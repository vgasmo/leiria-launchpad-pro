import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, User, Building2, Mail, Phone, Tag, ChevronRight, UserPlus, CheckCircle2, XCircle, FileText, Rocket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useFunnelItems, useCreateFunnelItem, useUpdateFunnelItem, useConvertToStartup, FunnelItem, FunnelStage } from '@/hooks/useFunnel';
import { useConsultors } from '@/hooks/useWorkspaceOwner';
import { usePrograms } from '@/hooks/useWorkspaces';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/dateUtils';

const STAGE_CONFIG: Record<FunnelStage, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-slate-500' },
  first_contact_booked: { label: 'Meeting Booked', color: 'bg-blue-500' },
  met: { label: 'Met', color: 'bg-indigo-500' },
  qualified: { label: 'Qualified', color: 'bg-purple-500' },
  proposal_sent: { label: 'Proposal Sent', color: 'bg-amber-500' },
  negotiating: { label: 'Negotiating', color: 'bg-orange-500' },
  contracted: { label: 'Contracted', color: 'bg-green-500' },
  incubating: { label: 'Incubating', color: 'bg-emerald-600' },
  accelerating: { label: 'Accelerating', color: 'bg-primary' },
  rejected: { label: 'Rejected', color: 'bg-destructive' },
  archived: { label: 'Archived', color: 'bg-muted-foreground' },
};

const ACTIVE_STAGES: FunnelStage[] = ['new', 'first_contact_booked', 'met', 'qualified', 'proposal_sent', 'negotiating', 'contracted'];

export function AdminFunnelManager() {
  const { t } = useTranslation();
  const { data: items, isLoading } = useFunnelItems();
  const { data: consultors } = useConsultors();
  const { data: programs } = usePrograms();
  const createItem = useCreateFunnelItem();
  const updateItem = useUpdateFunnelItem();
  const convertToStartup = useConvertToStartup();
  
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FunnelItem | null>(null);
  const [convertDialogItem, setConvertDialogItem] = useState<FunnelItem | null>(null);

  // Group items by stage for kanban view
  const itemsByStage = ACTIVE_STAGES.reduce((acc, stage) => {
    acc[stage] = items?.filter(i => i.stage === stage) || [];
    return acc;
  }, {} as Record<FunnelStage, FunnelItem[]>);

  const handleStageChange = (item: FunnelItem, newStage: FunnelStage) => {
    updateItem.mutate({ id: item.id, stage: newStage });
  };

  const handleAssign = (item: FunnelItem, consultorId: string) => {
    updateItem.mutate({ id: item.id, owner_consultant_id: consultorId });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Funnel</h2>
          <p className="text-muted-foreground">Track leads from first contact to conversion</p>
        </div>
        <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Lead</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
            </DialogHeader>
            <NewLeadForm 
              programs={programs || []}
              consultors={consultors || []}
              onSubmit={(data) => {
                createItem.mutate(data, { onSuccess: () => setIsNewDialogOpen(false) });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {ACTIVE_STAGES.map(stage => {
          const config = STAGE_CONFIG[stage];
          const stageItems = itemsByStage[stage];
          
          return (
            <div key={stage} className="flex-shrink-0 w-72">
              <div className="flex items-center gap-2 mb-3">
                <div className={cn('h-3 w-3 rounded-full', config.color)} />
                <span className="font-medium text-sm">{config.label}</span>
                <Badge variant="secondary" className="ml-auto text-xs">{stageItems.length}</Badge>
              </div>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2 pr-2">
                  {stageItems.map(item => (
                    <FunnelCard
                      key={item.id}
                      item={item}
                      consultors={consultors || []}
                      onStageChange={handleStageChange}
                      onAssign={handleAssign}
                      onConvert={() => setConvertDialogItem(item)}
                      onClick={() => setSelectedItem(item)}
                    />
                  ))}
                  {stageItems.length === 0 && (
                    <div className="p-4 text-center text-muted-foreground text-sm border border-dashed rounded-lg">
                      No items
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>

      {/* Convert Dialog */}
      {convertDialogItem && (
        <Dialog open={!!convertDialogItem} onOpenChange={() => setConvertDialogItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convert to Startup</DialogTitle>
            </DialogHeader>
            <ConvertForm
              item={convertDialogItem}
              programs={programs || []}
              onSubmit={(programId, stage) => {
                convertToStartup.mutate(
                  { funnelItemId: convertDialogItem.id, programId, stage },
                  { onSuccess: () => setConvertDialogItem(null) }
                );
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function FunnelCard({ 
  item, 
  consultors,
  onStageChange, 
  onAssign,
  onConvert,
  onClick 
}: { 
  item: FunnelItem;
  consultors: { id: string; full_name: string | null }[];
  onStageChange: (item: FunnelItem, stage: FunnelStage) => void;
  onAssign: (item: FunnelItem, consultorId: string) => void;
  onConvert: () => void;
  onClick: () => void;
}) {
  const canConvert = ['qualified', 'contracted'].includes(item.stage);
  
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="font-medium truncate">{item.organization_name || item.contact_name || 'Unnamed'}</p>
            {item.contact_email && (
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <Mail className="h-3 w-3" />{item.contact_email}
              </p>
            )}
          </div>
          {item.source && <Badge variant="outline" className="text-xs">{item.source}</Badge>}
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatRelativeTime(item.created_at)}</span>
          {item.owner && (
            <div className="flex items-center gap-1">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px]">{item.owner.full_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>

        <div className="flex gap-1 pt-1" onClick={e => e.stopPropagation()}>
          <Select onValueChange={(v) => onStageChange(item, v as FunnelStage)}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue placeholder="Move to..." />
            </SelectTrigger>
            <SelectContent>
              {ACTIVE_STAGES.filter(s => s !== item.stage).map(s => (
                <SelectItem key={s} value={s}>{STAGE_CONFIG[s].label}</SelectItem>
              ))}
              <SelectItem value="rejected">Reject</SelectItem>
            </SelectContent>
          </Select>
          
          {canConvert && (
            <Button size="sm" variant="default" className="h-7 text-xs" onClick={onConvert}>
              <Rocket className="h-3 w-3 mr-1" />Convert
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NewLeadForm({ 
  programs, 
  consultors,
  onSubmit 
}: { 
  programs: { id: string; name: string }[];
  consultors: { id: string; full_name: string | null }[];
  onSubmit: (data: Partial<FunnelItem>) => void;
}) {
  const [formData, setFormData] = useState({
    contact_name: '',
    contact_email: '',
    organization_name: '',
    source: '',
    notes: '',
    program_id: '',
    owner_consultant_id: '',
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Contact Name</Label>
          <Input value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={formData.contact_email} onChange={e => setFormData({...formData, contact_email: e.target.value})} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Organization</Label>
        <Input value={formData.organization_name} onChange={e => setFormData({...formData, organization_name: e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Source</Label>
          <Input placeholder="e.g., Website, Referral" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Assign to</Label>
          <Select value={formData.owner_consultant_id} onValueChange={v => setFormData({...formData, owner_consultant_id: v})}>
            <SelectTrigger><SelectValue placeholder="Select consultant" /></SelectTrigger>
            <SelectContent>
              {consultors.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
      </div>
      <Button type="submit" className="w-full">Create Lead</Button>
    </form>
  );
}

function ConvertForm({ 
  item, 
  programs, 
  onSubmit 
}: { 
  item: FunnelItem;
  programs: { id: string; name: string }[];
  onSubmit: (programId: string, stage: string) => void;
}) {
  const [programId, setProgramId] = useState(item.program_id || '');
  const [stage, setStage] = useState('ideation');

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Convert <strong>{item.organization_name || item.contact_name}</strong> to a startup
      </p>
      <div className="space-y-2">
        <Label>Program</Label>
        <Select value={programId} onValueChange={setProgramId}>
          <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
          <SelectContent>
            {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Starting Stage</Label>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ideation">Ideation</SelectItem>
            <SelectItem value="validation">Validation</SelectItem>
            <SelectItem value="mvp">MVP</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={() => onSubmit(programId, stage)} disabled={!programId} className="w-full">
        <Rocket className="h-4 w-4 mr-2" />Create Startup & Workspace
      </Button>
    </div>
  );
}
