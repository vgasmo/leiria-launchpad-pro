import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  Linkedin, 
  MessageSquare, 
  Check, 
  X, 
  Clock, 
  Users,
  Briefcase,
  Send,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

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

// Hook to fetch mentors
function useMentors(search: string) {
  return useQuery({
    queryKey: ['mentors', search],
    queryFn: async () => {
      // Get all users with mentor_externo role
      const { data: mentorRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'mentor_externo');

      if (rolesError) throw rolesError;
      
      const mentorIds = mentorRoles?.map(r => r.user_id) || [];
      if (mentorIds.length === 0) return [];

      let query = supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, linkedin_url, bio, expertise')
        .in('id', mentorIds);

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data as MentorProfile[];
    },
  });
}

// Hook to fetch user's connections
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
        .from('profiles')
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
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedMentor, setSelectedMentor] = useState<MentorProfile | null>(null);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);

  const isFounder = roles.includes('founder');
  const isMentor = roles.includes('mentor_externo');

  const { data: mentors, isLoading: loadingMentors } = useMentors(search);
  const { data: connections, isLoading: loadingConnections } = useConnections(
    user?.id, 
    isFounder ? 'founder' : 'mentor'
  );

  // Create connection mutation
  const createConnection = useMutation({
    mutationFn: async ({ mentorId, message }: { mentorId: string; message: string }) => {
      const { data, error } = await supabase
        .from('mentor_connections')
        .insert({
          founder_id: user!.id,
          mentor_id: mentorId,
          message: message.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-connections'] });
      toast.success('Connection request sent!');
      setConnectDialogOpen(false);
      setConnectionMessage('');
      setSelectedMentor(null);
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('You already have a connection request with this mentor');
      } else {
        toast.error(error.message || 'Failed to send connection request');
      }
    },
  });

  // Update connection status mutation
  const updateConnectionStatus = useMutation({
    mutationFn: async ({ connectionId, status }: { connectionId: string; status: string }) => {
      const { error } = await supabase
        .from('mentor_connections')
        .update({ 
          status, 
          responded_at: new Date().toISOString() 
        })
        .eq('id', connectionId);

      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['mentor-connections'] });
      toast.success(`Connection ${status === 'accepted' ? 'accepted' : 'declined'}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update connection');
    },
  });

  const handleConnect = (mentor: MentorProfile) => {
    setSelectedMentor(mentor);
    setConnectDialogOpen(true);
  };

  const handleSendRequest = () => {
    if (!selectedMentor) return;
    createConnection.mutate({
      mentorId: selectedMentor.id,
      message: connectionMessage,
    });
  };

  const getConnectionStatus = (mentorId: string): string | null => {
    const conn = connections?.find(c => c.mentor_id === mentorId || c.mentor?.id === mentorId);
    return conn?.status || null;
  };

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

  return (
    <AppLayout title={isFounder ? "Find Mentors" : "Connection Requests"}>
      {isFounder ? (
        <Tabs defaultValue="browse" className="space-y-6">
          <TabsList>
            <TabsTrigger value="browse" className="gap-2">
              <Users className="h-4 w-4" />
              Browse Mentors
            </TabsTrigger>
            <TabsTrigger value="connections" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              My Connections
              {pendingConnections.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {pendingConnections.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            {/* Search */}
            <div className="flex gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search mentors by name or expertise..."
                  className="pl-9"
                />
              </div>
            </div>

            {/* Mentors Grid */}
            {loadingMentors ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Skeleton className="h-16 w-16 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : mentors?.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No mentors found</h3>
                  <p className="text-muted-foreground">
                    {search ? 'Try adjusting your search terms' : 'No mentors are available at the moment'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mentors?.map(mentor => {
                  const status = getConnectionStatus(mentor.id);
                  
                  return (
                    <Card key={mentor.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={mentor.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                              {getInitials(mentor.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-medium truncate">
                                  {mentor.full_name || 'Unnamed Mentor'}
                                </h3>
                                <p className="text-sm text-muted-foreground truncate">
                                  {mentor.email}
                                </p>
                              </div>
                              {mentor.linkedin_url && (
                                <a
                                  href={mentor.linkedin_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-primary"
                                >
                                  <Linkedin className="h-5 w-5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {mentor.bio && (
                          <p className="text-sm text-muted-foreground mt-4 line-clamp-2">
                            {mentor.bio}
                          </p>
                        )}

                        {mentor.expertise && mentor.expertise.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {mentor.expertise.slice(0, 4).map(exp => (
                              <Badge key={exp} variant="secondary" className="text-xs">
                                {exp}
                              </Badge>
                            ))}
                            {mentor.expertise.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{mentor.expertise.length - 4}
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="mt-4">
                          {status === 'pending' ? (
                            <Button variant="outline" size="sm" disabled className="w-full">
                              <Clock className="h-4 w-4 mr-2" />
                              Request Pending
                            </Button>
                          ) : status === 'accepted' ? (
                            <Button variant="outline" size="sm" disabled className="w-full text-green-600">
                              <Check className="h-4 w-4 mr-2" />
                              Connected
                            </Button>
                          ) : status === 'declined' ? (
                            <Button variant="outline" size="sm" disabled className="w-full text-destructive">
                              <X className="h-4 w-4 mr-2" />
                              Request Declined
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              className="w-full"
                              onClick={() => handleConnect(mentor)}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Request Connection
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="connections" className="space-y-6">
            <ConnectionsList 
              connections={connections || []} 
              isLoading={loadingConnections}
              role="founder"
              getInitials={getInitials}
            />
          </TabsContent>
        </Tabs>
      ) : isMentor ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connection Requests</CardTitle>
              <CardDescription>
                Founders interested in connecting with you
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
                  <p className="text-muted-foreground">No connection requests yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {pendingConnections.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                        Pending Requests ({pendingConnections.length})
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
                                {conn.founder?.full_name || 'Unknown Founder'}
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
                                    status: 'accepted' 
                                  })}
                                  disabled={updateConnectionStatus.isPending}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateConnectionStatus.mutate({ 
                                    connectionId: conn.id, 
                                    status: 'declined' 
                                  })}
                                  disabled={updateConnectionStatus.isPending}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Decline
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
                        Connected Founders ({acceptedConnections.length})
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
                                {conn.founder?.full_name || 'Unknown Founder'}
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
                            <Badge variant="secondary" className="text-green-600">
                              <Check className="h-3 w-3 mr-1" />
                              Connected
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
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
            <p className="text-muted-foreground">
              This page is only available to founders and mentors.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Connect Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect with {selectedMentor?.full_name}</DialogTitle>
            <DialogDescription>
              Send a connection request to this mentor. You can include a message to introduce yourself.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedMentor?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(selectedMentor?.full_name || null)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{selectedMentor?.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedMentor?.email}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message (optional)</Label>
              <Textarea
                id="message"
                value={connectionMessage}
                onChange={(e) => setConnectionMessage(e.target.value)}
                placeholder="Introduce yourself and explain why you'd like to connect..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendRequest}
              disabled={createConnection.isPending}
            >
              {createConnection.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

// Connections list component for founders
function ConnectionsList({ 
  connections, 
  isLoading, 
  role,
  getInitials 
}: { 
  connections: MentorConnection[]; 
  isLoading: boolean;
  role: 'founder' | 'mentor';
  getInitials: (name: string | null) => string;
}) {
  const pending = connections.filter(c => c.status === 'pending');
  const accepted = connections.filter(c => c.status === 'accepted');
  const declined = connections.filter(c => c.status === 'declined');

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No connections yet</h3>
          <p className="text-muted-foreground">
            Browse mentors and send connection requests to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  const otherPerson = role === 'founder' ? 'mentor' : 'founder';

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            Pending ({pending.length})
          </h4>
          <div className="grid gap-3">
            {pending.map(conn => (
              <Card key={conn.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={(conn as any)[otherPerson]?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials((conn as any)[otherPerson]?.full_name || null)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">
                        {(conn as any)[otherPerson]?.full_name || 'Unknown'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(conn as any)[otherPerson]?.email}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-amber-600">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {accepted.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            Connected ({accepted.length})
          </h4>
          <div className="grid gap-3">
            {accepted.map(conn => (
              <Card key={conn.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={(conn as any)[otherPerson]?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials((conn as any)[otherPerson]?.full_name || null)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">
                        {(conn as any)[otherPerson]?.full_name || 'Unknown'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(conn as any)[otherPerson]?.email}
                      </p>
                    </div>
                    {(conn as any)[otherPerson]?.linkedin_url && (
                      <a
                        href={(conn as any)[otherPerson].linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Linkedin className="h-5 w-5" />
                      </a>
                    )}
                    <Badge variant="secondary" className="text-green-600">
                      <Check className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {declined.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-muted-foreground">
            <X className="h-4 w-4" />
            Declined ({declined.length})
          </h4>
          <div className="grid gap-3">
            {declined.map(conn => (
              <Card key={conn.id} className="opacity-60">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={(conn as any)[otherPerson]?.avatar_url || undefined} />
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {getInitials((conn as any)[otherPerson]?.full_name || null)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">
                        {(conn as any)[otherPerson]?.full_name || 'Unknown'}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-muted-foreground">
                      Declined
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}