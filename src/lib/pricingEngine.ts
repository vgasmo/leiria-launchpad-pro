/**
 * Canonical Pricing Engine
 * Rule-based pricing calculation for incubation contracts.
 * All prices derive from incubation types, buildings, area, and discount rules.
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
}

export interface DiscountRule {
  id: string;
  discount_percentage: number;
  start_date: string;
  end_date: string | null;
  reason: string | null;
}

export interface PricingResult {
  baseFee: number;
  baseFeeSource: string;
  spaceSurcharge: number;
  spaceSurchargeSource: string | null;
  grossMonthlyFee: number;
  activeDiscounts: AppliedDiscount[];
  totalDiscountPercentage: number;
  discountAmount: number;
  effectiveMonthlyFee: number;
  currency: string;
  equityPercentage: number | null;
  isManualOverride: boolean;
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

/**
 * Calculate contract pricing from structured inputs.
 * This is the single source of truth for all price derivation.
 */
export function calculateContractPricing(input: PricingInput): PricingResult {
  const warnings: PricingWarning[] = [];
  const auditTrail: string[] = [];
  const now = new Date();

  // 1. Determine base fee
  let baseFee: number;
  let baseFeeSource: string;
  let isManualOverride = false;

  if (input.manualOverride) {
    baseFee = input.manualOverride.fee;
    baseFeeSource = `Manual override: ${input.manualOverride.reason}`;
    isManualOverride = true;
    auditTrail.push(`Base fee overridden to €${baseFee} — Reason: ${input.manualOverride.reason}`);
    warnings.push({
      code: 'MANUAL_OVERRIDE',
      message: `Base fee manually set to €${baseFee}. Standard rate: €${input.incubationType.base_monthly_fee}`,
      severity: 'warning',
    });
  } else {
    baseFee = input.incubationType.base_monthly_fee;
    baseFeeSource = `Incubation type: ${input.incubationType.name} (€${baseFee}/month)`;
    auditTrail.push(`Base fee from "${input.incubationType.name}": €${baseFee}`);
  }

  // 2. Calculate space surcharge
  let spaceSurcharge = 0;
  let spaceSurchargeSource: string | null = null;

  if (input.incubationType.requires_space && input.incubationType.price_per_sqm && input.squareMeters) {
    spaceSurcharge = input.incubationType.price_per_sqm * input.squareMeters;
    spaceSurchargeSource = `${input.squareMeters}m² × €${input.incubationType.price_per_sqm}/m²`;
    auditTrail.push(`Space surcharge: ${spaceSurchargeSource} = €${spaceSurcharge}`);
  }

  // Validate: physical incubation requires space
  if (input.incubationType.requires_space && !input.squareMeters && !input.incubationType.is_virtual) {
    warnings.push({
      code: 'MISSING_SPACE',
      message: 'Physical incubation type requires space allocation (square meters)',
      severity: 'warning',
    });
  }

  // Validate: building required for physical
  if (input.incubationType.requires_space && !input.building && !input.incubationType.is_virtual) {
    warnings.push({
      code: 'MISSING_BUILDING',
      message: 'Physical incubation type requires a building assignment',
      severity: 'warning',
    });
  }

  // 3. Calculate gross fee
  const grossMonthlyFee = baseFee + spaceSurcharge;
  auditTrail.push(`Gross monthly fee: €${baseFee} + €${spaceSurcharge} = €${grossMonthlyFee}`);

  // 4. Apply discounts (non-cumulative: take the highest active discount)
  const activeDiscounts: AppliedDiscount[] = [];
  let maxActiveDiscount = 0;

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

      if (isActive && discount.discount_percentage > maxActiveDiscount) {
        maxActiveDiscount = discount.discount_percentage;
      }
    }
  }

  const totalDiscountPercentage = Math.min(maxActiveDiscount, 100);
  const discountAmount = grossMonthlyFee * (totalDiscountPercentage / 100);
  const effectiveMonthlyFee = Math.max(0, grossMonthlyFee - discountAmount);

  if (totalDiscountPercentage > 0) {
    auditTrail.push(`Active discount: ${totalDiscountPercentage}% = -€${discountAmount.toFixed(2)}`);
    auditTrail.push(`Effective monthly fee: €${effectiveMonthlyFee.toFixed(2)}`);
  }

  // 5. Tenure warnings
  if (input.contractStartDate) {
    const startDate = new Date(input.contractStartDate);
    const monthsActive = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    if (monthsActive >= 36) {
      warnings.push({
        code: 'OVER_3_YEARS',
        message: `Contract active for ${Math.floor(monthsActive / 12)} years. Review required per regulation.`,
        severity: 'critical',
      });
    } else if (monthsActive >= 24) {
      warnings.push({
        code: 'APPROACHING_3_YEARS',
        message: `Contract approaching 3-year mark (${Math.floor(monthsActive / 12)} years). Plan review.`,
        severity: 'warning',
      });
    }
  }

  return {
    baseFee,
    baseFeeSource,
    spaceSurcharge,
    spaceSurchargeSource,
    grossMonthlyFee,
    activeDiscounts,
    totalDiscountPercentage,
    discountAmount,
    effectiveMonthlyFee: Math.round(effectiveMonthlyFee * 100) / 100,
    currency: input.incubationType.base_currency || 'EUR',
    equityPercentage: input.incubationType.equity_percentage,
    isManualOverride,
    warnings,
    auditTrail,
  };
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
