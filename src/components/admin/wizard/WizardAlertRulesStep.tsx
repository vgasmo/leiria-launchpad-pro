import { useState, useEffect } from 'react';
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

const RULE_INFO: Record<string, { label: string; description: string; icon: React.ElementType }> = {
  no_session_days: {
    label: 'No Sessions',
    description: 'Alert when workspace has no sessions for X days',
    icon: Clock,
  },
  overdue_actions_count: {
    label: 'Overdue Actions',
    description: 'Alert when X or more actions are overdue',
    icon: Target,
  },
  missing_kpis_current_month: {
    label: 'Missing KPIs',
    description: 'Alert when current month KPIs are not reported',
    icon: AlertTriangle,
  },
  checkin_overdue_days: {
    label: 'Check-in Overdue',
    description: 'Alert when check-in is X days overdue',
    icon: CheckCircle,
  },
  milestone_overdue_count: {
    label: 'Overdue Milestones',
    description: 'Alert when X or more milestones are overdue',
    icon: Target,
  },
};

export function WizardAlertRulesStep({ alertRules, healthModel, onUpdate }: WizardAlertRulesStepProps) {
  const [localRules, setLocalRules] = useState<DraftAlertRule[]>(
    alertRules?.length > 0 ? alertRules : DEFAULT_ALERT_RULES
  );
  const [localHealthModel, setLocalHealthModel] = useState<DraftHealthModel>(
    healthModel || DEFAULT_HEALTH_MODEL
  );

  // Debounced update
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
      {/* Alert Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alert Rules
          </CardTitle>
          <CardDescription>
            Configure when alerts should be triggered for workspaces
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {localRules.map((rule) => {
            const info = RULE_INFO[rule.rule_type];
            const Icon = info?.icon || AlertTriangle;
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
                      <span className="font-medium text-sm">{info?.label || rule.rule_type}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{info?.description}</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Threshold:</Label>
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
                        <Label className="text-xs">Severity:</Label>
                        <Select
                          value={rule.severity}
                          onValueChange={(v) => handleRuleChange(rule.rule_type, 'severity', v)}
                          disabled={!rule.is_enabled}
                        >
                          <SelectTrigger className="h-7 w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="info">Info</SelectItem>
                            <SelectItem value="warning">Warning</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
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

      {/* Health Model */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Health Score Model
              </CardTitle>
              <CardDescription>Configure how workspace health is calculated</CardDescription>
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
            {/* Weights */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Dimension Weights</h4>
                <Badge variant={weightsSum === 100 ? 'default' : 'destructive'}>
                  Total: {weightsSum}%
                </Badge>
              </div>
              {Object.entries(localHealthModel.weights_json).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm capitalize">{key}</Label>
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
                <p className="text-xs text-destructive">Weights must sum to 100%</p>
              )}
            </div>

            {/* Thresholds */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Score Thresholds</h4>
              <div className="grid gap-3 md:grid-cols-5">
                {Object.entries(localHealthModel.thresholds_json)
                  .sort(([, a], [, b]) => b - a)
                  .map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs capitalize">{key.replace('_', ' ')}</Label>
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