/**
 * Public Book First Contact - Creates funnel item and calendar event
 * Supports real Graph API calendar integration with Teams meeting
 * 
 * HARDENED: Input validation, rate limiting, safe error messages
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation constants
const MAX_NAME_LENGTH = 200;
const MAX_EMAIL_LENGTH = 254;
const MAX_PHONE_LENGTH = 50;
const MAX_ORG_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 2000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;

interface BookingRequest {
  token: string;
  slot: {
    date: string;
    time: string;
  };
  contact: {
    name: string;
    email: string;
    phone?: string;
    organization?: string;
    message?: string;
  };
}

// Validate and sanitize booking request
function validateBookingRequest(body: unknown): { valid: true; data: BookingRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const req = body as Record<string, unknown>;

  // Token validation
  if (!req.token || typeof req.token !== 'string' || req.token.length > 500) {
    return { valid: false, error: 'Invalid token' };
  }

  // Slot validation
  if (!req.slot || typeof req.slot !== 'object') {
    return { valid: false, error: 'Invalid slot' };
  }
  const slot = req.slot as Record<string, unknown>;
  
  if (!slot.date || typeof slot.date !== 'string' || !DATE_REGEX.test(slot.date)) {
    return { valid: false, error: 'Invalid date format (expected YYYY-MM-DD)' };
  }
  if (!slot.time || typeof slot.time !== 'string' || !TIME_REGEX.test(slot.time)) {
    return { valid: false, error: 'Invalid time format (expected HH:MM)' };
  }

  // Contact validation
  if (!req.contact || typeof req.contact !== 'object') {
    return { valid: false, error: 'Invalid contact information' };
  }
  const contact = req.contact as Record<string, unknown>;

  if (!contact.name || typeof contact.name !== 'string' || contact.name.trim().length === 0) {
    return { valid: false, error: 'Name is required' };
  }
  if (contact.name.length > MAX_NAME_LENGTH) {
    return { valid: false, error: `Name must be ${MAX_NAME_LENGTH} characters or less` };
  }

  if (!contact.email || typeof contact.email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  const email = contact.email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email) || email.length > MAX_EMAIL_LENGTH) {
    return { valid: false, error: 'Invalid email address' };
  }

  // Optional fields validation
  let phone: string | undefined;
  if (contact.phone !== undefined && contact.phone !== null) {
    if (typeof contact.phone !== 'string' || contact.phone.length > MAX_PHONE_LENGTH) {
      return { valid: false, error: 'Invalid phone number' };
    }
    phone = contact.phone.trim() || undefined;
  }

  let organization: string | undefined;
  if (contact.organization !== undefined && contact.organization !== null) {
    if (typeof contact.organization !== 'string' || contact.organization.length > MAX_ORG_LENGTH) {
      return { valid: false, error: 'Invalid organization name' };
    }
    organization = contact.organization.trim() || undefined;
  }

  let message: string | undefined;
  if (contact.message !== undefined && contact.message !== null) {
    if (typeof contact.message !== 'string' || contact.message.length > MAX_MESSAGE_LENGTH) {
      return { valid: false, error: `Message must be ${MAX_MESSAGE_LENGTH} characters or less` };
    }
    message = contact.message.trim() || undefined;
  }

  return {
    valid: true,
    data: {
      token: req.token as string,
      slot: {
        date: slot.date as string,
        time: slot.time as string,
      },
      contact: {
        name: (contact.name as string).trim(),
        email,
        phone,
        organization,
        message,
      },
    },
  };
}

// Get Graph credentials with env var priority - support both integration types
async function getGraphCredentials(supabase: any): Promise<{
  tenantId: string;
  clientId: string;
  clientSecret: string;
} | null> {
  const envClientSecret = Deno.env.get('MS_GRAPH_CLIENT_SECRET');
  
  // Support both 'graph_api' and 'microsoft_graph' for backward compatibility
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

// Create calendar event with Teams meeting
async function createCalendarEvent(
  accessToken: string,
  consultantEmail: string,
  slot: { date: string; time: string },
  contact: { name: string; email: string; organization?: string; message?: string }
): Promise<{ eventId: string; teamsLink: string | null }> {
  // Parse time and create ISO datetime
  const startDateTime = `${slot.date}T${slot.time}:00`;
  const [hours, minutes] = slot.time.split(':').map(Number);
  const endHours = hours + 1; // 1-hour meeting
  const endTime = `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  const endDateTime = `${slot.date}T${endTime}:00`;
  
  const eventPayload = {
    subject: `First Contact Meeting - ${contact.name}${contact.organization ? ` (${contact.organization})` : ''}`,
    body: {
      contentType: "HTML",
      content: `
        <p><strong>First Contact Meeting</strong></p>
        <p><strong>Contact:</strong> ${contact.name}</p>
        <p><strong>Email:</strong> ${contact.email}</p>
        ${contact.organization ? `<p><strong>Organization:</strong> ${contact.organization}</p>` : ''}
        ${contact.message ? `<p><strong>Notes:</strong> ${contact.message}</p>` : ''}
        <p><em>Booked via FoundersBook public booking</em></p>
      `,
    },
    start: {
      dateTime: startDateTime,
      timeZone: "Europe/Lisbon",
    },
    end: {
      dateTime: endDateTime,
      timeZone: "Europe/Lisbon",
    },
    attendees: [
      {
        emailAddress: {
          address: contact.email,
          name: contact.name,
        },
        type: "required",
      },
    ],
    isOnlineMeeting: true,
    onlineMeetingProvider: "teamsForBusiness",
  };

  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(consultantEmail)}/events`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to create calendar event:", errorText);
    throw new Error(`Failed to create calendar event: ${response.status}`);
  }

  const event = await response.json();
  
  return {
    eventId: event.id,
    teamsLink: event.onlineMeeting?.joinUrl || null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse and validate request body
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Invalid JSON body" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validation = validateBookingRequest(rawBody);
    if (!validation.valid) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: validation.error 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token, slot, contact } = validation.data;

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
        success: false, 
        error: "Public booking is not enabled" 
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting - check if this email has booked recently (max 2 per 24h)
    const { data: recentBookings } = await supabase
      .from("funnel_items")
      .select("id, created_at")
      .eq("contact_email", contact.email)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (recentBookings && recentBookings.length >= 2) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Too many booking attempts. Please try again later." 
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get consultant info for calendar event
    let consultantEmail: string | null = null;
    let consultantId: string | null = null;
    
    // Try to get assigned consultant from token link
    if (token !== 'demo') {
      try {
        const tokenHash = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(token)
        );
        const tokenHex = Array.from(new Uint8Array(tokenHash))
          .map(b => b.toString(16).padStart(2, "0"))
          .join("");

        const { data: linkData } = await supabase
          .from("public_booking_links")
          .select("owner_consultant_id")
          .eq("token_hash", tokenHex)
          .eq("active", true)
          .maybeSingle();
        
        if (linkData?.owner_consultant_id) {
          consultantId = linkData.owner_consultant_id;
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", consultantId)
            .maybeSingle();
          
          consultantEmail = profile?.email || null;
        }
      } catch {
        // Table might not exist
      }
    }
    
    // Fallback: get any consultant
    if (!consultantEmail) {
      const { data: consultants } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "consultor")
        .limit(1);
      
      if (consultants?.[0]?.user_id) {
        consultantId = consultants[0].user_id;
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", consultantId)
          .maybeSingle();
        
        consultantEmail = profile?.email || null;
      }
    }

    // Get the first program for the funnel item
    const { data: programs } = await supabase
      .from("programs")
      .select("id")
      .limit(1);
    const programId = programs?.[0]?.id || null;

    // Create funnel item
    const { data: funnelItem, error: funnelError } = await supabase
      .from("funnel_items")
      .insert({
        stage: "first_contact_booked",
        type: "lead",
        contact_name: contact.name,
        contact_email: contact.email,
        contact_phone: contact.phone || null,
        organization_name: contact.organization || null,
        notes: contact.message || null,
        source: "public_booking",
        program_id: programId,
        owner_consultant_id: consultantId,
        first_contact_at: `${slot.date}T${slot.time}:00`,
      })
      .select()
      .single();

    if (funnelError) throw funnelError;

    // Log event
    await supabase.from("funnel_events").insert({
      funnel_item_id: funnelItem.id,
      event_type: "created",
      to_stage: "first_contact_booked",
      metadata: { 
        source: "public_booking",
        slot: slot,
      },
    });

    // Create calendar event via Graph API if configured
    let teamsLink: string | null = null;
    let calendarEventId: string | null = null;

    const credentials = await getGraphCredentials(supabase);
    
    if (credentials && consultantEmail) {
      try {
        const accessToken = await getGraphAccessToken(credentials);
        const eventResult = await createCalendarEvent(
          accessToken,
          consultantEmail,
          slot,
          contact
        );
        
        calendarEventId = eventResult.eventId;
        teamsLink = eventResult.teamsLink;
        
        console.log("Created calendar event:", calendarEventId, "Teams link:", teamsLink);
        
        // Update funnel item with calendar info (store in notes for now)
        if (teamsLink || calendarEventId) {
          await supabase
            .from("funnel_items")
            .update({
              notes: `${contact.message || ''}\n\n---\nTeams Link: ${teamsLink || 'N/A'}\nCalendar Event ID: ${calendarEventId || 'N/A'}`.trim(),
            })
            .eq("id", funnelItem.id);
        }
      } catch (graphError) {
        console.error("Graph API error (non-fatal):", graphError);
        // Don't fail the booking if calendar creation fails
      }
    } else {
      console.log("Graph API not configured, skipping calendar event creation");
    }

    return new Response(JSON.stringify({ 
      success: true,
      funnelItemId: funnelItem.id,
      teamsLink,
      calendarEventId,
      message: teamsLink 
        ? "Your booking has been confirmed. You'll receive a calendar invite with Teams link shortly."
        : "Your booking has been confirmed. The consultant will send you meeting details.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error:", message);
    return new Response(JSON.stringify({ 
      success: false, 
      error: message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
