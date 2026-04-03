import { supabase } from "@/lib/supabaseClient";
import { parseApiError } from "@/lib/apiError";

type InvokeOptions = Parameters<typeof supabase.functions.invoke>[1];

/**
 * Ensures we always send an Authorization header when calling backend functions.
 * Returns a standardized error shape for consistent UI handling.
 * 
 * @param functionName - Edge function name
 * @param options - Invoke options (body, headers, etc.)
 * @returns Result with data or error (backward compatible)
 */
export async function invokeWithAuth<T = any>(
  functionName: string,
  options?: InvokeOptions
): Promise<{ data: T | null; error: Error | null }> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    // Log structured error but return simple Error for compatibility
    const parsed = parseApiError(sessionError, `invokeWithAuth:${functionName}`);
    return { 
      data: null, 
      error: new Error(parsed.message)
    };
  }

  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    return { 
      data: null, 
      error: new Error("Please sign in to continue.")
    };
  }

  const { data, error } = await supabase.functions.invoke<T>(functionName, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    const parsed = parseApiError(error, `invokeWithAuth:${functionName}`);
    // Preserve status code info in the error message for downstream handling
    const rawMsg = error instanceof Error ? error.message : String(error);
    const is403 = rawMsg.includes('403') || rawMsg.includes('non-2xx') || parsed.code === 'FORBIDDEN';
    const errMsg = is403
      ? `403: Access denied (${functionName})`
      : parsed.message;
    return { 
      data: null, 
      error: new Error(errMsg)
    };
  }

  // Handle edge function returning error in the body (non-throw path)
  if (data && typeof data === 'object' && 'error' in data && !('id' in data)) {
    const bodyError = (data as any).error;
    if (typeof bodyError === 'string' && bodyError.toLowerCase().includes('access denied')) {
      return { data: null, error: new Error(`403: Access denied (${functionName})`) };
    }
  }

  return { data, error: null };
}
