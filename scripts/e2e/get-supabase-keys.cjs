#!/usr/bin/env node
/**
 * Extract Supabase keys from `supabase status --output json`.
 * Outputs KEY=VALUE lines to stdout, suitable for `eval $(node get-supabase-keys.cjs)`.
 *
 * Handles both camelCase and UPPER_CASE field names from different supabase CLI versions.
 */
const { execSync } = require('child_process');

try {
  const raw = execSync('supabase status --output json', { encoding: 'utf-8', timeout: 30000 });
  const data = JSON.parse(raw);

  // Normalize keys: try multiple possible field names
  const apiUrl = data.API_URL || data.api_url || data.ApiUrl || '';
  const anonKey = data.ANON_KEY || data.anon_key || data.AnonKey || '';
  const serviceRoleKey = data.SERVICE_ROLE_KEY || data.service_role_key || data.ServiceRoleKey || '';

  if (!apiUrl || !anonKey || !serviceRoleKey) {
    console.error('⚠️  Some keys missing from supabase status output.');
    console.error('Raw output:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  // Output as shell-eval-friendly lines
  console.log(`SUPABASE_URL=${apiUrl}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`);
  console.log(`VITE_SUPABASE_URL=${apiUrl}`);
  console.log(`VITE_SUPABASE_PUBLISHABLE_KEY=${anonKey}`);
  console.log(`VITE_SUPABASE_PROJECT_ID=local`);
} catch (err) {
  console.error('❌ Failed to extract Supabase keys.');
  console.error(err.message);
  try {
    const rawFallback = execSync('supabase status --output json 2>&1', { encoding: 'utf-8' });
    console.error('Raw supabase status output:', rawFallback);
  } catch (_) { /* ignore */ }
  process.exit(1);
}
