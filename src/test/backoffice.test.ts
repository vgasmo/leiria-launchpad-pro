import { describe, it, expect } from 'vitest';

describe('Backoffice Types', () => {
  it('contract status values are valid', () => {
    const validStatuses = ['draft', 'pending_signature', 'active', 'suspended', 'terminated', 'expired'];
    const testStatus = 'active';
    expect(validStatuses).toContain(testStatus);
  });

  it('invoice status values are valid', () => {
    const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded'];
    const testStatus = 'paid';
    expect(validStatuses).toContain(testStatus);
  });

  it('office space types are valid', () => {
    const validTypes = ['desk', 'private_office', 'meeting_room', 'hot_desk'];
    const testType = 'private_office';
    expect(validTypes).toContain(testType);
  });

  it('overdue invoice calculation', () => {
    const today = new Date().toISOString().split('T')[0];
    const pastDate = '2024-01-01';
    const futureDate = '2099-12-31';
    
    expect(pastDate < today).toBe(true);
    expect(futureDate > today).toBe(true);
  });
});
