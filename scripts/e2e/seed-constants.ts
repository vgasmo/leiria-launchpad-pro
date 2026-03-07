/**
 * Deterministic E2E test constants.
 * Stable UUIDs ensure idempotent seeding (re-run safe).
 */

export const TEST_PASSWORD = 'Test1234!';

export const USERS = {
  admin: {
    email: 'e2e-admin@startup-leiria.test',
    id: 'a0000000-0000-0000-0000-000000000001',
    role: 'admin' as const,
    fullName: 'E2E Admin',
  },
  backoffice: {
    email: 'e2e-backoffice@startup-leiria.test',
    id: 'a0000000-0000-0000-0000-000000000002',
    role: 'backoffice' as const,
    fullName: 'E2E Backoffice',
  },
  consultant: {
    email: 'e2e-consultant@startup-leiria.test',
    id: 'a0000000-0000-0000-0000-000000000003',
    role: 'consultor' as const,
    fullName: 'E2E Consultant',
  },
  founder: {
    email: 'e2e-founder@startup-leiria.test',
    id: 'a0000000-0000-0000-0000-000000000004',
    role: 'founder' as const,
    fullName: 'E2E Founder',
  },
  /** Founder with NO workspace — always lands in claim-first gate */
  founder_unclaimed: {
    email: 'e2e-founder-unclaimed@startup-leiria.test',
    id: 'a0000000-0000-0000-0000-000000000006',
    role: 'founder' as const,
    fullName: 'E2E Founder Unclaimed',
  },
  mentor: {
    email: 'e2e-mentor@startup-leiria.test',
    id: 'a0000000-0000-0000-0000-000000000005',
    role: 'mentor_externo' as const,
    fullName: 'E2E Mentor',
  },
} as const;

export const SEED_IDS = {
  program: 'b0000000-0000-0000-0000-000000000001',
  startup: 'b0000000-0000-0000-0000-000000000002',
  workspace: 'b0000000-0000-0000-0000-000000000003',
  building: 'b0000000-0000-0000-0000-000000000004',
  space: 'b0000000-0000-0000-0000-000000000005',
  contract: 'b0000000-0000-0000-0000-000000000006',
  funnelItem: 'b0000000-0000-0000-0000-000000000007',
  commLog: 'b0000000-0000-0000-0000-000000000008',
} as const;

export const CURRENT_NDA_VERSION = 'PT-NDA-2026-01';
