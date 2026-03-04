import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Clock, Rocket } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type ClaimStatus = 'loading' | 'auto_claimed' | 'already_claimed' | 'pending' | 'error';

export default function ClaimStartup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [status, setStatus] = useState<ClaimStatus>('loading');
  const [startupName, setStartupName] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const attemptClaim = async () => {
      try {
        const { data, error } = await supabase.rpc('claim_startup');
        
        if (error) {
          console.error('Claim error:', error);
          setStatus('error');
          return;
        }

        const result = data as { status: string; startup_name?: string; workspace_id?: string; message?: string };

        if (result.status === 'auto_claimed') {
          setStatus('auto_claimed');
          setStartupName(result.startup_name || null);
          setWorkspaceId(result.workspace_id || null);
          toast({
            title: t('claimStartup.claimedTitle', { defaultValue: 'Startup Encontrada!' }),
            description: t('claimStartup.claimedDesc', { defaultValue: 'A sua startup foi associada automaticamente.' }),
          });
          // Redirect after short delay
          setTimeout(() => {
            if (result.workspace_id) {
              navigate(`/workspace/${result.workspace_id}`, { replace: true });
            } else {
              navigate('/my-workspaces', { replace: true });
            }
          }, 2500);
        } else if (result.status === 'already_claimed') {
          setStatus('already_claimed');
          navigate('/my-workspaces', { replace: true });
        } else if (result.status === 'pending') {
          setStatus('pending');
        }
      } catch (err) {
        console.error('Claim error:', err);
        setStatus('error');
      }
    };

    attemptClaim();
  }, [user, navigate, t]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Rocket className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-heading">
            {t('claimStartup.title', { defaultValue: 'Reclamar a sua Startup' })}
          </CardTitle>
          <CardDescription>
            {t('claimStartup.subtitle', { defaultValue: 'Estamos a verificar se existe uma startup associada ao seu email.' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {t('claimStartup.searching', { defaultValue: 'A procurar a sua startup...' })}
              </p>
            </div>
          )}

          {status === 'auto_claimed' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-lg font-semibold text-foreground">
                {t('claimStartup.found', { defaultValue: 'Startup encontrada!' })}
              </p>
              {startupName && (
                <p className="text-sm text-muted-foreground">
                  {startupName}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {t('claimStartup.redirecting', { defaultValue: 'A redirecionar para o seu workspace...' })}
              </p>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {status === 'pending' && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Clock className="h-12 w-12 text-amber-500" />
              <p className="text-lg font-semibold text-foreground">
                {t('claimStartup.pendingTitle', { defaultValue: 'Pedido de Acesso Enviado' })}
              </p>
              <p className="text-sm text-muted-foreground max-w-xs">
                {t('claimStartup.pendingDesc', { defaultValue: 'Não encontrámos uma startup associada ao seu email. A sua equipa irá revê-lo e associá-lo manualmente.' })}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {profile?.email}
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-destructive">
                {t('claimStartup.error', { defaultValue: 'Ocorreu um erro. Por favor tente novamente.' })}
              </p>
              <Button onClick={() => window.location.reload()} variant="outline">
                {t('common.retry', { defaultValue: 'Tentar novamente' })}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
