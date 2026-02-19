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
import { FAQ_ITEMS } from '@/lib/faqCatalog';

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
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [searchQuery, setSearchQuery] = useState('');
  const [faqSearch, setFaqSearch] = useState('');

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
      if (!groups[item.category]) groups[item.category] = [];
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

  // FAQ from catalog, filtered
  const faqItems = useMemo(() => {
    let items = FAQ_ITEMS;
    if (faqSearch.trim()) {
      const q = faqSearch.toLowerCase();
      items = items.filter(f =>
        f.q_pt.toLowerCase().includes(q) ||
        f.q_en.toLowerCase().includes(q) ||
        f.a_pt.toLowerCase().includes(q) ||
        f.a_en.toLowerCase().includes(q) ||
        f.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }
    return items;
  }, [faqSearch]);

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
            <div className="max-w-3xl space-y-4">
              {/* FAQ Search */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('help.faqSearchPlaceholder', { defaultValue: 'Pesquisar perguntas…' })}
                  value={faqSearch}
                  onChange={e => setFaqSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {faqItems.length > 0 ? (
                <Accordion type="multiple" className="space-y-2">
                  {faqItems.map(item => (
                    <AccordionItem key={item.id} value={item.id} className="border rounded-lg px-4">
                      <AccordionTrigger className="text-sm font-medium hover:no-underline">
                        {lang === 'pt' ? item.q_pt : item.q_en}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                        {lang === 'pt' ? item.a_pt : item.a_en}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t('common.noResults', { defaultValue: 'Nenhum resultado encontrado' })}
                </p>
              )}
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
