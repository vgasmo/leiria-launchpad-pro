import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AcceptInviteRequest {
  token: string;
}

// Hash the token for lookup
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Validate auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized: Please log in first" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const authToken = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${authToken}` } }
    });
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(authToken);
    if (authError || !user) {
      console.error("Auth failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const payload: AcceptInviteRequest = await req.json();
    
    if (!payload.token || typeof payload.token !== 'string' || payload.token.length !== 64) {
      return new Response(
        JSON.stringify({ error: "Invalid invitation token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    
    // Hash the token to look up the invitation
    const tokenHash = await hashToken(payload.token);
    
    // Find the invitation
    const { data: invitation, error: inviteError } = await supabaseService
      .from('workspace_invitations')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    
    if (inviteError) {
      console.error("Error looking up invitation:", inviteError);
      return new Response(
        JSON.stringify({ error: "Failed to verify invitation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!invitation) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired invitation token" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Check if already accepted
    if (invitation.accepted_at) {
      return new Response(
        JSON.stringify({ 
          error: "This invitation has already been accepted",
          workspaceId: invitation.workspace_id
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This invitation has expired. Please request a new one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Verify email matches (case-insensitive)
    if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
      console.warn(`Email mismatch: invitation for ${invitation.email}, user is ${user.email}`);
      return new Response(
        JSON.stringify({ 
          error: "This invitation was sent to a different email address. Please log in with the correct account.",
          expectedEmail: invitation.email
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Check if user already has access to this workspace
    const { data: existingAccess } = await supabaseService
      .from('workspace_users')
      .select('id')
      .eq('workspace_id', invitation.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (existingAccess) {
      // Update invitation as accepted
      await supabaseService
        .from('workspace_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "You already have access to this workspace",
          workspaceId: invitation.workspace_id,
          alreadyMember: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Create workspace_users record
    const { error: insertError } = await supabaseService
      .from('workspace_users')
      .insert({
        workspace_id: invitation.workspace_id,
        user_id: user.id,
        role: invitation.role || 'founder',
      });
    
    if (insertError) {
      console.error("Failed to add user to workspace:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to add you to the workspace" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Add founder role to user_roles if not present
    const { data: existingRole } = await supabaseService
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'founder')
      .maybeSingle();
    
    if (!existingRole) {
      await supabaseService
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'founder',
        });
    }
    
    // Mark invitation as accepted
    await supabaseService
      .from('workspace_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);
    
    // Log activity
    await supabaseService
      .from('activity_log')
      .insert({
        user_id: user.id,
        workspace_id: invitation.workspace_id,
        entity_type: 'workspace_invitation',
        entity_id: invitation.id,
        action: 'accepted',
        metadata: { role: invitation.role }
      });
    
    console.log(`User ${user.id} accepted invitation and joined workspace ${invitation.workspace_id}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Welcome! You've been added to the workspace.",
        workspaceId: invitation.workspace_id,
        startupId: invitation.startup_id,
        showOnboarding: true
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (err) {
    console.error("Error in accept-workspace-invite:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});