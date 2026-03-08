export type GuideSection = {
  heading: string;
  body: string;
  tips?: string[];
};

export type GuideContent = {
  content_pt: GuideSection[];
  content_en: GuideSection[];
  reading_minutes?: number;
};

export const GUIDE_CONTENT: Record<string, GuideContent> = {
  'guide-tam-sam-som': {
    reading_minutes: 5,
    content_pt: [
      { heading: 'O que é TAM, SAM e SOM?', body: 'TAM (Total Addressable Market) é o mercado total disponível — o valor total de receita se capturasses 100% do mercado.\n\nSAM (Serviceable Addressable Market) é a fatia do TAM que o teu produto/serviço pode realisticamente servir, dadas as limitações geográficas, técnicas e de segmento.\n\nSOM (Serviceable Obtainable Market) é a porção do SAM que podes capturar nos próximos 1-3 anos, considerando concorrência, recursos e capacidade de execução.', tips: ['Usa abordagens bottom-up sempre que possível — são mais credíveis que top-down', 'Cita fontes (Eurostat, INE, Statista, relatórios de indústria)', 'Apresenta sempre em formato de funil visual'] },
      { heading: 'Como calcular (Bottom-Up)', body: '1. Identifica o número de potenciais clientes no teu segmento\n2. Multiplica pelo preço médio anual do teu produto/serviço\n3. Ajusta por taxa de adoção realista\n\nExemplo: 50.000 PMEs em Portugal × €200/mês × 12 = €120M (SAM)\nCom 2% de penetração no ano 1 → SOM = €2,4M' },
      { heading: 'Erros comuns', body: '• Começar pelo top-down sem validar com dados reais\n• Confundir TAM com o mercado total de uma indústria sem relevância para o produto\n• Não justificar pressupostos de penetração\n• Ignorar a concorrência ao calcular SOM', tips: ['Investidores valorizam mais a lógica dos pressupostos do que o número final', 'Prepara cenários conservador, base e optimista'] },
    ],
    content_en: [
      { heading: 'What are TAM, SAM, and SOM?', body: 'TAM (Total Addressable Market) is the total available market — the total revenue opportunity if you captured 100% of the market.\n\nSAM (Serviceable Addressable Market) is the slice of TAM your product/service can realistically serve, given geographic, technical, and segment constraints.\n\nSOM (Serviceable Obtainable Market) is the portion of SAM you can capture in the next 1-3 years, considering competition, resources, and execution capacity.', tips: ['Use bottom-up approaches whenever possible — they are more credible than top-down', 'Cite sources (Eurostat, Statista, industry reports)', 'Always present in a visual funnel format'] },
      { heading: 'How to calculate (Bottom-Up)', body: '1. Identify the number of potential customers in your segment\n2. Multiply by the average annual price of your product/service\n3. Adjust for realistic adoption rate\n\nExample: 50,000 SMEs in Portugal × €200/month × 12 = €120M (SAM)\nWith 2% penetration in year 1 → SOM = €2.4M' },
      { heading: 'Common mistakes', body: '• Starting top-down without validating with real data\n• Confusing TAM with the total market of an industry without relevance to the product\n• Not justifying penetration assumptions\n• Ignoring competition when calculating SOM', tips: ['Investors value the logic of assumptions more than the final number', 'Prepare conservative, base, and optimistic scenarios'] },
    ],
  },
  'guide-gtm-checklist': {
    reading_minutes: 4,
    content_pt: [
      { heading: 'Antes do lançamento', body: '• Define o teu ICP (Ideal Customer Profile) com critérios claros\n• Valida posicionamento com 5-10 potenciais clientes\n• Define pricing e packaging (pelo menos v1)\n• Cria landing page com proposta de valor clara\n• Prepara materiais de vendas mínimos (deck, one-pager)' },
      { heading: 'Canais de aquisição', body: '• Escolhe no máximo 2-3 canais iniciais\n• Define métricas de sucesso para cada canal\n• Calcula CAC esperado vs LTV esperado\n• Cria um funil simples de lead → trial → cliente\n\nCanais comuns: outbound, content, partnerships, comunidade, PLG (product-led growth)', tips: ['Não tentes todos os canais ao mesmo tempo', 'Mede tudo desde o dia 1 — mesmo que os números sejam pequenos'] },
      { heading: 'Primeiras métricas', body: '• Visitantes → Leads → MQLs → Clientes (taxa de conversão)\n• CAC (Custo de Aquisição de Cliente)\n• Tempo médio de ciclo de venda\n• NPS ou satisfação inicial\n• Receita recorrente mensal (MRR)' },
    ],
    content_en: [
      { heading: 'Before launch', body: '• Define your ICP (Ideal Customer Profile) with clear criteria\n• Validate positioning with 5-10 potential customers\n• Set pricing and packaging (at least v1)\n• Create a landing page with a clear value proposition\n• Prepare minimum sales materials (deck, one-pager)' },
      { heading: 'Acquisition channels', body: '• Choose at most 2-3 initial channels\n• Define success metrics for each channel\n• Calculate expected CAC vs expected LTV\n• Create a simple funnel: lead → trial → customer\n\nCommon channels: outbound, content, partnerships, community, PLG (product-led growth)', tips: ['Don\'t try all channels at once', 'Measure everything from day 1 — even if numbers are small'] },
      { heading: 'First metrics', body: '• Visitors → Leads → MQLs → Customers (conversion rate)\n• CAC (Customer Acquisition Cost)\n• Average sales cycle time\n• NPS or initial satisfaction\n• Monthly Recurring Revenue (MRR)' },
    ],
  },
  'guide-pricing-frameworks': {
    reading_minutes: 4,
    content_pt: [
      { heading: 'Pricing baseado em valor', body: 'O preço deve refletir o valor que o cliente percebe, não apenas o custo de produção.\n\n1. Quantifica o problema que resolves (em € ou tempo)\n2. Posiciona o preço como fração do valor entregue\n3. Testa com early adopters antes de fixar\n4. Itera com base em feedback e dados de conversão', tips: ['Regra geral: cobra 10-20% do valor que entregas', 'Sempre mais fácil baixar preço do que subir'] },
      { heading: 'Modelos comuns', body: '• Freemium: grátis + plano pago (ideal para PLG)\n• Subscription: mensal/anual (previsibilidade de MRR)\n• Per-seat: por utilizador (escala com adoção)\n• Usage-based: por consumo (alinha incentivos)\n• Tiered: pacotes por funcionalidade/volume' },
      { heading: 'Como testar', body: '• Pergunta a clientes quanto pagariam (Van Westendorp)\n• Testa 2-3 pontos de preço com A/B testing\n• Mede impacto em conversão E retenção\n• Revê a cada trimestre nos primeiros 12 meses' },
    ],
    content_en: [
      { heading: 'Value-based pricing', body: 'Price should reflect the value the customer perceives, not just production cost.\n\n1. Quantify the problem you solve (in € or time)\n2. Position price as a fraction of value delivered\n3. Test with early adopters before fixing\n4. Iterate based on feedback and conversion data', tips: ['Rule of thumb: charge 10-20% of the value you deliver', 'Always easier to lower prices than raise them'] },
      { heading: 'Common models', body: '• Freemium: free + paid plan (ideal for PLG)\n• Subscription: monthly/annual (MRR predictability)\n• Per-seat: per user (scales with adoption)\n• Usage-based: by consumption (aligns incentives)\n• Tiered: packages by feature/volume' },
      { heading: 'How to test', body: '• Ask customers what they would pay (Van Westendorp)\n• Test 2-3 price points with A/B testing\n• Measure impact on conversion AND retention\n• Review quarterly in the first 12 months' },
    ],
  },
  'guide-cac-ltv': {
    reading_minutes: 3,
    content_pt: [
      { heading: 'CAC — Custo de Aquisição de Cliente', body: 'CAC = Total gasto em vendas e marketing ÷ Número de novos clientes\n\nInclui: salários de vendas, ads, ferramentas, eventos, conteúdo.\nNão inclui: desenvolvimento de produto, suporte pós-venda.', tips: ['Calcula CAC por canal para saber onde investir mais', 'Blended CAC é útil mas esconde ineficiências'] },
      { heading: 'LTV — Valor do Ciclo de Vida', body: 'LTV = ARPU × Margem Bruta × Tempo médio de retenção (meses)\n\nExemplo: €100/mês × 70% margem × 24 meses = €1.680 LTV\n\nRácio saudável: LTV/CAC ≥ 3x\nPayback ideal: < 12 meses' },
      { heading: 'Como melhorar', body: '• Reduzir CAC: otimizar canais, melhorar conversão, referrals\n• Aumentar LTV: reduzir churn, upsell, aumentar ARPU\n• Monitorizar mensalmente e por cohort' },
    ],
    content_en: [
      { heading: 'CAC — Customer Acquisition Cost', body: 'CAC = Total spent on sales and marketing ÷ Number of new customers\n\nIncludes: sales salaries, ads, tools, events, content.\nExcludes: product development, post-sale support.', tips: ['Calculate CAC per channel to know where to invest more', 'Blended CAC is useful but hides inefficiencies'] },
      { heading: 'LTV — Lifetime Value', body: 'LTV = ARPU × Gross Margin × Average retention time (months)\n\nExample: €100/month × 70% margin × 24 months = €1,680 LTV\n\nHealthy ratio: LTV/CAC ≥ 3x\nIdeal payback: < 12 months' },
      { heading: 'How to improve', body: '• Reduce CAC: optimize channels, improve conversion, referrals\n• Increase LTV: reduce churn, upsell, increase ARPU\n• Monitor monthly and by cohort' },
    ],
  },
  'guide-investor-update': {
    reading_minutes: 3,
    content_pt: [
      { heading: 'Estrutura recomendada', body: '1. Resumo (2-3 linhas): o mais importante do mês\n2. Métricas-chave: MRR, clientes, churn, runway\n3. Destaques: conquistas e marcos\n4. Desafios: problemas e como estás a resolver\n5. Pedidos: intros, talento, feedback específico\n6. Próximos passos: foco do próximo mês', tips: ['Envia até ao dia 5 de cada mês', 'Sê honesto sobre desafios — investidores valorizam transparência', 'Mantém abaixo de 500 palavras'] },
      { heading: 'O que NÃO fazer', body: '• Saltar meses quando as coisas vão mal\n• Incluir só boas notícias\n• Escrever updates de 3 páginas\n• Esquecer de incluir métricas concretas' },
    ],
    content_en: [
      { heading: 'Recommended structure', body: '1. Summary (2-3 lines): the most important thing this month\n2. Key metrics: MRR, customers, churn, runway\n3. Highlights: achievements and milestones\n4. Challenges: problems and how you\'re solving them\n5. Asks: intros, talent, specific feedback\n6. Next steps: focus for next month', tips: ['Send by the 5th of each month', 'Be honest about challenges — investors value transparency', 'Keep under 500 words'] },
      { heading: 'What NOT to do', body: '• Skip months when things go badly\n• Only include good news\n• Write 3-page updates\n• Forget to include concrete metrics' },
    ],
  },
  'guide-cap-table': {
    reading_minutes: 4,
    content_pt: [
      { heading: 'O que é uma cap table?', body: 'A tabela de capitalização lista todos os acionistas, percentagens de ownership, tipos de ações e condições (vesting, cliff, preferências de liquidação).\n\nÉ essencial para negociar rondas de investimento e manter transparência com co-fundadores e investidores.' },
      { heading: 'Elementos essenciais', body: '• Fundadores: ações ordinárias + vesting schedule\n• Investidores: ações preferenciais + termos\n• ESOP (Employee Stock Option Pool): tipicamente 10-15%\n• Convertíveis: SAFEs, notas convertíveis pendentes\n• Diluição: impacto de cada ronda nos existentes', tips: ['Mantém a cap table atualizada a cada evento relevante', 'Usa ferramentas como Carta, Pulley ou simples spreadsheet'] },
      { heading: 'Vesting padrão', body: '4 anos total com 1 ano de cliff:\n• Cliff: 0% vested até completar 12 meses\n• Após cliff: 25% vested de imediato\n• Restante: vesting mensal linear nos 36 meses seguintes' },
    ],
    content_en: [
      { heading: 'What is a cap table?', body: 'A capitalization table lists all shareholders, ownership percentages, share types, and conditions (vesting, cliff, liquidation preferences).\n\nIt\'s essential for negotiating funding rounds and maintaining transparency with co-founders and investors.' },
      { heading: 'Essential elements', body: '• Founders: common shares + vesting schedule\n• Investors: preferred shares + terms\n• ESOP (Employee Stock Option Pool): typically 10-15%\n• Convertibles: SAFEs, pending convertible notes\n• Dilution: impact of each round on existing holders', tips: ['Keep the cap table updated at every relevant event', 'Use tools like Carta, Pulley, or a simple spreadsheet'] },
      { heading: 'Standard vesting', body: '4 years total with 1 year cliff:\n• Cliff: 0% vested until 12 months completed\n• After cliff: 25% vested immediately\n• Remaining: monthly linear vesting over the next 36 months' },
    ],
  },
  'guide-term-sheet': {
    reading_minutes: 4,
    content_pt: [
      { heading: 'O que é um term sheet?', body: 'Um term sheet é um documento não vinculativo que define os termos principais de um investimento: valorização, montante, tipo de ações, direitos e condições.\n\nÉ a base de negociação antes de avançar para documentos legais definitivos.' },
      { heading: 'Cláusulas-chave', body: '• Valuation (pre-money): determina diluição dos fundadores\n• Liquidation preference: quem recebe primeiro em caso de venda\n• Anti-dilution: proteção do investidor contra down-rounds\n• Board seats: representação no conselho\n• Pro-rata rights: direito de investir em rondas futuras\n• Vesting acceleration: o que acontece em caso de aquisição', tips: ['Foca-te primeiro em valuation e liquidation preference', 'Consulta sempre um advogado com experiência em VC'] },
      { heading: 'O que negociar com confiança', body: '• Valuation: baseia-te em tração e comparáveis\n• Vesting acceleration: pede pelo menos single-trigger parcial\n• Board composition: mantém controlo nos primeiros rounds\n• Information rights: standard, não cedas mais do que necessário' },
    ],
    content_en: [
      { heading: 'What is a term sheet?', body: 'A term sheet is a non-binding document that defines the main terms of an investment: valuation, amount, share type, rights, and conditions.\n\nIt\'s the negotiation basis before proceeding to definitive legal documents.' },
      { heading: 'Key clauses', body: '• Valuation (pre-money): determines founder dilution\n• Liquidation preference: who gets paid first in a sale\n• Anti-dilution: investor protection against down-rounds\n• Board seats: board representation\n• Pro-rata rights: right to invest in future rounds\n• Vesting acceleration: what happens in case of acquisition', tips: ['Focus first on valuation and liquidation preference', 'Always consult a lawyer with VC experience'] },
      { heading: 'What to negotiate confidently', body: '• Valuation: base it on traction and comparables\n• Vesting acceleration: ask for at least partial single-trigger\n• Board composition: maintain control in early rounds\n• Information rights: standard, don\'t give more than necessary' },
    ],
  },
  'guide-dataroom-checklist': {
    reading_minutes: 3,
    content_pt: [
      { heading: 'Documentos essenciais', body: '📊 Financeiro\n• Modelo financeiro (3-5 anos)\n• Demonstrações financeiras (últimos 2 anos)\n• Cap table atualizada\n\n📋 Legal\n• Pacto social e estatutos\n• Contratos de fundadores (vesting)\n• Propriedade intelectual (patentes, marcas)\n\n📈 Negócio\n• Pitch deck atualizado\n• Métricas-chave (dashboard ou export)\n• Pipeline de clientes/vendas' },
      { heading: 'Boas práticas', body: '• Organiza por pastas temáticas\n• Nomeia ficheiros de forma consistente\n• Atualiza antes de cada reunião com investidores\n• Usa controlo de acesso (quem vê o quê)', tips: ['Prepara o dataroom ANTES de precisar dele', 'Investidores julgam a organização como proxy da gestão'] },
    ],
    content_en: [
      { heading: 'Essential documents', body: '📊 Financial\n• Financial model (3-5 years)\n• Financial statements (last 2 years)\n• Updated cap table\n\n📋 Legal\n• Articles of incorporation\n• Founder agreements (vesting)\n• Intellectual property (patents, trademarks)\n\n📈 Business\n• Updated pitch deck\n• Key metrics (dashboard or export)\n• Customer/sales pipeline' },
      { heading: 'Best practices', body: '• Organize by thematic folders\n• Name files consistently\n• Update before each investor meeting\n• Use access control (who sees what)', tips: ['Prepare the dataroom BEFORE you need it', 'Investors judge organization as a proxy for management'] },
    ],
  },
  'guide-okrs-vs-kpis': {
    reading_minutes: 3,
    content_pt: [
      { heading: 'KPIs vs OKRs', body: 'KPIs (Key Performance Indicators) são métricas contínuas que monitorizam a saúde do negócio. Ex: MRR, churn rate, NPS.\n\nOKRs (Objectives & Key Results) são metas ambiciosas e temporárias. O Objective é qualitativo (inspirador), os Key Results são quantitativos (mensuráveis).\n\nExemplo OKR:\nObjective: Tornar-nos a referência em customer success\nKR1: NPS > 60\nKR2: Churn < 3%\nKR3: 5 case studies publicados' },
      { heading: 'Quando usar cada um', body: '• KPIs: sempre ativos, para monitorizar operações\n• OKRs: ciclos de 3 meses, para impulsionar mudança\n• Combina ambos: KPIs como "health metrics", OKRs como "growth bets"', tips: ['Não definas mais de 3 OKRs por trimestre', 'KPIs sem ação são só números — define thresholds de alarme'] },
    ],
    content_en: [
      { heading: 'KPIs vs OKRs', body: 'KPIs (Key Performance Indicators) are continuous metrics that monitor business health. E.g.: MRR, churn rate, NPS.\n\nOKRs (Objectives & Key Results) are ambitious, temporary goals. The Objective is qualitative (inspiring), Key Results are quantitative (measurable).\n\nExample OKR:\nObjective: Become the reference in customer success\nKR1: NPS > 60\nKR2: Churn < 3%\nKR3: 5 published case studies' },
      { heading: 'When to use each', body: '• KPIs: always active, to monitor operations\n• OKRs: 3-month cycles, to drive change\n• Combine both: KPIs as "health metrics", OKRs as "growth bets"', tips: ['Don\'t define more than 3 OKRs per quarter', 'KPIs without action are just numbers — define alarm thresholds'] },
    ],
  },
  'guide-experiment-design': {
    reading_minutes: 3,
    content_pt: [
      { heading: 'Template de experiência', body: '1. Hipótese: "Acreditamos que [ação] vai resultar em [resultado] para [segmento]"\n2. Teste: o que vamos fazer concretamente\n3. Métrica de sucesso: como medimos o resultado\n4. Critério de decisão: threshold para validar/invalidar\n5. Timeline: duração máxima do teste\n6. Resultado: o que aprendemos' },
      { heading: 'Boas práticas', body: '• Uma variável de cada vez\n• Define o critério ANTES de começar\n• Documenta tudo (mesmo falhas)\n• Partilha learnings com a equipa', tips: ['Experiências rápidas e baratas > perfeitas e caras', 'Se não sabes o que estás a testar, não é uma experiência'] },
    ],
    content_en: [
      { heading: 'Experiment template', body: '1. Hypothesis: "We believe that [action] will result in [outcome] for [segment]"\n2. Test: what we will concretely do\n3. Success metric: how we measure the result\n4. Decision criteria: threshold to validate/invalidate\n5. Timeline: maximum test duration\n6. Result: what we learned' },
      { heading: 'Best practices', body: '• One variable at a time\n• Define criteria BEFORE starting\n• Document everything (even failures)\n• Share learnings with the team', tips: ['Fast and cheap experiments > perfect and expensive', 'If you don\'t know what you\'re testing, it\'s not an experiment'] },
    ],
  },
  'guide-sales-pipeline': {
    reading_minutes: 3,
    content_pt: [
      { heading: 'Etapas típicas', body: '1. Lead: contacto inicial identificado\n2. Qualificado: confirma fit (ICP, budget, timing)\n3. Demo/Proposta: apresentação e proposta comercial\n4. Negociação: alinhamento de termos\n5. Fechado-Ganho / Fechado-Perdido\n\nCada etapa deve ter critérios claros de passagem.' },
      { heading: 'Métricas do funil', body: '• Taxa de conversão entre etapas\n• Tempo médio em cada etapa\n• Valor médio por deal\n• Win rate global\n• Pipeline coverage (3-4x target)', tips: ['Revê o pipeline semanalmente', 'Foca-te em mover deals, não em adicionar mais leads'] },
    ],
    content_en: [
      { heading: 'Typical stages', body: '1. Lead: initial contact identified\n2. Qualified: confirms fit (ICP, budget, timing)\n3. Demo/Proposal: presentation and commercial proposal\n4. Negotiation: terms alignment\n5. Closed-Won / Closed-Lost\n\nEach stage should have clear progression criteria.' },
      { heading: 'Funnel metrics', body: '• Conversion rate between stages\n• Average time in each stage\n• Average deal value\n• Overall win rate\n• Pipeline coverage (3-4x target)', tips: ['Review pipeline weekly', 'Focus on moving deals, not just adding more leads'] },
    ],
  },
  'guide-product-roadmap': {
    reading_minutes: 3,
    content_pt: [
      { heading: 'Princípios', body: '• Um roadmap não é uma lista de features — é uma ferramenta de comunicação\n• Organiza por outcomes (resultados), não outputs (funcionalidades)\n• Usa horizonte temporal: Now / Next / Later\n• Mantém flexível — adapta-se a cada sprint ou ciclo' },
      { heading: 'Template sugerido', body: 'Now (este mês):\n• [Outcome 1] — features A, B\n• [Outcome 2] — feature C\n\nNext (próximo trimestre):\n• [Outcome 3] — exploratório\n\nLater (6+ meses):\n• Visão de longo prazo', tips: ['Partilha com stakeholders regularmente', 'Diz não a 80% dos pedidos — foco é tudo'] },
    ],
    content_en: [
      { heading: 'Principles', body: '• A roadmap is not a feature list — it\'s a communication tool\n• Organize by outcomes, not outputs\n• Use time horizons: Now / Next / Later\n• Keep flexible — adapts each sprint or cycle' },
      { heading: 'Suggested template', body: 'Now (this month):\n• [Outcome 1] — features A, B\n• [Outcome 2] — feature C\n\nNext (next quarter):\n• [Outcome 3] — exploratory\n\nLater (6+ months):\n• Long-term vision', tips: ['Share with stakeholders regularly', 'Say no to 80% of requests — focus is everything'] },
    ],
  },
  'guide-fundraising-readiness': {
    reading_minutes: 4,
    content_pt: [
      { heading: 'Antes de levantar investimento', body: '✅ Pitch deck atualizado e ensaiado (< 15 slides)\n✅ Modelo financeiro com pressupostos claros\n✅ Cap table limpa e atualizada\n✅ Métricas dos últimos 3-6 meses documentadas\n✅ Dataroom organizado\n✅ Narrativa clara: problema → solução → tração → pedido\n✅ Lista de investidores alvo (30-50)\n✅ Referências prontas (clientes, mentores, outros founders)' },
      { heading: 'Sinais de que estás pronto', body: '• Tens product-market fit sinais (retenção, crescimento orgânico)\n• Sabes exatamente quanto precisas e para quê\n• Tens runway para 3-6 meses de processo\n• A equipa está alinhada e estável', tips: ['Começa o processo 6 meses antes de precisares do dinheiro', 'Fundraising é um full-time job — prepara a equipa para operar sem ti'] },
    ],
    content_en: [
      { heading: 'Before raising investment', body: '✅ Updated and rehearsed pitch deck (< 15 slides)\n✅ Financial model with clear assumptions\n✅ Clean and updated cap table\n✅ Last 3-6 months metrics documented\n✅ Organized dataroom\n✅ Clear narrative: problem → solution → traction → ask\n✅ Target investor list (30-50)\n✅ References ready (customers, mentors, other founders)' },
      { heading: 'Signs you\'re ready', body: '• You have product-market fit signals (retention, organic growth)\n• You know exactly how much you need and for what\n• You have 3-6 months runway for the process\n• Team is aligned and stable', tips: ['Start the process 6 months before you need the money', 'Fundraising is a full-time job — prepare the team to operate without you'] },
    ],
  },
  'guide-privacy-startups': {
    reading_minutes: 3,
    content_pt: [
      { heading: 'RGPD básico para startups', body: '• Identifica que dados pessoais recolhes e porquê\n• Cria uma política de privacidade clara\n• Implementa consentimento explícito (opt-in)\n• Permite aos utilizadores aceder, corrigir e apagar dados\n• Documenta o processamento (registo de atividades)' },
      { heading: 'Primeiros passos', body: '1. Auditoria de dados: que dados tens e onde estão\n2. Base legal: consentimento, contrato ou interesse legítimo\n3. Política de privacidade no site/app\n4. Processo de resposta a pedidos de titulares\n5. Segurança básica: HTTPS, passwords encriptadas, backups', tips: ['Não precisas de DPO se fores uma pequena startup', 'Documenta tudo — a boa-fé conta em caso de auditoria'] },
    ],
    content_en: [
      { heading: 'GDPR basics for startups', body: '• Identify what personal data you collect and why\n• Create a clear privacy policy\n• Implement explicit consent (opt-in)\n• Allow users to access, correct, and delete data\n• Document processing (records of activities)' },
      { heading: 'First steps', body: '1. Data audit: what data you have and where it is\n2. Legal basis: consent, contract, or legitimate interest\n3. Privacy policy on site/app\n4. Process for responding to data subject requests\n5. Basic security: HTTPS, encrypted passwords, backups', tips: ['You don\'t need a DPO if you\'re a small startup', 'Document everything — good faith counts in case of audit'] },
    ],
  },
};
