/**
 * Phase 2 type definitions.
 *
 * Covers three new simulation stages that extend Phase 1:
 *
 *   Stage A – Age-55 Transformation
 *     SA is closed; balances are transferred to a new Retirement Account (RA)
 *     up to the member's cohort-locked retirement sum target (BRS, FRS, or ERS).
 *     Shortfall is drawn from OA. Surplus SA stays as a withdrawable OA credit.
 *
 *   Stage B – Post-55 Accumulation (ages 55 → CPF LIFE payout start age)
 *     Contributions continue on the OA / RA / MA allocation table.
 *     Interest accrues on all four accounts. Member may still make top-ups.
 *
 *   Stage C – CPF LIFE Payout Phase (payout start age → planning horizon)
 *     RA balance is notionally converted to a CPF LIFE annuity premium.
 *     Monthly payouts begin. OA and MA continue to earn interest.
 *     Three CPF LIFE plan variants are modelled: Standard, Escalating, Basic.
 *
 * The unified orchestrator (`runFullSimulation`) chains Phase 1 → Stage A →
 * Stage B → Stage C and returns a single `FullSimulationResult`.
 */

import type { SimulationInputs, SimulationResult, AccountBalances, MonthlyRecord, AnnualSummary } from './types';
import type { RetirementSums } from './lookups';

// ---------------------------------------------------------------------------
// Age-55 transformation (Stage A)
// ---------------------------------------------------------------------------

/**
 * Which retirement sum target the member aims to set aside in their RA.
 * - BRS : Basic Retirement Sum (requires a property pledge)
 * - FRS : Full Retirement Sum  (default; no property pledge needed)
 * - ERS : Enhanced Retirement Sum (voluntary top-up above FRS)
 */
export type RetirementSumTarget = 'BRS' | 'FRS' | 'ERS';

/** Inputs specific to the age-55 transformation and CPF LIFE setup. */
export interface RetirementPreferences {
  /** Which retirement sum the member intends to set aside. Defaults to FRS. */
  retirementSumTarget: RetirementSumTarget;
  /**
   * True if the member owns a property with a remaining lease that covers
   * them to at least age 95. When true and target is BRS, the shortfall
   * between BRS and FRS remains in OA (withdrawable). Only relevant if
   * `retirementSumTarget` is 'BRS'.
   */
  hasPropertyPledge: boolean;
  /** CPF LIFE plan to model. Defaults to 'Standard'. */
  cpfLifePlan: CpfLifePlan;
  /**
   * Age at which CPF LIFE payouts begin. Must be 65–70 (inclusive).
   * Deferring beyond 65 increases the monthly payout by ~7% per year.
   * Defaults to 65.
   */
  payoutStartAge: number;
  /**
   * Age to which the simulation runs (inclusive). Represents the member's
   * planning horizon / assumed longevity. Defaults to 90.
   */
  planningHorizonAge: number;
}

/** Result of the one-time age-55 transformation step. */
export interface Age55TransformationResult {
  /** The calendar year in which the member turned 55. */
  year: number;
  /** The retirement sums applicable to this cohort (BRS/FRS/ERS). */
  retirementSums: RetirementSums;
  /** The target RA amount after transformation (BRS, FRS, or ERS). */
  targetAmount: number;
  /** SA balance immediately before the transformation. */
  saBalanceBefore: number;
  /** OA balance immediately before the transformation. */
  oaBalanceBefore: number;
  /** Amount transferred from SA to RA (up to the target). */
  saToRa: number;
  /** Amount transferred from OA to RA to cover any SA shortfall. */
  oaToRa: number;
  /** RA balance after the transformation. */
  raAfter: number;
  /** OA balance after the transformation. */
  oaAfter: number;
  /** SA balance after the transformation (always 0 — SA is closed at 55). */
  saAfter: number;
  /** MA balance after the transformation (unchanged). */
  maAfter: number;
  /**
   * The portion of OA that was originally SA "overflow" above the RA target.
   * This is the amount the member can withdraw in cash (if they choose).
   * For reporting purposes only — the engine keeps it in OA.
   */
  withdrawableOaAmount: number;
}

// ---------------------------------------------------------------------------
// CPF LIFE (Stage C)
// ---------------------------------------------------------------------------

/**
 * The three CPF LIFE annuity plan types:
 * - Standard  : Level monthly payouts for life; higher monthly payout than Basic.
 * - Escalating: Payouts increase by 2% per year (lower starting payout, inflation hedge).
 * - Basic     : Higher payouts while RA has balance; payouts reduce once balance < $60k.
 *               Higher bequest (remaining RA balance returned to estate upon death).
 */
export type CpfLifePlan = 'Standard' | 'Escalating' | 'Basic';

/**
 * Payout factor table entry for CPF LIFE.
 *
 * CPF Board does not publish actuarial tables, but the CPF LIFE Estimator
 * tool (https://www.cpf.gov.sg/member/retirement-income/monthly-payouts/cpf-life)
 * allows back-calculation of approximate monthly payout factors ($/month per
 * $1,000 of RA premium) for each plan, payout-start age, and cohort year.
 *
 * These are calibrated against published estimator examples:
 *   - FRS 2026 ($220,400), Standard, age 65 → ~$1,780/month → factor ~8.08
 *   - BRS 2026 ($110,200), Standard, age 65 → ~$950/month  → factor ~8.62
 *   - FRS 2026,            Standard, age 70 → ~$2,400/month → factor ~10.89
 * (Factors per $1,000 of RA. They decrease at higher RA amounts due to
 *  pooling and actuarial adjustments — we use a two-point interpolation.)
 */
export interface CpfLifePayoutFactors {
  /** CPF LIFE plan type. */
  plan: CpfLifePlan;
  /** Payout start age (65–70). */
  payoutStartAge: number;
  /**
   * Monthly payout per $1,000 of RA balance at payout start, calibrated for
   * a "typical" RA amount (around the FRS level). Used as the default factor.
   * Units: $ per month per $1,000 of RA.
   */
  factorPerThousand: number;
  /**
   * Relative scaling for the Escalating plan: the STARTING payout factor as
   * a fraction of the Standard plan factor at the same age (e.g. 0.85 = 85%
   * of Standard's starting payout, growing 2%/year thereafter).
   * Only used when plan = 'Escalating'.
   */
  escalatingStartRatio?: number;
  /**
   * Relative scaling for the Basic plan: the initial payout factor as a
   * fraction of the Standard plan factor (payouts are higher initially but
   * reduce once RA balance falls below $60,000).
   * Only used when plan = 'Basic'.
   */
  basicHighPayoutRatio?: number;
}

// ---------------------------------------------------------------------------
// Post-55 accumulation monthly records
// ---------------------------------------------------------------------------

/** A monthly record for the Post-55 Accumulation stage (ages 55 to payout-start age). */
export interface Post55MonthlyRecord extends MonthlyRecord {
  /** The member's RA balance at month end (non-zero post-55). */
  phase: 'post55';
}

// ---------------------------------------------------------------------------
// Payout phase monthly records
// ---------------------------------------------------------------------------

/** A monthly record for the CPF LIFE Payout phase. */
export interface PayoutMonthlyRecord {
  year: number;
  /** 1–12 */
  month: number;
  /** Age in completed years at the end of this month. */
  age: number;
  phase: 'payout';
  /** CPF LIFE monthly payout received this month. */
  cpfLifePayout: number;
  /** OA interest accrued this month (OA continues to earn interest during payout phase). */
  oaInterest: number;
  /** MA interest accrued this month. */
  maInterest: number;
  /** RA interest / payout-pool return accrued (modelled as 4% p.a. on the notional RA pool). */
  raInterest: number;
  /** Account balances at month end. RA represents the notional remaining pool balance. */
  closingBalances: AccountBalances;
  /** Cumulative CPF LIFE payouts received to date (including this month). */
  cumulativePayouts: number;
}

// ---------------------------------------------------------------------------
// Payout-phase annual summary
// ---------------------------------------------------------------------------

export interface PayoutAnnualSummary {
  year: number;
  ageAtYearEnd: number;
  totalCpfLifePayouts: number;
  interestEarned: number;
  closingBalances: AccountBalances;
  cumulativePayouts: number;
}

// ---------------------------------------------------------------------------
// Unified full simulation inputs / outputs
// ---------------------------------------------------------------------------

/** Full simulation inputs: Phase 1 inputs + retirement preferences. */
export interface FullSimulationInputs extends SimulationInputs {
  retirement: RetirementPreferences;
}

/** Cumulative totals for the payout phase. */
export interface PayoutPhaseTotals {
  totalCpfLifePayouts: number;
  totalOaInterest: number;
  totalMaInterest: number;
  totalRaInterest: number;
}

/** Complete result of the full life simulation (Phase 1 + Phase 2). */
export interface FullSimulationResult {
  /** Phase 1: accumulation up to age 55. */
  accumulationPhase: SimulationResult;
  /** Stage A: the one-time age-55 transformation snapshot. */
  age55Transformation: Age55TransformationResult;
  /** Stage B: post-55 accumulation monthly records (SA=0, RA active). */
  post55MonthlyRecords: MonthlyRecord[];
  post55AnnualSummaries: AnnualSummary[];
  /** Stage C: CPF LIFE payout phase records. */
  payoutMonthlyRecords: PayoutMonthlyRecord[];
  payoutAnnualSummaries: PayoutAnnualSummary[];
  /** Balances at the very start of CPF LIFE payouts (end of Stage B). */
  balancesAtPayoutStart: AccountBalances;
  /** Estimated monthly CPF LIFE payout (nominal, at payout-start age). */
  monthlyPayoutAtStart: number;
  /** CPF LIFE plan used. */
  cpfLifePlan: CpfLifePlan;
  /** The retirement sums that were locked in at age 55. */
  retirementSums: RetirementSums;
  /** Payout phase cumulative totals. */
  payoutTotals: PayoutPhaseTotals;
}
