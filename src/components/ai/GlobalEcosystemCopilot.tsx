import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_PROMPTS = [
  'Summarize my overdue tasks',
  "What's my next best action?",
  'How is my startup health?',
];

export function GlobalEcosystemCopilot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleSend = (text?: string) => {
    const content = text || input.trim();
    if (!content) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    // Simulate AI response
    setTimeout(() => {
      const reply: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: getSimulatedResponse(content),
      };
      setMessages(prev => [...prev, reply]);
      setIsThinking(false);
    }, 1200 + Math.random() * 800);
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full shadow-lg',
          'bg-primary text-primary-foreground',
          'flex items-center justify-center',
          'transition-all duration-300 hover:scale-110 hover:shadow-xl',
          'active:scale-95',
          'ring-2 ring-primary/20 ring-offset-2 ring-offset-background',
          // Hide on mobile when bottom nav is visible
          'lg:bottom-6 bottom-24',
        )}
        aria-label="Open AI Copilot"
      >
        <Sparkles className="h-5 w-5" />
      </button>

      {/* Chat Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col gap-0"
        >
          {/* Header */}
          <SheetHeader className="px-4 py-3 border-b border-border/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <SheetTitle className="text-sm font-semibold">Ecosystem Copilot</SheetTitle>
                <p className="text-[11px] text-muted-foreground">AI-powered assistant</p>
              </div>
              <Badge variant="secondary" className="text-[10px] gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-health-healthy animate-pulse" />
                Online
              </Badge>
            </div>
          </SheetHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
            {messages.length === 0 && !isThinking && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-1">
                  How can I help?
                </h4>
                <p className="text-xs text-muted-foreground max-w-[240px]">
                  Ask me anything about your startup, tasks, KPIs, or ecosystem.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-2',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                        <Bot className="h-3.5 w-3.5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted/60 text-foreground rounded-bl-md'
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isThinking && (
                <div className="flex gap-2 justify-start">
                  <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                      <Bot className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted/60 rounded-2xl rounded-bl-md px-4 py-3 space-y-2 max-w-[80%]">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Suggested Prompts */}
          {messages.length === 0 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
              {SUGGESTED_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className={cn(
                    'text-[11px] px-3 py-1.5 rounded-full border border-border/60',
                    'bg-card text-muted-foreground',
                    'hover:bg-primary/5 hover:text-foreground hover:border-primary/30',
                    'transition-all duration-200'
                  )}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 border-t border-border/60 shrink-0">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask anything..."
                className="flex-1 h-9 text-sm rounded-xl bg-muted/40 border-border/40"
                disabled={isThinking}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!input.trim() || isThinking}
                className="h-9 w-9 p-0 rounded-xl shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function getSimulatedResponse(query: string): string {
  const q = query.toLowerCase();
  if (q.includes('overdue') || q.includes('task'))
    return "You have action items that need attention. Head to your Actions tab to review and prioritize them. Focus on the highest-priority items first to keep your momentum going.";
  if (q.includes('health'))
    return "Your startup's health score reflects your KPI reporting, session activity, and milestone progress. Keep your metrics updated monthly and attend scheduled sessions to maintain a strong score.";
  if (q.includes('next') || q.includes('action'))
    return "Based on your current stage, I'd recommend updating your monthly KPIs and scheduling your next mentorship session. These two actions will have the biggest impact on your progress.";
  if (q.includes('kpi') || q.includes('metric'))
    return "Your KPIs are the pulse of your startup. Make sure to report them monthly — missing data lowers your health score and limits the insights your consultants can provide.";
  return "I'm here to help you navigate your incubation journey. You can ask me about your tasks, KPIs, sessions, health score, or next best actions. What would you like to know?";
}
