import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useState, useMemo } from 'react';
import { Search, BookOpen, TrendingUp, Users, PiggyBank, Target, Lightbulb } from 'lucide-react';
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
    metrics: t('glossary.categoryMetrics', 'Métricas Financeiras'),
    product: t('glossary.categoryProduct', 'Produto'),
    market: t('glossary.categoryMarket', 'Mercado'),
    funding: t('glossary.categoryFunding', 'Financiamento'),
  };

  return (
    <AppLayout title={t('glossary.title')} subtitle={t('glossary.subtitle', 'Conceitos essenciais para founders')}>
      <div className="space-y-6 p-6">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('glossary.searchPlaceholder', 'Pesquisar conceitos...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span>{allTerms.length} {t('glossary.concepts', 'conceitos')}</span>
          </div>
          {searchQuery && (
            <Badge variant="secondary">
              {filteredTerms.length} {t('common.results', 'resultados')}
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
                {t('glossary.noResults', 'Nenhum conceito encontrado para')} "{searchQuery}"
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
