import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MeetingInviteRequest {
  meetingId: string;
  workspaceId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  description?: string;
  location?: string;
  joinUrl?: string;
  recipientEmails: string[];
  organizerName: string;
  startupName: string;
}

// HTML escape function to prevent XSS
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

// Escape special characters for ICS format
function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

// Input validation
function validateInput(payload: MeetingInviteRequest): { valid: boolean; error?: string } {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!payload.meetingId || !uuidRegex.test(payload.meetingId)) {
    return { valid: false, error: "Invalid meeting ID" };
  }
  
  if (!payload.workspaceId || !uuidRegex.test(payload.workspaceId)) {
    return { valid: false, error: "Invalid workspace ID" };
  }
  
  if (!payload.title || typeof payload.title !== 'string' || payload.title.length > 200) {
    return { valid: false, error: "Title is required and must be less than 200 characters" };
  }
  
  if (!payload.startsAt || isNaN(Date.parse(payload.startsAt))) {
    return { valid: false, error: "Invalid start date" };
  }
  
  if (!payload.endsAt || isNaN(Date.parse(payload.endsAt))) {
    return { valid: false, error: "Invalid end date" };
  }
  
  if (payload.description && (typeof payload.description !== 'string' || payload.description.length > 2000)) {
    return { valid: false, error: "Description must be less than 2000 characters" };
  }
  
  if (payload.location && (typeof payload.location !== 'string' || payload.location.length > 200)) {
    return { valid: false, error: "Location must be less than 200 characters" };
  }
  
  if (payload.joinUrl && (typeof payload.joinUrl !== 'string' || payload.joinUrl.length > 500)) {
    return { valid: false, error: "Join URL must be less than 500 characters" };
  }
  
  if (!payload.organizerName || typeof payload.organizerName !== 'string' || payload.organizerName.length > 100) {
    return { valid: false, error: "Organizer name is required and must be less than 100 characters" };
  }
  
  if (!payload.startupName || typeof payload.startupName !== 'string' || payload.startupName.length > 100) {
    return { valid: false, error: "Startup name is required and must be less than 100 characters" };
  }
  
  if (!Array.isArray(payload.recipientEmails) || payload.recipientEmails.length > 50) {
    return { valid: false, error: "Recipient emails must be an array with max 50 entries" };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const email of payload.recipientEmails) {
    if (typeof email !== 'string' || !emailRegex.test(email) || email.length > 255) {
      return { valid: false, error: `Invalid email address: ${email}` };
    }
  }
  
  return { valid: true };
}

function generateICS(meeting: {
  title: string;
  startsAt: string;
  endsAt: string;
  description?: string;
  location?: string;
  joinUrl?: string;
  startupName: string;
  organizerName: string;
}): string {
  const startDate = new Date(meeting.startsAt);
  const endDate = new Date(meeting.endsAt);
  
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const uid = `meeting-${Date.now()}@lovable.app`;
  const now = formatDate(new Date());
  
  // Escape all user-controlled content for ICS format
  const safeTitle = escapeIcs(meeting.title);
  const safeStartupName = escapeIcs(meeting.startupName);
  const safeOrganizerName = escapeIcs(meeting.organizerName);
  const safeDescription = escapeIcs(meeting.description || 'Meeting scheduled');
  const safeLocation = meeting.location ? escapeIcs(meeting.location) : '';
  const safeJoinUrl = meeting.joinUrl || '';
  
  let descriptionText = safeDescription;
  if (safeJoinUrl) {
    descriptionText += `\\n\\nJoin URL: ${safeJoinUrl}`;
  }
  descriptionText += `\\n\\nOrganized by: ${safeOrganizerName}`;
  
  let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Startup Mentor Platform//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${safeTitle} - ${safeStartupName}
DESCRIPTION:${descriptionText}
ORGANIZER;CN=${safeOrganizerName}:mailto:noreply@resend.dev
STATUS:CONFIRMED
SEQUENCE:0`;

  if (safeLocation) {
    icsContent += `\nLOCATION:${safeLocation}`;
  }
  
  if (safeJoinUrl) {
    icsContent += `\nURL:${safeJoinUrl}`;
  }

  icsContent += `
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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Extract and validate JWT from Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized: No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const token = authHeader.replace("Bearer ", "");
    
    // Create client with user's token to verify authentication
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    });
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.error("Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Authenticated user: ${user.id}`);

    const payload: MeetingInviteRequest = await req.json();
    
    // Validate input
    const validation = validateInput(payload);
    if (!validation.valid) {
      console.error("Validation failed:", validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Verify user has access to the workspace using service role client
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: hasAccess, error: accessError } = await supabaseService.rpc('has_workspace_access', {
      _user_id: user.id,
      _workspace_id: payload.workspaceId
    });
    
    if (accessError) {
      console.error("Error checking workspace access:", accessError.message);
      return new Response(
        JSON.stringify({ error: "Failed to verify workspace access" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!hasAccess) {
      console.error(`User ${user.id} does not have access to workspace ${payload.workspaceId}`);
      return new Response(
        JSON.stringify({ error: "Forbidden: No access to this workspace" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Verify meeting exists and belongs to the workspace
    const { data: meeting, error: meetingError } = await supabaseService
      .from('meetings')
      .select('id, workspace_id')
      .eq('id', payload.meetingId)
      .eq('workspace_id', payload.workspaceId)
      .single();
    
    if (meetingError || !meeting) {
      console.error("Meeting not found or doesn't belong to workspace:", meetingError?.message);
      return new Response(
        JSON.stringify({ error: "Meeting not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Sending meeting invite:", {
      userId: user.id,
      meetingId: payload.meetingId,
      workspaceId: payload.workspaceId,
      title: payload.title,
      recipients: payload.recipientEmails.length,
      startsAt: payload.startsAt,
    });

    if (!payload.recipientEmails || payload.recipientEmails.length === 0) {
      console.log("No recipients to send to");
      return new Response(
        JSON.stringify({ message: "No recipients" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate ICS file with sanitized content
    const icsContent = generateICS({
      title: payload.title,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      description: payload.description,
      location: payload.location,
      joinUrl: payload.joinUrl,
      startupName: payload.startupName,
      organizerName: payload.organizerName,
    });

    const scheduledDate = new Date(payload.startsAt);
    const endDate = new Date(payload.endsAt);
    const formattedDate = scheduledDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedStartTime = scheduledDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const formattedEndTime = endDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Escape HTML in all user-controlled content
    const safeTitle = escapeHtml(payload.title);
    const safeStartupName = escapeHtml(payload.startupName);
    const safeOrganizerName = escapeHtml(payload.organizerName);
    const safeDescription = payload.description ? escapeHtml(payload.description) : '';
    const safeLocation = payload.location ? escapeHtml(payload.location) : '';
    const safeJoinUrl = payload.joinUrl || '';

    // Send email to each recipient
    const emailPromises = payload.recipientEmails.map(async (email) => {
      try {
        const result = await resend.emails.send({
          from: "Meetings <onboarding@resend.dev>",
          to: [email],
          subject: `Meeting Scheduled: ${safeTitle} - ${safeStartupName}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 8px;">📅 Meeting Scheduled</h1>
              <p style="color: #666; margin-bottom: 24px;">You've been invited to a meeting.</p>
              
              <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h2 style="color: #1a1a1a; font-size: 20px; margin: 0 0 16px 0;">${safeTitle}</h2>
                <p style="color: #666; margin: 0 0 8px 0;"><strong>Startup:</strong> ${safeStartupName}</p>
                <p style="color: #666; margin: 0 0 8px 0;"><strong>Date:</strong> ${escapeHtml(formattedDate)}</p>
                <p style="color: #666; margin: 0 0 8px 0;"><strong>Time:</strong> ${escapeHtml(formattedStartTime)} - ${escapeHtml(formattedEndTime)}</p>
                ${safeLocation ? `<p style="color: #666; margin: 0 0 8px 0;"><strong>Location:</strong> ${safeLocation}</p>` : ''}
                ${safeJoinUrl ? `<p style="color: #666; margin: 0 0 8px 0;"><strong>Join:</strong> <a href="${safeJoinUrl}" style="color: #0066cc;">${safeJoinUrl}</a></p>` : ''}
                ${safeDescription ? `<p style="color: #666; margin: 16px 0 0 0;"><strong>Details:</strong><br/>${safeDescription.replace(/\n/g, '<br/>')}</p>` : ''}
              </div>
              
              <p style="color: #666; font-size: 14px;">
                A calendar invite (.ics file) is attached. Add it to your calendar to receive reminders.
              </p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
              <p style="color: #999; font-size: 12px;">
                Organized by ${safeOrganizerName}
              </p>
            </div>
          `,
          attachments: [
            {
              filename: "meeting-invite.ics",
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

    console.log(`Sent ${successCount}/${payload.recipientEmails.length} emails by user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        message: `Sent ${successCount} invites`,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Error in send-meeting-invite:", err);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
