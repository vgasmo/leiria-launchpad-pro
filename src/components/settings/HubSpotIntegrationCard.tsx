import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

// HubSpot icon component
const HubSpotIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.984 2.21 2.21 0 00-2.209-2.21 2.21 2.21 0 00-2.209 2.21c0 .895.534 1.665 1.301 2.01v2.835a4.73 4.73 0 00-2.065 1.097L7.042 3.618a2.583 2.583 0 00.066-.561 2.62 2.62 0 00-2.62-2.62 2.62 2.62 0 00-2.62 2.62 2.62 2.62 0 002.62 2.62c.45 0 .873-.114 1.243-.316l7.05 5.387a4.67 4.67 0 00-.633 2.345 4.668 4.668 0 00.652 2.387l-2.082 2.082a2.137 2.137 0 00-.64-.1 2.16 2.16 0 00-2.16 2.16 2.16 2.16 0 002.16 2.16 2.16 2.16 0 002.16-2.16c0-.225-.036-.442-.1-.647l2.068-2.068a4.74 4.74 0 003.086 1.14 4.748 4.748 0 004.748-4.748 4.748 4.748 0 00-4.376-4.73z"/>
  </svg>
);

export function HubSpotIntegrationCard() {
  const { t } = useTranslation();

  return (
    <Card className="opacity-75">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HubSpotIcon className="h-5 w-5 text-[#FF7A59]" />
          HubSpot CRM
          <Badge variant="secondary" className="ml-2">
            {t('settings.comingSoon')}
          </Badge>
        </CardTitle>
        <CardDescription>
          {t('settings.hubspotDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground space-y-3">
          <p className="font-medium text-foreground">{t('settings.plannedFeatures')}</p>
          <ul className="list-disc list-inside space-y-1">
            <li>{t('integrations.hubspot.contactSync', 'Sincronização bidirecional de contactos entre startups e HubSpot')}</li>
            <li>{t('integrations.hubspot.investorTracking', 'Acompanhar interações com investidores como atividades HubSpot')}</li>
            <li>{t('integrations.hubspot.fundingSync', 'Sincronizar rondas de financiamento com deals HubSpot')}</li>
            <li>{t('integrations.hubspot.leadImport', 'Importar leads do HubSpot para membros do workspace')}</li>
            <li>{t('integrations.hubspot.sessionNotes', 'Registar notas de sessão como engagements HubSpot')}</li>
          </ul>
        </div>

        <div className="pt-2 border-t">
          <Button variant="outline" size="sm" disabled className="gap-2">
            <ExternalLink className="h-3 w-3" />
            {t('settings.connectHubSpot')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
