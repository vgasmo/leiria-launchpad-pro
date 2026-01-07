import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, FileText, ListTodo, MessageSquare, File, Target, StickyNote } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useGlobalSearch, SearchResult } from '@/hooks/useGlobalSearch';

const typeIcons: Record<string, React.ReactNode> = {
  session: <FileText className="h-4 w-4" />,
  action: <ListTodo className="h-4 w-4" />,
  note: <StickyNote className="h-4 w-4" />,
  document: <File className="h-4 w-4" />,
  message: <MessageSquare className="h-4 w-4" />,
  milestone: <Target className="h-4 w-4" />,
};

const typeLabels: Record<string, string> = {
  session: 'Sessões',
  action: 'Ações',
  note: 'Notas',
  document: 'Documentos',
  message: 'Mensagens',
  milestone: 'Milestones',
};

export function GlobalSearchInput() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = query; // Simple debounce could be added
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: results, isLoading } = useGlobalSearch({ query: debouncedQuery });

  // Group results by type
  const groupedResults = results?.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>) || {};

  const handleSelect = (result: SearchResult) => {
    navigate(result.url);
    setOpen(false);
    setQuery('');
  };

  const handleViewAll = () => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
    setOpen(false);
  };

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Popover open={open && query.length >= 2} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full max-w-[200px] sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Pesquisar..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.length >= 2) setOpen(true);
            }}
            onFocus={() => query.length >= 2 && setOpen(true)}
            className="pl-9 pr-8 text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[400px] p-0" align="start">
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">A pesquisar...</div>
          ) : Object.keys(groupedResults).length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Sem resultados para "{query}"
            </div>
          ) : (
            <div className="divide-y">
              {Object.entries(groupedResults).map(([type, items]) => (
                <div key={type} className="p-2">
                  <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                    {typeIcons[type]}
                    {typeLabels[type]} ({items.length})
                  </div>
                  {items.slice(0, 3).map(result => (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      className="w-full text-left px-2 py-2 rounded hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">{result.title}</span>
                        {result.workspace_name && (
                          <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                            {result.workspace_name}
                          </Badge>
                        )}
                      </div>
                      {result.snippet && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {result.snippet}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {results && results.length > 0 && (
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full" onClick={handleViewAll}>
              Ver todos os resultados
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
