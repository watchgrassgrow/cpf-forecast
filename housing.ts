/**
 * Stage C: CPF LIFE Payout Phase Simulator
 *
 * From the member's chosen payout start age (65–70) until the planning
 * horizon (e.g. age 90 or 100), this simulator tracks:
 *
 *  - Monthly CPF LIFE payouts (plan-specific, possibly escalating).
 *  - OA and MA continue to earn interest (at OA and SRMA rates respectively).
 *  - RA is modelled as a notional "pool balance" that earns 4% p.a. and is
 *    gradually drawn down by the monthly payouts. In reality, CPF LIFE is a
 *    pooled annuity and the RA balance is not individually tracked; we use
 *    this notional balance purely for reporting purposes (bequest estimate,
 *    pool depletion check for the Basic plan).
 *  - The extra interest scheme (55+ tiers) continues to apply.
 *
 * Inputs to this stage:
 *  - `startBalances`: OA, RA, MA balances at the start of the payout phase
 *    (output of Stage B). SA = 0.
 *  - `initialMonthlyPayout`: from the CPF LIFE estimator.
 *  - Simulation runs from `payoutStartAge` to `planningHorizonAge` (inclusive).
 */

import { CPF_RULES_2026 } from './cpfRules2026';
import type { CpfRulesConfig } from './configTypes';
import { getAgeAtMonthEnd, nextMonth, type YearMonth } from './dateUtils';
import { resolveInterestRates } from './defaults';
import { calculateMonthlyInterest } from './interest';
import { getMonthlyPayout } from './cpfLife';
import type {
  CpfLifePlan,
  FullSimulationInputs,
  PayoutAnnualSummary,
  PayoutMonthlyRecord,
  PayoutPhaseTotals,
} from './phase2Types';
import type { AccountBalances } from './types';

const MAX_PAYOUT_MONTHS = 12 * 50; // absolute safety cap

export interface PayoutSimulationResult {
  monthlyRecords: PayoutMonthlyRecord[];
  annualSummaries: PayoutAnnualSummary[];
  finalBalances: AccountBalances;
  totals: PayoutPhaseTotals;
}

/**
 * Runs the Stage C (CPF LIFE payout) simulation.
 *
 * @param startBalances         OA/RA/MA balances at the start of payouts (Stage B output).
 * @param startYearMonth        The year/month in which payouts commence.
 * @param initialMonthlyPayout  First month's CPF LIFE payout (from `estimateCpfLifePayout`).
 * @param plan                  CPF LIFE plan (for payout growth logic).
 * @param inputs                Full simulation inputs (for profile, economics).
 * @param rules                 CPF rules config.
 */
export function runPayoutSimulation(
  startBalances: AccountBalances,
  startYearMonth: YearMonth,
  initialMonthlyPayout: number,
  plan: CpfLifePlan,
  inputs: FullSimulationInputs,
  rules: CpfRulesConfig = CPF_RULES_2026,
): PayoutSimulationResult {
  const horizonAge = inputs.retirement.planningHorizonAge;
  const interestRates = resolveInterestRates(inputs.economics, rules);

  let balances: AccountBalances = { ...startBalances };
  const monthlyRecords: PayoutMonthlyRecord[] = [];
  let monthsElapsed = 0;
  let cumulativePayouts = 0;
  let cursor: YearMonth = { ...startYearMonth };

  while (monthsElapsed < MAX_PAYOUT_MONTHS) {
    const age = getAgeAtMonthEnd(inputs.profile.dateOfBirth, cursor.year, cursor.month);
    if (age > horizonAge) break;

    // CPF LIFE payout this month (plan-specific growth).
    const payout = getMonthlyPayout(initialMonthlyPayout, plan, monthsElapsed);
    cumulativePayouts += payout;

    const openingBalances: AccountBalances = { ...balances };

    // Interest on OA, MA, and notional RA pool (4% on pool; OA 2.5%).
    const interest = calculateMonthlyInterest(openingBalances, age, interestRates, inputs.economics.extraInterestEnabled, rules);

    // RA: earns its base interest, then is reduced by the monthly payout.
    // Clamped at 0 — the annuity pool technically can't go negative (CPF LIFE
    // guarantees payouts for life regardless; this is just a reporting proxy).
    const newRa = Math.max(0, openingBalances.ra + interest.raInterest - payout);

    balances = {
      oa: openingBalances.oa + interest.oaInterest,
      sa: 0,
      ma: openingBalances.ma + interest.maInterest,
      ra: newRa,
    };

    monthlyRecords.push({
      year: cursor.year,
      month: cursor.month,
      age,
      phase: 'payout',
      cpfLifePayout: payout,
      oaInterest: interest.oaInterest,
      maInterest: interest.maInterest,
      raInterest: interest.raInterest,
      closingBalances: { ...balances },
      cumulativePayouts: round2(cumulativePayouts),
    });

    cursor = nextMonth(cursor);
    monthsElapsed++;
  }

  const annualSummaries = buildPayoutAnnualSummaries(monthlyRecords);
  const totals = buildPayoutTotals(monthlyRecords);

  return {
    monthlyRecords,
    annualSummaries,
    finalBalances: {
      oa: round2(balances.oa),
      sa: 0,
      ma: round2(balances.ma),
      ra: round2(balances.ra),
    },
    totals,
  };
}

function buildPayoutAnnualSummaries(records: PayoutMonthlyRecord[]): PayoutAnnualSummary[] {
  const byYear = new Map<number, PayoutMonthlyRecord[]>();
  for (const r of records) {
    const list = byYear.get(r.year) ?? [];
    list.push(r);
    byYear.set(r.year, list);
  }
  return [...byYear.entries()].sort(([a], [b]) => a - b).map(([year, recs]) => {
    const last = recs[recs.length - 1]!;
    return {
      year,
      ageAtYearEnd: last.age,
      totalCpfLifePayouts: round2(sum(recs, r => r.cpfLifePayout)),
      interestEarned: round2(sum(recs, r => r.oaInterest + r.maInterest + r.raInterest)),
      closingBalances: {
        oa: round2(last.closingBalances.oa),
        sa: 0,
        ma: round2(last.closingBalances.ma),
        ra: round2(last.closingBalances.ra),
      },
      cumulativePayouts: last.cumulativePayouts,
    };
  });
}

function buildPayoutTotals(records: PayoutMonthlyRecord[]): PayoutPhaseTotals {
  return {
    totalCpfLifePayouts: round2(sum(records, r => r.cpfLifePayout)),
    totalOaInterest: round2(sum(records, r => r.oaInterest)),
    totalMaInterest: round2(sum(records, r => r.maInterest)),
    totalRaInterest: round2(sum(records, r => r.raInterest)),
  };
}

function sum<T>(items: T[], fn: (item: T) => number): number {
  return items.reduce((acc, x) => acc + fn(x), 0);
}
function round2(n: number): number { return Math.round(n * 100) / 100; }
