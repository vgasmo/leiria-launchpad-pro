import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabaseClient } from '@/lib/supabaseClient';

interface AiPulseCardProps {
  workspaceId: string;
  healthScore?: string | null;
  overdueCount?: number;
  className?: string;
}

const PULSE_COOLDOWN_KEY = 'ai-pulse-last-fired';
const PULSE_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const PULSE_DISMISSED_KEY = 'ai-pulse-dismissed';

export function AiPulseCard({ workspaceId, healthScore, overdueCount = 0, className }: AiPulseCardProps) {
  const { t } = useTranslation();
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const hasFired = useRef(false);

  const shouldTrigger = useCallback(() => {
    // Only fire if health is dropping or there are overdue items
    const needsPulse = healthScore === 'at_risk' || healthScore === 'critical' || overdueCount >= 2;
    if (!needsPulse) return false;

    // Check cooldown
    const lastFired = localStorage.getItem(`${PULSE_COOLDOWN_KEY}-${workspaceId}`);
    if (lastFired) {
      const elapsed = Date.now() - parseInt(lastFired, 10);
      if (elapsed < PULSE_COOLDOWN_MS) return false;
    }

    // Check if dismissed this session
    const dismissedSession = sessionStorage.getItem(`${PULSE_DISMISSED_KEY}-${workspaceId}`);
    if (dismissedSession === 'true') return false;

    return true;
  }, [healthScore, overdueCount, workspaceId]);

  useEffect(() => {
    if (hasFired.current || !shouldTrigger() || !workspaceId) return;
    hasFired.current = true;

    const fetchPulse = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session?.access_token) return;

        localStorage.setItem(`${PULSE_COOLDOWN_KEY}-${workspaceId}`, Date.now().toString());

        const prompt = overdueCount >= 2
          ? `I have ${overdueCount} overdue actions and my health score is "${healthScore || 'unknown'}". Give me 2-3 concise, actionable next steps to get back on track. Be direct, under 80 words.`
          : `My startup health is "${healthScore}". Give me 2-3 concise, actionable next steps to improve. Be direct, under 80 words.`;

        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/copilot-chat`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              messages: [{ role: 'user', content: prompt }],
            }),
          }
        );

        if (!resp.ok || !resp.body) return;

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let result = '';
        let textBuffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) result += delta;
            } catch { /* skip */ }
          }
        }

        if (result.trim()) {
          setSuggestion(result.trim());
        }
      } catch (err) {
        console.error('AI Pulse error:', err);
      } finally {
        setLoading(false);
      }
    };

    // Debounce: 2 seconds after mount
    const timer = setTimeout(fetchPulse, 2000);
    return () => clearTimeout(timer);
  }, [shouldTrigger, workspaceId, healthScore, overdueCount]);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(`${PULSE_DISMISSED_KEY}-${workspaceId}`, 'true');
  };

  if (dismissed || (!loading && !suggestion)) return null;

  return (
    <Card className={cn(
      'border-primary/20 overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-top-2',
      className,
    )}>
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent pointer-events-none" />
      <CardContent className="relative p-4">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-xs font-semibold text-primary uppercase tracking-wide">
                {t('aiPulse.title', { defaultValue: 'Sugestão IA' })}
              </h4>
            </div>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ) : (
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                {suggestion}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
