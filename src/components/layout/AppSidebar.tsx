import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Settings, 
  LogOut, 
  Building2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Users,
  MessageCircle,
  Lightbulb,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAttentionCount } from '@/hooks/useAttentionCount';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import startupLeiriaLogo from '@/assets/startup-leiria-logo.png';
import { MessagingPanel } from '@/components/messaging/MessagingPanel';

export function AppSidebar() {
  const location = useLocation();
  const { t } = useTranslation();
  const { profile, isAdmin, isMentor, isConsultor, roles, signOut } = useAuth();
  const isFounder = roles.includes('founder');
  const showConsultorTools = isAdmin || isConsultor || roles.includes('consultor');
  const [collapsed, setCollapsed] = useState(false);
  const [messagingOpen, setMessagingOpen] = useState(false);

  const navigation = [
    { name: t('nav.myWorkspaces'), href: '/my-workspaces', icon: Building2 },
  ];

  const adminNavigation = [
    { name: t('nav.adminPanel'), href: '/admin', icon: Settings },
  ];

  // Real notification count from database
  const { data: attentionStats, isLoading: attentionLoading } = useAttentionCount();
  const notificationCount = attentionStats?.totalAttention || 0;

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 z-40 h-screen gradient-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className={cn(
          "flex h-16 items-center border-b border-sidebar-border transition-all duration-300",
          collapsed ? "justify-center px-2" : "justify-center px-4"
        )}>
          <img 
            src={startupLeiriaLogo} 
            alt="FoundersBook" 
            className={cn(
              "transition-all duration-300 brightness-0 invert",
              collapsed ? "h-8 w-8 object-contain" : "h-10 w-auto"
            )}
          />
        </div>

        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-sidebar-border bg-sidebar-background text-sidebar-foreground hover:bg-sidebar-accent shadow-md z-50"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto scrollbar-thin" data-tour="workspaces">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/' && location.pathname.startsWith(item.href));
            
            const NavItem = (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <span className="animate-fade-in">{item.name}</span>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.name} delayDuration={0}>
                  <TooltipTrigger asChild>{NavItem}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              );
            }
            return NavItem;
          })}

          {/* Find Mentors - visible to founders and mentors */}
          {(isFounder || isMentor) && (
            <>
              <div className="my-4 h-px bg-sidebar-border" />
              {(() => {
                const isActive = location.pathname === '/mentors';
                const NavItem = (
                  <Link
                    to="/mentors"
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    <Users className="h-5 w-5 shrink-0" />
                    {!collapsed && (
                      <span className="animate-fade-in">{t('nav.findMentors')}</span>
                    )}
                  </Link>
                );

                if (collapsed) {
                  return (
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>{NavItem}</TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        {t('nav.findMentors')}
                      </TooltipContent>
                    </Tooltip>
                  );
                }
                return NavItem;
              })()}
            </>
          )}

          {/* Consultor Tools */}
          {showConsultorTools && (
            <>
              <div className="my-4 h-px bg-sidebar-border" />
              {(() => {
                const isActive = location.pathname === '/consultor-tools';
                const NavItem = (
                  <Link
                    to="/consultor-tools"
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    <Lightbulb className="h-5 w-5 shrink-0" />
                    {!collapsed && (
                      <span className="animate-fade-in">{t('nav.consultorTools', 'Consultor Tools')}</span>
                    )}
                  </Link>
                );

                if (collapsed) {
                  return (
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>{NavItem}</TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        {t('nav.consultorTools', 'Consultor Tools')}
                      </TooltipContent>
                    </Tooltip>
                  );
                }
                return NavItem;
              })()}
            </>
          )}

          {isAdmin && (
            <>
              <div className="my-4 h-px bg-sidebar-border" />
              {adminNavigation.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                
                const NavItem = (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && (
                      <span className="animate-fade-in">{item.name}</span>
                    )}
                  </Link>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.name} delayDuration={0}>
                      <TooltipTrigger asChild>{NavItem}</TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        {item.name}
                      </TooltipContent>
                    </Tooltip>
                  );
                }
                return NavItem;
              })}
            </>
          )}
        </nav>

        {/* Notifications */}
        {attentionLoading ? (
          <div className={cn("mx-3 mb-3", collapsed ? "p-2" : "p-3")}>
            <Skeleton className="h-10 w-full" />
          </div>
        ) : notificationCount > 0 ? (
          <Link
            to="/my-workspaces?filter=attention"
            className={cn(
              "mx-3 mb-3 rounded-lg bg-destructive/10 border border-destructive/20 transition-all duration-300 block hover:bg-destructive/20 cursor-pointer",
              collapsed ? "p-2" : "p-3"
            )}
            data-tour="notifications"
          >
            {collapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="flex justify-center">
                    <div className="relative">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                      <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
                        {notificationCount > 9 ? '9+' : notificationCount}
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {t('dashboard.itemsNeedAttention', { count: notificationCount })}
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex items-center gap-3 animate-fade-in">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-destructive">
                    {t('dashboard.itemsNeedAttention', { count: notificationCount })}
                  </p>
                  {attentionStats && (
                    <p className="text-[10px] text-destructive/70 truncate">
                      {[
                        attentionStats.criticalCount > 0 && `${attentionStats.criticalCount} ${t('health.critical').toLowerCase()}`,
                        attentionStats.atRiskCount > 0 && `${attentionStats.atRiskCount} ${t('health.at_risk').toLowerCase()}`,
                        attentionStats.overdueCount > 0 && `${attentionStats.overdueCount} ${t('actions.overdue').toLowerCase()}`,
                      ].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </Link>
        ) : null}

        {/* Help/Glossary - visible to founders */}
        {isFounder && (
          <div className={cn("mx-3 mb-2", collapsed ? "text-center" : "")}>
            {collapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    to="/help"
                    className={cn(
                      "flex items-center justify-center h-10 w-10 rounded-lg transition-colors",
                      location.pathname === '/help' 
                        ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <HelpCircle className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{t('nav.helpGlossary', 'Ajuda e Glossário')}</TooltipContent>
              </Tooltip>
            ) : (
              <Link
                to="/help"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 w-full",
                  location.pathname === '/help' 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" 
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <HelpCircle className="h-5 w-5" />
                {t('nav.helpGlossary', 'Ajuda e Glossário')}
              </Link>
            )}
          </div>
        )}

        {/* Messaging button */}
        <div className={cn("mx-3 mb-2", collapsed ? "text-center" : "")}>
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMessagingOpen(true)}
                  className="h-10 w-10 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  <MessageCircle className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{t('common.messages')}</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              onClick={() => setMessagingOpen(true)}
              className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <MessageCircle className="h-5 w-5" />
              {t('common.messages')}
            </Button>
          )}
        </div>

        {/* User section */}
        <div className="border-t border-sidebar-border p-3">
          <div className={cn(
            "flex items-center rounded-lg bg-sidebar-accent/30 transition-all duration-300",
            collapsed ? "justify-center p-2" : "gap-3 p-3"
          )}>
            <Avatar className={cn(
              "transition-all duration-300",
              collapsed ? "h-8 w-8" : "h-9 w-9"
            )}>
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0 animate-fade-in">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-sidebar-muted truncate">
                    {profile?.email}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
                  onClick={() => signOut()}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          {collapsed && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full mt-2 h-8 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  onClick={() => signOut()}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{t('auth.signOut')}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Messaging Panel */}
      <MessagingPanel open={messagingOpen} onOpenChange={setMessagingOpen} />
    </aside>
  );
}
