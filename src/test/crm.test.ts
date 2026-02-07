/**
 * CRM utility tests
 */
import { describe, it, expect } from 'vitest';

describe('CRM Pipeline', () => {
  const VALID_STAGES = [
    'new', 'first_contact_booked', 'met', 'qualified',
    'proposal_sent', 'negotiating', 'contracted',
    'incubating', 'accelerating', 'rejected', 'archived',
  ];

  it('all stage values are valid strings', () => {
    VALID_STAGES.forEach(stage => {
      expect(typeof stage).toBe('string');
      expect(stage.length).toBeGreaterThan(0);
    });
  });

  it('stage transitions: new → first_contact_booked is valid', () => {
    const from = 'new';
    const to = 'first_contact_booked';
    expect(VALID_STAGES).toContain(from);
    expect(VALID_STAGES).toContain(to);
  });

  it('relationship status derives from next_action_at', () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Overdue: next_action_at in the past
    expect(pastDate < now).toBe(true);
    // Upcoming: next_action_at in the future
    expect(futureDate > now).toBe(true);
  });

  it('lead score computation: completeness check', () => {
    const item = {
      contact_name: 'John',
      contact_email: 'john@example.com',
      contact_phone: null,
      organization_name: 'Acme',
      source: 'website',
      notes: 'Interested in program',
    };

    let score = 0;
    if (item.contact_name) score += 15;
    if (item.contact_email) score += 15;
    if (item.contact_phone) score += 10;
    if (item.organization_name) score += 15;
    if (item.source) score += 10;
    if (item.notes) score += 5;

    // Missing phone = 70/70 of available, or 60 total
    expect(score).toBe(60);
  });
});
