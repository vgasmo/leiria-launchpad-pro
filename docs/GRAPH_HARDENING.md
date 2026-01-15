# Microsoft Graph Integration Hardening

## Document Purpose
This document describes the Microsoft Graph API integration architecture, failure modes, changes made to improve reliability, and admin troubleshooting playbook.

---

## 1. Architecture Map

### Token Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                    TOKEN ACQUISITION FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Edge Function needs Graph access                             │
│           ↓                                                      │
│  2. getGraphCredentials() fetches from:                          │
│     - ENV: MS_GRAPH_CLIENT_SECRET (priority)                     │
│     - DB: global_integration_settings.settings_json              │
│           ↓                                                      │
│  3. getGraphAccessToken() calls Azure AD:                        │
│     POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
│     Body: client_id, client_secret, scope=.default, grant=client_credentials
│           ↓                                                      │
│  4. Token cached in memory (5-min buffer before expiry)          │
│           ↓                                                      │
│  5. callGraphWithRetry() makes API calls with:                   │
│     - Automatic 429 handling (Retry-After header)                │
│     - Exponential backoff on 5xx errors                          │
│     - Network error retry                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Credential Storage
| Source | Priority | Location | Security |
|--------|----------|----------|----------|
| Environment Variable | 1 (highest) | `MS_GRAPH_CLIENT_SECRET` | Supabase secrets (never in code) |
| Database | 2 (fallback) | `global_integration_settings.settings_json.client_secret` | Only accessible via service role |

### Edge Functions Inventory

| Function | Purpose | Auth Required | Graph Operations |
|----------|---------|---------------|------------------|
| `check-consultant-availability` | Real-time calendar free/busy | JWT (user) | getSchedule |
| `public-get-availability` | Public booking slot lookup | None (public) | getSchedule |
| `public-book-first-contact` | Create booking + calendar event | None (public) | createEvent |
| `validate-booking-slot` | Confirm slot still available | JWT (user) | getSchedule |
| `sync-outlook-calendar` | Sync sessions to Outlook | JWT (optional) | createEvent, updateEvent, deleteEvent |
| `sync-graph-email-history` | Import email threads to CRM | JWT (staff) | mailFolders/messages |
| `import-teams-transcript` | Fetch meeting transcripts | JWT (user) | onlineMeetings/transcripts |
| `test-graph-api` | Admin diagnostic tool | JWT (admin) | Various |
| `get-global-integrations` | Read integration settings | JWT (staff) | N/A |
| `set-global-integrations` | Update integration settings | JWT (admin) | N/A |

### Integration Type Normalization
The system supports **both** `graph_api` and `microsoft_graph` as integration types for backward compatibility:

```sql
-- Query pattern used in all functions:
.in('integration_type', ['graph_api', 'microsoft_graph'])
```

---

## 2. Failure Modes Matrix

### Authentication Failures

| Error | Cause | User Impact | Detection | Resolution |
|-------|-------|-------------|-----------|------------|
| `401 Unauthorized` | Invalid/expired client_secret | All Graph features fail | Token acquisition fails | Update secret in env/settings |
| `400 Bad Request` (token) | Invalid tenant_id or client_id | All Graph features fail | Token error response | Verify Azure AD app registration |
| `AADSTS7000215` | Client secret expired | All Graph features fail | Specific error code | Regenerate secret in Azure |

### Permission Failures

| Error | Cause | User Impact | Detection | Resolution |
|-------|-------|-------------|-----------|------------|
| `403 Forbidden` (calendar) | Missing `Calendars.ReadWrite` | No availability/booking | Calendar API call fails | Add permission in Azure + admin consent |
| `403 Forbidden` (mail) | Missing `Mail.Read` | No email sync | Email API call fails | Add permission in Azure + admin consent |
| `403 Forbidden` (transcripts) | Missing ApplicationAccessPolicy | No transcript import | Teams API call fails | Run `New-CsApplicationAccessPolicy` in PowerShell |
| `403 Access Denied` (user) | Mailbox not accessible | Single user affected | Per-user error | Check user license / mailbox |

### Rate Limiting

| Error | Cause | User Impact | Detection | Resolution |
|-------|-------|-------------|-----------|------------|
| `429 Too Many Requests` | Exceeded API limits | Temporary slowdown | Response status 429 | Automatic retry with Retry-After |
| Sustained 429 | Abuse or misconfiguration | Feature degradation | Repeated 429s | Review call patterns, implement caching |

### Transient Failures

| Error | Cause | User Impact | Detection | Resolution |
|-------|-------|-------------|-----------|------------|
| `500/502/503/504` | Graph service issues | Temporary failure | Server error codes | Automatic retry with backoff |
| Network timeout | Connectivity issues | Request fails | Fetch timeout | Automatic retry (up to 3 attempts) |
| DNS failure | Network configuration | Complete failure | TypeError in fetch | Check network/DNS configuration |

### Data/Logic Failures

| Error | Cause | User Impact | Detection | Resolution |
|-------|-------|-------------|-----------|------------|
| `404 Not Found` (user) | Email doesn't match Azure AD | No calendar for user | User lookup fails | Verify profile email matches M365 account |
| `404 Not Found` (event) | Event deleted externally | Sync state mismatch | Event operation fails | Clear `outlook_event_id` and re-sync |
| Timezone mismatch | DST/timezone handling | Wrong slot times | User reports | All times use `Europe/Lisbon` explicitly |
| Day boundary errors | UTC vs local time | Missing/extra slots | Slots at wrong hours | Use explicit timezone in all queries |

---

## 3. Changes Shipped

### A. Integration-Type Normalization

**Files Changed:**
- `supabase/functions/check-consultant-availability/index.ts`
- `supabase/functions/validate-booking-slot/index.ts`
- `supabase/functions/sync-outlook-calendar/index.ts`
- `supabase/functions/import-teams-transcript/index.ts`
- `supabase/functions/test-graph-api/index.ts`

**Change:** All functions now query with `.in('integration_type', ['graph_api', 'microsoft_graph'])` for backward compatibility.

### B. Shared Graph Auth Library

**File:** `supabase/functions/_shared/graphAuth.ts`

**Features:**
- `getGraphCredentials()` - Unified credential retrieval with env var priority
- `getGraphAccessToken()` - Token acquisition with:
  - In-memory caching (5-min buffer)
  - 429 handling with Retry-After header
  - 5xx retry with exponential backoff
  - Network error retry
- `callGraphWithRetry()` - API calls with automatic retry
- `clearTokenCache()` - For testing/forced refresh

### C. Fetch Timeouts

**Files Changed:** All Graph edge functions

**Implementation:** Using `AbortController` with 30-second timeout for all Graph API calls.

### D. Structured Logging

**All Functions:** Use `createLogger()` from `_shared/security.ts` with:
- Correlation ID (requestId)
- Function name
- Operation type
- Safe error messages (no secrets)

### E. Input Validation Hardening

**`public-book-first-contact`:**
- Email format validation
- Rate limiting (max 2 bookings per email per 24h)
- Input length limits
- Sanitized error responses

**`public-get-availability`:**
- Token validation
- Feature flag check
- Safe error messages (no stack traces)

---

## 4. Admin Playbook

### Quick Diagnostics

**Test Graph API Connection:**
```
POST /functions/v1/test-graph-api
Authorization: Bearer <admin_token>
Body: { "test": "auth" }
```

**Expected Response:**
```json
{ "success": true, "message": "Graph API authentication successful" }
```

### Common Issues and Fixes

#### Issue: "Graph API not configured"

**Symptoms:**
- All Graph features return "not configured" errors
- Availability shows no slots

**Diagnosis:**
1. Check `global_integration_settings` table has a row with `integration_type = 'graph_api'`
2. Verify `is_enabled = true`
3. Verify `settings_json` contains `tenant_id` and `client_id`

**Fix:**
1. Go to Admin → Integrations → Microsoft Graph
2. Enter Tenant ID, Client ID
3. Set Client Secret via Supabase secrets (`MS_GRAPH_CLIENT_SECRET`)
4. Enable the integration

#### Issue: "Failed to authenticate with Microsoft"

**Symptoms:**
- 401 errors in logs
- Token acquisition fails

**Diagnosis:**
1. Check if client_secret is expired (Azure AD → App registrations → Certificates & secrets)
2. Verify tenant_id and client_id are correct
3. Check if app registration exists

**Fix:**
1. Generate new client secret in Azure AD
2. Update `MS_GRAPH_CLIENT_SECRET` in Supabase secrets
3. Redeploy edge functions to pick up new secret

#### Issue: "Cannot access user calendar"

**Symptoms:**
- 403 errors for specific users
- Availability shows empty for some consultants

**Diagnosis:**
1. Check if user email in profiles matches M365 account
2. Verify user has Exchange Online license
3. Check app has `Calendars.ReadWrite` application permission

**Fix:**
1. Ensure profile email is the organizational email (e.g., `user@company.com`)
2. In Azure AD → App registrations → API permissions:
   - Add `Calendars.ReadWrite` (Application type)
   - Grant admin consent

#### Issue: "Transcript import fails with policy error"

**Symptoms:**
- 403 with "ApplicationAccessPolicy" in message
- Transcripts not importing

**Diagnosis:**
1. Check integration_errors table for policy-related errors
2. Verify OnlineMeetingTranscript.Read.All permission

**Fix:**
Run in Teams Admin PowerShell:
```powershell
# Create policy
New-CsApplicationAccessPolicy -Identity "Graph-Transcript-Policy" -AppIds "<app_client_id>" -Description "Allow transcript access"

# Apply to all users or specific user
Grant-CsApplicationAccessPolicy -PolicyName "Graph-Transcript-Policy" -Global
# OR for specific user:
Grant-CsApplicationAccessPolicy -PolicyName "Graph-Transcript-Policy" -Identity "user@company.com"
```

#### Issue: "Rate limited (429)"

**Symptoms:**
- Intermittent failures
- "Too many requests" in logs

**Diagnosis:**
1. Check function invocation frequency
2. Look for retry loops or abuse patterns

**Fix:**
1. System automatically handles with exponential backoff
2. If persistent, review application patterns
3. Consider caching availability data
4. Contact Microsoft if limits too restrictive

### Integration Health Check Script

Use this SQL to check integration health:

```sql
-- Check integration configuration
SELECT 
  integration_type,
  is_enabled,
  created_at,
  updated_at,
  settings_json->>'tenant_id' as tenant_id,
  settings_json->>'client_id' as client_id,
  CASE WHEN settings_json->>'client_secret' IS NOT NULL THEN 'SET' ELSE 'MISSING' END as secret_status
FROM global_integration_settings
WHERE integration_type IN ('graph_api', 'microsoft_graph');

-- Check recent integration errors
SELECT 
  integration_type,
  error_message,
  error_details,
  created_at
FROM integration_errors
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- Check sync status of sessions
SELECT 
  outlook_sync_status,
  COUNT(*) as count
FROM sessions
WHERE scheduled_at > NOW() - INTERVAL '7 days'
GROUP BY outlook_sync_status;
```

### Required Azure AD Permissions

| Permission | Type | Purpose |
|------------|------|---------|
| `Calendars.ReadWrite` | Application | Calendar events CRUD |
| `Mail.Read` | Application | Email sync to CRM |
| `OnlineMeetings.Read.All` | Application | Access meeting info |
| `OnlineMeetingTranscript.Read.All` | Application | Read transcripts |
| `User.Read.All` | Application | User directory lookup |

---

## 5. Monitoring Recommendations

### Key Metrics to Track

1. **Token acquisition success rate** - Should be >99%
2. **Graph API error rate by status code** - Watch for 429 spikes
3. **Average retry count** - Should be <1.5
4. **Integration error count by type** - Trend should be flat/declining

### Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Token failures (1h) | > 5 | > 20 |
| 429 errors (1h) | > 10 | > 50 |
| 5xx errors (1h) | > 5 | > 20 |
| Avg latency (Graph calls) | > 2s | > 5s |

---

## 6. Timezone Handling

### Standard: Europe/Lisbon

All availability and booking operations use `Europe/Lisbon` timezone explicitly:

```typescript
// In all Graph API calls:
startTime: { dateTime: startTime, timeZone: 'Europe/Lisbon' },
endTime: { dateTime: endTime, timeZone: 'Europe/Lisbon' },
```

### DST Considerations

- Portugal observes DST (last Sunday of March to last Sunday of October)
- Graph API handles DST automatically when timezone is specified
- Frontend must send local times, not UTC, for correct DST handling

### Date Format Standards

| Context | Format | Example |
|---------|--------|---------|
| Date parameter | `YYYY-MM-DD` | `2024-01-15` |
| DateTime (local) | `YYYY-MM-DDTHH:mm:ss` | `2024-01-15T09:00:00` |
| DateTime (ISO) | `YYYY-MM-DDTHH:mm:ssZ` | `2024-01-15T09:00:00Z` |
| Graph API | Local + timeZone object | `{ dateTime: "2024-01-15T09:00:00", timeZone: "Europe/Lisbon" }` |
