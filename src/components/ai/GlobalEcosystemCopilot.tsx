import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabaseClient } from '@/lib/supabaseClient';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/copilot-chat`;

export function GlobalEcosystemCopilot() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const suggestedPrompts = [
    t('copilot.promptOverdue', { defaultValue: 'Resumir tarefas em atraso' }),
    t('copilot.promptNextAction', { defaultValue: 'Qual é a minha melhor próxima ação?' }),
    t('copilot.promptHealth', { defaultValue: 'Como está a saúde da minha startup?' }),
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleSend = useCallback(async (text?: string) => {
    const content = text || input.trim();
    if (!content || isThinking) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsThinking(true);

    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let assistantSoFar = '';

    try {
      // Get the user's actual session token
      const { data: { session } } = await supabaseClient.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
        setIsThinking(false);
        return;
      }

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        const errMsg = errData.error || `Error ${resp.status}`;
        if (resp.status === 429) {
          toast.error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (resp.status === 402) {
          toast.error('AI credits exhausted. Please add credits in Settings.');
        } else {
          toast.error(errMsg);
        }
        setIsThinking(false);
        return;
      }

      if (!resp.body) {
        toast.error('No response stream received.');
        setIsThinking(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      const upsertAssistant = (nextChunk: string) => {
        assistantSoFar += nextChunk;
        const snapshot = assistantSoFar;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: snapshot } : m
            );
          }
          return [...prev, { id: crypto.randomUUID(), role: 'assistant', content: snapshot }];
        });
      };

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) upsertAssistant(delta);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) upsertAssistant(delta);
          } catch {
            /* ignore partial leftovers */
          }
        }
      }

      // If we got no content at all, show a fallback
      if (!assistantSoFar) {
        setMessages(prev => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: "I'm here to help! Could you rephrase your question?",
          },
        ]);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('Copilot stream error:', err);
      toast.error('Failed to reach the AI assistant. Please try again.');
    } finally {
      setIsThinking(false);
    }
  }, [input, isThinking, messages]);

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
                <SheetTitle className="text-sm font-semibold">{t('copilot.title', { defaultValue: 'Copilot do Ecossistema' })}</SheetTitle>
                <p className="text-[11px] text-muted-foreground">{t('copilot.subtitle', { defaultValue: 'Assistente com IA' })}</p>
              </div>
              <Badge variant="secondary" className="text-[10px] gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-health-healthy animate-pulse" />
                {t('copilot.online', { defaultValue: 'Online' })}
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
                  {t('copilot.howCanIHelp', { defaultValue: 'Como posso ajudar?' })}
                </h4>
                <p className="text-xs text-muted-foreground max-w-[240px]">
                  {t('copilot.askAnything', { defaultValue: 'Pergunte sobre a sua startup, tarefas, KPIs ou ecossistema.' })}
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
                      'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted/60 text-foreground rounded-bl-md'
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isThinking && !messages.some(m => m.role === 'assistant' && m === messages[messages.length - 1]) && (
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
              {suggestedPrompts.map(prompt => (
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
                placeholder={t('copilot.inputPlaceholder', { defaultValue: 'Pergunte qualquer coisa...' })}
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
