import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Rocket, Building2, Globe, Calendar, FileText, Phone, Mail, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
  nif: z.string().max(20).optional(),
  mainContactName: z.string().max(100).optional(),
  mainContactEmail: z.string().email().optional().or(z.literal('')),
  mainContactPhone: z.string().max(30).optional(),
  hasStartupPortugalStatus: z.boolean().optional(),
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
  const [nif, setNif] = useState('');
  const [mainContactName, setMainContactName] = useState('');
  const [mainContactEmail, setMainContactEmail] = useState('');
  const [mainContactPhone, setMainContactPhone] = useState('');
  const [hasStartupPortugalStatus, setHasStartupPortugalStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    const result = startupSchema.safeParse({ 
      name, description, website, stage, programId,
      nif, mainContactName, mainContactEmail, mainContactPhone, hasStartupPortugalStatus
    });
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
      // 1. Create the startup with new fields
      const { data: startup, error: startupError } = await supabase
        .from('startups')
        .insert({
          name: result.data.name,
          description: result.data.description || null,
          website: result.data.website || null,
          nif: result.data.nif || null,
          main_contact_name: result.data.mainContactName || null,
          main_contact_email: result.data.mainContactEmail || null,
          main_contact_phone: result.data.mainContactPhone || null,
          has_startup_portugal_status: result.data.hasStartupPortugalStatus || false,
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
      setNif('');
      setMainContactName('');
      setMainContactEmail('');
      setMainContactPhone('');
      setHasStartupPortugalStatus(false);
      
    } catch (err: any) {
      console.error('Error creating startup:', err);
      setError(err.message || t('createStartup.failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

          {/* NIF and Legal Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startup-nif">NIF (Tax ID)</Label>
              <Input
                id="startup-nif"
                value={nif}
                onChange={(e) => setNif(e.target.value)}
                placeholder="PT123456789"
                maxLength={20}
              />
            </div>
            <div className="flex items-center sm:items-end sm:pb-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="startup-portugal-status" 
                  checked={hasStartupPortugalStatus} 
                  onCheckedChange={(checked) => setHasStartupPortugalStatus(!!checked)} 
                />
                <Label htmlFor="startup-portugal-status" className="cursor-pointer text-sm">
                  <CheckCircle className="h-3.5 w-3.5 inline mr-1 text-green-600" />
                  Estatuto Startup Portugal
                </Label>
              </div>
            </div>
          </div>

          {/* Main Contact */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
            <p className="text-sm font-medium flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Contacto Principal
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="main-contact-name" className="text-xs">Nome</Label>
                <Input
                  id="main-contact-name"
                  value={mainContactName}
                  onChange={(e) => setMainContactName(e.target.value)}
                  placeholder="João Silva"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="main-contact-email" className="text-xs">
                  <Mail className="h-3 w-3 inline mr-1" />
                  Email
                </Label>
                <Input
                  id="main-contact-email"
                  type="email"
                  value={mainContactEmail}
                  onChange={(e) => setMainContactEmail(e.target.value)}
                  placeholder="joao@startup.pt"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="main-contact-phone" className="text-xs">Telefone</Label>
                <Input
                  id="main-contact-phone"
                  value={mainContactPhone}
                  onChange={(e) => setMainContactPhone(e.target.value)}
                  placeholder="+351 912 345 678"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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