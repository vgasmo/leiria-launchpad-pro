/**
 * Contract Onboarding Wizard
 * Multi-step: 1) Company Data → 2) Review Contract & Regulation → 3) DocuSign Signing
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Building2, FileText, PenTool, CheckCircle2, ArrowRight, ArrowLeft, Download, Shield, Loader2, ExternalLink } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';

type WizardStep = 'company_data' | 'review_contract' | 'signing';

const STEPS: { key: WizardStep; icon: typeof Building2; label: string }[] = [
  { key: 'company_data', icon: Building2, label: 'Dados da Empresa' },
  { key: 'review_contract', icon: FileText, label: 'Rever Contrato' },
  { key: 'signing', icon: PenTool, label: 'Assinatura Digital' },
];

interface CompanyFormData {
  legal_representative_name: string;
  legal_representative_email: string;
  company_nif: string;
  company_address: string;
  company_city: string;
  company_postal_code: string;
}

export default function ContractOnboarding() {
  const { contractId } = useParams<{ contractId: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<WizardStep>('company_data');
  const [regulationAccepted, setRegulationAccepted] = useState(false);
  const [contractAccepted, setContractAccepted] = useState(false);

  const [formData, setFormData] = useState<CompanyFormData>({
    legal_representative_name: '',
    legal_representative_email: '',
    company_nif: '',
    company_address: '',
    company_city: '',
    company_postal_code: '',
  });

  // Fetch contract with workspace + startup data
  const { data: contract, isLoading } = useQuery({
    queryKey: ['contract-onboarding', contractId],
    enabled: !!contractId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('startup_contracts')
        .select(`
          *,
          workspace:workspaces(
            id,
            startup:startups(id, name, nif, main_contact_name, main_contact_email, address)
          ),
          incubation_type:incubation_types(name),
          building:buildings(name, code, address)
        `)
        .eq('id', contractId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Pre-fill from startup data
  useEffect(() => {
    if (contract) {
      const startup = (contract as any).workspace?.startup;
      if (startup) {
        setFormData(prev => ({
          ...prev,
          legal_representative_name: (contract as any).legal_representative_name || startup.main_contact_name || '',
          legal_representative_email: (contract as any).legal_representative_email || startup.main_contact_email || '',
          company_nif: (contract as any).company_nif || startup.nif || '',
          company_address: (contract as any).company_address || startup.address || '',
          company_city: (contract as any).company_city || '',
          company_postal_code: (contract as any).company_postal_code || '',
        }));
      }
    }
  }, [contract]);

  // Save company data
  const saveCompanyData = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('startup_contracts')
        .update({
          legal_representative_name: formData.legal_representative_name,
          legal_representative_email: formData.legal_representative_email,
          company_nif: formData.company_nif,
          company_address: formData.company_address,
          company_city: formData.company_city,
          company_postal_code: formData.company_postal_code,
        } as any)
        .eq('id', contractId!);
      if (error) throw error;
    },
    onSuccess: () => {
      setCurrentStep('review_contract');
      toast.success('Dados guardados');
    },
    onError: () => toast.error('Erro ao guardar dados'),
  });

  // Accept regulation + send to DocuSign
  const submitForSigning = useMutation({
    mutationFn: async () => {
      // 1. Mark regulation as accepted
      await supabase
        .from('startup_contracts')
        .update({
          regulation_accepted_at: new Date().toISOString(),
          regulation_version: 'V11_2026',
          signature_status: 'sent_for_signature',
          signature_requested_at: new Date().toISOString(),
        } as any)
        .eq('id', contractId!);

      // 2. Call DocuSign edge function
      const { data, error } = await supabase.functions.invoke('docusign-send-envelope', {
        body: {
          contractId,
          signerEmail: formData.legal_representative_email,
          signerName: formData.legal_representative_name,
          companyNif: formData.company_nif,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setCurrentStep('signing');
      queryClient.invalidateQueries({ queryKey: ['contract-onboarding', contractId] });
      toast.success('Contrato enviado para assinatura digital!');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erro ao enviar para assinatura. A equipa foi notificada.');
      // Still move to signing step to show status
      setCurrentStep('signing');
    },
  });

  const stepIndex = STEPS.findIndex(s => s.key === currentStep);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const isFormValid = formData.legal_representative_name.trim() &&
    formData.legal_representative_email.trim() &&
    formData.company_nif.trim() &&
    formData.company_address.trim() &&
    formData.company_city.trim() &&
    formData.company_postal_code.trim();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!contract) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h2 className="text-lg font-semibold">Contrato não encontrado</h2>
          <p className="text-muted-foreground text-sm mt-1">Este contrato pode não existir ou não ter permissão de acesso.</p>
        </div>
      </AppLayout>
    );
  }

  const sigStatus = (contract as any).signature_status;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Onboarding Contratual</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {(contract as any).workspace?.startup?.name || 'Startup'} — {(contract as any).contract_number || 'Novo Contrato'}
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-3">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = step.key === currentStep;
              const isDone = i < stepIndex;
              return (
                <div key={step.key} className={`flex items-center gap-1.5 text-xs font-medium ${isActive ? 'text-primary' : isDone ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  {step.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 1: Company Data */}
        {currentStep === 'company_data' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Dados da Empresa e Representante Legal
              </CardTitle>
              <CardDescription>
                Estes dados serão utilizados para a geração automática do contrato de incubação.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nome do Representante Legal *</Label>
                  <Input
                    value={formData.legal_representative_name}
                    onChange={e => setFormData(prev => ({ ...prev, legal_representative_name: e.target.value }))}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email do Representante *</Label>
                  <Input
                    type="email"
                    value={formData.legal_representative_email}
                    onChange={e => setFormData(prev => ({ ...prev, legal_representative_email: e.target.value }))}
                    placeholder="email@empresa.pt"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>NIF da Empresa *</Label>
                  <Input
                    value={formData.company_nif}
                    onChange={e => setFormData(prev => ({ ...prev, company_nif: e.target.value }))}
                    placeholder="123456789"
                    maxLength={9}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Morada Fiscal *</Label>
                  <Input
                    value={formData.company_address}
                    onChange={e => setFormData(prev => ({ ...prev, company_address: e.target.value }))}
                    placeholder="Rua, número, andar"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Cidade *</Label>
                  <Input
                    value={formData.company_city}
                    onChange={e => setFormData(prev => ({ ...prev, company_city: e.target.value }))}
                    placeholder="Leiria"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Código Postal *</Label>
                  <Input
                    value={formData.company_postal_code}
                    onChange={e => setFormData(prev => ({ ...prev, company_postal_code: e.target.value }))}
                    placeholder="2400-000"
                  />
                </div>
              </div>

              {/* Contract summary */}
              <Separator />
              <div className="bg-muted/40 rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumo do Contrato</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Tipo:</span> {(contract as any).incubation_type?.name || '—'}</div>
                  <div><span className="text-muted-foreground">Edifício:</span> {(contract as any).building?.name || '—'}</div>
                  <div><span className="text-muted-foreground">Mensalidade:</span> {(contract as any).monthly_fee}€/{(contract as any).currency || 'EUR'}</div>
                  <div><span className="text-muted-foreground">Início:</span> {new Date((contract as any).start_date).toLocaleDateString('pt-PT')}</div>
                  {(contract as any).square_meters && (
                    <div><span className="text-muted-foreground">Área:</span> {(contract as any).square_meters} m²</div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => saveCompanyData.mutate()}
                  disabled={!isFormValid || saveCompanyData.isPending}
                  className="gap-2"
                >
                  {saveCompanyData.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Continuar <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Review Contract & Regulation */}
        {currentStep === 'review_contract' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Rever Contrato e Regulamento
              </CardTitle>
              <CardDescription>
                Reveja os documentos antes de enviar para assinatura digital.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Contract Document */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Minuta de Contrato de Incubação</p>
                      <p className="text-xs text-muted-foreground">V9 — 2026</p>
                    </div>
                  </div>
                  <a href="/templates/V9_Minuta_Contrato_IF_e_IV_2026.docx" download>
                    <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                      <Download className="h-3.5 w-3.5" />
                      Descarregar
                    </Button>
                  </a>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="accept-contract"
                    checked={contractAccepted}
                    onCheckedChange={(v) => setContractAccepted(v === true)}
                  />
                  <label htmlFor="accept-contract" className="text-xs leading-tight cursor-pointer">
                    Li e aceito os termos do Contrato de Incubação, incluindo as condições de prestação de serviços, obrigações e direitos das partes.
                  </label>
                </div>
              </div>

              {/* Regulation Document */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium">Regulamento Startup Leiria</p>
                      <p className="text-xs text-muted-foreground">V11 — Anexo I — 2026</p>
                    </div>
                  </div>
                  <a href="/templates/V11_Anexo_I_Regulamento_SUP_LRA_2026_2.pdf" download>
                    <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                      <Download className="h-3.5 w-3.5" />
                      Descarregar
                    </Button>
                  </a>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="accept-regulation"
                    checked={regulationAccepted}
                    onCheckedChange={(v) => setRegulationAccepted(v === true)}
                  />
                  <label htmlFor="accept-regulation" className="text-xs leading-tight cursor-pointer">
                    Li e aceito o Regulamento da Startup Leiria, comprometendo-me a cumprir as normas e procedimentos nele estabelecidos.
                  </label>
                </div>
              </div>

              {/* Company data summary */}
              <div className="bg-muted/40 rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados Confirmados</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Representante:</span> {formData.legal_representative_name}</div>
                  <div><span className="text-muted-foreground">Email:</span> {formData.legal_representative_email}</div>
                  <div><span className="text-muted-foreground">NIF:</span> {formData.company_nif}</div>
                  <div><span className="text-muted-foreground">Morada:</span> {formData.company_address}, {formData.company_city}</div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep('company_data')} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Button>
                <Button
                  onClick={() => submitForSigning.mutate()}
                  disabled={!contractAccepted || !regulationAccepted || submitForSigning.isPending}
                  className="gap-2"
                >
                  {submitForSigning.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenTool className="h-4 w-4" />}
                  Enviar para Assinatura
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Signing Status */}
        {currentStep === 'signing' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenTool className="h-5 w-5 text-primary" />
                Assinatura Digital
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sigStatus === 'completed' ? (
                <div className="text-center py-8 space-y-3">
                  <CheckCircle2 className="h-16 w-16 mx-auto text-emerald-500" />
                  <h3 className="text-lg font-semibold text-emerald-700">Contrato Assinado!</h3>
                  <p className="text-sm text-muted-foreground">
                    O contrato foi assinado digitalmente com sucesso. Os dados foram registados automaticamente.
                  </p>
                  <Button onClick={() => navigate('/my-workspaces')} className="mt-4">
                    Ir para o meu Workspace
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="relative mx-auto w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <PenTool className="absolute inset-0 m-auto h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Aguardando Assinatura</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      O contrato foi enviado para <strong>{formData.legal_representative_email}</strong> via DocuSign.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Verifique a sua caixa de email (incluindo spam) para assinar digitalmente.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {sigStatus === 'sent_for_signature' ? 'Enviado para assinatura' :
                     sigStatus === 'viewed' ? 'Documento visualizado' :
                     sigStatus === 'declined' ? 'Assinatura recusada' :
                     'Pendente'}
                  </Badge>
                  <div className="flex justify-center gap-3 mt-4">
                    <Button variant="outline" onClick={() => navigate('/my-workspaces')}>
                      Voltar mais tarde
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
