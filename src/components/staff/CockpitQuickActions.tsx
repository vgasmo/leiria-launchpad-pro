/**
 * Cockpit Quick Actions - One-click actions for consultors
 * P0.4: Quick actions for daily operations
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Calendar,
  ClipboardList,
  MessageSquare,
  Bell,
  Zap,
  ChevronDown,
  CheckCircle2,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { WorkspaceWithDetails } from '@/hooks/useWorkspaces';

interface CockpitQuickActionsProps {
  workspaces: WorkspaceWithDetails[];
  compact?: boolean;
}

export function CockpitQuickActions({ workspaces, compact = false }: CockpitQuickActionsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showQuickSession, setShowQuickSession] = useState(false);
  const [showQuickAction, setShowQuickAction] = useState(false);
  const [showQuickReminder, setShowQuickReminder] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Quick session form state
  const [sessionWorkspaceId, setSessionWorkspaceId] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDate, setSessionDate] = useState('');

  // Quick action form state
  const [actionWorkspaceId, setActionWorkspaceId] = useState('');
  const [actionTitle, setActionTitle] = useState('');
  const [actionDueDate, setActionDueDate] = useState('');

  const handleCreateQuickSession = async () => {
    if (!sessionWorkspaceId || !sessionTitle || !sessionDate) {
      toast.error('Please fill all fields');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('sessions')
        .insert({
          workspace_id: sessionWorkspaceId,
          title: sessionTitle,
          scheduled_at: new Date(sessionDate).toISOString(),
          duration: 60,
          created_by: user?.id,
        });

      if (error) throw error;
      toast.success('Session scheduled successfully');
      setShowQuickSession(false);
      resetSessionForm();
    } catch (error) {
      toast.error('Failed to create session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateQuickAction = async () => {
    if (!actionWorkspaceId || !actionTitle) {
      toast.error('Please fill required fields');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('action_items')
        .insert({
          workspace_id: actionWorkspaceId,
          title: actionTitle,
          due_date: actionDueDate || null,
          priority: 'medium',
          status: 'pending',
          created_by: user?.id,
        });

      if (error) throw error;
      toast.success('Action item created');
      setShowQuickAction(false);
      resetActionForm();
    } catch (error) {
      toast.error('Failed to create action');
    } finally {
      setIsLoading(false);
    }
  };

  const resetSessionForm = () => {
    setSessionWorkspaceId('');
    setSessionTitle('');
    setSessionDate('');
  };

  const resetActionForm = () => {
    setActionWorkspaceId('');
    setActionTitle('');
    setActionDueDate('');
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setShowQuickSession(true)}>
          <Calendar className="h-4 w-4 mr-1" />
          Session
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowQuickAction(true)}>
          <ClipboardList className="h-4 w-4 mr-1" />
          Action
        </Button>
        <QuickSessionDialog
          open={showQuickSession}
          onOpenChange={setShowQuickSession}
          workspaces={workspaces}
          sessionWorkspaceId={sessionWorkspaceId}
          setSessionWorkspaceId={setSessionWorkspaceId}
          sessionTitle={sessionTitle}
          setSessionTitle={setSessionTitle}
          sessionDate={sessionDate}
          setSessionDate={setSessionDate}
          isLoading={isLoading}
          onSubmit={handleCreateQuickSession}
        />
        <QuickActionDialog
          open={showQuickAction}
          onOpenChange={setShowQuickAction}
          workspaces={workspaces}
          actionWorkspaceId={actionWorkspaceId}
          setActionWorkspaceId={setActionWorkspaceId}
          actionTitle={actionTitle}
          setActionTitle={setActionTitle}
          actionDueDate={actionDueDate}
          setActionDueDate={setActionDueDate}
          isLoading={isLoading}
          onSubmit={handleCreateQuickAction}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            className="h-auto py-3 flex flex-col gap-1"
            onClick={() => setShowQuickSession(true)}
          >
            <Calendar className="h-5 w-5 text-primary" />
            <span className="text-xs">Schedule Session</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-3 flex flex-col gap-1"
            onClick={() => setShowQuickAction(true)}
          >
            <ClipboardList className="h-5 w-5 text-primary" />
            <span className="text-xs">Add Action</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-3 flex flex-col gap-1"
            onClick={() => navigate('/my-workspaces?filter=attention')}
          >
            <Bell className="h-5 w-5 text-amber-500" />
            <span className="text-xs">View Alerts</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-3 flex flex-col gap-1"
            onClick={() => navigate('/consultor-tools')}
          >
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="text-xs">Consultor Tools</span>
          </Button>
        </div>
      </CardContent>

      <QuickSessionDialog
        open={showQuickSession}
        onOpenChange={setShowQuickSession}
        workspaces={workspaces}
        sessionWorkspaceId={sessionWorkspaceId}
        setSessionWorkspaceId={setSessionWorkspaceId}
        sessionTitle={sessionTitle}
        setSessionTitle={setSessionTitle}
        sessionDate={sessionDate}
        setSessionDate={setSessionDate}
        isLoading={isLoading}
        onSubmit={handleCreateQuickSession}
      />
      <QuickActionDialog
        open={showQuickAction}
        onOpenChange={setShowQuickAction}
        workspaces={workspaces}
        actionWorkspaceId={actionWorkspaceId}
        setActionWorkspaceId={setActionWorkspaceId}
        actionTitle={actionTitle}
        setActionTitle={setActionTitle}
        actionDueDate={actionDueDate}
        setActionDueDate={setActionDueDate}
        isLoading={isLoading}
        onSubmit={handleCreateQuickAction}
      />
    </Card>
  );
}

// Dialog components
function QuickSessionDialog({
  open,
  onOpenChange,
  workspaces,
  sessionWorkspaceId,
  setSessionWorkspaceId,
  sessionTitle,
  setSessionTitle,
  sessionDate,
  setSessionDate,
  isLoading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaces: WorkspaceWithDetails[];
  sessionWorkspaceId: string;
  setSessionWorkspaceId: (v: string) => void;
  sessionTitle: string;
  setSessionTitle: (v: string) => void;
  sessionDate: string;
  setSessionDate: (v: string) => void;
  isLoading: boolean;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick Schedule Session</DialogTitle>
          <DialogDescription>
            Schedule a session for any startup in your portfolio
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Startup</Label>
            <Select value={sessionWorkspaceId} onValueChange={setSessionWorkspaceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select startup..." />
              </SelectTrigger>
              <SelectContent>
                {workspaces.slice(0, 50).map(w => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.startup?.name || 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Session Title</Label>
            <Input
              placeholder="e.g., Weekly check-in"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
            />
          </div>
          <div>
            <Label>Date & Time</Label>
            <Input
              type="datetime-local"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuickActionDialog({
  open,
  onOpenChange,
  workspaces,
  actionWorkspaceId,
  setActionWorkspaceId,
  actionTitle,
  setActionTitle,
  actionDueDate,
  setActionDueDate,
  isLoading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaces: WorkspaceWithDetails[];
  actionWorkspaceId: string;
  setActionWorkspaceId: (v: string) => void;
  actionTitle: string;
  setActionTitle: (v: string) => void;
  actionDueDate: string;
  setActionDueDate: (v: string) => void;
  isLoading: boolean;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick Add Action</DialogTitle>
          <DialogDescription>
            Add an action item to any startup
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Startup</Label>
            <Select value={actionWorkspaceId} onValueChange={setActionWorkspaceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select startup..." />
              </SelectTrigger>
              <SelectContent>
                {workspaces.slice(0, 50).map(w => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.startup?.name || 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Action Title</Label>
            <Input
              placeholder="e.g., Submit financial projections"
              value={actionTitle}
              onChange={(e) => setActionTitle(e.target.value)}
            />
          </div>
          <div>
            <Label>Due Date (optional)</Label>
            <Input
              type="date"
              value={actionDueDate}
              onChange={(e) => setActionDueDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Add Action'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
