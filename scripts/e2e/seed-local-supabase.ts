/**
 * Deterministic E2E seed script for local Supabase.
 *
 * Usage:
 *   SUPABASE_URL=http://127.0.0.1:54321 \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   npx tsx scripts/e2e/seed-local-supabase.ts
 *
 * Idempotent: uses stable UUIDs + ON CONFLICT DO NOTHING / upserts.
 *
 * IMPORTANT: Workspace is created as 'pending' first, then members are added,
 * then workspace is activated. This respects the trg_validate_workspace_activation
 * trigger which requires at least one active workspace_user before allowing
 * status = 'active'.
 */
import { createClient } from '@supabase/supabase-js';
import { USERS, TEST_PASSWORD, SEED_IDS, CURRENT_NDA_VERSION } from './seed-constants';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function upsertUser(user: typeof USERS[keyof typeof USERS]) {
  // Try to create; if exists, update password
  const { data: existing } = await supabase.auth.admin.getUserById(user.id);

  if (existing?.user) {
    await supabase.auth.admin.updateUserById(user.id, {
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    console.log(`  ✓ Updated user ${user.email}`);
  } else {
    const { error } = await supabase.auth.admin.createUser({
      id: user.id,
      email: user.email,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: user.fullName },
    });
    if (error) {
      // Might already exist with different ID; try by email
      const { data: byEmail } = await supabase.auth.admin.listUsers();
      const found = byEmail?.users?.find(u => u.email === user.email);
      if (found) {
        await supabase.auth.admin.updateUserById(found.id, {
          password: TEST_PASSWORD,
          email_confirm: true,
        });
        console.log(`  ✓ Updated existing user ${user.email} (id: ${found.id})`);
        // Update our reference to use actual ID
        (user as any)._actualId = found.id;
        return found.id;
      }
      console.error(`  ✗ Failed to create ${user.email}:`, error.message);
      throw error;
    }
    console.log(`  ✓ Created user ${user.email}`);
  }
  return user.id;
}

function getUserId(user: typeof USERS[keyof typeof USERS]): string {
  return (user as any)._actualId || user.id;
}

async function seedRoles() {
  for (const user of Object.values(USERS)) {
    const uid = getUserId(user);
    const { error } = await supabase.from('user_roles').upsert(
      { user_id: uid, role: user.role },
      { onConflict: 'user_id,role' }
    );
    if (error) console.warn(`  ⚠ Role ${user.role} for ${user.email}: ${error.message}`);
    else console.log(`  ✓ Role ${user.role} → ${user.email}`);
  }
}

async function seedProfiles() {
  for (const user of Object.values(USERS)) {
    const uid = getUserId(user);
    const { error } = await supabase.from('profiles').upsert(
      {
        id: uid,
        email: user.email,
        full_name: user.fullName,
        account_status: 'approved',
      },
      { onConflict: 'id' }
    );
    if (error) console.warn(`  ⚠ Profile ${user.email}: ${error.message}`);
    else console.log(`  ✓ Profile → ${user.email}`);
  }
}

async function seedData() {
  const consultantId = getUserId(USERS.consultant);
  const founderId = getUserId(USERS.founder);
  const mentorId = getUserId(USERS.mentor);

  // Program
  const { error: progErr } = await supabase.from('programs').upsert({
    id: SEED_IDS.program,
    name: 'E2E Test Program',
    is_active: true,
    status: 'active',
  }, { onConflict: 'id' });
  if (progErr) console.warn('  ⚠ Program:', progErr.message);
  else console.log('  ✓ Program');

  // Startup
  const { error: startupErr } = await supabase.from('startups').upsert({
    id: SEED_IDS.startup,
    name: 'E2E Test Startup',
    main_contact_email: USERS.founder.email,
    main_contact_name: USERS.founder.fullName,
  }, { onConflict: 'id' });
  if (startupErr) console.warn('  ⚠ Startup:', startupErr.message);
  else console.log('  ✓ Startup');

  // ─── Workspace creation: 3-step safe activation ───
  // Step 1: Create/upsert workspace as 'pending' (safe for trigger)
  const { error: wsErr } = await supabase.from('workspaces').upsert({
    id: SEED_IDS.workspace,
    startup_id: SEED_IDS.startup,
    program_id: SEED_IDS.program,
    stage: 'ideation',
    status: 'pending',
    health_score: 'stable',
    priority_level: 'medium',
    assigned_consultor_id: consultantId,
  }, { onConflict: 'id' });
  if (wsErr) {
    console.error('  ✗ Workspace (pending):', wsErr.message);
    throw new Error(`Workspace creation failed: ${wsErr.message}`);
  }
  console.log('  ✓ Workspace (created as pending)');

  // Step 2: Add workspace users BEFORE activating
  const wsUsers = [
    { workspace_id: SEED_IDS.workspace, user_id: founderId, role: 'founder', active: true },
    { workspace_id: SEED_IDS.workspace, user_id: consultantId, role: 'consultor', active: true },
    { workspace_id: SEED_IDS.workspace, user_id: mentorId, role: 'mentor_externo', active: true },
  ];
  for (const wu of wsUsers) {
    const { error } = await supabase.from('workspace_users').upsert(wu, {
      onConflict: 'workspace_id,user_id',
    });
    if (error) {
      console.error(`  ✗ workspace_user ${wu.role}: ${error.message}`);
      throw new Error(`workspace_user insert failed for ${wu.role}: ${error.message}`);
    }
    console.log(`  ✓ workspace_user ${wu.role}`);
  }

  // Step 3: NOW activate the workspace (trigger will find active members)
  const { error: activateErr } = await supabase
    .from('workspaces')
    .update({ status: 'active' })
    .eq('id', SEED_IDS.workspace);
  if (activateErr) {
    console.error('  ✗ Workspace activation:', activateErr.message);
    throw new Error(`Workspace activation failed: ${activateErr.message}`);
  }
  console.log('  ✓ Workspace activated (status → active)');

  // Building
  const { error: bldErr } = await supabase.from('buildings').upsert({
    id: SEED_IDS.building,
    name: 'E2E Building',
    code: 'E2E-B1',
    is_active: true,
  }, { onConflict: 'id' });
  if (bldErr) console.warn('  ⚠ Building:', bldErr.message);
  else console.log('  ✓ Building');

  // Office Space
  const { error: spaceErr } = await supabase.from('office_spaces').upsert({
    id: SEED_IDS.space,
    building_id: SEED_IDS.building,
    name: 'E2E Room A',
    type: 'office',
    capacity: 10,
    is_available: true,
  }, { onConflict: 'id' });
  if (spaceErr) console.warn('  ⚠ Space:', spaceErr.message);
  else console.log('  ✓ Office Space');

  // Startup Contract
  const { error: contractErr } = await supabase.from('startup_contracts').upsert({
    id: SEED_IDS.contract,
    workspace_id: SEED_IDS.workspace,
    building_id: SEED_IDS.building,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    status: 'active',
    monthly_fee: 500,
    currency: 'EUR',
  }, { onConflict: 'id' });
  if (contractErr) console.warn('  ⚠ Contract:', contractErr.message);
  else console.log('  ✓ Contract');

  // Funnel item (CRM lead)
  const { error: funnelErr } = await supabase.from('funnel_items').upsert({
    id: SEED_IDS.funnelItem,
    type: 'lead',
    stage: 'new',
    contact_name: 'E2E Lead Contact',
    contact_email: 'e2e-lead@example.test',
    organization_name: 'E2E Lead Org',
    owner_consultant_id: consultantId,
    program_id: SEED_IDS.program,
    source: 'e2e_seed',
  }, { onConflict: 'id' });
  if (funnelErr) console.warn('  ⚠ Funnel item:', funnelErr.message);
  else console.log('  ✓ Funnel item');

  // Communication log (task)
  const { error: commErr } = await supabase.from('communication_log').upsert({
    id: SEED_IDS.commLog,
    workspace_id: SEED_IDS.workspace,
    activity_type: 'task',
    status: 'open',
    subject: 'E2E Follow-up Task',
    assigned_to: consultantId,
    occurred_at: new Date().toISOString(),
    visibility: 'team',
    funnel_item_id: SEED_IDS.funnelItem,
  }, { onConflict: 'id' });
  if (commErr) console.warn('  ⚠ Communication log:', commErr.message);
  else console.log('  ✓ Communication log');

  // Mentor NDA acceptance
  const { error: ndaErr } = await supabase.from('mentor_nda_acceptances').upsert({
    user_id: mentorId,
    nda_version: CURRENT_NDA_VERSION,
    accepted_at: new Date().toISOString(),
  }, { onConflict: 'user_id,nda_version' });
  if (ndaErr) console.warn('  ⚠ NDA acceptance:', ndaErr.message);
  else console.log('  ✓ NDA acceptance');

  // Clean up any stale claim requests for the active founder
  // This prevents the onboarding gate from seeing a 'pending' claim
  const { error: cleanClaimErr } = await supabase
    .from('startup_claim_requests')
    .delete()
    .eq('user_id', founderId);
  if (cleanClaimErr) console.warn('  ⚠ Clean claim requests:', cleanClaimErr.message);
  else console.log('  ✓ Cleaned stale claim requests for active founder');

  // NOTE: founder_unclaimed user intentionally has NO workspace or claim request.
  // This ensures they always land in the claim-first onboarding gate.
  console.log('  ✓ founder_unclaimed: no workspace seeded (claim-first persona)');
}

/**
 * Post-seed validation — fails fast if the active founder persona
 * does not have the exact state needed to bypass the onboarding gate.
 *
 * Mirrors the checks in useFounderOnboardingState():
 *   1. auth user exists
 *   2. profile exists with account_status = 'approved'
 *   3. user_roles has 'founder' role
 *   4. workspace_users row exists (active=true, role='founder')
 *   5. linked workspace has status 'active' or 'claimed'
 *   6. no pending claim requests exist
 */
async function validateFounderPersona() {
  const founderId = getUserId(USERS.founder);
  const founderEmail = USERS.founder.email;
  let failures = 0;

  console.log(`\n  Validating founder persona: ${founderEmail} (${founderId})`);

  // 1. Auth user exists
  const { data: authUser } = await supabase.auth.admin.getUserById(founderId);
  if (!authUser?.user) {
    console.error('  ✗ VALIDATION FAIL: Auth user does not exist');
    failures++;
  } else {
    console.log(`  ✓ Auth user exists (email_confirmed: ${!!authUser.user.email_confirmed_at})`);
  }

  // 2. Profile with approved status
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, email, account_status')
    .eq('id', founderId)
    .single();
  if (profileErr || !profile) {
    console.error('  ✗ VALIDATION FAIL: Profile not found', profileErr?.message);
    failures++;
  } else if (profile.account_status !== 'approved') {
    console.error(`  ✗ VALIDATION FAIL: Profile account_status = '${profile.account_status}' (expected 'approved')`);
    failures++;
  } else {
    console.log(`  ✓ Profile approved (status: ${profile.account_status})`);
  }

  // 3. Founder role in user_roles
  const { data: roles, error: rolesErr } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', founderId)
    .eq('role', 'founder');
  if (rolesErr || !roles || roles.length === 0) {
    console.error('  ✗ VALIDATION FAIL: No founder role in user_roles', rolesErr?.message);
    failures++;
  } else {
    console.log(`  ✓ Founder role exists in user_roles`);
  }

  // 4. workspace_users entry (active, role=founder)
  const { data: wsUsers, error: wsUsersErr } = await supabase
    .from('workspace_users')
    .select('workspace_id, role, active')
    .eq('user_id', founderId)
    .eq('active', true)
    .eq('role', 'founder');
  if (wsUsersErr || !wsUsers || wsUsers.length === 0) {
    console.error('  ✗ VALIDATION FAIL: No active workspace_users entry with role=founder', wsUsersErr?.message);
    failures++;
  } else {
    console.log(`  ✓ workspace_users entry: workspace_id=${wsUsers[0].workspace_id}, active=${wsUsers[0].active}`);
  }

  // 5. Workspace status is 'active' or 'claimed'
  const { data: workspace, error: wsErr } = await supabase
    .from('workspaces')
    .select('id, status, startup_id')
    .eq('id', SEED_IDS.workspace)
    .single();
  if (wsErr || !workspace) {
    console.error('  ✗ VALIDATION FAIL: Workspace not found', wsErr?.message);
    failures++;
  } else if (workspace.status !== 'active' && workspace.status !== 'claimed') {
    console.error(`  ✗ VALIDATION FAIL: Workspace status = '${workspace.status}' (expected 'active' or 'claimed')`);
    failures++;
  } else {
    console.log(`  ✓ Workspace status: '${workspace.status}'`);
  }

  // 6. No pending claim requests
  const { data: claims, error: claimsErr } = await supabase
    .from('startup_claim_requests')
    .select('id, status')
    .eq('user_id', founderId)
    .eq('status', 'pending');
  if (claimsErr) {
    console.warn('  ⚠ Could not check claim requests:', claimsErr.message);
  } else if (claims && claims.length > 0) {
    console.error(`  ✗ VALIDATION FAIL: Found ${claims.length} pending claim request(s) — onboarding gate will see 'has_pending_claim'`);
    failures++;
  } else {
    console.log('  ✓ No pending claim requests');
  }

  // 7. Simulate the exact hook query (the !inner join path)
  const { data: hookSimulation, error: hookErr } = await supabase
    .from('workspace_users')
    .select('workspace_id, workspaces!inner(id, status, startup_id, startups(name))')
    .eq('user_id', founderId)
    .eq('active', true)
    .eq('role', 'founder')
    .limit(5);
  if (hookErr) {
    console.error('  ✗ VALIDATION FAIL: Hook query simulation failed:', hookErr.message);
    failures++;
  } else if (!hookSimulation || hookSimulation.length === 0) {
    console.error('  ✗ VALIDATION FAIL: Hook query returned 0 rows — onboarding gate will route to /claim-startup');
    console.error('    This means RLS is blocking the query OR the join is filtering results.');
    console.error('    Note: Service role bypasses RLS, so if this fails, the schema join is broken.');
    failures++;
  } else {
    const ws = (hookSimulation[0] as any).workspaces;
    const status = ws?.status;
    if (status === 'active' || status === 'claimed') {
      console.log(`  ✓ Hook query returns workspace with status='${status}' — founder will bypass claim gate`);
    } else {
      console.error(`  ✗ VALIDATION FAIL: Hook query returns workspace with status='${status}' — gate will NOT be bypassed`);
      failures++;
    }
  }

  if (failures > 0) {
    console.error(`\n❌ FOUNDER PERSONA VALIDATION FAILED (${failures} issue(s))`);
    console.error('   The active founder will be routed to /claim-startup in Playwright tests.');
    process.exit(1);
  }

  // 8. RLS-aware validation: sign in as the founder and run the exact hook query
  console.log('\n  🔒 RLS-aware validation (signing in as founder)...');
  const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  if (ANON_KEY) {
    const founderClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: signInData, error: signInErr } = await founderClient.auth.signInWithPassword({
      email: founderEmail,
      password: TEST_PASSWORD,
    });
    if (signInErr || !signInData?.user) {
      console.error('  ✗ RLS VALIDATION: Cannot sign in as founder:', signInErr?.message);
      process.exit(1);
    }
    console.log(`  ✓ Signed in as ${founderEmail}`);

    // Run the exact query from useFounderOnboardingState
    const { data: rlsResult, error: rlsErr } = await founderClient
      .from('workspace_users')
      .select('workspace_id, workspaces!inner(id, status, startup_id, startups(name))')
      .eq('user_id', signInData.user.id)
      .eq('active', true)
      .eq('role', 'founder')
      .limit(5);

    if (rlsErr) {
      console.error('  ✗ RLS VALIDATION: Hook query failed through RLS:', rlsErr.message);
      process.exit(1);
    }
    if (!rlsResult || rlsResult.length === 0) {
      console.error('  ✗ RLS VALIDATION: Hook query returned 0 rows through RLS!');
      console.error('    Data exists (service role sees it) but RLS blocks the founder.');
      console.error('    Fix: Check workspace_users SELECT policy and workspaces SELECT policy.');
      process.exit(1);
    }
    const rlsWs = (rlsResult[0] as any).workspaces;
    if (rlsWs?.status === 'active' || rlsWs?.status === 'claimed') {
      console.log(`  ✓ RLS query returns workspace status='${rlsWs.status}' — CONFIRMED: founder will bypass gate`);
    } else {
      console.error(`  ✗ RLS VALIDATION: Query returns status='${rlsWs?.status}' through RLS`);
      process.exit(1);
    }

    await founderClient.auth.signOut();
  } else {
    console.warn('  ⚠ Skipping RLS validation: SUPABASE_ANON_KEY not available');
  }

  console.log('  ✅ All founder persona validations passed\n');
}

async function main() {
  console.log('🌱 E2E Seed — Local Supabase');
  console.log(`  URL: ${SUPABASE_URL}`);
  console.log('');

  console.log('1️⃣  Users');
  for (const user of Object.values(USERS)) {
    await upsertUser(user);
  }

  console.log('\n2️⃣  Profiles');
  await seedProfiles();

  console.log('\n3️⃣  Roles');
  await seedRoles();

  console.log('\n4️⃣  Data');
  await seedData();

  console.log('\n5️⃣  Post-seed validation');
  await validateFounderPersona();

  console.log('✅ Seeding complete');
}

main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
