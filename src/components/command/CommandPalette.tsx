import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, FileText, ListTodo, StickyNote, File, Target, MessageSquare,
  Calendar, CheckSquare, BarChart3, Users, Building2, Settings, Home,
  Briefcase, ArrowRight, Command as CommandIcon, Sparkles, Bot, Loader2,
  AlertTriangle,
} from 'lucide-react';
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useGlobalSearch, SearchResult } from '@/hooks/useGlobalSearch';
import { useAuth } from '@/contexts/AuthContext';

const typeIcons: Record<string, React.ReactNode> = {
  session: <Calendar className="h-4 w-4 text-muted-foreground" />,
  action: <ListTodo className="h-4 w-4 text-muted-foreground" />,
  note: <StickyNote className="h-4 w-4 text-muted-foreground" />,
  document: <File className="h-4 w-4 text-muted-foreground" />,
  message: <MessageSquare className="h-4 w-4 text-muted-foreground" />,
  milestone: <Target className="h-4 w-4 text-muted-foreground" />,
};

export function CommandPalette() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, isConsultor, isStaff, isMentor, isFounder } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [copilotMode, setCopilotMode] = useState(false);
  const [copilotThinking, setCopilotThinking] = useState(false);
  const [copilotAnswer, setCopilotAnswer] = useState<string | null>(null);

  const { data: searchResults } = useGlobalSearch({ query: copilotMode ? '' : query });

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const runAction = useCallback((path: string) => {
    navigate(path);
    setOpen(false);
    setQuery('');
  }, [navigate]);

  // Extract workspace ID from current path
  const workspaceMatch = location.pathname.match(/\/workspace\/([a-f0-9-]+)/);
  const currentWorkspaceId = workspaceMatch?.[1];

  // Quick actions based on context
  const quickActions = [];

  if (currentWorkspaceId) {
    quickActions.push(
      { id: 'kpis', label: t('quickActions.updateKpis'), icon: <BarChart3 className="h-4 w-4" />, path: `/workspace/${currentWorkspaceId}?tab=kpis` },
      { id: 'action', label: t('quickActions.newAction'), icon: <CheckSquare className="h-4 w-4" />, path: `/workspace/${currentWorkspaceId}?tab=actions` },
      { id: 'session', label: t('quickActions.scheduleSession'), icon: <Calendar className="h-4 w-4" />, path: `/workspace/${currentWorkspaceId}?tab=agenda` },
      { id: 'document', label: t('quickActions.uploadDocument'), icon: <FileText className="h-4 w-4" />, path: `/workspace/${currentWorkspaceId}?tab=documents` },
    );
  }

  // Navigation items based on role
  const navItems = [
    { id: 'home', label: t('nav.home'), icon: <Home className="h-4 w-4" />, path: '/my-workspaces' },
    { id: 'settings', label: t('nav.settings'), icon: <Settings className="h-4 w-4" />, path: '/settings' },
  ];

  if (isStaff) {
    navItems.push(
      { id: 'crm', label: t('nav.crm'), icon: <Briefcase className="h-4 w-4" />, path: '/crm' },
      { id: 'admin', label: t('nav.adminPanel'), icon: <Building2 className="h-4 w-4" />, path: '/admin' },
    );
  }
  if (isStaff || isMentor) {
    navItems.push(
      { id: 'mentors', label: t('nav.mentors'), icon: <Users className="h-4 w-4" />, path: '/mentors' },
    );
  }

  // Group search results by type
  const groupedResults = searchResults?.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>) || {};

  const typeLabels: Record<string, string> = {
    session: t('search.types.sessions'),
    action: t('search.types.actions'),
    note: t('search.types.notes'),
    document: t('search.types.documents'),
    message: t('search.types.messages'),
    milestone: t('search.types.milestones'),
  };

  const hasSearchResults = searchResults && searchResults.length > 0;
  const showQuickActions = !query && quickActions.length > 0;
  const showNav = !query || query.length < 2;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder={t('commandPalette.placeholder')}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {query.length >= 2
            ? t('search.noResultsFor', { query })
            : t('commandPalette.typeToSearch')}
        </CommandEmpty>

        {/* Search Results */}
        {hasSearchResults && Object.entries(groupedResults).map(([type, items]) => (
          <CommandGroup key={type} heading={typeLabels[type] || type}>
            {items.slice(0, 5).map(result => (
              <CommandItem
                key={result.id}
                onSelect={() => runAction(result.url)}
                className="flex items-center gap-3"
              >
                {typeIcons[result.type]}
                <div className="flex-1 min-w-0">
                  <span className="text-sm truncate block">{result.title}</span>
                  {result.snippet && (
                    <span className="text-xs text-muted-foreground truncate block">{result.snippet.slice(0, 80)}</span>
                  )}
                </div>
                {result.workspace_name && (
                  <Badge variant="outline" className="text-xs flex-shrink-0">{result.workspace_name}</Badge>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        {/* Quick Actions */}
        {showQuickActions && (
          <>
            {hasSearchResults && <CommandSeparator />}
            <CommandGroup heading={t('commandPalette.quickActions')}>
              {quickActions.map(action => (
                <CommandItem key={action.id} onSelect={() => runAction(action.path)} className="gap-3">
                  {action.icon}
                  <span>{action.label}</span>
                  <ArrowRight className="ml-auto h-3 w-3 text-muted-foreground" />
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Navigation */}
        {showNav && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t('commandPalette.navigation')}>
              {navItems.map(item => (
                <CommandItem key={item.id} onSelect={() => runAction(item.path)} className="gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
