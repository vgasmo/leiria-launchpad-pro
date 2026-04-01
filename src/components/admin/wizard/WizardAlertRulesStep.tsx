import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bell, Activity, AlertTriangle, Clock, Target, CheckCircle } from 'lucide-react';
import type { DraftAlertRule, DraftHealthModel } from '@/hooks/useProgramSetup';

interface WizardAlertRulesStepProps {
  alertRules: DraftAlertRule[];
  healthModel?: DraftHealthModel;
  onUpdate: (alertRules: DraftAlertRule[], healthModel?: DraftHealthModel) => void;
}

const DEFAULT_ALERT_RULES: DraftAlertRule[] = [
  { rule_type: 'no_session_days', threshold: 14, severity: 'warning', is_enabled: true },
  { rule_type: 'overdue_actions_count', threshold: 5, severity: 'warning', is_enabled: true },
  { rule_type: 'missing_kpis_current_month', threshold: 1, severity: 'info', is_enabled: true },
  { rule_type: 'checkin_overdue_days', threshold: 7, severity: 'warning', is_enabled: true },
  { rule_type: 'milestone_overdue_count', threshold: 2, severity: 'critical', is_enabled: true },
];

const DEFAULT_HEALTH_MODEL: DraftHealthModel = {
  weights_json: {
    actions: 25,
    sessions: 20,
    kpis: 25,
    checkins: 15,
    milestones: 15,
  },
  thresholds_json: {
    thriving: 85,
    on_track: 70,
    needs_attention: 50,
    at_risk: 30,
    critical: 0,
  },
  is_enabled: true,
};

const RULE_ICONS: Record<string, React.ElementType> = {
  no_session_days: Clock,
  overdue_actions_count: Target,
  missing_kpis_current_month: AlertTriangle,
  checkin_overdue_days: CheckCircle,
  milestone_overdue_count: Target,
};

export function WizardAlertRulesStep({ alertRules, healthModel, onUpdate }: WizardAlertRulesStepProps) {
  const { t } = useTranslation();
  const [localRules, setLocalRules] = useState<DraftAlertRule[]>(
    alertRules?.length > 0 ? alertRules : DEFAULT_ALERT_RULES
  );
  const [localHealthModel, setLocalHealthModel] = useState<DraftHealthModel>(
    healthModel || DEFAULT_HEALTH_MODEL
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      onUpdate(localRules, localHealthModel);
    }, 500);
    return () => clearTimeout(timer);
  }, [localRules, localHealthModel, onUpdate]);

  const handleRuleChange = (ruleType: string, field: keyof DraftAlertRule, value: unknown) => {
    setLocalRules((prev) =>
      prev.map((r) => (r.rule_type === ruleType ? { ...r, [field]: value } : r))
    );
  };

  const handleWeightChange = (key: string, value: number) => {
    setLocalHealthModel((prev) => ({
      ...prev,
      weights_json: { ...prev.weights_json, [key]: value },
    }));
  };

  const handleThresholdChange = (key: string, value: number) => {
    setLocalHealthModel((prev) => ({
      ...prev,
      thresholds_json: { ...prev.thresholds_json, [key]: value },
    }));
  };

  const weightsSum = Object.values(localHealthModel.weights_json).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {t('wizard.alertRules.title')}
          </CardTitle>
          <CardDescription>
            {t('wizard.alertRules.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {localRules.map((rule) => {
            const Icon = RULE_ICONS[rule.rule_type] || AlertTriangle;
            return (
              <div
                key={rule.rule_type}
                className={`p-4 border rounded-lg ${rule.is_enabled ? 'bg-card' : 'bg-muted/50 opacity-60'}`}
              >
                <div className="flex items-start gap-4">
                  <Switch
                    checked={rule.is_enabled}
                    onCheckedChange={(checked) =>
                      handleRuleChange(rule.rule_type, 'is_enabled', checked)
                    }
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{t(`wizard.alertRules.rules.${rule.rule_type}.label`)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{t(`wizard.alertRules.rules.${rule.rule_type}.description`)}</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">{t('wizard.alertRules.threshold')}:</Label>
                        <Input
                          type="number"
                          value={rule.threshold}
                          onChange={(e) =>
                            handleRuleChange(rule.rule_type, 'threshold', Number(e.target.value))
                          }
                          className="h-7 w-20"
                          disabled={!rule.is_enabled}
                          min={0}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">{t('wizard.alertRules.severity')}:</Label>
                        <Select
                          value={rule.severity}
                          onValueChange={(v) => handleRuleChange(rule.rule_type, 'severity', v)}
                          disabled={!rule.is_enabled}
                        >
                          <SelectTrigger className="h-7 w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="info">{t('common.info')}</SelectItem>
                            <SelectItem value="warning">{t('common.warning')}</SelectItem>
                            <SelectItem value="critical">{t('common.critical')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                {t('wizard.healthModel.title')}
              </CardTitle>
              <CardDescription>{t('wizard.healthModel.description')}</CardDescription>
            </div>
            <Switch
              checked={localHealthModel.is_enabled}
              onCheckedChange={(checked) =>
                setLocalHealthModel((prev) => ({ ...prev, is_enabled: checked }))
              }
            />
          </div>
        </CardHeader>
        {localHealthModel.is_enabled && (
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{t('wizard.healthModel.dimensionWeights')}</h4>
                <Badge variant={weightsSum === 100 ? 'default' : 'destructive'}>
                  Total: {weightsSum}%
                </Badge>
              </div>
              {Object.entries(localHealthModel.weights_json).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm capitalize">{t(`wizard.healthModel.dimensions.${key}`)}</Label>
                    <span className="text-sm font-medium">{value}%</span>
                  </div>
                  <Slider
                    value={[value]}
                    onValueChange={([v]) => handleWeightChange(key, v)}
                    max={100}
                    step={5}
                  />
                </div>
              ))}
              {weightsSum !== 100 && (
                <p className="text-xs text-destructive">{t('wizard.healthModel.weightsMustSum')}</p>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium">{t('wizard.healthModel.scoreThresholds')}</h4>
              <div className="grid gap-3 md:grid-cols-5">
                {Object.entries(localHealthModel.thresholds_json)
                  .sort(([, a], [, b]) => b - a)
                  .map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs">{t(`wizard.healthModel.thresholds.${key}`)}</Label>
                      <Input
                        type="number"
                        value={value}
                        onChange={(e) => handleThresholdChange(key, Number(e.target.value))}
                        className="h-8"
                        min={0}
                        max={100}
                      />
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
