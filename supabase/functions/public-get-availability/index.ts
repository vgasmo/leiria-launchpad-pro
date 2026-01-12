import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { addDays, format, setHours, setMinutes, isBefore, isAfter, startOfDay } from "https://esm.sh/date-fns@3.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, action } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Token required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate token - tokens are stored in feature_flags or a dedicated booking_tokens table
    // For now, we use a simple hash-based validation against program settings
    const tokenHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token)
    );
    const tokenHex = Array.from(new Uint8Array(tokenHash))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    // Check if this token matches any program's booking token
    const { data: programs } = await supabase
      .from("programs")
      .select("id, name")
      .limit(1);

    // For MVP: accept any non-empty token if public_first_contact_booking is enabled
    const { data: flag } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", "public_first_contact_booking")
      .single();

    if (!flag?.enabled) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Public booking is not enabled" 
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "validate") {
      // Return token validation result
      return new Response(JSON.stringify({
        valid: true,
        tokenData: {
          id: token,
          program_id: programs?.[0]?.id || null,
          program_name: programs?.[0]?.name || null,
          consultant_id: null,
          consultant_name: null,
          expires_at: null,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_slots") {
      // Generate available slots for next 2 weeks
      // In production, this would check consultant availability via Graph API
      const slots: { date: string; time: string; available: boolean }[] = [];
      const now = new Date();
      
      for (let day = 1; day <= 14; day++) {
        const date = addDays(now, day);
        const dayOfWeek = date.getDay();
        
        // Skip weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        
        const dateStr = format(date, "yyyy-MM-dd");
        
        // Add slots from 9am to 5pm
        const times = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];
        
        for (const time of times) {
          slots.push({
            date: dateStr,
            time,
            available: true, // In production: check against calendar
          });
        }
      }

      return new Response(JSON.stringify({ slots }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
