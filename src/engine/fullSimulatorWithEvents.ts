/**
 * Full Lifecycle Orchestrator — WITH life events.
 *
 * Identical to runFullSimulation (fullSimulator.ts) except Phase 1 uses
 * runAccumulationSimulationWithEvents instead of runAccumulationSimulation,
 * so top-up and housing events are applied during the accumulation phase.
 * Stages A/B/C (age-55 transformation, post-55 accumulation, CPF LIFE
 * payout) are unaffected and reused exactly as-is — life events in this
 * version only fire before age 55 (Phase 1), matching the current scope
 * of the Life Events UI step.
 */

import { CPF_RULES_2026 } from './cpfRules2026';
import type { CpfRulesConfig } from './configTypes';
import { getAgeAtMonthEnd, isoToYearMonth, todayYearMonth, type YearMonth } from './dateUtils';
import { runAccumulationSimulationWithEvents, type SimulationResultWithEvents } from './simulatorWithEvents';
import { applyAge55Transformation, balancesAfterTransformation } from './transformation55';
import { runPost55Simulation } from './post55Simulator';
import { estimateCpfLifePayout } from './cpfLife';
import { runPayoutSimulation } from './payoutSimulator';
import type { FullSimulationInputs, FullSimulationResult } from './phase2Types';
import type { LifeEvents } from './lifeEventTypes';

export interface FullSimulationResultWithEvents extends Omit<FullSimulationResult, 'accumulationPhase'> {
  accumulationPhase: SimulationResultWithEvents;
}

/**
 * Runs the complete CPF lifecycle simulation, applying life events
 * (top-ups and housing/mortgage activity) during the accumulation phase.
 */
export function runFullSimulationWithEvents(
  inputs: FullSimulationInputs,
  events: LifeEvents,
  rules: CpfRulesConfig = CPF_RULES_2026,
): FullSimulationResultWithEvents {
  // ── Phase 1: Accumulation up to age 55, with life events ────────────────
  const phase1Result = runAccumulationSimulationWithEvents(
    { ...inputs, endAge: 55 },
    events,
    rules,
  );

  const startYM: YearMonth = inputs.simulationStartDate
    ? isoToYearMonth(inputs.simulationStartDate)
    : todayYearMonth();

  const age55YM = findFirstMonthAtAge(inputs.profile.dateOfBirth, 55, startYM);

  // ── Stage A: Age-55 Transformation (unchanged) ───────────────────────────
  const transformation = applyAge55Transformation(
    phase1Result.finalBalances,
    age55YM.year,
    inputs.retirement,
    inputs.economics,
    rules,
  );
  const post55StartBalances = balancesAfterTransformation(transformation);

  // ── Stage B: Post-55 Accumulation (unchanged — no events modeled yet post-55) ──
  const post55Result = runPost55Simulation(
    post55StartBalances,
    age55YM,
    inputs,
    rules,
  );

  // ── Stage C: CPF LIFE Payout Phase (unchanged) ───────────────────────────
  const payoutStartAge = inputs.retirement.payoutStartAge;
  const cpfLifePlan = inputs.retirement.cpfLifePlan;
  const balancesAtPayoutStart = post55Result.finalBalances;

  const monthlyPayoutAtStart = estimateCpfLifePayout(
    balancesAtPayoutStart.ra,
    cpfLifePlan,
    payoutStartAge,
  );

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

function findFirstMonthAtAge(
  dateOfBirth: string,
  targetAge: number,
  searchFrom: YearMonth,
): YearMonth {
  const dobYear = parseInt(dateOfBirth.split('-')[0]!, 10);
  const approxYear = dobYear + targetAge;

  for (let offset = -3; offset <= 12; offset++) {
    const candidate = addMonths({ year: approxYear, month: 1 }, offset);
    if (candidate.year < searchFrom.year ||
       (candidate.year === searchFrom.year && candidate.month < searchFrom.month)) {
      continue;
    }
    if (getAgeAtMonthEnd(dateOfBirth, candidate.year, candidate.month) === targetAge) {
      return candidate;
    }
  }

  return { year: approxYear, month: 1 };
}

function addMonths(ym: YearMonth, months: number): YearMonth {
  const total = (ym.year * 12 + ym.month - 1) + months;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}
