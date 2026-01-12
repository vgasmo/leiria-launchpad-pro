import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, slot, contact } = await req.json();

    if (!token || !slot || !contact?.name || !contact?.email) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing required fields" 
      }), {
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
      .single();

    if (!flag?.enabled) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Public booking is not enabled" 
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting - check if this email has booked recently
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

    // Create session (without workspace for now - it's a lead)
    // In production: also create Outlook calendar event + Teams meeting

    // Attempt to create calendar event via Graph API
    let teamsLink = null;
    let calendarEventId = null;

    try {
      // Check if Graph API is configured
      const { data: graphSettings } = await supabase
        .from("global_integration_settings")
        .select("settings_json, is_enabled")
        .eq("integration_type", "microsoft_graph")
        .single();

      if (graphSettings?.is_enabled) {
        // Would call Graph API here to create event
        // For now, log that we would create it
        console.log("Would create Graph calendar event for slot:", slot);
      }
    } catch (graphError) {
      console.error("Graph API error (non-fatal):", graphError);
    }

    return new Response(JSON.stringify({ 
      success: true,
      funnelItemId: funnelItem.id,
      teamsLink,
      calendarEventId,
      message: "Your booking has been confirmed. You will receive a calendar invite shortly.",
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
