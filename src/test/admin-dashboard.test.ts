import { describe, it, expect } from 'vitest';

describe('AdminDashboard module', () => {
  it('should import AdminDashboard without error', async () => {
    const mod = await import('@/components/dashboard/AdminDashboard');
    expect(mod.AdminDashboard).toBeDefined();
    expect(typeof mod.AdminDashboard).toBe('function');
  });

  it('should import useAdminDashboardStats without error', async () => {
    const mod = await import('@/hooks/useAdminDashboardStats');
    expect(mod.useAdminDashboardStats).toBeDefined();
    expect(typeof mod.useAdminDashboardStats).toBe('function');
  });
});
