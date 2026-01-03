import { useTranslation } from 'react-i18next';
import { Video, ExternalLink, Zap, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';

interface MeetingIntegrationGuideProps {
  compact?: boolean;
}

const INTEGRATIONS = [
  {
    id: 'zoom',
    name: 'Zoom',
    status: 'coming_soon',
    description: 'Auto-import meeting recordings and transcripts',
    features: ['Automatic transcript import', 'Recording attachments', 'Participant tracking'],
  },
  {
    id: 'google_meet',
    name: 'Google Meet',
    status: 'coming_soon',
    description: 'Sync your Google Meet sessions automatically',
    features: ['Live transcription sync', 'Calendar integration', 'AI meeting notes'],
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    status: 'coming_soon',
    description: 'Connect your Teams meetings',
    features: ['Transcript import', 'Meeting insights', 'Action item extraction'],
  },
];

export function MeetingIntegrationGuide({ compact = false }: MeetingIntegrationGuideProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  if (compact) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
            <Video className="h-4 w-4 mr-2" />
            Connect meeting tools
            <Badge variant="secondary" className="ml-auto text-[10px]">Soon</Badge>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="space-y-2 pl-6">
            {INTEGRATIONS.map((integration) => (
              <div key={integration.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 opacity-30" />
                <span>{integration.name}</span>
                <Badge variant="outline" className="text-[9px] ml-auto">Coming soon</Badge>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 pl-6">
            For now, use voice-to-text or paste transcripts manually.
          </p>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Video className="h-4 w-4" />
          Meeting Integrations
        </CardTitle>
        <CardDescription>
          Automatically import transcripts from your video calls
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {INTEGRATIONS.map((integration) => (
          <div 
            key={integration.id}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded bg-background flex items-center justify-center border">
                <Video className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{integration.name}</p>
                <p className="text-xs text-muted-foreground">{integration.description}</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              Coming soon
            </Badge>
          </div>
        ))}
        
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            <Zap className="h-3 w-3 inline mr-1" />
            Meanwhile, use the <strong>Voice-to-Text</strong> button while taking notes, 
            or paste meeting transcripts in the AI panel.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
