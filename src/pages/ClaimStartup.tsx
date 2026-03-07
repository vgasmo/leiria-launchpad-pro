import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';
import { useAuth } from '@/contexts/AuthContext';
import { useFounderOnboardingState } from '@/hooks/useFounderOnboardingState';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Clock, Rocket, Shield, AlertCircle, ArrowRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type ClaimPageState = 'idle' | 'verifying' | 'auto_claimed' | 'already_claimed' | 'pending_review' | 'error';

export default function ClaimStartup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const founderState = useFounderOnboardingState();

  const [pageState, setPageState] = useState<ClaimPageState>('idle');
  const [claimedStartupName, setClaimedStartupName] = useState<string | null>(null);
  const [claimedWorkspaceId, setClaimedWorkspaceId] = useState<string | null>(null);

  // Determine the effective display state based on founderState + pageState
  const getDisplayState = () => {
    // If we just ran the RPC, that takes priority
    if (pageState === 'verifying' || pageState === 'auto_claimed' || pageState === 'error') {
      return pageState;
    }
    // Otherwise, use the read-only state
    if (founderState.isLoading) return 'loading' as const;
    if (founderState.status === 'has_active_workspace') return 'already_claimed' as const;
    if (founderState.status === 'has_pending_claim') return 'pending_review' as const;
    if (founderState.status === 'has_pending_workspace') return 'pending_application' as const;
    return 'ready_to_verify' as const;
  };

  const displayState = getDisplayState();

  // P0.1 Safety: non-founders should never see the claim UI
  // Strict profile-role guard: only 'founder' role may access this page
  useEffect(() => {
    if (!profile) return; // still loading
    const role = profile.role;
    if (role !== 'founder') {
      navigate('/', { replace: true });
      return;
    }
    // Secondary guard via founderState for founders who are also staff
    if (
      !founderState.isLoading &&
      (founderState.status === 'not_founder' || founderState.status === 'staff_exempt')
    ) {
      navigate('/my-workspaces', { replace: true });
    }
  }, [profile, founderState.isLoading, founderState.status, navigate]);

  const handleVerify = useCallback(async () => {
    if (!user) return;
    setPageState('verifying');

    try {
      const { data, error } = await supabase.rpc('claim_startup');
      if (error) {
        logger.error('claim_rpc_failed', { userId: user.id.slice(0, 8) }, error);
        setPageState('error');
        return;
      }

      const result = data as { status: string; startup_name?: string; workspace_id?: string; message?: string };

      if (result.status === 'auto_claimed') {
        setPageState('auto_claimed');
        setClaimedStartupName(result.startup_name || null);
        setClaimedWorkspaceId(result.workspace_id || null);
        // Invalidate onboarding state so routing updates
        queryClient.invalidateQueries({ queryKey: ['founder-onboarding-state'] });
        toast({
          title: t('claimStartup.claimedTitle', { defaultValue: 'Startup verificada!' }),
          description: t('claimStartup.claimedDesc', { defaultValue: 'A sua startup foi associada automaticamente à sua conta.' }),
        });
        setTimeout(() => {
          if (result.workspace_id) {
            navigate(`/workspace/${result.workspace_id}`, { replace: true });
          } else {
            navigate('/my-workspaces', { replace: true });
          }
        }, 2500);
      } else if (result.status === 'already_claimed') {
        setPageState('already_claimed');
        queryClient.invalidateQueries({ queryKey: ['founder-onboarding-state'] });
        setTimeout(() => navigate('/my-workspaces', { replace: true }), 1500);
      } else if (result.status === 'pending') {
        setPageState('pending_review');
        queryClient.invalidateQueries({ queryKey: ['founder-onboarding-state'] });
      }
    } catch (err) {
      logger.error('claim_unexpected_error', { userId: user?.id?.slice(0, 8) }, err);
      setPageState('error');
    }
  }, [user, navigate, t, queryClient]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Rocket className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-heading">
            {t('claimStartup.title', { defaultValue: 'Verificar a sua Startup' })}
          </CardTitle>
          <CardDescription className="max-w-sm mx-auto">
            {t('claimStartup.subtitle', { defaultValue: 'Esta plataforma é apenas por convite. Vamos verificar se a sua startup já está preparada no sistema.' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">

          {/* LOADING — hook is resolving */}
          {displayState === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {t('common.loading', { defaultValue: 'A carregar...' })}
              </p>
            </div>
          )}

          {/* READY TO VERIFY — primary CTA */}
          {displayState === 'ready_to_verify' && (
            <div className="flex flex-col items-center gap-4 py-6 text-center w-full">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2.5">
                <Shield className="h-4 w-4 text-primary shrink-0" />
                <span>{t('claimStartup.inviteOnlyNote', { defaultValue: 'Plataforma apenas por convite. A verificação é rápida e segura.' })}</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                {t('claimStartup.howItWorks', { defaultValue: 'Vamos verificar se existe uma startup associada ao seu email. Se encontrarmos, será associada automaticamente à sua conta.' })}
              </p>
              <Button onClick={handleVerify} size="lg" className="gap-2 w-full max-w-xs shadow-lg">
                <Rocket className="h-5 w-5" />
                {t('claimStartup.verifyCta', { defaultValue: 'Verificar Agora' })}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                {t('claimStartup.noMatchHint', { defaultValue: 'Se não encontrarmos correspondência, a nossa equipa irá rever o seu pedido.' })}
              </p>
            </div>
          )}

          {/* VERIFYING — RPC in progress */}
          {displayState === 'verifying' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {t('claimStartup.searching', { defaultValue: 'A verificar a sua startup...' })}
              </p>
            </div>
          )}

          {/* AUTO CLAIMED — success */}
          {displayState === 'auto_claimed' && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-lg font-semibold text-foreground">
                {t('claimStartup.found', { defaultValue: 'Startup verificada com sucesso!' })}
              </p>
              {claimedStartupName && (
                <p className="text-sm font-medium text-primary">{claimedStartupName}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {t('claimStartup.redirecting', { defaultValue: 'A redirecionar para o seu espaço de trabalho...' })}
              </p>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* ALREADY CLAIMED — user already has a workspace */}
          {displayState === 'already_claimed' && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-lg font-semibold text-foreground">
                {t('claimStartup.alreadyLinked', { defaultValue: 'A sua startup já está associada' })}
              </p>
              {founderState.startupName && (
                <p className="text-sm font-medium text-primary">{founderState.startupName}</p>
              )}
              <Button onClick={() => navigate('/my-workspaces', { replace: true })} className="gap-2 mt-2">
                <ArrowRight className="h-4 w-4" />
                {t('claimStartup.goToWorkspace', { defaultValue: 'Ir para o meu espaço de trabalho' })}
              </Button>
            </div>
          )}

          {/* PENDING REVIEW — claim request submitted, awaiting staff */}
          {(displayState === 'pending_review') && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Clock className="h-12 w-12 text-amber-500" />
              <p className="text-lg font-semibold text-foreground">
                {t('claimStartup.pendingTitle', { defaultValue: 'Pedido em Análise' })}
              </p>
              <p className="text-sm text-muted-foreground max-w-xs">
                {t('claimStartup.pendingDesc', { defaultValue: 'Não encontrámos uma correspondência automática, mas a sua equipa irá analisar e associá-lo manualmente. Isto é normal no modelo por convite.' })}
              </p>
              <div className="bg-muted/50 rounded-lg px-4 py-2.5 text-xs text-muted-foreground mt-2">
                <p>{profile?.email}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('claimStartup.pendingTiming', { defaultValue: 'Este processo é geralmente concluído em poucos dias úteis.' })}
              </p>
            </div>
          )}

          {/* PENDING APPLICATION — founder submitted a new startup */}
          {displayState === 'pending_application' && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Clock className="h-12 w-12 text-amber-500" />
              <p className="text-lg font-semibold text-foreground">
                {t('claimStartup.applicationPendingTitle', { defaultValue: 'Candidatura em Análise' })}
              </p>
              {founderState.startupName && (
                <p className="text-sm font-medium text-primary">{founderState.startupName}</p>
              )}
              <p className="text-sm text-muted-foreground max-w-xs">
                {t('claimStartup.applicationPendingDesc', { defaultValue: 'A sua candidatura foi recebida e está a ser analisada pela nossa equipa. Será notificado assim que for aprovada.' })}
              </p>
            </div>
          )}

          {/* ERROR */}
          {displayState === 'error' && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <p className="text-sm text-destructive">
                {t('claimStartup.error', { defaultValue: 'Ocorreu um erro na verificação. Por favor tente novamente.' })}
              </p>
              <Button onClick={() => setPageState('idle')} variant="outline">
                {t('common.retry', { defaultValue: 'Tentar novamente' })}
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
