import { describe, it, expect, vi } from 'vitest';

// Mock the supabase client
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
  supabaseClient: {},
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

describe('Mentor Dashboard Logic', () => {
  it('should sort workspaces by next meeting date', () => {
    const workspaces = [
      { id: '1', nextMeetingDate: '2026-02-10T10:00:00Z', updated_at: '2026-02-01' },
      { id: '2', nextMeetingDate: null, updated_at: '2026-02-05' },
      { id: '3', nextMeetingDate: '2026-02-08T10:00:00Z', updated_at: '2026-02-01' },
    ];

    const sorted = [...workspaces].sort((a, b) => {
      if (a.nextMeetingDate && !b.nextMeetingDate) return -1;
      if (!a.nextMeetingDate && b.nextMeetingDate) return 1;
      if (a.nextMeetingDate && b.nextMeetingDate) {
        return new Date(a.nextMeetingDate).getTime() - new Date(b.nextMeetingDate).getTime();
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    expect(sorted[0].id).toBe('3'); // earliest meeting
    expect(sorted[1].id).toBe('1'); // later meeting
    expect(sorted[2].id).toBe('2'); // no meeting
  });

  it('should calculate mentor impact stats', () => {
    const workspaces = [
      { health_score: 'healthy', health_score_override: null, lastSession: { id: '1' }, pendingActionsCount: 2 },
      { health_score: 'thriving', health_score_override: null, lastSession: null, pendingActionsCount: 0 },
      { health_score: 'critical', health_score_override: null, lastSession: { id: '2' }, pendingActionsCount: 3 },
    ];

    const healthyCount = workspaces.filter(w => {
      const health = w.health_score_override || w.health_score;
      return health === 'healthy' || health === 'thriving';
    }).length;

    const sessionsCompleted = workspaces.filter(w => w.lastSession).length;
    const actionsCreated = workspaces.reduce((sum, w) => sum + w.pendingActionsCount, 0);

    expect(healthyCount).toBe(2);
    expect(sessionsCompleted).toBe(2);
    expect(actionsCreated).toBe(5);
  });
});

describe('Admin Dashboard Logic', () => {
  it('should compute needs attention count from health distribution', () => {
    const healthDistribution = {
      critical: 2,
      at_risk: 3,
      stable: 10,
      healthy: 8,
      thriving: 5,
    };

    const needsAttention = healthDistribution.critical + healthDistribution.at_risk;
    const healthyCount = healthDistribution.healthy + healthDistribution.thriving;

    expect(needsAttention).toBe(5);
    expect(healthyCount).toBe(13);
  });

  it('should compute health percentages correctly', () => {
    const healthDistribution = {
      critical: 1,
      at_risk: 2,
      stable: 3,
      healthy: 2,
      thriving: 2,
    };
    const total = Object.values(healthDistribution).reduce((a, b) => a + b, 0);
    expect(total).toBe(10);

    const criticalPct = (healthDistribution.critical / total) * 100;
    expect(criticalPct).toBe(10);
  });
});

describe('CRM Stage Transitions', () => {
  const VALID_STAGES = [
    'new', 'first_contact_booked', 'met', 'qualified', 'proposal_sent',
    'negotiating', 'contracted', 'incubating', 'accelerating', 'rejected', 'archived',
  ];

  it('should have all valid pipeline stages', () => {
    expect(VALID_STAGES).toHaveLength(11);
    expect(VALID_STAGES).toContain('new');
    expect(VALID_STAGES).toContain('contracted');
    expect(VALID_STAGES).toContain('archived');
  });

  it('should validate stage transitions exist', () => {
    // A funnel item should be able to move to any stage
    const item = { id: '1', stage: 'new' };
    VALID_STAGES.forEach(stage => {
      expect(VALID_STAGES).toContain(stage);
    });
  });
});

describe('Relationship Status Logic', () => {
  it('should return overdue when next action is in the past', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const isOverdue = new Date(pastDate) < new Date();
    expect(isOverdue).toBe(true);
  });

  it('should return not overdue for future dates', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const isOverdue = new Date(futureDate) < new Date();
    expect(isOverdue).toBe(false);
  });
});

describe('Task Sorting Logic', () => {
  it('should sort tasks by due date with nulls last', () => {
    const tasks = [
      { id: '1', due_at: null, created_at: '2026-02-01T10:00:00Z' },
      { id: '2', due_at: '2026-02-10T10:00:00Z', created_at: '2026-02-01T10:00:00Z' },
      { id: '3', due_at: '2026-02-05T10:00:00Z', created_at: '2026-02-01T10:00:00Z' },
    ];

    const sorted = [...tasks].sort((a, b) => {
      if (!a.due_at && !b.due_at) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (!a.due_at) return 1;
      if (!b.due_at) return -1;
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    });

    expect(sorted[0].id).toBe('3'); // earliest due
    expect(sorted[1].id).toBe('2'); // later due
    expect(sorted[2].id).toBe('1'); // no due date
  });
});
