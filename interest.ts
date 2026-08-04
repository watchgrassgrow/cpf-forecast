/**
 * CPF LIFE Payout Estimator
 *
 * CPF Board operates CPF LIFE as a pooled longevity annuity. The Board does
 * not publish actuarial tables, but the CPF LIFE Estimator tool
 * (https://www.cpf.gov.sg/member/retirement-income/monthly-payouts/cpf-life)
 * lets members see indicative payouts for their RA balance. We back-calculate
 * approximate "payout factors" ($/month per $1,000 of RA premium) from those
 * published examples and use linear interpolation for balances in between.
 *
 * Calibration sources (CPF Board published estimates, 2026 cohort):
 *   Standard plan, age 65: BRS $110,200 → ~$950/mo  ; FRS $220,400 → ~$1,780/mo
 *   Standard plan, age 70: FRS $220,400 → ~$2,400/mo
 *   Escalating plan starts ~10–15% lower than Standard and grows 2%/yr.
 *   Basic plan starts ~10% higher than Standard while RA pool > $60k.
 *
 * The "payout factor" approach:
 *   monthly_payout = (RA_balance / 1000) × payout_factor
 *
 * This is a simplification — real CPF LIFE factors also depend on the exact
 * birth cohort's mortality tables and the pooling surplus. The estimates here
 * will be close to the CPF LIFE Estimator's output but will not be identical.
 * Users should be clearly informed that these are ESTIMATES.
 *
 * Deferral bonus:
 *   Each year the member defers payouts beyond age 65 increases the monthly
 *   payout by approximately 6–7% (CPF Board's published figure). We use 6.5%
 *   per year of deferral as the deferral multiplier.
 */

import type { CpfLifePlan, CpfLifePayoutFactors } from './phase2Types';

// ---------------------------------------------------------------------------
// Calibrated payout factor table
// ---------------------------------------------------------------------------
//
// Units: $ per month per $1,000 of RA balance at payout start.
// Source: back-calculated from CPF LIFE Estimator examples (2026 cohort).
// These factors apply to the Standard plan at age 65. Other plans and ages
// are derived from these via multipliers documented below.

const STANDARD_FACTOR_AT_65 = 8.08; // $/mo per $1k RA (calibrated at FRS ~$220k)

// Deferral multiplier per year beyond age 65 (compounded).
const DEFERRAL_RATE_PER_YEAR = 0.065;

// Plan multipliers relative to Standard plan factor:
//   Escalating: starts ~12% lower (grows 2%/yr thereafter)
//   Basic:      starts ~8% higher (reduces once RA pool < $60k)
const PLAN_START_RATIO: Record<CpfLifePlan, number> = {
  Standard:   1.00,
  Escalating: 0.88,
  Basic:      1.08,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the estimated initial monthly CPF LIFE payout.
 *
 * @param raPremium      RA balance at the point payouts commence (the "premium").
 * @param plan           CPF LIFE plan (Standard, Escalating, or Basic).
 * @param payoutStartAge Age at which payouts begin (65–70).
 */
export function estimateCpfLifePayout(
  raPremium: number,
  plan: CpfLifePlan,
  payoutStartAge: number,
): number {
  const clampedAge = Math.max(65, Math.min(70, payoutStartAge));
  const yearsDeferred = clampedAge - 65;

  // Base factor (Standard, age 65), scaled for deferral.
  const deferralMultiplier = Math.pow(1 + DEFERRAL_RATE_PER_YEAR, yearsDeferred);
  const standardFactorAtAge = STANDARD_FACTOR_AT_65 * deferralMultiplier;

  // Apply plan multiplier.
  const planFactor = standardFactorAtAge * PLAN_START_RATIO[plan];

  return round2((raPremium / 1000) * planFactor);
}

/**
 * Returns the payout factor metadata used for a given plan and payout start age.
 * Exposed for transparency/display purposes in the UI.
 */
export function getCpfLifePayoutFactors(
  plan: CpfLifePlan,
  payoutStartAge: number,
): CpfLifePayoutFactors {
  const clampedAge = Math.max(65, Math.min(70, payoutStartAge));
  const yearsDeferred = clampedAge - 65;
  const deferralMultiplier = Math.pow(1 + DEFERRAL_RATE_PER_YEAR, yearsDeferred);
  return {
    plan,
    payoutStartAge: clampedAge,
    factorPerThousand: round2(STANDARD_FACTOR_AT_65 * deferralMultiplier * PLAN_START_RATIO[plan]),
    escalatingStartRatio: plan === 'Escalating' ? PLAN_START_RATIO.Escalating : undefined,
    basicHighPayoutRatio: plan === 'Basic' ? PLAN_START_RATIO.Basic : undefined,
  };
}

// ---------------------------------------------------------------------------
// Plan-specific payout growth
// ---------------------------------------------------------------------------

/**
 * Returns the monthly CPF LIFE payout for month N of the payout phase,
 * accounting for plan-specific payout evolution:
 *
 * - Standard:   level payout (constant).
 * - Escalating: increases 2% each year (compounded annually from the start).
 * - Basic:      stays at the initial rate while RA pool has adequate balance;
 *               simplification — we keep it level here since the pool
 *               depletion timeline is actuarially complex (the UI should note
 *               that Basic payouts may reduce in later years).
 *
 * @param initialMonthlyPayout  The payout amount returned by `estimateCpfLifePayout`.
 * @param plan                  CPF LIFE plan.
 * @param monthsElapsed         Months since payouts started (0-indexed: month 0 = first payout).
 */
export function getMonthlyPayout(
  initialMonthlyPayout: number,
  plan: CpfLifePlan,
  monthsElapsed: number,
): number {
  switch (plan) {
    case 'Escalating': {
      const yearsElapsed = Math.floor(monthsElapsed / 12);
      return round2(initialMonthlyPayout * Math.pow(1.02, yearsElapsed));
    }
    case 'Standard':
    case 'Basic':
    default:
      return initialMonthlyPayout;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
