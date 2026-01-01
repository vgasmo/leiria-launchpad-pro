import React from 'react';
import { useCohortAnalytics } from '@/hooks/useCohortAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { usePrograms } from '@/hooks/useWorkspaces';
import { useState } from 'react';
import { Users, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';

const HEALTH_COLORS: Record<string, string> = {
  critical: '#ef4444',
  at_risk: '#f59e0b',
  stable: '#6b7280',
  healthy: '#22c55e',
  thriving: '#10b981',
};

const STAGE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export function CohortAnalytics() {
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const { data: programs } = usePrograms();
  const { data: stats, isLoading } = useCohortAnalytics(selectedProgram === 'all' ? undefined : selectedProgram);

  const aggregateStats = stats?.reduce((acc, s) => ({
    totalStartups: acc.totalStartups + s.totalStartups,
    avgPendingActions: acc.avgPendingActions + s.avgPendingActions,
    avgOverdueActions: acc.avgOverdueActions + s.avgOverdueActions,
    kpiCompletionRate: acc.kpiCompletionRate + s.kpiCompletionRate,
    healthDistribution: {
      critical: acc.healthDistribution.critical + s.healthDistribution.critical,
      at_risk: acc.healthDistribution.at_risk + s.healthDistribution.at_risk,
      stable: acc.healthDistribution.stable + s.healthDistribution.stable,
      healthy: acc.healthDistribution.healthy + s.healthDistribution.healthy,
      thriving: acc.healthDistribution.thriving + s.healthDistribution.thriving,
    },
  }), {
    totalStartups: 0,
    avgPendingActions: 0,
    avgOverdueActions: 0,
    kpiCompletionRate: 0,
    healthDistribution: { critical: 0, at_risk: 0, stable: 0, healthy: 0, thriving: 0 },
  });

  const programCount = stats?.length || 1;
  const normalizedStats = aggregateStats ? {
    ...aggregateStats,
    avgPendingActions: aggregateStats.avgPendingActions / programCount,
    avgOverdueActions: aggregateStats.avgOverdueActions / programCount,
    kpiCompletionRate: aggregateStats.kpiCompletionRate / programCount,
  } : null;

  const healthChartData = normalizedStats ? Object.entries(normalizedStats.healthDistribution)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({ name: status, value: count, fill: HEALTH_COLORS[status] })) : [];

  const stageData = stats?.flatMap(s => 
    Object.entries(s.stageDistribution).map(([stage, count]) => ({
      program: s.programName,
      stage,
      count,
    }))
  ) || [];

  // Group by stage for stacked view
  const stageChartData = Array.from(new Set(stageData.map(d => d.stage))).map(stage => ({
    stage,
    count: stageData.filter(d => d.stage === stage).reduce((sum, d) => sum + d.count, 0),
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-8 w-16 bg-muted rounded mb-2" />
                <div className="h-4 w-24 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Program Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Cohort Analytics</h2>
        <Select value={selectedProgram} onValueChange={setSelectedProgram}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select program" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            {programs?.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Startups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{normalizedStats?.totalStartups || 0}</div>
            <p className="text-xs text-muted-foreground">across {stats?.length || 0} programs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Avg Overdue Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{normalizedStats?.avgOverdueActions.toFixed(1) || 0}</div>
            <p className="text-xs text-muted-foreground">per startup</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Pending Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{normalizedStats?.avgPendingActions.toFixed(1) || 0}</div>
            <p className="text-xs text-muted-foreground">per startup</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              KPI Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{normalizedStats?.kpiCompletionRate.toFixed(0) || 0}%</div>
            <Progress value={normalizedStats?.kpiCompletionRate || 0} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Health Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={healthChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {healthChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stage Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Stage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {stageChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stageChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6">
                    {stageChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={STAGE_COLORS[index % STAGE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-Program Breakdown */}
      {stats && stats.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Program Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.map(program => (
                <div key={program.programId} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{program.programName}</h4>
                    <span className="text-sm text-muted-foreground">{program.totalStartups} startups</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Critical/At Risk</span>
                      <p className="font-medium text-red-500">
                        {program.healthDistribution.critical + program.healthDistribution.at_risk}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Healthy/Thriving</span>
                      <p className="font-medium text-green-500">
                        {program.healthDistribution.healthy + program.healthDistribution.thriving}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Avg Overdue</span>
                      <p className="font-medium">{program.avgOverdueActions.toFixed(1)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">KPI Rate</span>
                      <p className="font-medium">{program.kpiCompletionRate.toFixed(0)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
