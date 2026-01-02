import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, X, Calendar, CheckSquare, BarChart3, MessageSquare, FileText, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  tab?: string;
}

export function GlobalQuickActions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [showFab, setShowFab] = useState(false);

  // Show FAB on workspace-related pages
  useEffect(() => {
    const isWorkspacePage = location.pathname.includes('/workspace') || 
                            location.pathname === '/' ||
                            location.pathname === '/my-workspaces';
    setShowFab(isWorkspacePage);
  }, [location.pathname]);

  // Extract workspace ID from current path if on workspace detail page
  const workspaceMatch = location.pathname.match(/\/workspace\/([a-f0-9-]+)/);
  const currentWorkspaceId = workspaceMatch?.[1];

  const actions: QuickAction[] = [
    { 
      id: 'kpis', 
      label: t('quickActions.updateKpis'),
      description: t('quickActions.updateKpisDesc'),
      icon: <BarChart3 className="h-5 w-5" />,
      path: currentWorkspaceId ? `/workspace/${currentWorkspaceId}` : '/my-workspaces',
      tab: 'kpis',
    },
    { 
      id: 'action', 
      label: t('quickActions.newAction'),
      description: t('quickActions.newActionDesc'),
      icon: <CheckSquare className="h-5 w-5" />,
      path: currentWorkspaceId ? `/workspace/${currentWorkspaceId}` : '/my-workspaces',
      tab: 'actions',
    },
    { 
      id: 'session', 
      label: t('quickActions.scheduleSession'),
      description: t('quickActions.scheduleSessionDesc'),
      icon: <Calendar className="h-5 w-5" />,
      path: currentWorkspaceId ? `/workspace/${currentWorkspaceId}` : '/my-workspaces',
      tab: 'sessions',
    },
    { 
      id: 'milestone', 
      label: t('quickActions.addMilestone'),
      description: t('quickActions.addMilestoneDesc'),
      icon: <Target className="h-5 w-5" />,
      path: currentWorkspaceId ? `/workspace/${currentWorkspaceId}` : '/my-workspaces',
      tab: 'milestones',
    },
    { 
      id: 'document', 
      label: t('quickActions.uploadDocument'),
      description: t('quickActions.uploadDocumentDesc'),
      icon: <FileText className="h-5 w-5" />,
      path: currentWorkspaceId ? `/workspace/${currentWorkspaceId}` : '/my-workspaces',
      tab: 'documents',
    },
    { 
      id: 'checkin', 
      label: t('quickActions.weeklyCheckin'),
      description: t('quickActions.weeklyCheckinDesc'),
      icon: <MessageSquare className="h-5 w-5" />,
      path: currentWorkspaceId ? `/workspace/${currentWorkspaceId}` : '/my-workspaces',
      tab: 'checkins',
    },
  ];

  const handleActionClick = (action: QuickAction) => {
    if (action.tab) {
      navigate(`${action.path}?tab=${action.tab}`);
    } else {
      navigate(action.path);
    }
    setIsOpen(false);
  };

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open quick actions
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!showFab) return null;

  return (
    <>
      {/* FAB Button - visible on mobile and desktop */}
      <div className="fixed bottom-6 right-6 z-50 md:bottom-8 md:right-8">
        <Button
          size="lg"
          className={cn(
            "h-14 w-14 rounded-full shadow-xl transition-all duration-200",
            "hover:scale-105 active:scale-95",
            isOpen && "rotate-45 bg-destructive hover:bg-destructive"
          )}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={t('quickActions.openMenu')}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </Button>
      </div>

      {/* Quick Actions Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('quickActions.title')}</DialogTitle>
            <DialogDescription>
              {t('quickActions.description')}
              <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded">⌘K</span>
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-4">
            {actions.map((action) => (
              <Button
                key={action.id}
                variant="ghost"
                className="h-auto py-3 px-4 justify-start gap-4 hover:bg-muted"
                onClick={() => handleActionClick(action)}
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                  {action.icon}
                </div>
                <div className="text-left">
                  <div className="font-medium">{action.label}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
