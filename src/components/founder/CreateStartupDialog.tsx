import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Rocket, Building2, Globe, Calendar, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePrograms } from '@/hooks/useWorkspaces';
import { toast } from 'sonner';
import { StartupStage } from '@/types/database';

const startupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().trim().max(500).optional(),
  website: z.string().url().optional().or(z.literal('')),
  stage: z.enum(['ideation', 'validation', 'mvp', 'growth', 'scale']),
  programId: z.string().uuid('Please select a program'),
});

interface CreateStartupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateStartupDialog({ open, onOpenChange }: CreateStartupDialogProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: programs, isLoading: loadingPrograms } = usePrograms();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [stage, setStage] = useState<StartupStage>('ideation');
  const [programId, setProgramId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    const result = startupSchema.safeParse({ name, description, website, stage, programId });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    if (!user) {
      setError(t('createStartup.mustBeLoggedIn'));
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create the startup
      const { data: startup, error: startupError } = await supabase
        .from('startups')
        .insert({
          name: result.data.name,
          description: result.data.description || null,
          website: result.data.website || null,
        })
        .select()
        .single();

      if (startupError) throw startupError;

      // 2. Create a pending workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          startup_id: startup.id,
          program_id: result.data.programId,
          stage: result.data.stage,
          status: 'pending',
        })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // 3. Add the founder to the workspace
      const { error: memberError } = await supabase
        .from('workspace_users')
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: 'founder',
          active: true,
        });

      if (memberError) throw memberError;

      toast.success(t('createStartup.successMessage'));
      onOpenChange(false);
      
      // Reset form
      setName('');
      setDescription('');
      setWebsite('');
      setStage('ideation');
      setProgramId('');
      
    } catch (err: any) {
      console.error('Error creating startup:', err);
      setError(err.message || t('createStartup.failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Rocket className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>{t('createStartup.title')}</DialogTitle>
          </div>
          <DialogDescription>
            {t('createStartup.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="startup-name">
              <Building2 className="h-3.5 w-3.5 inline mr-1.5" />
              {t('createStartup.startupName')} *
            </Label>
            <Input
              id="startup-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('createStartup.startupNamePlaceholder')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startup-description">
              <FileText className="h-3.5 w-3.5 inline mr-1.5" />
              {t('createStartup.descriptionLabel')}
            </Label>
            <Textarea
              id="startup-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('createStartup.descriptionPlaceholder')}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startup-website">
              <Globe className="h-3.5 w-3.5 inline mr-1.5" />
              {t('createStartup.websiteLabel')}
            </Label>
            <Input
              id="startup-website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder={t('createStartup.websitePlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startup-program">{t('createStartup.programLabel')} *</Label>
              <Select value={programId} onValueChange={setProgramId} required>
                <SelectTrigger>
                  <SelectValue placeholder={t('createStartup.selectProgram')} />
                </SelectTrigger>
                <SelectContent>
                  {loadingPrograms ? (
                    <SelectItem value="" disabled>{t('common.loading')}</SelectItem>
                  ) : (
                    programs?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startup-stage">{t('createStartup.currentStage')} *</Label>
              <Select value={stage} onValueChange={(v) => setStage(v as StartupStage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ideation">{t('stages.ideation')}</SelectItem>
                  <SelectItem value="validation">{t('stages.validation')}</SelectItem>
                  <SelectItem value="mvp">{t('stages.mvp')}</SelectItem>
                  <SelectItem value="growth">{t('stages.growth')}</SelectItem>
                  <SelectItem value="scale">{t('stages.scale')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.creating') : t('createStartup.submitApplication')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}