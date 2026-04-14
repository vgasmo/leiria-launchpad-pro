/**
 * Public Get Availability - Returns available time slots for public booking
 * Uses real Graph API calendar data when configured
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { addDays, format } from "https://esm.sh/date-fns@3.6.0";
import { handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';

interface TimeSlot {
  date: string;
  time: string;
  available: boolean;
}

// Get Graph credentials with env var priority
async function getGraphCredentials(supabase: any): Promise<{
  tenantId: string;
  clientId: string;
  clientSecret: string;
} | null> {
  const envClientSecret = Deno.env.get('MS_GRAPH_CLIENT_SECRET');
  
  const { data: graphSettings } = await supabase
    .from('global_integration_settings')
    .select('settings_json, is_enabled')
    .in('integration_type', ['graph_api', 'microsoft_graph'])
    .eq('is_enabled', true)
    .limit(1)
    .maybeSingle();
  
  if (!graphSettings?.settings_json) return null;

  const globalJson = graphSettings.settings_json as {
    tenant_id?: string;
    client_id?: string;
    client_secret?: string;
  };
  
  const tenantId = globalJson.tenant_id;
  const clientId = globalJson.client_id;
  const clientSecret = envClientSecret || globalJson.client_secret;
  
  if (!tenantId || !clientId || !clientSecret) return null;
  
  return { tenantId, clientId, clientSecret };
}

// Get Microsoft Graph access token
async function getGraphAccessToken(credentials: {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to get Graph token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Get free/busy schedule from Graph API
async function getFreeBusySchedule(
  accessToken: string,
  userEmail: string,
  startTime: string,
  endTime: string
): Promise<{ availabilityView: string } | null> {
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userEmail)}/calendar/getSchedule`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      schedules: [userEmail],
      startTime: { dateTime: startTime, timeZone: 'Europe/Lisbon' },
      endTime: { dateTime: endTime, timeZone: 'Europe/Lisbon' },
      availabilityViewInterval: 30,
    }),
  });

  if (!response.ok) {
    console.error("Graph API error:", await response.text());
    return null;
  }

  const data = await response.json();
  return data.value?.[0] || null;
}

// Generate slots from availability view
function generateSlotsFromAvailability(
  date: string,
  availabilityView: string
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const workStart = 9;
  const times = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];
  
  for (const time of times) {
    const [hour, minute] = time.split(':').map(Number);
    const slotStartIndex = (hour - workStart) * 2 + (minute === 30 ? 1 : 0);
    
    let isAvailable = true;
    for (let i = 0; i < 2 && slotStartIndex + i < availabilityView.length; i++) {
      const status = availabilityView[slotStartIndex + i];
      if (status !== '0') {
        isAvailable = false;
        break;
      }
    }
    
    slots.push({ date, time, available: isAvailable });
  }
  
  return slots;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    let body: { token?: unknown; action?: unknown };
    try {
      body = await req.json();
    } catch {
      return corsJsonResponse({ error: "Invalid JSON body" }, req, 400);
    }

    const { token, action } = body;

    if (!token || typeof token !== 'string' || token.length > 500) {
      return corsJsonResponse({ error: "Invalid or missing token" }, req, 400);
    }

    if (action !== undefined && action !== 'validate' && action !== 'get_slots') {
      return corsJsonResponse({ error: "Invalid action" }, req, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if public booking is enabled
    const { data: flag } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", "public_first_contact_booking")
      .maybeSingle();

    if (!flag?.enabled) {
      return corsJsonResponse({ valid: false, error: "Public booking is not enabled" }, req, 403);
    }

    let consultantEmail: string | null = null;
    let consultantName: string | null = null;
    let programId: string | null = null;
    let programName: string | null = null;

    if (token === 'demo') {
      const { data: programs } = await supabase.from("programs").select("id, name").limit(1);
      programId = programs?.[0]?.id || null;
      programName = programs?.[0]?.name || null;
      
      const { data: consultants } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "consultor")
        .limit(1);
      
      if (consultants?.[0]?.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", consultants[0].user_id)
          .maybeSingle();
        
        consultantEmail = profile?.email || null;
        consultantName = profile?.full_name || null;
      }
    } else {
      const tokenHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
      const tokenHex = Array.from(new Uint8Array(tokenHash)).map(b => b.toString(16).padStart(2, "0")).join("");

      try {
        const { data: linkData } = await supabase
          .from("public_booking_links")
          .select("id, owner_consultant_id, program_id, active, expires_at")
          .eq("token_hash", tokenHex)
          .eq("active", true)
          .maybeSingle();
        
        if (linkData) {
          if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
            return corsJsonResponse({ valid: false, error: "This booking link has expired" }, req, 403);
          }
          
          if (linkData.owner_consultant_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("email, full_name")
              .eq("id", linkData.owner_consultant_id)
              .maybeSingle();
            
            consultantEmail = profile?.email || null;
            consultantName = profile?.full_name || null;
          }
          
          if (linkData.program_id) {
            const { data: program } = await supabase
              .from("programs")
              .select("id, name")
              .eq("id", linkData.program_id)
              .maybeSingle();
            
            programId = program?.id || null;
            programName = program?.name || null;
          }
        }
      } catch {
        console.log("public_booking_links table not found, using demo mode");
      }
      
      if (!programId) {
        const { data: programs } = await supabase.from("programs").select("id, name").limit(1);
        programId = programs?.[0]?.id || null;
        programName = programs?.[0]?.name || null;
      }
    }

    if (action === "validate") {
      return corsJsonResponse({
        valid: true,
        tokenData: {
          id: token,
          program_id: programId,
          program_name: programName,
          consultant_id: null,
          consultant_name: consultantName,
          expires_at: null,
        },
      }, req);
    }

    if (action === "get_slots") {
      const slots: TimeSlot[] = [];
      const now = new Date();
      
      const credentials = await getGraphCredentials(supabase);
      
      if (credentials && consultantEmail) {
        try {
          const accessToken = await getGraphAccessToken(credentials);
          
          for (let day = 1; day <= 14; day++) {
            const date = addDays(now, day);
            const dayOfWeek = date.getDay();
            
            if (dayOfWeek === 0 || dayOfWeek === 6) continue;
            
            const dateStr = format(date, "yyyy-MM-dd");
            const startTime = `${dateStr}T09:00:00`;
            const endTime = `${dateStr}T18:00:00`;
            
            const schedule = await getFreeBusySchedule(accessToken, consultantEmail, startTime, endTime);
            
            if (schedule?.availabilityView) {
              const daySlots = generateSlotsFromAvailability(dateStr, schedule.availabilityView);
              slots.push(...daySlots);
            }
          }
        } catch (graphError) {
          console.error("Graph API error:", graphError);
          return corsJsonResponse({ 
            slots: [],
            consultantName,
            graphEnabled: true,
            warning: 'Unable to verify calendar availability. Please contact directly.',
          }, req);
        }
      } else {
        // Graph not configured: generate default weekday slots as fallback
        for (let day = 1; day <= 14; day++) {
          const date = addDays(now, day);
          const dayOfWeek = date.getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) continue;

          const dateStr = format(date, "yyyy-MM-dd");
          const defaultTimes = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];
          for (const time of defaultTimes) {
            slots.push({ date: dateStr, time, available: true });
          }
        }
      }

      return corsJsonResponse({ slots, consultantName, graphEnabled: !!credentials }, req);
    }

    return corsJsonResponse({ error: "Invalid action" }, req, 400);
  } catch (error: unknown) {
    console.error("Error:", error instanceof Error ? error.message : 'Unknown error');
    return corsJsonResponse({ 
      error: "Unable to retrieve availability. Please try again or contact us directly." 
    }, req, 500);
  }
});
