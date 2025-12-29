import { useState } from 'react';
import { format, isPast } from 'date-fns';
import { 
  Search, 
  Plus, 
  FileText, 
  Clock, 
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSessions, useCreateSession, useUpdateSession, useDeleteSession, useSessionActionItems, useCreateActionItem, useWorkspaceMembers } from '@/hooks/useSessions';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SessionsTabProps {
  workspaceId: string;
  canWrite: boolean;
}

export function SessionsTab({ workspaceId, canWrite }: SessionsTabProps) {
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const { data: sessions, isLoading } = useSessions(workspaceId);
  const deleteMutation = useDeleteSession(workspaceId);

  const filteredSessions = sessions?.filter(session =>
    session.title.toLowerCase().includes(search.toLowerCase()) ||
    session.agenda?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!sessionToDelete) return;
    try {
      await deleteMutation.mutateAsync(sessionToDelete);
      toast.success('Session deleted');
      setShowDeleteAlert(false);
      setSessionToDelete(null);
    } catch (error) {
      toast.error('Failed to delete session');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sessions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {canWrite && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Session
          </Button>
        )}
      </div>

      {/* Sessions List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : filteredSessions?.length === 0 ? (
        <Card className="bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-heading text-lg font-semibold mb-2">No sessions found</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              {search ? 'Try adjusting your search' : 'Create your first mentoring session'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredSessions?.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              canWrite={canWrite}
              onEdit={() => setSelectedSession(session)}
              onDelete={() => {
                setSessionToDelete(session.id);
                setShowDeleteAlert(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Create Session Dialog */}
      <CreateSessionDialog
        workspaceId={workspaceId}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {/* Edit Session Dialog */}
      {selectedSession && (
        <SessionDetailDialog
          workspaceId={workspaceId}
          session={selectedSession}
          canWrite={canWrite}
          open={!!selectedSession}
          onOpenChange={(open) => !open && setSelectedSession(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this session? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SessionCard({ session, canWrite, onEdit, onDelete }: { 
  session: any; 
  canWrite: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isPastSession = isPast(new Date(session.scheduled_at));
  const hasNotes = !!session.notes;
  const hasDecisions = !!session.decisions;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onEdit}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
              <span className="text-xs text-primary font-medium">
                {format(new Date(session.scheduled_at), 'MMM')}
              </span>
              <span className="text-lg font-bold text-primary leading-none">
                {format(new Date(session.scheduled_at), 'd')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{session.title}</h3>
                {isPastSession && !hasNotes && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                    Needs notes
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {format(new Date(session.scheduled_at), 'h:mm a')}
                </span>
                {session.duration && (
                  <span>{session.duration} min</span>
                )}
              </div>
              {session.agenda && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                  {session.agenda}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                {hasNotes && (
                  <Badge variant="secondary" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    Notes
                  </Badge>
                )}
                {hasDecisions && (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Decisions
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {canWrite && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CreateSessionDialog({ workspaceId, open, onOpenChange }: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState('60');
  const [agenda, setAgenda] = useState('');

  const createMutation = useCreateSession(workspaceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledAt) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration: parseInt(duration),
        agenda: agenda.trim() || null,
        notes: null,
        decisions: null,
      });
      toast.success('Session created');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to create session');
    }
  };

  const resetForm = () => {
    setTitle('');
    setScheduledAt('');
    setDuration('60');
    setAgenda('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Session</DialogTitle>
          <DialogDescription>
            Schedule a new mentoring session
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Weekly check-in"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_at">Date & Time *</Label>
              <Input
                id="scheduled_at"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                  <SelectItem value="90">90 min</SelectItem>
                  <SelectItem value="120">120 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="agenda">Agenda</Label>
            <Textarea
              id="agenda"
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="Topics to discuss..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SessionDetailDialog({ workspaceId, session, canWrite, open, onOpenChange }: {
  workspaceId: string;
  session: any;
  canWrite: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [notes, setNotes] = useState(session.notes || '');
  const [decisions, setDecisions] = useState(session.decisions || '');
  const [showActionDialog, setShowActionDialog] = useState(false);

  const updateMutation = useUpdateSession(workspaceId);
  const { data: actionItems, isLoading: actionsLoading } = useSessionActionItems(session.id);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        id: session.id,
        notes: notes.trim() || null,
        decisions: decisions.trim() || null,
      });
      toast.success('Session updated');
    } catch (error) {
      toast.error('Failed to update session');
    }
  };

  const isPastSession = isPast(new Date(session.scheduled_at));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{session.title}</DialogTitle>
            <DialogDescription>
              {format(new Date(session.scheduled_at), 'EEEE, MMMM d, yyyy')} at {format(new Date(session.scheduled_at), 'h:mm a')}
              {session.duration && ` • ${session.duration} min`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Agenda */}
            {session.agenda && (
              <div>
                <Label className="text-muted-foreground">Agenda</Label>
                <p className="mt-1 text-sm whitespace-pre-wrap">{session.agenda}</p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Session Notes</Label>
              {canWrite ? (
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes from this session..."
                  rows={4}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                  {notes || 'No notes recorded'}
                </p>
              )}
            </div>

            {/* Decisions */}
            <div className="space-y-2">
              <Label htmlFor="decisions">Key Decisions</Label>
              {canWrite ? (
                <Textarea
                  id="decisions"
                  value={decisions}
                  onChange={(e) => setDecisions(e.target.value)}
                  placeholder="Key decisions made during this session..."
                  rows={3}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                  {decisions || 'No decisions recorded'}
                </p>
              )}
            </div>

            {/* Action Items from this session */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Action Items from this Session</Label>
                {canWrite && (
                  <Button variant="outline" size="sm" onClick={() => setShowActionDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Action Item
                  </Button>
                )}
              </div>
              {actionsLoading ? (
                <Skeleton className="h-20" />
              ) : actionItems?.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground bg-muted/50 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No action items from this session</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {actionItems?.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className={`h-2 w-2 rounded-full ${
                        item.status === 'completed' ? 'bg-green-500' :
                        item.status === 'in_progress' ? 'bg-blue-500' : 'bg-muted-foreground'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.title}</p>
                        {item.due_date && (
                          <p className="text-xs text-muted-foreground">
                            Due: {format(new Date(item.due_date), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                      <Badge variant={
                        item.status === 'completed' ? 'default' :
                        item.status === 'in_progress' ? 'secondary' : 'outline'
                      } className="text-xs">
                        {item.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {canWrite && (
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Action Item Dialog */}
      <AddActionItemDialog
        workspaceId={workspaceId}
        sessionId={session.id}
        open={showActionDialog}
        onOpenChange={setShowActionDialog}
      />
    </>
  );
}

function AddActionItemDialog({ workspaceId, sessionId, open, onOpenChange }: {
  workspaceId: string;
  sessionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [ownerId, setOwnerId] = useState('');

  const { data: members } = useWorkspaceMembers(workspaceId);
  const createMutation = useCreateActionItem(workspaceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: dueDate || undefined,
        priority,
        session_id: sessionId,
        owner_user_id: ownerId || undefined,
      });
      toast.success('Action item created');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to create action item');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setPriority('medium');
    setOwnerId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Action Item</DialogTitle>
          <DialogDescription>
            Create an action item from this session
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="action-title">Title *</Label>
            <Input
              id="action-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="action-description">Description</Label>
            <Textarea
              id="action-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details..."
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="action-due-date">Due Date</Label>
              <Input
                id="action-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="action-priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="action-owner">Assign to</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {members?.map(member => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.profile?.full_name || member.profile?.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Action Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
