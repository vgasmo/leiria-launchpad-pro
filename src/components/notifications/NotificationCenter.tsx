import { useState } from 'react';
import { Bell, CheckCheck, Trash2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useDeleteNotification } from '@/hooks/useNotifications';
import { formatRelativeTime } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

const notificationTypeIcons: Record<string, string> = {
  template_review: '📋',
  session_reminder: '📅',
  action_due: '⚠️',
  mention: '💬',
  milestone_completed: '🎉',
  stage_change: '🚀',
  // CRM notification types
  task_due: '⏰',
  task_overdue: '🔴',
  next_action_due: '📌',
  next_action_overdue: '❗',
  overdue_escalated: '🚨',
  recap_ready: '✨',
  email_sync_done: '📧',
  // Automation types
  discount_expiring: '💸',
  contract_anniversary: '🎂',
  founder_inactive: '😴',
  contract_expiring: '📄',
  checkin_overdue: '📝',
  kpi_stale: '📊',
  crm_lead_stale: '🕐',
  milestone_overdue: '🚩',
  pending_approval: '👤',
  intake_stale: '📨',
  session_no_notes: '✏️',
  workspace_no_consultant: '🔍',
};

const notificationTypeColors: Record<string, string> = {
  template_review: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  session_reminder: 'bg-green-500/10 text-green-600 dark:text-green-400',
  action_due: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  mention: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  milestone_completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  stage_change: 'bg-primary/10 text-primary',
  // CRM notification types
  task_due: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  task_overdue: 'bg-destructive/10 text-destructive',
  next_action_due: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  next_action_overdue: 'bg-destructive/10 text-destructive',
  overdue_escalated: 'bg-destructive/10 text-destructive',
  recap_ready: 'bg-primary/10 text-primary',
  email_sync_done: 'bg-green-500/10 text-green-600 dark:text-green-400',
  // Automation types
  discount_expiring: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  contract_anniversary: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  founder_inactive: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  contract_expiring: 'bg-destructive/10 text-destructive',
  checkin_overdue: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  kpi_stale: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  crm_lead_stale: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  milestone_overdue: 'bg-destructive/10 text-destructive',
  pending_approval: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  intake_stale: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  session_no_notes: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  workspace_no_consultant: 'bg-destructive/10 text-destructive',
};

export function NotificationCenter() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markRead.mutate(notification.id);
    }
    if (notification.link) {
      setOpen(false);
      navigate(notification.link);
    }
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification.mutate(id);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative text-muted-foreground hover:text-foreground"
          data-tour="notifications"
          aria-label={t('notifications.title')}
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center animate-pulse-soft" aria-label={`${unreadCount} unread`}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold text-sm">{t('notifications.title')}</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" aria-hidden="true" />
              {t('notifications.markAllRead')}
            </Button>
          )}
        </div>
        
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground text-sm" aria-live="polite">
              {t('common.loading')}
            </div>
          ) : notifications?.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">{t('notifications.noNotifications')}</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications?.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "flex items-start gap-3 p-3 cursor-pointer transition-colors hover:bg-muted/50",
                    !notification.read && "bg-primary/5"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-sm flex-shrink-0",
                    notificationTypeColors[notification.type] || "bg-muted"
                  )}>
                    {notificationTypeIcons[notification.type] || '📣'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        "text-sm leading-tight",
                        !notification.read && "font-medium"
                      )}>
                        {notification.title}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                        onClick={(e) => handleDelete(e, notification.id)}
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                      </Button>
                    </div>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelativeTime(notification.created_at)}
                      </span>
                      {notification.link && (
                        <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" aria-hidden="true" />
                      )}
                      {!notification.read && (
                        <Badge variant="secondary" className="h-4 text-[9px] px-1">
                          New
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {notifications && notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button 
                variant="ghost" 
                className="w-full h-8 text-xs"
                onClick={() => {
                  setOpen(false);
                  navigate('/settings?tab=notifications');
                }}
              >
                {t('notifications.settings')}
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
