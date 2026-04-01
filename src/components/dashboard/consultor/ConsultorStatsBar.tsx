import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Calendar, Users, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface ConsultorStatsBarProps {
  stats: {
    total: number;
    needsAttention: number;
    upcomingMeetingsCount: number;
    overdueActionsCount: number;
  };
}

export const ConsultorStatsBar = memo(function ConsultorStatsBar({ stats }: ConsultorStatsBarProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <Card interactive className="p-4 rounded-2xl border-border/60">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('dashboard.totalStartups')}</p>
            <p className="text-3xl font-semibold">{stats.total}</p>
          </div>
          <Users className="h-5 w-5 text-muted-foreground/50" />
        </div>
      </Card>

      <Card 
        interactive
        className={`p-4 rounded-2xl border-border/60 cursor-pointer transition-all hover:shadow-sm ${
          stats.needsAttention > 0 ? 'border-health-at-risk/30' : ''
        }`}
        onClick={() => navigate('/my-workspaces?filter=attention')}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('dashboard.needsAttention')}</p>
            <p className={`text-3xl font-semibold ${stats.needsAttention > 0 ? 'text-health-at-risk' : ''}`}>
              {stats.needsAttention}
            </p>
          </div>
          <AlertCircle className={`h-5 w-5 ${stats.needsAttention > 0 ? 'text-health-at-risk/60' : 'text-muted-foreground/50'}`} />
        </div>
      </Card>

      <Card interactive className="p-4 rounded-2xl border-border/60">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('dashboard.meetingsThisWeek')}</p>
            <p className="text-3xl font-semibold">{stats.upcomingMeetingsCount}</p>
          </div>
          <Calendar className="h-5 w-5 text-muted-foreground/50" />
        </div>
      </Card>

      <Card className="p-4 rounded-2xl border-border/60">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('dashboard.overdueActions')}</p>
            <p className={`text-3xl font-semibold ${stats.overdueActionsCount > 0 ? 'text-health-critical' : ''}`}>
              {stats.overdueActionsCount}
            </p>
          </div>
          <AlertTriangle className={`h-5 w-5 ${stats.overdueActionsCount > 0 ? 'text-health-critical/60' : 'text-muted-foreground/50'}`} />
        </div>
      </Card>
    </section>
  );
});
