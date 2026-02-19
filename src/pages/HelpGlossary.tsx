import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useState, useMemo } from 'react';
import { Search, BookOpen, TrendingUp, PiggyBank, Target, Lightbulb, HelpCircle, Mail, Clock, MessageCircle } from 'lucide-react';
import type { GlossaryTerm } from '@/components/ui/GlossaryTooltip';

// Categories for organizing terms
const TERM_CATEGORIES: Record<string, { icon: typeof TrendingUp; terms: GlossaryTerm[] }> = {
  metrics: {
    icon: TrendingUp,
    terms: ['cac', 'ltv', 'ltvCacRatio', 'arpu', 'churnRate', 'mrr', 'paybackPeriod', 'runway', 'burnRate', 'grossMargin', 'nps'],
  },
  product: {
    icon: Lightbulb,
    terms: ['mvp', 'pmf', 'unitEconomics'],
  },
  market: {
    icon: Target,
    terms: ['tam', 'sam', 'som', 'b2b', 'b2c', 'saas'],
  },
  funding: {
    icon: PiggyBank,
    terms: ['preemption', 'dilution', 'capTable', 'vesting', 'cliff'],
  },
};

export default function HelpGlossary() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  // Flatten all terms with their translations
  const allTerms = useMemo(() => {
    const terms: { term: GlossaryTerm; title: string; description: string; category: string }[] = [];
    
    Object.entries(TERM_CATEGORIES).forEach(([category, { terms: categoryTerms }]) => {
      categoryTerms.forEach(term => {
        terms.push({
          term,
          title: t(`glossary.${term}`),
          description: t(`glossary.${term}Desc`),
          category,
        });
      });
    });
    
    return terms;
  }, [t]);

  // Filter terms based on search
  const filteredTerms = useMemo(() => {
    if (!searchQuery.trim()) return allTerms;
    
    const query = searchQuery.toLowerCase();
    return allTerms.filter(
      item => 
        item.title.toLowerCase().includes(query) || 
        item.description.toLowerCase().includes(query)
    );
  }, [allTerms, searchQuery]);

  // Group filtered terms by category
  const groupedTerms = useMemo(() => {
    const groups: Record<string, typeof filteredTerms> = {};
    
    filteredTerms.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    
    return groups;
  }, [filteredTerms]);

  const categoryLabels: Record<string, string> = {
    metrics: t('glossary.categoryMetrics', { defaultValue: 'Métricas Financeiras' }),
    product: t('glossary.categoryProduct', { defaultValue: 'Produto' }),
    market: t('glossary.categoryMarket', { defaultValue: 'Mercado' }),
    funding: t('glossary.categoryFunding', { defaultValue: 'Financiamento' }),
  };

  // FAQ items
  const faqItems = [
    { q: t('faq.q1', { defaultValue: 'Como peço um mentor?' }), a: t('faq.a1', { defaultValue: 'Na página "Mentores & Recursos", veja a lista de mentores disponíveis e clique em "Manifestar Interesse". Pode selecionar até 3 mentores e incluir uma mensagem. O seu consultor será notificado e fará a ligação.' }) },
    { q: t('faq.q2', { defaultValue: 'Como marco uma sessão?' }), a: t('faq.a2', { defaultValue: 'Dentro do espaço de trabalho da sua startup, vá ao separador "Sessões & Mentoria". O seu consultor agendará sessões consigo. Também pode pedir sessões ao seu mentor através da plataforma.' }) },
    { q: t('faq.q3', { defaultValue: 'Como submeto um documento?' }), a: t('faq.a3', { defaultValue: 'No separador "Documentos" do seu espaço de trabalho, clique em "Novo Documento" e carregue o ficheiro com a categoria correta (ex: Pitch Deck, Modelo Financeiro). Pode pedir feedback diretamente ao consultor.' }) },
    { q: t('faq.q4', { defaultValue: 'O que são KPIs e como os atualizo?' }), a: t('faq.a4', { defaultValue: 'KPIs (Key Performance Indicators) são métricas que medem o progresso da startup (ex: MRR, utilizadores ativos). Vá ao separador "Objetivos & KPIs" e atualize os valores mensalmente para acompanhar tendências.' }) },
    { q: t('faq.q5', { defaultValue: 'Para que servem os Playbooks?' }), a: t('faq.a5', { defaultValue: 'Playbooks são guias estruturados com milestones e ações recomendadas para a sua fase de desenvolvimento. O consultor pode ativar playbooks para criar automaticamente marcos e tarefas no seu plano.' }) },
    { q: t('faq.q6', { defaultValue: 'Como uso os Templates?' }), a: t('faq.a6', { defaultValue: 'Templates são formulários pré-definidos (ex: Business Model Canvas, Proposta de Valor). No separador "Templates", selecione um template, preencha e submeta para revisão do consultor.' }) },
    { q: t('faq.q7', { defaultValue: 'O que acontece quando submeto um template?' }), a: t('faq.a7', { defaultValue: 'O template fica "Em Revisão". O consultor receberá uma notificação e poderá aprovar, pedir alterações ou deixar notas. Poderá ver o estado atualizado a qualquer momento.' }) },
    { q: t('faq.q8', { defaultValue: 'Como vejo o meu progresso geral?' }), a: t('faq.a8', { defaultValue: 'O painel "Início" mostra uma visão geral com ações pendentes, próximas sessões e alertas. Dentro do espaço de trabalho, o separador "Visão Geral" mostra o estado atual da startup.' }) },
    { q: t('faq.q9', { defaultValue: 'Posso convidar membros da minha equipa?' }), a: t('faq.a9', { defaultValue: 'Sim! No separador "Equipa" (dentro de Mais Detalhes), pode adicionar membros da equipa com os respetivos cargos e contactos.' }) },
    { q: t('faq.q10', { defaultValue: 'Tenho um problema técnico. O que faço?' }), a: t('faq.a10', { defaultValue: 'Contacte a equipa de suporte através do email abaixo. Inclua uma descrição do problema e, se possível, capturas de ecrã.' }) },
    { q: t('faq.q11', { defaultValue: 'O que é o Dataroom?' }), a: t('faq.a11', { defaultValue: 'O Dataroom é um espaço seguro para partilhar documentos com investidores. Pode criar links de partilha com prazo de validade e controlar o acesso.' }) },
    { q: t('faq.q12', { defaultValue: 'Como funciona a preparação para investidores?' }), a: t('faq.a12', { defaultValue: 'No separador "Governança", encontra um checklist de preparação para investidores com itens organizados por categoria. Complete os itens para aumentar a sua prontidão.' }) },
  ];

  return (
    <AppLayout 
      title={t('help.pageTitle', { defaultValue: 'Glossário & FAQ' })} 
      subtitle={t('help.pageSubtitle', { defaultValue: 'Conceitos, perguntas frequentes e suporte' })}
    >
      <div className="space-y-6 p-6">
        <Tabs defaultValue="faq" className="space-y-6">
          <TabsList>
            <TabsTrigger value="faq" className="gap-1.5">
              <HelpCircle className="h-4 w-4" />
              {t('help.faqTab', { defaultValue: 'FAQ' })}
            </TabsTrigger>
            <TabsTrigger value="glossary" className="gap-1.5">
              <BookOpen className="h-4 w-4" />
              {t('help.glossaryTab', { defaultValue: 'Glossário' })}
            </TabsTrigger>
          </TabsList>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-6">
            <div className="max-w-3xl">
              <Accordion type="multiple" className="space-y-2">
                {faqItems.map((item, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-4">
                    <AccordionTrigger className="text-sm font-medium hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* Support Contact */}
            <Card className="max-w-3xl border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  {t('help.supportTitle', { defaultValue: 'Contacto de Suporte' })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{t('help.supportEmail', { defaultValue: 'suporte@startupleiria.com' })}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{t('help.supportHours', { defaultValue: 'Segunda a Sexta, 9h–18h' })}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('help.supportNote', { defaultValue: 'Para questões urgentes, contacte o seu consultor diretamente através do sistema de mensagens.' })}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Glossary Tab */}
          <TabsContent value="glossary" className="space-y-6">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('glossary.searchPlaceholder', { defaultValue: 'Pesquisar conceitos...' })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span>{allTerms.length} {t('glossary.concepts', { defaultValue: 'conceitos' })}</span>
              </div>
              {searchQuery && (
                <Badge variant="secondary">
                  {filteredTerms.length} {t('common.results', { defaultValue: 'resultados' })}
                </Badge>
              )}
            </div>

            {/* Terms by Category */}
            <div className="space-y-8">
              {Object.entries(TERM_CATEGORIES).map(([category, { icon: Icon }]) => {
                const categoryTerms = groupedTerms[category];
                if (!categoryTerms?.length) return null;

                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="text-lg font-semibold">{categoryLabels[category]}</h2>
                      <Badge variant="outline" className="ml-2">{categoryTerms.length}</Badge>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {categoryTerms.map(({ term, title, description }) => (
                        <Card key={term} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">{title}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {description}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty State */}
            {filteredTerms.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    {t('glossary.noResults', { defaultValue: 'Nenhum conceito encontrado para' })} "{searchQuery}"
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}