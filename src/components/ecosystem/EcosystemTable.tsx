import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Building2, Users, ExternalLink, Calendar, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { StageBadge } from '@/components/ui/StageBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { EcosystemItem } from '@/hooks/useEcosystemItems';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  items: EcosystemItem[];
  onOpenItem: (item: EcosystemItem) => void;
}

export function EcosystemTable({ items, onOpenItem }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title={t('ecosystem.noItems', { defaultValue: 'No items found' })}
        description={t('ecosystem.noItemsDesc', { defaultValue: 'Try adjusting your filters or search criteria' })}
      />
    );
  }

  return (
    <>
      {/* ── Mobile: stacked cards ── */}
      <div className="flex flex-col gap-3 md:hidden">
        {items.map(item => (
          <Card
            key={item.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onOpenItem(item)}
          >
            <CardContent className="p-4 space-y-3">
              {/* Row 1: Name + type badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-sm truncate">{item.name || t('common.unknown', { defaultValue: 'Unknown' })}</span>
                  {item.overdue_actions_count && item.overdue_actions_count > 0 && (
                    <Badge variant="destructive" className="text-xs shrink-0">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {item.overdue_actions_count}
                    </Badge>
                  )}
                </div>
                <Badge variant={item.item_type === 'workspace' ? 'default' : 'secondary'} className="shrink-0 text-xs">
                  {item.item_type === 'workspace' 
                    ? t('ecosystem.workspace', { defaultValue: 'Workspace' }) 
                    : t('ecosystem.lead', { defaultValue: 'Lead' })}
                </Badge>
              </div>

              {/* Row 2: Stage + Health */}
              <div className="flex items-center gap-2 flex-wrap">
                {item.stage && <StageBadge stage={item.stage as any} />}
                {item.health_score && <HealthBadge score={item.health_score as any} />}
                {item.program_name && (
                  <span className="text-xs text-muted-foreground">{item.program_name}</span>
                )}
              </div>

              {/* Row 3: Owner + Last Activity */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{item.owner_name || '-'}</span>
                <span>
                  {item.last_activity_at 
                    ? formatDistanceToNow(new Date(item.last_activity_at), { addSuffix: true })
                    : '-'}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Desktop: standard table ── */}
      <div className="border rounded-lg overflow-hidden hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">{t('ecosystem.name', { defaultValue: 'Name' })}</TableHead>
              <TableHead className="w-[80px]">{t('ecosystem.type', { defaultValue: 'Type' })}</TableHead>
              <TableHead>{t('workspace.program', { defaultValue: 'Program' })}</TableHead>
              <TableHead>{t('workspace.stage', { defaultValue: 'Stage' })}</TableHead>
              <TableHead>{t('workspace.healthScore', { defaultValue: 'Health' })}</TableHead>
              <TableHead>{t('ecosystem.owner', { defaultValue: 'Owner' })}</TableHead>
              <TableHead>{t('ecosystem.lastActivity', { defaultValue: 'Last Activity' })}</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => (
              <TableRow 
                key={item.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onOpenItem(item)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {item.name || t('common.unknown', { defaultValue: 'Unknown' })}
                    {item.overdue_actions_count && item.overdue_actions_count > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {item.overdue_actions_count}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={item.item_type === 'workspace' ? 'default' : 'secondary'}>
                    {item.item_type === 'workspace' 
                      ? t('ecosystem.workspace', { defaultValue: 'Workspace' }) 
                      : t('ecosystem.lead', { defaultValue: 'Lead' })}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.program_name || '-'}
                </TableCell>
                <TableCell>
                  {item.stage ? (
                    <StageBadge stage={item.stage as any} />
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {item.health_score ? (
                    <HealthBadge score={item.health_score as any} />
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.owner_name || '-'}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {item.last_activity_at 
                    ? formatDistanceToNow(new Date(item.last_activity_at), { addSuffix: true })
                    : '-'}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenItem(item); }}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {t('ecosystem.openDetail', { defaultValue: 'Open Details' })}
                      </DropdownMenuItem>
                      {item.item_type === 'workspace' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => { 
                            e.stopPropagation(); 
                            navigate(`/workspace/${item.workspace_id}?tab=agenda`);
                          }}>
                            <Calendar className="h-4 w-4 mr-2" />
                            {t('ecosystem.scheduleSession', { defaultValue: 'Schedule Session' })}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { 
                            e.stopPropagation(); 
                            navigate(`/workspace/${item.workspace_id}?tab=team`);
                          }}>
                            <Users className="h-4 w-4 mr-2" />
                            {t('ecosystem.manageTeam', { defaultValue: 'Manage Team' })}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}