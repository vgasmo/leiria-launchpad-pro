import { useState } from 'react';
import { sanitizeUrl } from '@/lib/sanitizeUrl';
import { useQuery } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Linkedin, 
  MessageSquare, 
  Check, 
  X, 
  Clock, 
  Users,
  Send,
  Calendar,
  BarChart3,
  CalendarDays,
  Mail,
  UserPlus,
  Search
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { MentorAvailabilitySettings } from '@/components/mentors/MentorAvailabilitySettings';
import { MentorImpactDashboard } from '@/components/mentors/MentorImpactDashboard';
import { MentorBookingPanel } from '@/components/mentors/MentorBookingPanel';
import { FounderMentorRequestPanel } from '@/components/mentors/FounderMentorRequestPanel';
import { PendingMentorRequestsPanel } from '@/components/mentors/PendingMentorRequestsPanel';
import { AdminExternalMentorsManager } from '@/components/admin/AdminExternalMentorsManager';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const CURRENT_NDA_VERSION = 'PT-NDA-2026-01';

interface MentorProfile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  linkedin_url: string | null;
  bio: string | null;
  expertise: string[] | null;
}

interface MentorConnection {
  id: string;
  founder_id: string;
  mentor_id: string;
  status: string;
  message: string | null;
  created_at: string;
  mentor?: MentorProfile | null;
  founder?: MentorProfile | null;
}

interface AssignedMentor {
  user_id: string;
  workspace_id: string;
  profile: MentorProfile | null;
}

// Hook to fetch assigned mentors for a founder's workspaces
function useAssignedMentors(userId: string | undefined) {
  return useQuery({
    queryKey: ['assigned-mentors', userId],
    queryFn: async (): Promise<AssignedMentor[]> => {
      if (!userId) return [];

      // Get founder's workspaces
      const { data: founderWorkspaces, error: wsError } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', userId)
        .eq('role', 'founder')
        .eq('active', true);

      if (wsError) throw wsError;
      if (!founderWorkspaces?.length) return [];

      const workspaceIds = founderWorkspaces.map(w => w.workspace_id);

      // Get mentors assigned to those workspaces
      const { data: mentorAssignments, error: mentorError } = await supabase
        .from('workspace_users')
        .select('user_id, workspace_id')
        .in('workspace_id', workspaceIds)
        .eq('role', 'mentor_externo')
        .eq('active', true);

      if (mentorError) throw mentorError;
      if (!mentorAssignments?.length) return [];

      const mentorIds = [...new Set(mentorAssignments.map(m => m.user_id))];

      // Get mentor profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles_safe')
        .select('id, full_name, email, avatar_url, linkedin_url, bio, expertise')
        .in('id', mentorIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.id, p as MentorProfile]));

      return mentorAssignments.map(m => ({
        user_id: m.user_id,
        workspace_id: m.workspace_id,
        profile: profileMap.get(m.user_id) || null,
      }));
    },
    enabled: !!userId,
  });
}

// Hook to fetch user's connections (for mentors)
function useConnections(userId: string | undefined, role: 'founder' | 'mentor') {
  return useQuery<MentorConnection[]>({
    queryKey: ['mentor-connections', userId, role],
    queryFn: async (): Promise<MentorConnection[]> => {
      if (!userId) return [];

      const column = role === 'founder' ? 'founder_id' : 'mentor_id';
      const { data, error } = await supabase
        .from('mentor_connections')
        .select('*')
        .eq(column, userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      // Fetch related profiles
      const otherColumn = role === 'founder' ? 'mentor_id' : 'founder_id';
      const otherIds = data.map(c => (c as any)[otherColumn]) as string[];
      
      if (otherIds.length === 0) return data as MentorConnection[];

      const { data: profiles } = await supabase
        .from('profiles_safe')
        .select('id, full_name, email, avatar_url, linkedin_url, bio, expertise')
        .in('id', otherIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p as MentorProfile]));

      return data.map(conn => ({
        id: conn.id,
        founder_id: conn.founder_id,
        mentor_id: conn.mentor_id,
        status: conn.status,
        message: conn.message,
        created_at: conn.created_at,
        mentor: role === 'founder' ? profileMap.get(conn.mentor_id) || null : null,
        founder: role === 'mentor' ? profileMap.get(conn.founder_id) || null : null,
      })) as MentorConnection[];
    },
    enabled: !!userId,
  });
}

export default function Mentors() {
  const { user, roles, isLoading: authLoading, isAuthReady, isAdmin, isConsultor } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isFounder = roles.includes('founder');
  const isMentor = roles.includes('mentor_externo');
  const isStaff = isAdmin || isConsultor;

  // Check NDA acceptance for external mentors
  const { data: ndaAcceptance, isLoading: ndaLoading } = useQuery({
    queryKey: ['mentor-nda-check', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('mentor_nda_acceptances')
        .select('id')
        .eq('user_id', user.id)
        .eq('nda_version', CURRENT_NDA_VERSION)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && isMentor && !isStaff,
  });

  const { data: assignedMentors, isLoading: loadingAssigned } = useAssignedMentors(
    isFounder ? user?.id : undefined
  );
  const { data: connections, isLoading: loadingConnections } = useConnections(
    user?.id, 
    isFounder ? 'founder' : 'mentor'
  );

  // Update connection status mutation (for mentors) — must be above early return to respect Rules of Hooks
  const updateConnectionStatus = useMutation({
    mutationFn: async ({ connectionId, status, founderId }: { connectionId: string; status: string; founderId: string }) => {
      const { error } = await supabase
        .from('mentor_connections')
        .update({ 
          status, 
          responded_at: new Date().toISOString() 
        })
        .eq('id', connectionId);

      if (error) throw error;

      // If accepted, add mentor to the founder's workspaces
      if (status === 'accepted' && user) {
        const { data: founderWorkspaces } = await supabase
          .from('workspace_users')
          .select('workspace_id')
          .eq('user_id', founderId)
          .eq('role', 'founder')
          .eq('active', true);

        if (founderWorkspaces && founderWorkspaces.length > 0) {
          const workspaceInserts = founderWorkspaces.map(wu => ({
            workspace_id: wu.workspace_id,
            user_id: user.id,
            role: 'mentor_externo' as const,
            active: true,
          }));

          await supabase
            .from('workspace_users')
            .upsert(workspaceInserts, { 
              onConflict: 'workspace_id,user_id',
              ignoreDuplicates: true 
            });
        }
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['mentor-connections'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success(`${t('mentorsPage.connection')} ${status === 'accepted' ? t('mentorsPage.accepted') : t('mentorsPage.declined')}`);
    },
    onError: (error: any) => {
      toast.error(error.message || t('mentorsPage.failedToUpdate'));
    },
  });

  // Redirect external mentors to NDA page if not accepted (after all hooks)
  if (isMentor && !isStaff && isAuthReady && !ndaLoading && !ndaAcceptance) {
    return <Navigate to="/mentor-nda" replace />;
  }

  const getInitials = (name: string | null) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  const pendingConnections = connections?.filter(c => c.status === 'pending') || [];
  const acceptedConnections = connections?.filter(c => c.status === 'accepted') || [];

  // Get unique mentors for founder view
  const uniqueMentors = assignedMentors
    ? [...new Map(assignedMentors.map(m => [m.user_id, m])).values()]
    : [];

  // Determine page title based on role
  const getPageTitle = () => {
    if (isStaff) return t('mentorsPage.findAndAssign');
    if (isFounder) return t('mentorsPage.myMentors');
    if (isMentor) return t('mentorsPage.connectionRequests');
    return t('mentorsPage.myMentors');
  };

  return (
    <AppLayout title={getPageTitle()}>
      {/* STAFF VIEW: Find & Assign + Pending Requests */}
      {isStaff ? (
        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList>
            <TabsTrigger value="requests" className="gap-2">
              <Clock className="h-4 w-4" />
              {t('mentorsPage.pendingMentorRequests')}
            </TabsTrigger>
            <TabsTrigger value="mentors" className="gap-2">
              <UserPlus className="h-4 w-4" />
              {t('mentorsPage.findAndAssign')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <PendingMentorRequestsPanel />
          </TabsContent>

          <TabsContent value="mentors">
            <AdminExternalMentorsManager />
          </TabsContent>
        </Tabs>
      ) : isFounder ? (
        // FOUNDER VIEW: Request mentor + assigned mentors + booking
        <div className="space-y-6">
          {/* Request a Mentor Section */}
          <FounderMentorRequestPanel />

          {/* Assigned Mentors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('mentorsPage.myMentors')}
              </CardTitle>
              <CardDescription>
                {t('mentorsPage.myMentorsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAssigned ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map(i => (
                    <Card key={i} className="p-4">
                      <div className="flex items-start gap-4">
                        <Skeleton className="h-16 w-16 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : uniqueMentors.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t('mentorsPage.noMentorsAssigned')}</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {t('mentorsPage.noMentorsAssignedDesc')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {uniqueMentors.map(mentor => (
                    <Card key={mentor.user_id} className="p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-16 w-16 border-2 border-primary/10">
                          <AvatarImage src={mentor.profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                            {getInitials(mentor.profile?.full_name || null)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold text-lg">
                                {mentor.profile?.full_name || t('mentorsPage.unnamedMentor')}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {mentor.profile?.email}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              {mentor.profile?.linkedin_url && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  asChild
                                  className="h-8 w-8"
                                >
                                  <a
                                    href={sanitizeUrl(mentor.profile.linkedin_url)!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Linkedin className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>

                          {mentor.profile?.bio && (
                            <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                              {mentor.profile.bio}
                            </p>
                          )}

                          {mentor.profile?.expertise && mentor.profile.expertise.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {mentor.profile.expertise.slice(0, 4).map(exp => (
                                <Badge key={exp} variant="secondary" className="text-xs">
                                  {exp}
                                </Badge>
                              ))}
                              {mentor.profile.expertise.length > 4 && (
                                <Badge variant="outline" className="text-xs">
                                  +{mentor.profile.expertise.length - 4}
                                </Badge>
                              )}
                            </div>
                          )}

                          {mentor.profile?.email && (
                            <div className="flex gap-2 mt-4">
                              <Button size="sm" variant="outline" asChild>
                                <a href={sanitizeUrl(`mailto:${mentor.profile.email}`)!}>
                                  <Mail className="h-4 w-4 mr-2" />
                                  {t('mentorsPage.contact')}
                                </a>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Booking section for founders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                {t('mentorsPage.bookSession')}
              </CardTitle>
              <CardDescription>
                {t('mentorsPage.bookSessionDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MentorBookingPanel mode="founder" />
            </CardContent>
          </Card>
        </div>
      ) : isMentor ? (
        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList>
            <TabsTrigger value="requests" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              {t('mentorsPage.connectionRequests')}
              {pendingConnections.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                  {pendingConnections.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="availability" className="gap-2">
              <Calendar className="h-4 w-4" />
              {t('mentorsPage.availability')}
            </TabsTrigger>
            <TabsTrigger value="bookings" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              {t('mentorsPage.bookings')}
            </TabsTrigger>
            <TabsTrigger value="impact" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('mentorsPage.impact')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>{t('mentorsPage.connectionRequests')}</CardTitle>
                <CardDescription>
                  {t('mentorsPage.foundersInterestedDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingConnections ? (
                  <div className="space-y-4">
                    {[1, 2].map(i => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : pendingConnections.length === 0 && acceptedConnections.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{t('mentorsPage.noRequestsYet')}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {pendingConnections.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                          {t('mentorsPage.pendingRequests')} ({pendingConnections.length})
                        </h4>
                        <div className="space-y-3">
                          {pendingConnections.map(conn => (
                            <div 
                              key={conn.id} 
                              className="flex items-start gap-4 p-4 rounded-lg border bg-card"
                            >
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={conn.founder?.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                  {getInitials(conn.founder?.full_name || null)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium">
                                  {conn.founder?.full_name || t('mentorsPage.unknownFounder')}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {conn.founder?.email}
                                </p>
                                {conn.message && (
                                  <p className="text-sm mt-2 p-2 bg-muted rounded">
                                    "{conn.message}"
                                  </p>
                                )}
                                <div className="flex gap-2 mt-3">
                                  <Button
                                    size="sm"
                                    onClick={() => updateConnectionStatus.mutate({ 
                                      connectionId: conn.id, 
                                      status: 'accepted',
                                      founderId: conn.founder_id 
                                    })}
                                    disabled={updateConnectionStatus.isPending}
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    {t('mentorsPage.accept')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateConnectionStatus.mutate({ 
                                      connectionId: conn.id, 
                                      status: 'declined',
                                      founderId: conn.founder_id 
                                    })}
                                    disabled={updateConnectionStatus.isPending}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    {t('mentorsPage.decline')}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {acceptedConnections.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                          {t('mentorsPage.connectedFounders')} ({acceptedConnections.length})
                        </h4>
                        <div className="space-y-3">
                          {acceptedConnections.map(conn => (
                            <div 
                              key={conn.id} 
                              className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={conn.founder?.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                  {getInitials(conn.founder?.full_name || null)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium">
                                  {conn.founder?.full_name || t('mentorsPage.unknownFounder')}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {conn.founder?.email}
                                </p>
                              </div>
                              {conn.founder?.linkedin_url && (
                                <a
                                  href={conn.founder.linkedin_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-primary"
                                >
                                  <Linkedin className="h-5 w-5" />
                                </a>
                              )}
                              <Badge variant="secondary" className="text-emerald-600 dark:text-emerald-400">
                                <Check className="h-3 w-3 mr-1" />
                                {t('mentorsPage.connected')}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="availability">
            <MentorAvailabilitySettings />
          </TabsContent>

          <TabsContent value="bookings">
            <MentorBookingPanel mode="mentor" />
          </TabsContent>

          <TabsContent value="impact">
            <MentorImpactDashboard />
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('mentorsPage.accessRestricted')}</h3>
            <p className="text-muted-foreground">
              {t('mentorsPage.accessRestrictedDesc')}
            </p>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
