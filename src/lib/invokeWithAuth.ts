import { supabase } from "@/integrations/supabase/client";

type InvokeOptions = Parameters<typeof supabase.functions.invoke>[1];

/**
 * Ensures we always send an Authorization header when calling backend functions.
 * This prevents sporadic 401 "Invalid JWT" errors when the client session isn't attached.
 */
export async function invokeWithAuth<T = any>(
  functionName: string,
  options?: InvokeOptions
): Promise<{ data: T | null; error: any }> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    return { data: null, error: sessionError };
  }

  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    return { data: null, error: new Error("Not authenticated") };
  }

  return supabase.functions.invoke(functionName, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
