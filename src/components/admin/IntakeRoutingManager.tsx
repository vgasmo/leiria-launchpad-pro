import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, RotateCcw, User, Loader2, Copy, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { useIntakeRouting, useUpsertIntakeRoute, useConsultants, type IntakeRoute } from '@/hooks/useIntakeRouting';

export function IntakeRoutingManager() {
  const { t } = useTranslation();
  const { data: routes, isLoading: loadingRoutes } = useIntakeRouting();
  const { data: consultants, isLoading: loadingConsultants } = useConsultants();
  const upsertRoute = useUpsertIntakeRoute();
  
  const [mode, setMode] = useState<'single' | 'round_robin'>('single');
  const [selectedConsultants, setSelectedConsultants] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  
  const globalRoute = routes?.find(r => r.scope === 'global');
  
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
  
  const handleCopyBookingLink = () => {
    const link = `${window.location.origin}/book/demo`;
    navigator.clipboard.writeText(link);
    toast.success('Booking link copied');
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Intake Routing
        </CardTitle>
        <CardDescription>
          Configure which consultant calendar is used for first-contact bookings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mode Selection */}
        <div className="space-y-3">
          <Label>Routing Mode</Label>
          <RadioGroup value={mode} onValueChange={(v) => handleModeChange(v as 'single' | 'round_robin')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="single" id="single" />
              <Label htmlFor="single" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                Single Consultant
                <span className="text-xs text-muted-foreground">
                  — All bookings go to one calendar
                </span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="round_robin" id="round_robin" />
              <Label htmlFor="round_robin" className="flex items-center gap-2 cursor-pointer">
                <RotateCcw className="h-4 w-4" />
                Round Robin
                <span className="text-xs text-muted-foreground">
                  — Distribute leads across selected consultants
                </span>
              </Label>
            </div>
          </RadioGroup>
        </div>
        
        {/* Consultant Selection */}
        <div className="space-y-3">
          <Label>
            {mode === 'single' ? 'Select Consultant' : 'Select Consultants for Rotation'}
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
                No consultants found. Add users with the consultant role first.
              </div>
            )}
          </div>
        </div>
        
        {/* Current Status */}
        {globalRoute && (
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <div className="font-medium mb-1">Current Configuration</div>
            <div className="text-muted-foreground">
              Mode: <span className="font-medium">{globalRoute.mode}</span>
              {globalRoute.mode === 'round_robin' && (
                <span> — Next assignment: #{(globalRoute.round_robin_index % (globalRoute.consultant_ids?.length || 1)) + 1}</span>
              )}
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={upsertRoute.isPending || !hasChanges || selectedConsultants.length === 0}
          >
            {upsertRoute.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
          
          <Button variant="outline" onClick={handleCopyBookingLink}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Booking Link
          </Button>
          
          <Button
            variant="ghost"
            asChild
          >
            <a href="/book/demo" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Test Booking
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
