/**
 * Public Get Availability - Returns available time slots for public booking
 * Uses real Graph API calendar data when configured
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { addDays, format } from "https://esm.sh/date-fns@3.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TimeSlot {
  date: string;
  time: string;
  available: boolean;
}

interface BookingLink {
  id: string;
  token_hash: string;
  owner_consultant_id: string | null;
  program_id: string | null;
  active: boolean;
  expires_at: string | null;
}

// Get Graph credentials with env var priority
async function getGraphCredentials(supabase: any): Promise<{
  tenantId: string;
  clientId: string;
  clientSecret: string;
} | null> {
  const envClientSecret = Deno.env.get('MS_GRAPH_CLIENT_SECRET');
  
  // Support both 'graph_api' and 'microsoft_graph' integration types for backward compatibility
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
      availabilityViewInterval: 30, // 30-minute slots
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
  const workStart = 9; // 9 AM
  const workEnd = 18; // 6 PM
  const times = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];
  
  for (const time of times) {
    const [hour, minute] = time.split(':').map(Number);
    
    // Calculate index in availability view (each char = 30 min from midnight)
    // We need to check from work start, so index = (hour - workStart) * 2 + (minute === 30 ? 1 : 0)
    const slotStartIndex = (hour - workStart) * 2 + (minute === 30 ? 1 : 0);
    
    let isAvailable = true;
    // Check 2 consecutive 30-min blocks (1 hour meeting)
    for (let i = 0; i < 2 && slotStartIndex + i < availabilityView.length; i++) {
      const status = availabilityView[slotStartIndex + i];
      if (status !== '0') { // 0 = free
        isAvailable = false;
        break;
      }
    }
    
    slots.push({
      date,
      time,
      available: isAvailable,
    });
  }
  
  return slots;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body safely
    let body: { token?: unknown; action?: unknown };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token, action } = body;

    // Validate token
    if (!token || typeof token !== 'string' || token.length > 500) {
      return new Response(JSON.stringify({ error: "Invalid or missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate action
    if (action !== undefined && action !== 'validate' && action !== 'get_slots') {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Public booking is not enabled" 
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate token against public_booking_links table (if it exists) or accept demo tokens
    let consultantEmail: string | null = null;
    let consultantName: string | null = null;
    let programId: string | null = null;
    let programName: string | null = null;

    // For demo/testing, accept 'demo' token
    if (token === 'demo') {
      // Get first program for demo
      const { data: programs } = await supabase
        .from("programs")
        .select("id, name")
        .limit(1);
      
      programId = programs?.[0]?.id || null;
      programName = programs?.[0]?.name || null;
      
      // Get a consultant email for availability checking
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
      // Check public_booking_links table for real tokens
      // Hash the token for comparison
      const tokenHash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(token)
      );
      const tokenHex = Array.from(new Uint8Array(tokenHash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      // Try to find the booking link (table may not exist yet)
      try {
        const { data: linkData } = await supabase
          .from("public_booking_links")
          .select("id, owner_consultant_id, program_id, active, expires_at")
          .eq("token_hash", tokenHex)
          .eq("active", true)
          .maybeSingle();
        
        if (linkData) {
          // Check expiration
          if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
            return new Response(JSON.stringify({ 
              valid: false, 
              error: "This booking link has expired" 
            }), {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          
          // Get consultant info
          if (linkData.owner_consultant_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("email, full_name")
              .eq("id", linkData.owner_consultant_id)
              .maybeSingle();
            
            consultantEmail = profile?.email || null;
            consultantName = profile?.full_name || null;
          }
          
          // Get program info
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
        // Table doesn't exist yet, fall back to demo mode
        console.log("public_booking_links table not found, using demo mode");
      }
      
      // Fallback: if no link found, accept any token for now (MVP)
      if (!programId) {
        const { data: programs } = await supabase
          .from("programs")
          .select("id, name")
          .limit(1);
        
        programId = programs?.[0]?.id || null;
        programName = programs?.[0]?.name || null;
      }
    }

    if (action === "validate") {
      return new Response(JSON.stringify({
        valid: true,
        tokenData: {
          id: token,
          program_id: programId,
          program_name: programName,
          consultant_id: null,
          consultant_name: consultantName,
          expires_at: null,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_slots") {
      const slots: TimeSlot[] = [];
      const now = new Date();
      
      // Check if Graph API is configured for real availability
      const credentials = await getGraphCredentials(supabase);
      
      if (credentials && consultantEmail) {
        // Use real Graph API availability
        try {
          const accessToken = await getGraphAccessToken(credentials);
          
          for (let day = 1; day <= 14; day++) {
            const date = addDays(now, day);
            const dayOfWeek = date.getDay();
            
            // Skip weekends
            if (dayOfWeek === 0 || dayOfWeek === 6) continue;
            
            const dateStr = format(date, "yyyy-MM-dd");
            const startTime = `${dateStr}T09:00:00`;
            const endTime = `${dateStr}T18:00:00`;
            
            const schedule = await getFreeBusySchedule(
              accessToken,
              consultantEmail,
              startTime,
              endTime
            );
            
            if (schedule?.availabilityView) {
              const daySlots = generateSlotsFromAvailability(dateStr, schedule.availabilityView);
              slots.push(...daySlots);
            }
            // If Graph didn't return schedule for this day, skip it - don't guess availability
          }
        } catch (graphError) {
          console.error("Graph API error:", graphError);
          // On Graph error, return empty slots with a warning - don't guess
          return new Response(JSON.stringify({ 
            slots: [],
            consultantName,
            graphEnabled: true,
            warning: 'Unable to verify calendar availability. Please contact directly.',
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        // No Graph integration configured - return empty slots with warning
        // This is critical for safety: never guess availability when calendar isn't configured
        return new Response(JSON.stringify({ 
          slots: [],
          consultantName,
          graphEnabled: false,
          warning: 'Calendar integration not configured. Contact us to schedule.',
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ 
        slots,
        consultantName,
        graphEnabled: !!credentials,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    // Log full error server-side for debugging
    console.error("Error:", error instanceof Error ? error.message : 'Unknown error');
    // Return safe error message to client - never leak internal details
    return new Response(JSON.stringify({ 
      error: "Unable to retrieve availability. Please try again or contact us directly." 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
