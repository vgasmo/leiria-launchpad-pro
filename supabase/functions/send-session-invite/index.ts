import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SessionInviteRequest {
  sessionId: string;
  workspaceId: string;
  title: string;
  scheduledAt: string;
  duration: number;
  agenda?: string;
  recipientEmails: string[];
  organizerName: string;
  startupName: string;
}

function generateICS(session: {
  title: string;
  scheduledAt: string;
  duration: number;
  agenda?: string;
  startupName: string;
  organizerName: string;
}): string {
  const startDate = new Date(session.scheduledAt);
  const endDate = new Date(startDate.getTime() + (session.duration || 60) * 60000);
  
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const uid = `session-${Date.now()}@lovable.app`;
  const now = formatDate(new Date());
  
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Startup Mentor Platform//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${session.title} - ${session.startupName}
DESCRIPTION:${session.agenda || 'Mentoring session'}\\n\\nOrganized by: ${session.organizerName}
ORGANIZER;CN=${session.organizerName}:mailto:noreply@resend.dev
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;

  return icsContent;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: SessionInviteRequest = await req.json();
    
    console.log("Sending session invite:", {
      title: payload.title,
      recipients: payload.recipientEmails.length,
      scheduledAt: payload.scheduledAt,
    });

    if (!payload.recipientEmails || payload.recipientEmails.length === 0) {
      console.log("No recipients to send to");
      return new Response(
        JSON.stringify({ message: "No recipients" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate ICS file
    const icsContent = generateICS({
      title: payload.title,
      scheduledAt: payload.scheduledAt,
      duration: payload.duration,
      agenda: payload.agenda,
      startupName: payload.startupName,
      organizerName: payload.organizerName,
    });

    const scheduledDate = new Date(payload.scheduledAt);
    const formattedDate = scheduledDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = scheduledDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Send email to each recipient
    const emailPromises = payload.recipientEmails.map(async (email) => {
      try {
        const result = await resend.emails.send({
          from: "Sessions <onboarding@resend.dev>",
          to: [email],
          subject: `Session Scheduled: ${payload.title} - ${payload.startupName}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 8px;">📅 Session Scheduled</h1>
              <p style="color: #666; margin-bottom: 24px;">You've been invited to a mentoring session.</p>
              
              <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h2 style="color: #1a1a1a; font-size: 20px; margin: 0 0 16px 0;">${payload.title}</h2>
                <p style="color: #666; margin: 0 0 8px 0;"><strong>Startup:</strong> ${payload.startupName}</p>
                <p style="color: #666; margin: 0 0 8px 0;"><strong>Date:</strong> ${formattedDate}</p>
                <p style="color: #666; margin: 0 0 8px 0;"><strong>Time:</strong> ${formattedTime}</p>
                <p style="color: #666; margin: 0 0 8px 0;"><strong>Duration:</strong> ${payload.duration || 60} minutes</p>
                ${payload.agenda ? `<p style="color: #666; margin: 16px 0 0 0;"><strong>Agenda:</strong><br/>${payload.agenda}</p>` : ''}
              </div>
              
              <p style="color: #666; font-size: 14px;">
                A calendar invite (.ics file) is attached. Add it to your calendar to receive reminders.
              </p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
              <p style="color: #999; font-size: 12px;">
                Organized by ${payload.organizerName}
              </p>
            </div>
          `,
          attachments: [
            {
              filename: "session-invite.ics",
              content: btoa(icsContent),
            },
          ],
        });
        console.log(`Email sent to ${email}:`, result);
        return { email, success: true, result };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Failed to send email to ${email}:`, err);
        return { email, success: false, error: errorMessage };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`Sent ${successCount}/${payload.recipientEmails.length} emails`);

    return new Response(
      JSON.stringify({ 
        message: `Sent ${successCount} invites`,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Error in send-session-invite:", err);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
