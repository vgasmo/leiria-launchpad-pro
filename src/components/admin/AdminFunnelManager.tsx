import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Mail, Rocket, Settings, Target, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useFunnelItems, useCreateFunnelItem, useUpdateFunnelItem, useConvertToStartup, FunnelItem, FunnelStage } from '@/hooks/useFunnel';
import { useUpdateNextAction } from '@/hooks/useNextAction';
import { useConsultors } from '@/hooks/useWorkspaceOwner';
import { usePrograms } from '@/hooks/useWorkspaces';
import { useIncubationTypes, useBuildings } from '@/hooks/useBackoffice';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/dateUtils';
import { IntakeRoutingManager } from './IntakeRoutingManager';
import { RecordDrawer } from '@/components/crm/RecordDrawer';
import { STAGE_LABELS } from '@/constants/funnelStages';

const STAGE_COLORS: Record<FunnelStage, string> = {
  new: 'bg-slate-500',
  first_contact_booked: 'bg-blue-500',
  met: 'bg-indigo-500',
  qualified: 'bg-purple-500',
  proposal_sent: 'bg-amber-500',
  negotiating: 'bg-orange-500',
  intake_requested: 'bg-cyan-500',
  intake_filling: 'bg-cyan-400',
  intake_submitted: 'bg-teal-500',
  intake_review: 'bg-teal-600',
  intake_changes_requested: 'bg-yellow-500',
  approved_for_signature: 'bg-lime-500',
  sent_for_signature: 'bg-green-400',
  contracted: 'bg-green-500',
  incubating: 'bg-emerald-600',
  accelerating: 'bg-primary',
  rejected: 'bg-destructive',
  archived: 'bg-muted-foreground',
};

const ACTIVE_STAGES: FunnelStage[] = ['new', 'first_contact_booked', 'met', 'qualified', 'proposal_sent', 'negotiating', 'intake_requested', 'intake_filling', 'intake_submitted', 'intake_review', 'approved_for_signature', 'sent_for_signature', 'contracted'];

export function AdminFunnelManager() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: items } = useFunnelItems();
  const { data: consultors } = useConsultors();
  const { data: programs } = usePrograms();
  const createItem = useCreateFunnelItem();
  const updateItem = useUpdateFunnelItem();
  const convertToStartup = useConvertToStartup();
  
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FunnelItem | null>(null);
  const [convertDialogItem, setConvertDialogItem] = useState<FunnelItem | null>(null);
  const [showMineOnly, setShowMineOnly] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Filter items based on showMineOnly toggle
  const filteredItems = showMineOnly && user 
    ? items?.filter(i => i.owner_consultant_id === user.id) 
    : items;

  // Group items by stage for kanban view
  const itemsByStage = ACTIVE_STAGES.reduce((acc, stage) => {
    acc[stage] = filteredItems?.filter(i => i.stage === stage) || [];
    return acc;
  }, {} as Record<FunnelStage, FunnelItem[]>);

  const handleCardClick = (item: FunnelItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const handleStageChange = (item: FunnelItem, newStage: FunnelStage) => {
    updateItem.mutate({ id: item.id, stage: newStage });
  };

  const handleAssign = (item: FunnelItem, consultorId: string) => {
    updateItem.mutate({ id: item.id, owner_consultant_id: consultorId });
  };

  return (
    <Tabs defaultValue="funnel" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('admin.funnel.title')}</h2>
          <p className="text-muted-foreground">{t('admin.funnel.subtitle')}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-mine"
              checked={showMineOnly}
              onCheckedChange={setShowMineOnly}
            />
            <Label htmlFor="show-mine" className="text-sm cursor-pointer">{t('admin.funnel.myDealsOnly')}</Label>
          </div>
          <TabsList>
            <TabsTrigger value="funnel">{t('admin.funnel.pipeline')}</TabsTrigger>
            <TabsTrigger value="routing" className="gap-1">
              <Settings className="h-3 w-3" />
              {t('admin.funnel.intakeRouting')}
            </TabsTrigger>
          </TabsList>
          <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />{t('admin.funnel.addLead')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('admin.funnel.addNewLead')}</DialogTitle>
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
      </div>

      <TabsContent value="routing">
        <IntakeRoutingManager />
      </TabsContent>

      <TabsContent value="funnel">
        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {ACTIVE_STAGES.map(stage => {
            const stageItems = itemsByStage[stage];
            
            return (
              <div key={stage} className="flex-shrink-0 w-72">
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn('h-3 w-3 rounded-full', STAGE_COLORS[stage])} />
                  <span className="font-medium text-sm">{t(`pipeline.stages.${stage}`, STAGE_LABELS[stage])}</span>
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
                        onClick={() => handleCardClick(item)}
                      />
                    ))}
                    {stageItems.length === 0 && (
                      <div className="p-4 text-center text-muted-foreground text-sm border border-dashed rounded-lg">
                        {t('crm.emptyColumn', 'Arraste leads para aqui')}
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
                <DialogTitle>{t('crm.convertToStartup', 'Converter para Startup')}</DialogTitle>
              </DialogHeader>
              <ConvertForm
                item={convertDialogItem}
                programs={programs || []}
                onSubmit={(data) => {
                  convertToStartup.mutate(
                    { funnelItemId: convertDialogItem.id, ...data },
                    { onSuccess: () => setConvertDialogItem(null) }
                  );
                }}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* CRM Record Drawer */}
        <RecordDrawer
          item={selectedItem}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
        />
      </TabsContent>
    </Tabs>
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
  const { t } = useTranslation();
  const [nextActionPopover, setNextActionPopover] = useState(false);
  const [nextActionDate, setNextActionDate] = useState('');
  const [nextActionDesc, setNextActionDesc] = useState('');
  const updateNextAction = useUpdateNextAction();
  
  const canConvert = ['qualified', 'contracted'].includes(item.stage);
  const nextActionAt = (item as any).next_action_at as string | null;
  const nextActionDescription = (item as any).next_action_description as string | null;
  const lastActivityAt = (item as any).last_activity_at as string | null;
  const isOverdue = nextActionAt && new Date(nextActionAt) < new Date();

  const handleSetNextAction = () => {
    if (!nextActionDate) return;
    updateNextAction.mutate({
      funnelItemId: item.id,
      next_action_at: new Date(nextActionDate).toISOString(),
      next_action_description: nextActionDesc,
    }, {
      onSuccess: () => {
        setNextActionPopover(false);
        setNextActionDate('');
        setNextActionDesc('');
      }
    });
  };
  
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="font-medium truncate">{item.organization_name || item.contact_name || t('common.unnamed')}</p>
            {item.contact_email && (
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <Mail className="h-3 w-3" />{item.contact_email}
              </p>
            )}
          </div>
          {item.source && <Badge variant="outline" className="text-xs">{item.source}</Badge>}
        </div>
        
        {/* Next Action Display */}
        {nextActionAt && (
          <div className={cn(
            'flex items-center gap-1.5 text-xs rounded-md px-2 py-1',
            isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-muted'
          )}>
            <Target className="h-3 w-3 shrink-0" />
            <span className="truncate flex-1">{nextActionDescription || t('crm.nextAction')}</span>
            <span className={cn('shrink-0', isOverdue && 'font-medium')}>
              {formatRelativeTime(nextActionAt)}
            </span>
          </div>
        )}
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {lastActivityAt ? (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(lastActivityAt)}
              </span>
            ) : (
              <span>{formatRelativeTime(item.created_at)}</span>
            )}
          </div>
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
              <SelectValue placeholder={t('crm.moveTo', 'Mover para...')} />
            </SelectTrigger>
            <SelectContent>
              {ACTIVE_STAGES.filter(s => s !== item.stage).map(s => (
                <SelectItem key={s} value={s}>{t(`pipeline.stages.${s}`, STAGE_LABELS[s])}</SelectItem>
              ))}
              <SelectItem value="rejected">{t('pipeline.stages.rejected')}</SelectItem>
            </SelectContent>
          </Select>
          
          <Popover open={nextActionPopover} onOpenChange={setNextActionPopover}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 px-2">
                <Target className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
              <div className="space-y-3">
                <p className="text-sm font-medium">{t('crm.setNextAction')}</p>
                <div className="space-y-2">
                  <Label className="text-xs">{t('crm.nextActionDate')}</Label>
                  <Input
                    type="datetime-local"
                    value={nextActionDate}
                    onChange={(e) => setNextActionDate(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t('crm.nextActionDescription')}</Label>
                  <Input
                    value={nextActionDesc}
                    onChange={(e) => setNextActionDesc(e.target.value)}
                    placeholder={t('crm.detailsPlaceholder')}
                    className="h-8 text-sm"
                  />
                </div>
                <Button 
                  size="sm" 
                  className="w-full h-7" 
                  onClick={handleSetNextAction}
                  disabled={!nextActionDate || updateNextAction.isPending}
                >
                  {t('common.save')}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          {canConvert && (
            <Button size="sm" variant="default" className="h-7 text-xs" onClick={onConvert}>
              <Rocket className="h-3 w-3 mr-1" />{t('admin.funnel.convert')}
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
  const { t } = useTranslation();
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
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...formData, owner_consultant_id: formData.owner_consultant_id || undefined, program_id: formData.program_id || undefined }); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('admin.funnel.contactName')}</Label>
          <Input value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>{t('common.email')}</Label>
          <Input type="email" value={formData.contact_email} onChange={e => setFormData({...formData, contact_email: e.target.value})} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t('admin.funnel.organization')}</Label>
        <Input value={formData.organization_name} onChange={e => setFormData({...formData, organization_name: e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('admin.funnel.source')}</Label>
          <Input placeholder={t('admin.funnel.sourcePlaceholder')} value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>{t('admin.funnel.assignTo')}</Label>
          <Select value={formData.owner_consultant_id} onValueChange={v => setFormData({...formData, owner_consultant_id: v})}>
            <SelectTrigger><SelectValue placeholder={t('admin.funnel.selectConsultant')} /></SelectTrigger>
            <SelectContent>
              {consultors.filter(c => c.id).map(c => (
                <SelectItem key={c.id} value={c.id}>{c.full_name || t('common.unnamed')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t('common.notes')}</Label>
        <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
      </div>
      <Button type="submit" className="w-full">{t('admin.funnel.createLead')}</Button>
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
  onSubmit: (data: { 
    programId: string; 
    stage: string; 
    incubationTypeId?: string;
    buildingId?: string;
    squareMeters?: number;
    monthlyFee?: number;
  }) => void;
}) {
  const { t } = useTranslation();
  const [programId, setProgramId] = useState(item.program_id || '');
  const [stage, setStage] = useState('ideation');
  const [incubationTypeId, setIncubationTypeId] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [squareMeters, setSquareMeters] = useState('');
  const [monthlyFee, setMonthlyFee] = useState('');
  
  // Fetch incubation types and buildings
  const { data: incubationTypes } = useIncubationTypes();
  const { data: buildings } = useBuildings();
  
  const selectedIncubationType = incubationTypes?.find(t => t.id === incubationTypeId);
  const requiresSpace = selectedIncubationType?.requires_space;
  const pricePerSqm = selectedIncubationType?.price_per_sqm;
  
  // Calculate monthly fee when sqm or type changes
  const calculatedFee = pricePerSqm && squareMeters 
    ? (parseFloat(squareMeters) * pricePerSqm).toFixed(2)
    : selectedIncubationType?.base_monthly_fee?.toString() || '';

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t('admin.funnel.convertTo')} <strong>{item.organization_name || item.contact_name}</strong>
      </p>
      
      <div className="space-y-2">
        <Label>{t('admin.funnel.program')}</Label>
        <Select value={programId} onValueChange={setProgramId}>
          <SelectTrigger><SelectValue placeholder={t('admin.funnel.selectProgram')} /></SelectTrigger>
          <SelectContent>
            {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label>{t('admin.funnel.startingStage')}</Label>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ideation">Ideation</SelectItem>
            <SelectItem value="validation">Validation</SelectItem>
            <SelectItem value="mvp">MVP</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="border-t pt-4 mt-4">
        <Label className="text-base font-medium">{t('admin.funnel.contractDetails')}</Label>
      </div>
      
      <div className="space-y-2">
        <Label>{t('admin.backoffice.incubationType')}</Label>
        <Select value={incubationTypeId} onValueChange={setIncubationTypeId}>
          <SelectTrigger><SelectValue placeholder={t('admin.backoffice.selectIncubationType')} /></SelectTrigger>
          <SelectContent>
            {incubationTypes?.filter(t => t.is_active).map(t => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} - €{t.base_monthly_fee}/mo
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label>{t('admin.backoffice.building')}</Label>
        <Select value={buildingId} onValueChange={setBuildingId}>
          <SelectTrigger><SelectValue placeholder={t('admin.backoffice.selectBuilding')} /></SelectTrigger>
          <SelectContent>
            {buildings?.filter(b => b.is_active).map(b => (
              <SelectItem key={b.id} value={b.id}>
                {b.name} ({b.city})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {requiresSpace && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('admin.backoffice.squareMeters')}</Label>
            <Input 
              type="number" 
              step="0.01"
              value={squareMeters}
              onChange={(e) => setSquareMeters(e.target.value)}
              placeholder="m²"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('admin.backoffice.monthlyFee')}</Label>
            <Input 
              type="number" 
              step="0.01"
              value={monthlyFee || calculatedFee}
              onChange={(e) => setMonthlyFee(e.target.value)}
              placeholder="€"
            />
          </div>
        </div>
      )}
      
      <Button 
        onClick={() => onSubmit({ 
          programId, 
          stage, 
          incubationTypeId: incubationTypeId || undefined,
          buildingId: buildingId || undefined,
          squareMeters: squareMeters ? parseFloat(squareMeters) : undefined,
          monthlyFee: monthlyFee ? parseFloat(monthlyFee) : (calculatedFee ? parseFloat(calculatedFee) : undefined),
        })} 
        disabled={!programId} 
        className="w-full"
      >
        <Rocket className="h-4 w-4 mr-2" />{t('admin.funnel.createStartupWorkspace')}
      </Button>
    </div>
  );
}
