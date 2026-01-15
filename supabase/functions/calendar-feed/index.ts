/**
 * Calendar Feed Edge Function
 * Returns an ICS feed for sessions (authenticated or token-based)
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';
import { createLogger, generateRequestId, ErrorCode } from '../_shared/security.ts';

const FUNCTION_NAME = 'calendar-feed';

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

interface Session {
  id: string;
  title: string;
  scheduled_at: string;
  duration: number | null;
  location: string | null;
  notes: string | null;
  join_url: string | null;
  teams_meeting_url: string | null;
  workspaces?: {
    startups?: {
      name: string;
    };
  };
}

Deno.serve(async (req: Request) => {
  const requestId = generateRequestId();
  const log = createLogger(FUNCTION_NAME, requestId);
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const workspaceId = url.searchParams.get('workspace_id');
    
    log.info('Calendar feed request', { hasToken: !!token, workspaceId: !!workspaceId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authentication: Either JWT from header OR a secure calendar token
    let authenticatedUserId: string | null = null;
    
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const jwtToken = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(jwtToken);
      if (!error && user) {
        authenticatedUserId = user.id;
      }
    }
    
    // If no JWT auth, check for calendar feed token
    if (!authenticatedUserId && token) {
      // Validate token (stored in profiles.calendar_feed_token)
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('calendar_feed_token', token)
        .maybeSingle();
      
      if (profile && !error) {
        authenticatedUserId = profile.id;
        log.info('Token validated for user', { userId: profile.id });
      } else {
        log.warn('Invalid calendar token');
        return new Response('Invalid or expired token', {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        });
      }
    }
    
    if (!authenticatedUserId && !workspaceId) {
      return new Response('Unauthorized - provide token parameter or Authorization header', {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    // Build query based on scope
    let sessions: Session[] = [];
    
    if (workspaceId) {
      // Fetch sessions for a specific workspace
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id, title, scheduled_at, duration, location, notes, join_url, teams_meeting_url,
          workspaces!inner(startups(name))
        `)
        .eq('workspace_id', workspaceId)
        .gte('scheduled_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .lte('scheduled_at', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()) // Next 90 days
        .order('scheduled_at', { ascending: true })
        .limit(200);
      
      if (error) {
        log.error('Error fetching workspace sessions', error);
        throw error;
      }
      sessions = (data || []) as unknown as Session[];
    } else if (authenticatedUserId) {
      // Fetch sessions for all workspaces the user has access to
      const { data: userWorkspaces } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', authenticatedUserId)
        .eq('active', true);
      
      if (userWorkspaces && userWorkspaces.length > 0) {
        const workspaceIds = userWorkspaces.map(w => w.workspace_id);
        
        const { data, error } = await supabase
          .from('sessions')
          .select(`
            id, title, scheduled_at, duration, location, notes, join_url, teams_meeting_url,
            workspaces!inner(startups(name))
          `)
          .in('workspace_id', workspaceIds)
          .gte('scheduled_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .lte('scheduled_at', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(500);
        
        if (error) {
          log.error('Error fetching user sessions', error);
          throw error;
        }
        sessions = (data || []) as unknown as Session[];
      }
    }

    log.info('Found sessions', { count: sessions.length });

    // Generate ICS content
    const appUrl = Deno.env.get('APP_URL') || 'https://startupleiria.app';
    
    const icsEvents = sessions.map(session => {
      const startDate = new Date(session.scheduled_at);
      const endDate = new Date(startDate.getTime() + (session.duration || 60) * 60 * 1000);
      const startupName = session.workspaces?.startups?.name || 'Session';
      
      const description = [
        session.notes,
        session.join_url ? `Join: ${session.join_url}` : null,
        session.teams_meeting_url ? `Teams: ${session.teams_meeting_url}` : null,
      ].filter(Boolean).join('\\n');

      return `BEGIN:VEVENT
UID:session-${session.id}@startupleiria.app
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${escapeICSText(`${session.title} - ${startupName}`)}
${description ? `DESCRIPTION:${escapeICSText(description)}` : ''}
${session.location ? `LOCATION:${escapeICSText(session.location)}` : ''}
${session.teams_meeting_url || session.join_url ? `URL:${session.teams_meeting_url || session.join_url}` : ''}
END:VEVENT`;
    }).join('\n');

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Startup Leiria//Session Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Startup Leiria Sessions
X-WR-TIMEZONE:Europe/Lisbon
X-PUBLISHED-TTL:PT15M
REFRESH-INTERVAL;VALUE=DURATION:PT15M
${icsEvents}
END:VCALENDAR`;

    log.info('Generated ICS feed successfully');

    return new Response(icsContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="sessions.ics"',
        'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
      },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Calendar feed error', error);
    return new Response(`Error generating calendar: ${errorMessage}`, {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    });
  }
});
