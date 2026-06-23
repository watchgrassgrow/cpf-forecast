/**
 * Full Lifecycle Orchestrator
 *
 * Chains all four simulation stages into a single function call:
 *
 *   Phase 1  – Accumulation (current age → age 55)
 *   Stage A  – Age-55 Transformation (SA closure, RA creation)
 *   Stage B  – Post-55 Accumulation (age 55 → CPF LIFE payout start)
 *   Stage C  – CPF LIFE Payout (payout start → planning horizon)
 */

import { CPF_RULES_2026 } from './cpfRules2026';
import type { CpfRulesConfig } from './configTypes';
import { getAgeAtMonthEnd, isoToYearMonth, todayYearMonth, type YearMonth } from './dateUtils';
import { runAccumulationSimulation } from './simulator';
import { applyAge55Transformation, balancesAfterTransformation } from './transformation55';
import { runPost55Simulation } from './post55Simulator';
import { estimateCpfLifePayout } from './cpfLife';
import { runPayoutSimulation } from './payoutSimulator';
import type { FullSimulationInputs, FullSimulationResult } from './phase2Types';

/**
 * Runs the complete CPF lifecycle simulation.
 */
export function runFullSimulation(
  inputs: FullSimulationInputs,
  rules: CpfRulesConfig = CPF_RULES_2026,
): FullSimulationResult {
  // ── Phase 1: Accumulation up to age 55 ──────────────────────────────────
  const phase1Result = runAccumulationSimulation(
    { ...inputs, endAge: 55 },
    rules,
  );

  const startYM: YearMonth = inputs.simulationStartDate
    ? isoToYearMonth(inputs.simulationStartDate)
    : todayYearMonth();

  // Find the first calendar month in which the member's age-at-month-end = 55.
  const age55YM = findFirstMonthAtAge(inputs.profile.dateOfBirth, 55, startYM);

  // ── Stage A: Age-55 Transformation ──────────────────────────────────────
  const transformation = applyAge55Transformation(
    phase1Result.finalBalances,
    age55YM.year,
    inputs.retirement,
    inputs.economics,
    rules,
  );
  const post55StartBalances = balancesAfterTransformation(transformation);

  // ── Stage B: Post-55 Accumulation ───────────────────────────────────────
  const post55Result = runPost55Simulation(
    post55StartBalances,
    age55YM,
    inputs,
    rules,
  );

  // ── Stage C: CPF LIFE Payout Phase ──────────────────────────────────────
  const payoutStartAge = inputs.retirement.payoutStartAge;
  const cpfLifePlan = inputs.retirement.cpfLifePlan;
  const balancesAtPayoutStart = post55Result.finalBalances;

  const monthlyPayoutAtStart = estimateCpfLifePayout(
    balancesAtPayoutStart.ra,
    cpfLifePlan,
    payoutStartAge,
  );

  // Find the first month in which age-at-month-end = payoutStartAge.
  const payoutStartYM = findFirstMonthAtAge(inputs.profile.dateOfBirth, payoutStartAge, age55YM);

  const payoutResult = runPayoutSimulation(
    balancesAtPayoutStart,
    payoutStartYM,
    monthlyPayoutAtStart,
    cpfLifePlan,
    inputs,
    rules,
  );

  return {
    accumulationPhase: phase1Result,
    age55Transformation: transformation,
    post55MonthlyRecords: post55Result.monthlyRecords,
    post55AnnualSummaries: post55Result.annualSummaries,
    payoutMonthlyRecords: payoutResult.monthlyRecords,
    payoutAnnualSummaries: payoutResult.annualSummaries,
    balancesAtPayoutStart,
    monthlyPayoutAtStart,
    cpfLifePlan,
    retirementSums: transformation.retirementSums,
    payoutTotals: payoutResult.totals,
  };
}

/**
 * Finds the first calendar month (at or after `searchFrom`) in which the
 * member's age-at-month-end equals exactly `targetAge`.
 *
 * Strategy: jump to the approximate year (DOB year + targetAge) and scan
 * a ±14-month window around it to find the exact month.
 */
function findFirstMonthAtAge(
  dateOfBirth: string,
  targetAge: number,
  searchFrom: YearMonth,
): YearMonth {
  const dobYear = parseInt(dateOfBirth.split('-')[0]!, 10);
  const approxYear = dobYear + targetAge;

  // Scan 3 months before to 12 months after the approximate birthday year.
  for (let offset = -3; offset <= 12; offset++) {
    const candidate = addMonths({ year: approxYear, month: 1 }, offset);
    if (candidate.year < searchFrom.year ||
       (candidate.year === searchFrom.year && candidate.month < searchFrom.month)) {
      continue; // don't go before the simulation start
    }
    if (getAgeAtMonthEnd(dateOfBirth, candidate.year, candidate.month) === targetAge) {
      return candidate;
    }
  }

  // Fallback: return the first month of the approximate year.
  return { year: approxYear, month: 1 };
}

function addMonths(ym: YearMonth, months: number): YearMonth {
  const total = (ym.year * 12 + ym.month - 1) + months;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}
