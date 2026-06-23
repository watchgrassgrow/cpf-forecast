/**
 * Life Events: Top-ups and Housing
 *
 * Models two categories of mid-simulation cash events that a CPF member can
 * trigger themselves (as opposed to the automatic monthly contribution
 * machinery in contributions.ts / allocations.ts):
 *
 *  1. TOP-UPS — voluntary cash injections into CPF accounts. Three distinct
 *     mechanisms exist under CPF Board rules, each with different target
 *     accounts and different caps:
 *
 *       - RSTU (Retirement Sum Topping-Up): cash -> SA (if <55) or RA (if
 *         55+). Capped by how much headroom remains to the member's FRS
 *         (or ERS, once 55+ and topping up further). NOT capped by the
 *         $8,000/$16,000 tax-relief figures — those only affect how much
 *         of the top-up is tax-deductible, not how much CPF will accept.
 *
 *       - Voluntary Contribution (3 accounts): cash -> OA/SA/MA split using
 *         the SAME allocation ratios as mandatory employment contributions
 *         for the member's age. Capped by the member's remaining headroom
 *         under the annual CPF contribution limit (the same limit that
 *         mandatory contributions count against).
 *
 *       - MediSave top-up: cash -> MA only. Capped by remaining headroom to
 *         the Basic Healthcare Sum (BHS).
 *
 *  2. HOUSING (mortgage / property) — using OA savings to fund a property
 *     downpayment and/or service a home loan. CPF tracks this as a loan,
 *     not a withdrawal: the principal used must eventually be refunded with
 *     "accrued interest" (the interest it would have earned had it stayed
 *     in the OA, at the prevailing OA rate, compounded monthly) when the
 *     property is sold. The accrued-interest liability is tracked
 *     completely separately from the live OA balance.
 */

import type { CpfRulesConfig } from './configTypes';

// ---------------------------------------------------------------------------
// Top-up events
// ---------------------------------------------------------------------------

export type TopUpKind = 'rstu' | 'voluntary3' | 'medisave';

/** A one-off (or recurring) voluntary cash top-up event, scheduled at a specific calendar month. */
export interface TopUpEvent {
  id: string;
  kind: TopUpKind;
  /** ISO date (YYYY-MM-DD); only year/month are used — events fire on the 1st of that month. */
  date: string;
  /** Requested cash amount. Actual amount applied may be less, if capped by headroom (see TopUpResult). */
  amount: number;
  /**
   * If set, this top-up repeats annually (same calendar month) up to and including this end year.
   * Useful for modelling "I plan to top up $8,000 to RA every January until I hit FRS".
   */
  repeatUntilYear?: number;
}

/** Result of attempting to apply one top-up event in a given month, given the member's current balances/age. */
export interface TopUpResult {
  kind: TopUpKind;
  requestedAmount: number;
  /** Amount actually applied, after capping by the relevant headroom. */
  appliedAmount: number;
  /** Amount rejected due to insufficient headroom (requestedAmount - appliedAmount). */
  excessAmount: number;
  /** How the applied amount was distributed across accounts. */
  allocation: { oa: number; sa: number; ra: number; ma: number };
  /** Human-readable reason if appliedAmount < requestedAmount (e.g. "FRS headroom reached"), else undefined. */
  capReason?: string;
}

// ---------------------------------------------------------------------------
// Housing / mortgage events
// ---------------------------------------------------------------------------

/**
 * Models one property's CPF usage from purchase (or refinancing) through an
 * optional future sale. A member can have multiple HousingEvent entries
 * over a lifetime (e.g. sell HDB, buy condo).
 */
export interface HousingEvent {
  id: string;
  /** ISO date (YYYY-MM-DD) of purchase / first CPF usage on this property. */
  purchaseDate: string;
  /** One-off OA amount used for the downpayment (deducted from OA on purchaseDate). */
  oaDownpayment: number;
  /** Monthly OA amount used to service the mortgage instalment, starting the month after purchaseDate. */
  monthlyOaInstalment: number;
  /** Number of months the monthly instalment is deducted for (i.e. loan tenure, or until sale if earlier). */
  loanTenureMonths: number;
  /**
   * If set, the property is sold on this date. Triggers the CPF housing
   * refund: principal + accrued interest is returned to OA (<55) or RA
   * then OA (55+), capped at saleProceeds. Monthly instalment deductions
   * stop from this date even if loanTenureMonths hasn't elapsed.
   */
  saleDate?: string;
  /** Total cash sale proceeds available to refund CPF (after paying off any outstanding bank loan). Required if saleDate is set. */
  saleProceeds?: number;
  /** Optional label for display purposes, e.g. "4-room HDB, Punggol". */
  label?: string;
}

/** Running state for one HousingEvent's accrued-interest liability, tracked month by month. */
export interface HousingLiabilityState {
  eventId: string;
  /** Cumulative CPF principal withdrawn for this property so far (downpayment + instalments to date). */
  principalWithdrawn: number;
  /** Cumulative accrued interest owed on that principal, compounded monthly at the OA rate. */
  accruedInterest: number;
  /** True once this property has been sold and the refund has been processed. */
  settled: boolean;
}

/** Result of processing one month's housing event activity (instalment deduction, accrual, or sale settlement). */
export interface HousingMonthResult {
  eventId: string;
  /** OA deducted this month for downpayment or instalment (0 if neither applies this month). */
  oaDeducted: number;
  /** Accrued interest added to the liability this month (computed on the liability balance, not the OA balance). */
  interestAccrued: number;
  /** True if the property was sold this month and a refund was processed. */
  soldThisMonth: boolean;
  /** If sold this month: total refund amount (principal + accrued interest, capped at sale proceeds). */
  refundAmount?: number;
  /** If sold this month: portion of the refund that went to RA (only relevant if member is 55+ and below FRS). */
  refundToRa?: number;
  /** If sold this month: portion of the refund that went to OA. */
  refundToOa?: number;
  /** If sold this month and saleProceeds < principal + accrued interest: the shortfall, which CPF does NOT require the member to make up in cash. */
  shortfallForgiven?: number;
}

/** Aggregate of all life events to apply during a simulation. */
export interface LifeEvents {
  topUps: TopUpEvent[];
  housing: HousingEvent[];
}

export const EMPTY_LIFE_EVENTS: LifeEvents = { topUps: [], housing: [] };
