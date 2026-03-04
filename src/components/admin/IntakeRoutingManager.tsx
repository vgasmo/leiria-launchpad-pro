import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, RotateCcw, User, Loader2, Copy, ExternalLink, Link, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { useIntakeRouting, useUpsertIntakeRoute, useConsultants, type IntakeRoute } from '@/hooks/useIntakeRouting';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface BookingLink {
  id: string;
  token_hash: string;
  owner_consultant_id: string | null;
  owner_email: string | null;
  program_id: string | null;
  active: boolean;
  expires_at: string | null;
  created_at: string;
  intake_route_id: string | null;
}

export function IntakeRoutingManager() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: routes, isLoading: loadingRoutes } = useIntakeRouting();
  const { data: consultants, isLoading: loadingConsultants } = useConsultants();
  const upsertRoute = useUpsertIntakeRoute();
  
  const [mode, setMode] = useState<'single' | 'round_robin'>('single');
  const [selectedConsultants, setSelectedConsultants] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  
  const globalRoute = routes?.find(r => r.scope === 'global');
  
  // Fetch booking links
  const { data: bookingLinks, isLoading: loadingLinks } = useQuery({
    queryKey: ['booking-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_booking_links')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BookingLink[];
    },
  });
  
  // Create booking link mutation
  const createLinkMutation = useMutation({
    mutationFn: async () => {
      // Generate a random token
      const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      const tokenHash = token; // In production, hash this
      
      const { data, error } = await supabase
        .from('public_booking_links')
        .insert({
          token_hash: tokenHash,
          intake_route_id: globalRoute?.id || null,
          active: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, plainToken: token };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['booking-links'] });
      const link = `${window.location.origin}/book/${data.plainToken}`;
      navigator.clipboard.writeText(link);
      toast.success('Link created and copied to clipboard');
    },
    onError: (error) => {
      toast.error(`Failed to create link: ${error.message}`);
    },
  });
  
  // Delete booking link mutation
  const deleteLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('public_booking_links')
        .update({ active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-links'] });
      toast.success('Link deactivated');
    },
  });
  
  useEffect(() => {
    if (globalRoute) {
      setMode(globalRoute.mode as 'single' | 'round_robin');
      setSelectedConsultants(globalRoute.consultant_ids || []);
    }
  }, [globalRoute]);
  
  const handleConsultantToggle = (consultantId: string) => {
    setSelectedConsultants(prev => {
      if (mode === 'single') {
        return [consultantId];
      }
      if (prev.includes(consultantId)) {
        return prev.filter(id => id !== consultantId);
      }
      return [...prev, consultantId];
    });
    setHasChanges(true);
  };
  
  const handleModeChange = (newMode: 'single' | 'round_robin') => {
    setMode(newMode);
    if (newMode === 'single' && selectedConsultants.length > 1) {
      setSelectedConsultants([selectedConsultants[0]]);
    }
    setHasChanges(true);
  };
  
  const handleSave = async () => {
    if (selectedConsultants.length === 0) {
      toast.error('Please select at least one consultant');
      return;
    }
    
    await upsertRoute.mutateAsync({
      id: globalRoute?.id,
      scope: 'global',
      mode,
      consultant_ids: selectedConsultants,
      active: true,
    });
    
    setHasChanges(false);
  };
  
  const handleCopyLink = (tokenHash: string) => {
    const link = `${window.location.origin}/book/${tokenHash}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard');
  };
  
  if (loadingRoutes || loadingConsultants) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('admin.intakeRouting.title', 'Intake Routing')}
          </CardTitle>
          <CardDescription>
            {t('admin.intakeRouting.description', 'Configure which consultant calendar is used for first-contact bookings')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mode Selection */}
          <div className="space-y-3">
            <Label>{t('admin.intakeRouting.routingMode', 'Routing Mode')}</Label>
            <RadioGroup value={mode} onValueChange={(v) => handleModeChange(v as 'single' | 'round_robin')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="single" />
                <Label htmlFor="single" className="flex items-center gap-2 cursor-pointer">
                  <User className="h-4 w-4" />
                  {t('admin.intakeRouting.singleConsultant', 'Single Consultant')}
                  <span className="text-xs text-muted-foreground">
                    — {t('admin.intakeRouting.singleDesc', 'All bookings go to one calendar')}
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="round_robin" id="round_robin" />
                <Label htmlFor="round_robin" className="flex items-center gap-2 cursor-pointer">
                  <RotateCcw className="h-4 w-4" />
                  {t('admin.intakeRouting.roundRobin', 'Round Robin')}
                  <span className="text-xs text-muted-foreground">
                    — {t('admin.intakeRouting.roundRobinDesc', 'Distribute leads across selected consultants')}
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Consultant Selection */}
          <div className="space-y-3">
            <Label>
              {mode === 'single' 
                ? t('admin.intakeRouting.selectConsultant', 'Select Consultant')
                : t('admin.intakeRouting.selectConsultants', 'Select Consultants for Rotation')}
            </Label>
            <div className="grid gap-2">
              {consultants?.map((consultant) => (
                <div
                  key={consultant.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedConsultants.includes(consultant.id)
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleConsultantToggle(consultant.id)}
                >
                  <Checkbox
                    checked={selectedConsultants.includes(consultant.id)}
                    onCheckedChange={() => handleConsultantToggle(consultant.id)}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{consultant.full_name || 'Unnamed'}</div>
                    <div className="text-sm text-muted-foreground">{consultant.email}</div>
                  </div>
                  {selectedConsultants.includes(consultant.id) && mode === 'round_robin' && (
                    <Badge variant="secondary">
                      #{selectedConsultants.indexOf(consultant.id) + 1}
                    </Badge>
                  )}
                </div>
              ))}
              {(!consultants || consultants.length === 0) && (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  {t('admin.intakeRouting.noConsultants', 'No consultants found. Add users with the consultant role first.')}
                </div>
              )}
            </div>
          </div>
          
          {/* Current Status */}
          {globalRoute && (
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <div className="font-medium mb-1">{t('admin.intakeRouting.currentConfig', 'Current Configuration')}</div>
              <div className="text-muted-foreground">
                {t('admin.intakeRouting.mode', 'Mode')}: <span className="font-medium">{globalRoute.mode}</span>
                {globalRoute.mode === 'round_robin' && (
                  <span> — {t('admin.intakeRouting.nextAssignment', 'Next assignment')}: #{(globalRoute.round_robin_index % (globalRoute.consultant_ids?.length || 1)) + 1}</span>
                )}
              </div>
            </div>
          )}
          
          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={upsertRoute.isPending || !hasChanges || selectedConsultants.length === 0}
          >
            {upsertRoute.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('common.saveChanges', 'Save Changes')}
          </Button>
        </CardContent>
      </Card>
      
      {/* Booking Links Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                {t('admin.intakeRouting.bookingLinks', 'Booking Links')}
              </CardTitle>
              <CardDescription>
                {t('admin.intakeRouting.bookingLinksDesc', 'Generate shareable links for external booking')}
              </CardDescription>
            </div>
            <Button onClick={() => createLinkMutation.mutate()} disabled={createLinkMutation.isPending}>
              {createLinkMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {t('admin.intakeRouting.generateLink', 'Generate Link')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingLinks ? (
            <div className="py-4 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : bookingLinks && bookingLinks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.intakeRouting.link', 'Link')}</TableHead>
                  <TableHead>{t('admin.intakeRouting.createdAt', 'Created')}</TableHead>
                  <TableHead>{t('common.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookingLinks.map(link => (
                  <TableRow key={link.id}>
                    <TableCell className="font-mono text-sm">
                      /book/{link.token_hash.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(link.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyLink(link.token_hash)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a href={`/book/${link.token_hash}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteLinkMutation.mutate(link.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              {t('admin.intakeRouting.noLinks', 'No booking links yet. Generate one to get started.')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
