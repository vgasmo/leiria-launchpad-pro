import { useState, useMemo } from 'react';
import { Plus, Trash2, UserCheck, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useProfiles, 
  useUserRoles, 
  useAddUserRole, 
  useRemoveUserRole,
  useWorkspaceUsers,
  useAddWorkspaceUser,
  useUpdateWorkspaceUser,
  useRemoveWorkspaceUser,
  useAllWorkspaces,
} from '@/hooks/useAdminData';

const ROLES = ['admin', 'consultor', 'mentor_externo', 'founder', 'team_member'] as const;
type Role = typeof ROLES[number];

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  consultor: 'Consultor',
  mentor_externo: 'External Mentor',
  founder: 'Founder',
  team_member: 'Team Member',
};

export function AdminUsersManager() {
  const { data: profiles, isLoading: loadingProfiles } = useProfiles();
  const { data: userRoles, isLoading: loadingRoles } = useUserRoles();
  const { data: workspaceUsers, isLoading: loadingWsUsers } = useWorkspaceUsers();
  const { data: workspaces } = useAllWorkspaces();

  const addUserRole = useAddUserRole();
  const removeUserRole = useRemoveUserRole();
  const addWorkspaceUser = useAddWorkspaceUser();
  const updateWorkspaceUser = useUpdateWorkspaceUser();
  const removeWorkspaceUser = useRemoveWorkspaceUser();

  const [searchTerm, setSearchTerm] = useState('');
  const [addRoleDialog, setAddRoleDialog] = useState<{ userId: string; userName: string } | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>('consultor');
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<{ id: string; role: string } | null>(null);

  const [assignWsDialog, setAssignWsDialog] = useState<{ userId: string; userName: string } | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [wsRole, setWsRole] = useState<Role>('founder');
  const [deleteWsUserTarget, setDeleteWsUserTarget] = useState<string | null>(null);

  const isLoading = loadingProfiles || loadingRoles || loadingWsUsers;

  const filteredProfiles = useMemo(() => {
    if (!profiles) return [];
    if (!searchTerm.trim()) return profiles;
    const term = searchTerm.toLowerCase();
    return profiles.filter(p => 
      p.full_name?.toLowerCase().includes(term) || 
      p.email.toLowerCase().includes(term)
    );
  }, [profiles, searchTerm]);

  const getUserRoles = (userId: string) => userRoles?.filter(r => r.user_id === userId) || [];
  const getUserWorkspaces = (userId: string) => workspaceUsers?.filter(wu => wu.user_id === userId) || [];

  const getWorkspaceName = (wsId: string) => {
    const ws = workspaces?.find(w => w.id === wsId);
    return ws?.startup?.name || 'Unknown';
  };

  const handleAddRole = async () => {
    if (!addRoleDialog) return;
    await addUserRole.mutateAsync({ user_id: addRoleDialog.userId, role: selectedRole });
    setAddRoleDialog(null);
  };

  const handleRemoveRole = async () => {
    if (!deleteRoleTarget) return;
    await removeUserRole.mutateAsync(deleteRoleTarget.id);
    setDeleteRoleTarget(null);
  };

  const handleAssignWorkspace = async () => {
    if (!assignWsDialog || !selectedWorkspace) return;
    await addWorkspaceUser.mutateAsync({ 
      workspace_id: selectedWorkspace, 
      user_id: assignWsDialog.userId, 
      role: wsRole,
    });
    setAssignWsDialog(null);
    setSelectedWorkspace('');
  };

  const handleToggleWsActive = async (id: string, currentActive: boolean) => {
    await updateWorkspaceUser.mutateAsync({ id, active: !currentActive });
  };

  const handleRemoveWsUser = async () => {
    if (!deleteWsUserTarget) return;
    await removeWorkspaceUser.mutateAsync(deleteWsUserTarget);
    setDeleteWsUserTarget(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">User Management</h2>
        <p className="text-sm text-muted-foreground">Manage user roles and workspace assignments</p>
      </div>

      <Input 
        placeholder="Search users by name or email..." 
        value={searchTerm} 
        onChange={e => setSearchTerm(e.target.value)}
        className="max-w-md"
      />

      <div className="space-y-3">
        {filteredProfiles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No users found.
            </CardContent>
          </Card>
        ) : (
          filteredProfiles.map(profile => {
            const roles = getUserRoles(profile.id);
            const wsAssignments = getUserWorkspaces(profile.id);
            const isAdmin = roles.some(r => r.role === 'admin');

            return (
              <Card key={profile.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback>{profile.full_name?.charAt(0) || profile.email.charAt(0)}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{profile.full_name || 'No name'}</h3>
                        {isAdmin && <Badge variant="destructive">Admin</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{profile.email}</p>

                      {/* Global Roles */}
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <UserCheck className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">Global Roles</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-xs"
                            onClick={() => setAddRoleDialog({ userId: profile.id, userName: profile.full_name || profile.email })}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {roles.length === 0 ? (
                            <span className="text-xs text-muted-foreground">No roles</span>
                          ) : (
                            roles.map(r => (
                              <Badge 
                                key={r.id} 
                                variant="secondary" 
                                className="cursor-pointer hover:bg-destructive/20"
                                onClick={() => setDeleteRoleTarget({ id: r.id, role: r.role })}
                              >
                                {ROLE_LABELS[r.role as Role] || r.role}
                                <Trash2 className="h-3 w-3 ml-1" />
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Workspace Assignments */}
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">Workspace Assignments</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-xs"
                            onClick={() => setAssignWsDialog({ userId: profile.id, userName: profile.full_name || profile.email })}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Assign
                          </Button>
                        </div>
                        <div className="space-y-1">
                          {wsAssignments.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Not assigned to any workspace</span>
                          ) : (
                            wsAssignments.map(wu => (
                              <div key={wu.id} className="flex items-center gap-2 text-xs bg-muted/50 rounded p-2">
                                <span className="flex-1">{getWorkspaceName(wu.workspace_id)}</span>
                                <Badge variant="outline" className="text-xs">
                                  {ROLE_LABELS[wu.role as Role] || wu.role}
                                </Badge>
                                <div className="flex items-center gap-1">
                                  <Switch 
                                    checked={wu.active} 
                                    onCheckedChange={() => handleToggleWsActive(wu.id, wu.active)}
                                  />
                                  <span className="text-muted-foreground">{wu.active ? 'Active' : 'Inactive'}</span>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6"
                                  onClick={() => setDeleteWsUserTarget(wu.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Role Dialog */}
      <Dialog open={!!addRoleDialog} onOpenChange={(open) => !open && setAddRoleDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Role to {addRoleDialog?.userName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(role => (
                    <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRoleDialog(null)}>Cancel</Button>
            <Button onClick={handleAddRole}>Add Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Workspace Dialog */}
      <Dialog open={!!assignWsDialog} onOpenChange={(open) => !open && setAssignWsDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign {assignWsDialog?.userName} to Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Workspace</Label>
              <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                <SelectTrigger>
                  <SelectValue placeholder="Select workspace" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces?.map(ws => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.startup?.name || 'Unknown'} ({ws.program?.name || 'No program'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={wsRole} onValueChange={(v) => setWsRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.filter(r => r !== 'admin').map(role => (
                    <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignWsDialog(null)}>Cancel</Button>
            <Button onClick={handleAssignWorkspace} disabled={!selectedWorkspace}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation */}
      <AlertDialog open={!!deleteRoleTarget} onOpenChange={(open) => !open && setDeleteRoleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Role</AlertDialogTitle>
            <AlertDialogDescription>
              Remove the "{deleteRoleTarget?.role}" role from this user?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveRole} className="bg-destructive text-destructive-foreground">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Workspace User Confirmation */}
      <AlertDialog open={!!deleteWsUserTarget} onOpenChange={(open) => !open && setDeleteWsUserTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Remove this user from the workspace?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveWsUser} className="bg-destructive text-destructive-foreground">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
