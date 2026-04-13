import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePrograms } from '@/hooks/useProgramSetup';
import type { DraftBasics, ProgramModeSettings } from '@/hooks/useProgramSetup';
import type { Database } from '@/integrations/supabase/types';
import { BarChart3, Activity, Target, Bell, BookOpen, Calculator, Zap, Settings2, Rocket, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type ProgramType = Database['public']['Enums']['program_type'];
import { useTranslation } from 'react-i18next';

interface WizardBasicsStepProps {
  data: DraftBasics;
  onUpdate: (data: DraftBasics) => void;
}

const DEFAULT_SETTINGS: ProgramModeSettings = {
  program_mode: 'standard',
  enable_kpis: true,
  enable_health: true,
  enable_milestones: true,
  enable_alerts: true,
  enable_playbooks: true,
  enable_financial_model: true,
};

const BASIC_MODE_SETTINGS: ProgramModeSettings = {
  program_mode: 'basic',
  enable_kpis: false,
  enable_health: false,
  enable_milestones: false,
  enable_alerts: false,
  enable_playbooks: false,
  enable_financial_model: false,
};

const MODULE_CONFIG = [
  { key: 'enable_kpis', icon: BarChart3, labelKey: 'programSetup.modules.kpis', descKey: 'programSetup.modules.kpisDesc' },
  { key: 'enable_health', icon: Activity, labelKey: 'programSetup.modules.health', descKey: 'programSetup.modules.healthDesc' },
  { key: 'enable_milestones', icon: Target, labelKey: 'programSetup.modules.milestones', descKey: 'programSetup.modules.milestonesDesc' },
  { key: 'enable_alerts', icon: Bell, labelKey: 'programSetup.modules.alerts', descKey: 'programSetup.modules.alertsDesc' },
  { key: 'enable_playbooks', icon: BookOpen, labelKey: 'programSetup.modules.playbooks', descKey: 'programSetup.modules.playbooksDesc' },
  { key: 'enable_financial_model', icon: Calculator, labelKey: 'programSetup.modules.financialModel', descKey: 'programSetup.modules.financialModelDesc' },
] as const;

export function WizardBasicsStep({ data, onUpdate }: WizardBasicsStepProps) {
  const { t } = useTranslation();
  const [localData, setLocalData] = useState<DraftBasics>({
    ...data,
    settings: data.settings || DEFAULT_SETTINGS,
    program_type: data.program_type || 'incubation',
  });
  const { data: programs } = usePrograms();

  // Debounced update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (JSON.stringify(localData) !== JSON.stringify(data)) {
        onUpdate(localData);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localData, data, onUpdate]);

  const handleChange = (field: keyof DraftBasics, value: string) => {
    setLocalData((prev) => ({ ...prev, [field]: value }));
  };

  const handleModeChange = (mode: 'standard' | 'basic') => {
    const newSettings = mode === 'basic' ? { ...BASIC_MODE_SETTINGS } : { ...DEFAULT_SETTINGS };
    setLocalData((prev) => ({ ...prev, settings: newSettings }));
  };

  const handleModuleToggle = (moduleKey: keyof ProgramModeSettings, enabled: boolean) => {
    setLocalData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings!,
        [moduleKey]: enabled,
        // If enabling any module in basic mode, stay in basic but with custom settings
        program_mode: prev.settings?.program_mode || 'standard',
      },
    }));
  };

  const handleCloneFrom = (programId: string) => {
    const program = programs?.find((p) => p.id === programId);
    if (program) {
      setLocalData({
        name: `${program.name} (Copy)`,
        description: program.description || undefined,
        start_date: undefined,
        end_date: undefined,
        settings: DEFAULT_SETTINGS,
      });
    }
  };

  const currentSettings = localData.settings || DEFAULT_SETTINGS;
  const isBasicMode = currentSettings.program_mode === 'basic';
  const isAcceleration = localData.program_type === 'acceleration';

  const handleProgramTypeChange = (type: ProgramType) => {
    setLocalData((prev) => ({ ...prev, program_type: type }));
  };

  return (
    <div className="space-y-6">
      {/* Clone from existing */}
      {programs && programs.length > 0 && !data.name && (
        <div className="p-4 border rounded-lg bg-muted/50">
          <Label className="text-sm font-medium">{t('programSetup.cloneFrom', 'Clone from existing program')}</Label>
          <Select onValueChange={handleCloneFrom}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder={t('programSetup.selectToClone', 'Select a program to clone...')} />
            </SelectTrigger>
            <SelectContent>
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            {t('programSetup.cloneDescription', 'This will copy stages, KPIs, playbooks, and alert rules from the selected program.')}
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="name">{t('programSetup.programName', 'Program Name')} *</Label>
          <Input
            id="name"
            value={localData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder={t('programSetup.programNamePlaceholder', 'e.g., Accelerator 2024')}
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="description">{t('programSetup.description', 'Description')}</Label>
          <Textarea
            id="description"
            value={localData.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder={t('programSetup.descriptionPlaceholder', 'Describe the program objectives and focus areas...')}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="start_date">{t('programSetup.startDate', 'Start Date')}</Label>
          <Input
            id="start_date"
            type="date"
            value={localData.start_date || ''}
            onChange={(e) => handleChange('start_date', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_date">{t('programSetup.endDate', 'End Date')}</Label>
          <Input
            id="end_date"
            type="date"
            value={localData.end_date || ''}
            onChange={(e) => handleChange('end_date', e.target.value)}
          />
        </div>
      </div>

      {/* Program Mode Selection */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t('programSetup.programMode', 'Program Mode')}</CardTitle>
            </div>
            <Badge variant={isBasicMode ? 'secondary' : 'default'}>
              {isBasicMode ? t('programSetup.basicMode', 'Basic') : t('programSetup.standardMode', 'Standard')}
            </Badge>
          </div>
          <CardDescription>
            {t('programSetup.programModeDescription', 'Choose how startups in this program will be managed')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleModeChange('standard')}
              className={`flex-1 p-4 rounded-lg border-2 transition-all text-left ${
                !isBasicMode 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted hover:border-muted-foreground/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-primary" />
                <span className="font-medium">{t('programSetup.standardMode', 'Standard')}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('programSetup.standardModeDesc', 'Full features: KPIs, health scores, milestones, playbooks, and more.')}
              </p>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('basic')}
              className={`flex-1 p-4 rounded-lg border-2 transition-all text-left ${
                isBasicMode 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted hover:border-muted-foreground/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{t('programSetup.basicMode', 'Basic')}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('programSetup.basicModeDesc', 'Lightweight: Focus on sessions, tasks, templates, and mentoring.')}
              </p>
            </button>
          </div>

          {/* Module Toggles */}
          <div className="pt-2 border-t">
            <Label className="text-sm text-muted-foreground mb-3 block">
              {t('programSetup.customizeModules', 'Customize modules (optional)')}
            </Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {MODULE_CONFIG.map(({ key, icon: Icon, labelKey, descKey }) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label htmlFor={key} className="text-sm font-medium cursor-pointer">
                        {t(labelKey)}
                      </Label>
                      <p className="text-xs text-muted-foreground">{t(descKey)}</p>
                    </div>
                  </div>
                  <Switch
                    id={key}
                    checked={currentSettings[key as keyof ProgramModeSettings] as boolean}
                    onCheckedChange={(checked) => handleModuleToggle(key as keyof ProgramModeSettings, checked)}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}