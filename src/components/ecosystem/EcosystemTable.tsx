import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Building2, Users, ExternalLink, Calendar, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
        title={t('ecosystem.noItems', 'No items found')}
        description={t('ecosystem.noItemsDesc', 'Try adjusting your filters or search criteria')}
      />
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">{t('ecosystem.name', 'Name')}</TableHead>
            <TableHead className="w-[80px]">{t('ecosystem.type', 'Type')}</TableHead>
            <TableHead>{t('workspace.program', 'Program')}</TableHead>
            <TableHead>{t('workspace.stage', 'Stage')}</TableHead>
            <TableHead>{t('workspace.healthScore', 'Health')}</TableHead>
            <TableHead>{t('ecosystem.owner', 'Owner')}</TableHead>
            <TableHead>{t('ecosystem.lastActivity', 'Last Activity')}</TableHead>
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
                  {item.name || t('common.unknown', 'Unknown')}
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
                    ? t('ecosystem.workspace', 'Workspace') 
                    : t('ecosystem.lead', 'Lead')}
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
                      {t('ecosystem.openDetail', 'Open Details')}
                    </DropdownMenuItem>
                    {item.item_type === 'workspace' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { 
                          e.stopPropagation(); 
                          navigate(`/workspace/${item.workspace_id}?tab=agenda`);
                        }}>
                          <Calendar className="h-4 w-4 mr-2" />
                          {t('ecosystem.scheduleSession', 'Schedule Session')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { 
                          e.stopPropagation(); 
                          navigate(`/workspace/${item.workspace_id}?tab=team`);
                        }}>
                          <Users className="h-4 w-4 mr-2" />
                          {t('ecosystem.manageTeam', 'Manage Team')}
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
  );
}
