import { useState, useMemo } from 'react';
import { Calculator, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MetricInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  tooltip?: string;
}

function MetricInput({ label, value, onChange, prefix, suffix, tooltip }: MetricInputProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm font-medium">{label}</Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {prefix}
          </span>
        )}
        <Input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={prefix ? 'pl-7' : suffix ? 'pr-8' : ''}
          min={0}
          step="any"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

interface ResultCardProps {
  label: string;
  value: string;
  status: 'good' | 'warning' | 'bad' | 'neutral';
  description?: string;
}

function ResultCard({ label, value, status, description }: ResultCardProps) {
  const statusColors = {
    good: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    bad: 'text-red-600 dark:text-red-400',
    neutral: 'text-foreground',
  };

  const StatusIcon = {
    good: CheckCircle,
    warning: AlertTriangle,
    bad: TrendingDown,
    neutral: TrendingUp,
  }[status];

  return (
    <div className="p-4 rounded-lg bg-muted/50 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <StatusIcon className={`h-4 w-4 ${statusColors[status]}`} />
      </div>
      <p className={`text-2xl font-bold ${statusColors[status]}`}>{value}</p>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export function UnitEconomicsCalculator() {
  // Input state
  const [marketingCosts, setMarketingCosts] = useState(0);
  const [salesCosts, setSalesCosts] = useState(0);
  const [newCustomers, setNewCustomers] = useState(0);
  const [arpu, setArpu] = useState(0);
  const [grossMargin, setGrossMargin] = useState(70);
  const [monthlyChurnRate, setMonthlyChurnRate] = useState(5);

  // Calculated metrics
  const metrics = useMemo(() => {
    const cac = newCustomers > 0 ? (marketingCosts + salesCosts) / newCustomers : 0;
    const customerLifetimeMonths = monthlyChurnRate > 0 ? 1 / (monthlyChurnRate / 100) : 0;
    const ltv = arpu * customerLifetimeMonths * (grossMargin / 100);
    const ltvCacRatio = cac > 0 ? ltv / cac : 0;
    const paybackPeriod = arpu > 0 && grossMargin > 0 ? cac / (arpu * (grossMargin / 100)) : 0;

    return {
      cac,
      customerLifetimeMonths,
      ltv,
      ltvCacRatio,
      paybackPeriod,
    };
  }, [marketingCosts, salesCosts, newCustomers, arpu, grossMargin, monthlyChurnRate]);

  // Status helpers
  const getLtvCacStatus = (ratio: number): 'good' | 'warning' | 'bad' | 'neutral' => {
    if (ratio === 0) return 'neutral';
    if (ratio >= 3) return 'good';
    if (ratio >= 1) return 'warning';
    return 'bad';
  };

  const getPaybackStatus = (months: number): 'good' | 'warning' | 'bad' | 'neutral' => {
    if (months === 0) return 'neutral';
    if (months <= 12) return 'good';
    if (months <= 18) return 'warning';
    return 'bad';
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000) return `€${(value / 1000).toFixed(1)}k`;
    return `€${value.toFixed(0)}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <CardTitle>Unit Economics Calculator</CardTitle>
        </div>
        <CardDescription>
          Calculate your key SaaS metrics: CAC, LTV, LTV/CAC ratio, and payback period
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Customer Acquisition
            </h4>
            <MetricInput
              label="Marketing Costs (monthly)"
              value={marketingCosts}
              onChange={setMarketingCosts}
              prefix="€"
              tooltip="Total monthly spend on marketing: ads, content, events, etc."
            />
            <MetricInput
              label="Sales Costs (monthly)"
              value={salesCosts}
              onChange={setSalesCosts}
              prefix="€"
              tooltip="Total monthly sales costs: salaries, commissions, tools"
            />
            <MetricInput
              label="New Customers (monthly)"
              value={newCustomers}
              onChange={setNewCustomers}
              tooltip="Number of new paying customers acquired this month"
            />
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Revenue & Retention
            </h4>
            <MetricInput
              label="ARPU (monthly)"
              value={arpu}
              onChange={setArpu}
              prefix="€"
              tooltip="Average Revenue Per User per month"
            />
            <MetricInput
              label="Gross Margin"
              value={grossMargin}
              onChange={setGrossMargin}
              suffix="%"
              tooltip="Revenue minus cost of goods sold (typically 70-90% for SaaS)"
            />
            <MetricInput
              label="Monthly Churn Rate"
              value={monthlyChurnRate}
              onChange={setMonthlyChurnRate}
              suffix="%"
              tooltip="Percentage of customers who cancel each month"
            />
          </div>
        </div>

        <Separator />

        {/* Results Section */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Calculated Metrics
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ResultCard
              label="CAC"
              value={metrics.cac > 0 ? formatCurrency(metrics.cac) : '-'}
              status="neutral"
              description="Cost to acquire one customer"
            />
            <ResultCard
              label="LTV"
              value={metrics.ltv > 0 ? formatCurrency(metrics.ltv) : '-'}
              status="neutral"
              description="Lifetime value per customer"
            />
            <ResultCard
              label="LTV:CAC Ratio"
              value={metrics.ltvCacRatio > 0 ? `${metrics.ltvCacRatio.toFixed(1)}x` : '-'}
              status={getLtvCacStatus(metrics.ltvCacRatio)}
              description={metrics.ltvCacRatio >= 3 ? 'Healthy ratio (≥3x)' : metrics.ltvCacRatio >= 1 ? 'Needs improvement' : 'Below target'}
            />
            <ResultCard
              label="Payback Period"
              value={metrics.paybackPeriod > 0 ? `${metrics.paybackPeriod.toFixed(1)} mo` : '-'}
              status={getPaybackStatus(metrics.paybackPeriod)}
              description={metrics.paybackPeriod <= 12 ? 'Good (≤12 months)' : 'Consider reducing CAC'}
            />
          </div>

          {/* Customer Lifetime */}
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Customer Lifetime</p>
                <p className="text-lg font-semibold">
                  {metrics.customerLifetimeMonths > 0 
                    ? `${metrics.customerLifetimeMonths.toFixed(1)} months`
                    : '-'}
                </p>
              </div>
              <Badge variant="outline">
                Based on {monthlyChurnRate}% monthly churn
              </Badge>
            </div>
          </div>
        </div>

        {/* Benchmarks */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p><strong>Benchmarks:</strong></p>
          <p>• LTV:CAC ratio should be ≥ 3x for a healthy business</p>
          <p>• CAC payback period should be ≤ 12 months</p>
          <p>• Monthly churn rate of 5% = ~20 month customer lifetime</p>
        </div>
      </CardContent>
    </Card>
  );
}
