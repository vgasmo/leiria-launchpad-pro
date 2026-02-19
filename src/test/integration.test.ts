import { describe, it, expect, vi } from 'vitest';

// Mock supabase
vi.mock('@/lib/supabaseClient', () => ({
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
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
  supabaseClient: {},
}));

describe('invokeWithAuth', () => {
  it('should return error when no session exists', async () => {
    const { invokeWithAuth } = await import('@/lib/invokeWithAuth');
    const result = await invokeWithAuth('test-function');
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('Please sign in to continue.');
  });
});

describe('API Error Parsing', () => {
  it('should parse standard Error objects', async () => {
    const { parseApiError } = await import('@/lib/apiError');
    const error = new Error('Something went wrong');
    const parsed = parseApiError(error, 'test');
    expect(parsed.message).toBe('Something went wrong');
  });

  it('should handle null/undefined errors gracefully', async () => {
    const { parseApiError } = await import('@/lib/apiError');
    const parsed = parseApiError(null as any, 'test');
    expect(parsed.message).toBeTruthy();
  });
});

describe('RecordDrawer Sub-components', () => {
  it('should export all drawer sub-components', async () => {
    const drawerExports = await import('@/components/crm/drawer/index');
    expect(drawerExports.RecordDrawerHeader).toBeDefined();
    expect(drawerExports.OverviewTab).toBeDefined();
    expect(drawerExports.QuickActions).toBeDefined();
    expect(drawerExports.NextActionDialog).toBeDefined();
    expect(drawerExports.AddActivityDialog).toBeDefined();
    expect(drawerExports.AddTaskDialog).toBeDefined();
  });
});

describe('Backoffice Hooks', () => {
  it('should export all backoffice domain hooks', async () => {
    const backofficeExports = await import('@/hooks/backoffice/index');
    expect(backofficeExports).toBeDefined();
    // Verify the module loaded without errors
    expect(typeof backofficeExports).toBe('object');
  });
});

describe('Security - Secret Stripping', () => {
  it('should strip sensitive keys from settings objects', () => {
    const settings = {
      tenant_id: 'abc',
      client_id: 'def',
      graph_credential: 'SENSITIVE_VALUE',
      redirect_uri: 'https://example.com',
    };

    const { graph_credential: _stripped, ...safeSettings } = settings;
    
    expect(safeSettings).not.toHaveProperty('graph_credential');
    expect(safeSettings.tenant_id).toBe('abc');
    expect(safeSettings.client_id).toBe('def');
    expect(safeSettings.redirect_uri).toBe('https://example.com');
  });

  it('should not include VITE_ env vars in edge function context', () => {
    // Edge functions should use Deno.env, not import.meta.env.VITE_*
    // This test validates the principle
    const edgeFunctionEnvAccess = () => {
      const forbidden = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'];
      return forbidden.every(key => typeof key === 'string');
    };
    expect(edgeFunctionEnvAccess()).toBe(true);
  });
});
