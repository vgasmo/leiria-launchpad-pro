/**
 * Canonical Pricing Engine — Startup Leiria V11 March 2026
 * 
 * Source of truth: Anexo I – Regulamento Interno Startup Leiria V11
 * All prices derive from the official versioned pricing table.
 * 
 * Key rules from regulation:
 * - Prices reviewed every 2 years (Art. 6.º §2)
 * - Modality/space change → automatic price update (Art. 6.º §3)
 * - 60-day written notice for price revision (Art. 6.º §4)
 * - 30-day silence = tacit acceptance (Art. 6.º §5)
 * - 5% discount for Startup Portugal status (non-cumulative)
 * - 10% discount for Startup Leiria associates (non-cumulative)
 * - Discounts are NOT cumulative
 * - Startups in first 3 years: base rates apply
 * - From year 4+: annual increase of 5% (startup) or 7.5% (non-startup)
 * - Post-incubation: 150€/year
 * - Ideas incubation: max 6 months
 * - Payment: direct debit from day 15
 * - Late interest: Euribor trimestral
 */

export interface PricingInput {
  incubationType: {
    id: string;
    name: string;
    base_monthly_fee: number;
    base_currency: string;
    price_per_sqm: number | null;
    requires_space: boolean;
    is_virtual: boolean;
    equity_percentage: number | null;
    contract_type: string | null;
  };
  building?: {
    id: string;
    name: string;
    code: string;
  } | null;
  squareMeters?: number | null;
  /** Active discount rules applied to this contract */
  discounts?: DiscountRule[];
  /** Contract start date for tenure-based rules */
  contractStartDate?: string;
  /** Override base fee manually (requires reason) */
  manualOverride?: {
    fee: number;
    reason: string;
  };
  /** Pricing line from official table (preferred over incubationType base fee) */
  pricingLine?: PricingLine | null;
  /** Startup category for differential pricing */
  startupCategory?: 'startup' | 'non_startup';
  /** Is the entity an associate of Startup Leiria */
  isAssociate?: boolean;
  /** Has Startup Portugal recognized status */
  hasStartupPortugalStatus?: boolean;
  /** Current incubation year (1-based) */
  incubationYear?: number;
  /** Is in post-incubation phase */
  isPostIncubation?: boolean;
  /** Pricing table version used */
  pricingVersionCode?: string;
}

export interface PricingLine {
  id: string;
  designation: string;
  startup_monthly_fee: number;
  non_startup_monthly_fee: number | null;
  startup_annual_increase_pct: number | null;
  non_startup_annual_increase_pct: number | null;
  area_sqm: number | null;
  is_per_sqm: boolean;
  is_post_incubation: boolean;
  max_duration_months: number | null;
  billing_frequency: string;
  location_type: string | null;
}

export interface DiscountRule {
  id: string;
  discount_percentage: number;
  start_date: string;
  end_date: string | null;
  reason: string | null;
}

export interface DiscountCandidate {
  type: 'startup_portugal' | 'associate' | 'ca_deliberation' | 'custom';
  percentage: number;
  reason: string;
  eligible: boolean;
  applied: boolean;
}

export interface PricingResult {
  baseFee: number;
  baseFeeSource: string;
  spaceSurcharge: number;
  spaceSurchargeSource: string | null;
  grossMonthlyFee: number;
  /** All discount candidates evaluated */
  discountCandidates: DiscountCandidate[];
  activeDiscounts: AppliedDiscount[];
  totalDiscountPercentage: number;
  discountAmount: number;
  effectiveMonthlyFee: number;
  annualFee: number;
  vatBasis: number;
  vatRate: number;
  vatAmount: number;
  totalWithVat: number;
  currency: string;
  equityPercentage: number | null;
  isManualOverride: boolean;
  pricingVersionCode: string | null;
  billingFrequency: string;
  /** Year-over-year increase applied */
  yearlyIncreaseApplied: number;
  warnings: PricingWarning[];
  auditTrail: string[];
}

export interface AppliedDiscount {
  id: string;
  percentage: number;
  reason: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
}

export interface PricingWarning {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

const VAT_RATE = 0.23; // IVA 23%

/**
 * Calculate contract pricing from structured inputs.
 * This is the single source of truth for all price derivation.
 */
export function calculateContractPricing(input: PricingInput): PricingResult {
  const warnings: PricingWarning[] = [];
  const auditTrail: string[] = [];
  const now = new Date();
  const isStartup = (input.startupCategory || 'startup') === 'startup';
  const incubationYear = input.incubationYear || 1;
  const pricingVersionCode = input.pricingVersionCode || 'V11-MAR-2026';

  auditTrail.push(`Tabela de preços: ${pricingVersionCode}`);
  auditTrail.push(`Categoria: ${isStartup ? 'Startup/Associado' : 'Não Startup'}`);
  auditTrail.push(`Ano de incubação: ${incubationYear}`);

  // 1. Determine base fee from pricing line or incubation type
  let baseFee: number;
  let baseFeeSource: string;
  let isManualOverride = false;
  let billingFrequency = 'monthly';
  let yearlyIncreaseApplied = 0;

  if (input.manualOverride) {
    baseFee = input.manualOverride.fee;
    baseFeeSource = `Exceção manual: ${input.manualOverride.reason}`;
    isManualOverride = true;
    auditTrail.push(`⚠ Fee base sobreposta manualmente: €${baseFee} — Motivo: ${input.manualOverride.reason}`);
    warnings.push({
      code: 'MANUAL_OVERRIDE',
      message: `Fee base definida manualmente (€${baseFee}). Valor standard: €${input.incubationType.base_monthly_fee}`,
      severity: 'warning',
    });
  } else if (input.pricingLine) {
    const pl = input.pricingLine;
    billingFrequency = pl.billing_frequency || 'monthly';

    // Use the correct column based on startup category
    if (pl.is_per_sqm) {
      const sqm = input.squareMeters || 0;
      const pricePerSqm = isStartup ? pl.startup_monthly_fee : (pl.non_startup_monthly_fee || pl.startup_monthly_fee);
      baseFee = pricePerSqm * sqm;
      baseFeeSource = `${pl.designation}: ${sqm}m² × €${pricePerSqm}/m²/mês`;
      auditTrail.push(`Preço por m²: ${sqm}m² × €${pricePerSqm} = €${baseFee}`);
    } else {
      baseFee = isStartup ? pl.startup_monthly_fee : (pl.non_startup_monthly_fee || pl.startup_monthly_fee);
      baseFeeSource = `${pl.designation}: €${baseFee}/${billingFrequency === 'monthly' ? 'mês' : 'ano'} (${isStartup ? 'Startup' : 'Não Startup'})`;
      auditTrail.push(`Fee base: ${pl.designation} = €${baseFee}`);
    }

    // Apply year-over-year increase for year 4+ (physical offices only)
    if (incubationYear > 3 && pl.startup_annual_increase_pct) {
      const increasePct = isStartup ? pl.startup_annual_increase_pct : (pl.non_startup_annual_increase_pct || pl.startup_annual_increase_pct);
      const yearsOver = incubationYear - 3;
      const multiplier = Math.pow(1 + increasePct / 100, yearsOver);
      const oldFee = baseFee;
      baseFee = Math.round(baseFee * multiplier * 100) / 100;
      yearlyIncreaseApplied = increasePct;
      auditTrail.push(`Aumento anual ${increasePct}% (ano ${incubationYear}): €${oldFee} → €${baseFee}`);
      warnings.push({
        code: 'YEAR_4_PLUS_INCREASE',
        message: `Aumento de ${increasePct}% aplicado — ano ${incubationYear} de incubação`,
        severity: 'info',
      });
    }

    // Max duration warning
    if (pl.max_duration_months) {
      warnings.push({
        code: 'MAX_DURATION',
        message: `Modalidade limitada a ${pl.max_duration_months} meses`,
        severity: 'info',
      });
    }
  } else {
    baseFee = input.incubationType.base_monthly_fee;
    baseFeeSource = `Tipo de incubação: ${input.incubationType.name} (€${baseFee}/mês)`;
    auditTrail.push(`Fee base: "${input.incubationType.name}": €${baseFee}`);
  }

  // 2. Calculate space surcharge (only for types that use price_per_sqm without a pricing line)
  let spaceSurcharge = 0;
  let spaceSurchargeSource: string | null = null;

  if (!input.pricingLine?.is_per_sqm && input.incubationType.requires_space && input.incubationType.price_per_sqm && input.squareMeters) {
    spaceSurcharge = input.incubationType.price_per_sqm * input.squareMeters;
    spaceSurchargeSource = `${input.squareMeters}m² × €${input.incubationType.price_per_sqm}/m²`;
    auditTrail.push(`Suplemento espaço: ${spaceSurchargeSource} = €${spaceSurcharge}`);
  }

  // Validation warnings
  if (input.incubationType.requires_space && !input.squareMeters && !input.incubationType.is_virtual) {
    warnings.push({
      code: 'MISSING_SPACE',
      message: 'Incubação física requer alocação de espaço (m²)',
      severity: 'warning',
    });
  }

  if (input.incubationType.requires_space && !input.building && !input.incubationType.is_virtual) {
    warnings.push({
      code: 'MISSING_BUILDING',
      message: 'Incubação física requer atribuição de edifício',
      severity: 'warning',
    });
  }

  // 3. Gross fee
  const grossMonthlyFee = baseFee + spaceSurcharge;
  auditTrail.push(`Fee bruta: €${baseFee} + €${spaceSurcharge} = €${grossMonthlyFee}`);

  // 4. Evaluate discount candidates (regulation rules)
  const discountCandidates: DiscountCandidate[] = [];

  // 5% Startup Portugal
  const spEligible = input.hasStartupPortugalStatus === true;
  discountCandidates.push({
    type: 'startup_portugal',
    percentage: 5,
    reason: 'Estatuto Startup Portugal (Lei n.º 21/2023)',
    eligible: spEligible,
    applied: false,
  });

  // 10% Associado
  const assocEligible = input.isAssociate === true;
  discountCandidates.push({
    type: 'associate',
    percentage: 10,
    reason: 'Associado da Startup Leiria',
    eligible: assocEligible,
    applied: false,
  });

  // Apply non-cumulative rule: take the HIGHEST eligible automatic discount
  let bestAutoDiscount = 0;
  let bestAutoDiscountIdx = -1;
  for (let i = 0; i < discountCandidates.length; i++) {
    if (discountCandidates[i].eligible && discountCandidates[i].percentage > bestAutoDiscount) {
      bestAutoDiscount = discountCandidates[i].percentage;
      bestAutoDiscountIdx = i;
    }
  }
  if (bestAutoDiscountIdx >= 0) {
    discountCandidates[bestAutoDiscountIdx].applied = true;
    auditTrail.push(`Desconto automático: ${discountCandidates[bestAutoDiscountIdx].percentage}% — ${discountCandidates[bestAutoDiscountIdx].reason}`);
    auditTrail.push(`Nota: descontos NÃO cumulativos — aplicado o mais favorável`);
  }

  // 5. Apply contract-specific discounts (CA deliberations, temporal)
  const activeDiscounts: AppliedDiscount[] = [];
  let maxContractDiscount = 0;

  if (input.discounts) {
    for (const discount of input.discounts) {
      const startDate = new Date(discount.start_date);
      const endDate = discount.end_date ? new Date(discount.end_date) : null;
      const isActive = startDate <= now && (!endDate || endDate >= now);

      activeDiscounts.push({
        id: discount.id,
        percentage: discount.discount_percentage,
        reason: discount.reason,
        startDate: discount.start_date,
        endDate: discount.end_date,
        isActive,
      });

      if (isActive && discount.discount_percentage > maxContractDiscount) {
        maxContractDiscount = discount.discount_percentage;
      }
    }
  }

  // Non-cumulative: take the higher of auto discount or contract discount
  const totalDiscountPercentage = Math.min(Math.max(bestAutoDiscount, maxContractDiscount), 100);
  const discountAmount = grossMonthlyFee * (totalDiscountPercentage / 100);
  const effectiveMonthlyFee = Math.max(0, grossMonthlyFee - discountAmount);

  if (totalDiscountPercentage > 0) {
    auditTrail.push(`Desconto efetivo: ${totalDiscountPercentage}% = -€${discountAmount.toFixed(2)}`);
    auditTrail.push(`Fee mensal efetiva: €${effectiveMonthlyFee.toFixed(2)}`);
  }

  // 6. VAT and annual
  const annualFee = billingFrequency === 'monthly' ? effectiveMonthlyFee * 12 : effectiveMonthlyFee;
  const vatBasis = effectiveMonthlyFee;
  const vatAmount = vatBasis * VAT_RATE;
  const totalWithVat = vatBasis + vatAmount;

  auditTrail.push(`IVA (${VAT_RATE * 100}%): €${vatAmount.toFixed(2)} — Total c/ IVA: €${totalWithVat.toFixed(2)}`);

  // 7. Tenure & lifecycle warnings
  if (input.contractStartDate) {
    const startDate = new Date(input.contractStartDate);
    const monthsActive = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

    if (monthsActive >= 36 && !input.isPostIncubation) {
      warnings.push({
        code: 'OVER_3_YEARS',
        message: `Contrato ativo há ${Math.floor(monthsActive / 12)} anos. Revisão obrigatória — Art. 9.º do Regulamento.`,
        severity: 'critical',
      });
    } else if (monthsActive >= 30 && !input.isPostIncubation) {
      warnings.push({
        code: 'APPROACHING_3_YEARS',
        message: `Contrato aproxima-se dos 3 anos (${Math.floor(monthsActive / 12)} anos). Planear revisão.`,
        severity: 'warning',
      });
    }

    // Biennial price review
    const monthsSinceStart = monthsActive;
    if (monthsSinceStart >= 24 && monthsSinceStart % 24 < 3) {
      warnings.push({
        code: 'BIENNIAL_REVIEW_DUE',
        message: 'Revisão bianual de preços devida — comunicação 60 dias antes.',
        severity: 'warning',
      });
    }

    // Anniversary
    if (monthsSinceStart >= 11 && monthsSinceStart % 12 < 2) {
      warnings.push({
        code: 'ANNIVERSARY_APPROACHING',
        message: `Aniversário contratual (ano ${Math.ceil(monthsSinceStart / 12)}) próximo.`,
        severity: 'info',
      });
    }
  }

  if (input.isPostIncubation) {
    auditTrail.push('Regime de pós-incubação ativo');
  }

  return {
    baseFee,
    baseFeeSource,
    spaceSurcharge,
    spaceSurchargeSource,
    grossMonthlyFee,
    discountCandidates,
    activeDiscounts,
    totalDiscountPercentage,
    discountAmount,
    effectiveMonthlyFee: Math.round(effectiveMonthlyFee * 100) / 100,
    annualFee: Math.round(annualFee * 100) / 100,
    vatBasis: Math.round(vatBasis * 100) / 100,
    vatRate: VAT_RATE,
    vatAmount: Math.round(vatAmount * 100) / 100,
    totalWithVat: Math.round(totalWithVat * 100) / 100,
    currency: input.incubationType.base_currency || 'EUR',
    equityPercentage: input.incubationType.equity_percentage,
    isManualOverride,
    pricingVersionCode,
    billingFrequency,
    yearlyIncreaseApplied,
    warnings,
    auditTrail,
  };
}

/**
 * Resolve which discount applies given startup status.
 * Returns the single best non-cumulative discount.
 */
export function resolveApplicableDiscounts(
  hasStartupPortugalStatus: boolean,
  isAssociate: boolean,
  caDiscounts?: DiscountRule[],
): { bestPercentage: number; reason: string; type: string } {
  const candidates: Array<{ pct: number; reason: string; type: string }> = [];

  if (hasStartupPortugalStatus) {
    candidates.push({ pct: 5, reason: 'Estatuto Startup Portugal (Lei n.º 21/2023)', type: 'startup_portugal' });
  }
  if (isAssociate) {
    candidates.push({ pct: 10, reason: 'Associado da Startup Leiria', type: 'associate' });
  }
  if (caDiscounts) {
    for (const d of caDiscounts) {
      const now = new Date();
      const start = new Date(d.start_date);
      const end = d.end_date ? new Date(d.end_date) : null;
      if (start <= now && (!end || end >= now)) {
        candidates.push({ pct: d.discount_percentage, reason: d.reason || 'Deliberação CA', type: 'ca_deliberation' });
      }
    }
  }

  if (!candidates.length) return { bestPercentage: 0, reason: '', type: 'none' };

  candidates.sort((a, b) => b.pct - a.pct);
  return { bestPercentage: candidates[0].pct, reason: candidates[0].reason, type: candidates[0].type };
}

/**
 * Format currency for display
 */
export function formatContractCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}
