/**
 * Housing (mortgage) event processor.
 *
 * CPF treats OA savings used for property as a loan to yourself, not a
 * withdrawal. Per CPF Board's published rules:
 *
 *   - Every dollar of OA used for a downpayment or monthly mortgage
 *     instalment is removed from the live OA balance (so it stops earning
 *     OA interest directly) AND is added to a separate "principal
 *     withdrawn" liability.
 *   - That liability accrues "accrued interest" every month, compounding
 *     at the prevailing OA interest rate — this represents the interest
 *     the member would have earned had the money stayed in OA.
 *   - On sale of the property, the member must refund the liability
 *     (principal + accrued interest) from the sale proceeds, BEFORE
 *     keeping any cash. If sale proceeds are insufficient, CPF forgives
 *     the shortfall (no out-of-pocket top-up required).
 *   - If the member is 55+ at the time of sale, the refund first tops up
 *     RA to the prevailing retirement sum target, with any remainder
 *     going to OA. If below 55, the entire refund goes to OA.
 *
 * This module tracks each HousingEvent's liability independently via a
 * HousingLiabilityState, so a member can have multiple properties over
 * their lifetime without one's accrued interest contaminating another's.
 */

import { CPF_RULES_2026 } from './cpfRules2026';
import type { CpfRulesConfig } from './configTypes';
import { isoToYearMonth, type YearMonth } from './dateUtils';
import type {
  HousingEvent,
  HousingLiabilityState,
  HousingMonthResult,
} from './lifeEventTypes';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Creates the initial (zeroed) liability state for a HousingEvent. */
export function initHousingLiability(event: HousingEvent): HousingLiabilityState {
  return {
    eventId: event.id,
    principalWithdrawn: 0,
    accruedInterest: 0,
    settled: false,
  };
}

function ymKey(ym: YearMonth): number {
  return ym.year * 12 + ym.month;
}

/**
 * Processes one calendar month of activity for a single HousingEvent:
 * downpayment deduction (if this is the purchase month), monthly
 * instalment deduction (if within the loan tenure and not yet sold),
 * interest accrual on the liability, and sale settlement (if this is the
 * sale month).
 *
 * @param event           The housing event definition.
 * @param liability       Current liability state (mutated state is returned, not mutated in place).
 * @param current         The (year, month) being processed.
 * @param age             Member's age in completed years this month (determines refund routing on sale).
 * @param raBalance       Current RA balance (only used if a sale settlement occurs at age 55+).
 * @param retirementSumTarget  The member's prevailing retirement sum target (only used for sale settlement at 55+).
 * @param oaRate          Annual OA interest rate, for accruing the liability.
 * @param rules           CPF rules configuration (unused directly here but kept for signature consistency / future use).
 */
export function processHousingEventMonth(
  event: HousingEvent,
  liability: HousingLiabilityState,
  current: YearMonth,
  age: number,
  raBalance: number,
  retirementSumTarget: number,
  oaRate: number,
  rules: CpfRulesConfig = CPF_RULES_2026,
): { liability: HousingLiabilityState; result: HousingMonthResult } {
  if (liability.settled) {
    return {
      liability,
      result: { eventId: event.id, oaDeducted: 0, interestAccrued: 0, soldThisMonth: false },
    };
  }

  const purchaseYM = isoToYearMonth(event.purchaseDate);
  const saleYM = event.saleDate ? isoToYearMonth(event.saleDate) : null;
  const currentKey = ymKey(current);
  const purchaseKey = ymKey(purchaseYM);
  const saleKey = saleYM ? ymKey(saleYM) : null;

  let principal = liability.principalWithdrawn;
  let accrued = liability.accruedInterest;
  let oaDeducted = 0;

  // Downpayment: deducted exactly in the purchase month.
  if (currentKey === purchaseKey && event.oaDownpayment > 0) {
    oaDeducted += event.oaDownpayment;
    principal = round2(principal + event.oaDownpayment);
  }

  // Monthly instalment: deducted from the month AFTER purchase, for up to
  // loanTenureMonths, but stops once the property is sold.
  const isWithinLoanTenure =
    currentKey > purchaseKey && currentKey <= purchaseKey + event.loanTenureMonths;
  const isBeforeSale = saleKey === null || currentKey < saleKey;
  if (isWithinLoanTenure && isBeforeSale && event.monthlyOaInstalment > 0) {
    oaDeducted += event.monthlyOaInstalment;
    principal = round2(principal + event.monthlyOaInstalment);
  }

  // Accrue interest on the liability balance (principal + interest so far),
  // BEFORE this month's new deduction is added to the accruing base — CPF
  // accrues on the opening liability balance for the month, consistent
  // with how OA interest itself is accrued in the main simulator.
  const openingLiability = liability.principalWithdrawn + liability.accruedInterest;
  const monthlyAccrual = round2(openingLiability * (oaRate / 12));
  accrued = round2(accrued + monthlyAccrual);

  let soldThisMonth = false;
  let refundAmount: number | undefined;
  let refundToRa: number | undefined;
  let refundToOa: number | undefined;
  let shortfallForgiven: number | undefined;
  let settled = false;

  if (saleKey !== null && currentKey === saleKey) {
    soldThisMonth = true;
    const totalOwed = round2(principal + accrued);
    const proceeds = Math.max(0, event.saleProceeds ?? 0);
    refundAmount = round2(Math.min(totalOwed, proceeds));
    shortfallForgiven = round2(Math.max(0, totalOwed - proceeds));

    if (age >= 55) {
      const raHeadroom = Math.max(0, retirementSumTarget - raBalance);
      refundToRa = round2(Math.min(refundAmount, raHeadroom));
      refundToOa = round2(refundAmount - refundToRa);
    } else {
      refundToRa = 0;
      refundToOa = refundAmount;
    }

    settled = true;
    principal = 0;
    accrued = 0;
  }

  const newLiability: HousingLiabilityState = {
    eventId: event.id,
    principalWithdrawn: principal,
    accruedInterest: accrued,
    settled,
  };

  return {
    liability: newLiability,
    result: {
      eventId: event.id,
      oaDeducted: round2(oaDeducted),
      interestAccrued: monthlyAccrual,
      soldThisMonth,
      refundAmount,
      refundToRa,
      refundToOa,
      shortfallForgiven,
    },
  };
}

/** Total accrued-interest liability across all of a member's housing events (for reporting / "what if I sold today" display). */
export function totalHousingLiability(liabilities: HousingLiabilityState[]): { principal: number; accrued: number; total: number } {
  const principal = round2(liabilities.reduce((s, l) => s + (l.settled ? 0 : l.principalWithdrawn), 0));
  const accrued = round2(liabilities.reduce((s, l) => s + (l.settled ? 0 : l.accruedInterest), 0));
  return { principal, accrued, total: round2(principal + accrued) };
}
