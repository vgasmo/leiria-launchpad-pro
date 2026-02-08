/**
 * Deterministic E2E seed script for local Supabase.
 *
 * Usage:
 *   SUPABASE_URL=http://127.0.0.1:54321 \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   npx tsx scripts/e2e/seed-local-supabase.ts
 *
 * Idempotent: uses stable UUIDs + ON CONFLICT DO NOTHING / upserts.
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

  // Workspace
  const { error: wsErr } = await supabase.from('workspaces').upsert({
    id: SEED_IDS.workspace,
    startup_id: SEED_IDS.startup,
    program_id: SEED_IDS.program,
    stage: 'ideation',
    status: 'active',
    health_score: 'stable',
    priority_level: 'medium',
    assigned_consultor_id: consultantId,
  }, { onConflict: 'id' });
  if (wsErr) console.warn('  ⚠ Workspace:', wsErr.message);
  else console.log('  ✓ Workspace');

  // Workspace users
  const wsUsers = [
    { workspace_id: SEED_IDS.workspace, user_id: founderId, role: 'founder', active: true },
    { workspace_id: SEED_IDS.workspace, user_id: consultantId, role: 'consultor', active: true },
    { workspace_id: SEED_IDS.workspace, user_id: mentorId, role: 'mentor_externo', active: true },
  ];
  for (const wu of wsUsers) {
    const { error } = await supabase.from('workspace_users').upsert(wu, {
      onConflict: 'workspace_id,user_id',
    });
    if (error) console.warn(`  ⚠ workspace_user ${wu.role}: ${error.message}`);
    else console.log(`  ✓ workspace_user ${wu.role}`);
  }

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

  console.log('\n✅ Seeding complete');
}

main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
