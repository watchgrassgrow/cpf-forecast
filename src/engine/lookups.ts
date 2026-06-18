/**
 * Lookup helpers for CPF parameters that vary by calendar year (OW ceiling,
 * Basic Healthcare Sum, retirement sums).
 *
 * CPF Board / MOH / MOF typically only publish these figures one or two
 * years ahead. For years beyond the latest officially-known year, this
 * module projects forward using the user-adjustable growth-rate
 * assumptions in `ProjectionAssumptions`. These projections are estimates,
 * not official figures, and should be clearly labelled as such in the UI.
 */

import type { CpfRulesConfig, ProjectionAssumptions } from './configTypes';

/**
 * Returns the OW ceiling ($/month) applicable for a given calendar year.
 *
 * - For years within the published `owCeilingSchedule`, returns the exact
 *   (or most recently effective) published value.
 * - For years before the earliest published entry, returns the earliest
 *   published value.
 * - For years after the latest published entry, projects forward by
 *   compounding `assumptions.owCeilingGrowthRate` (default 0, i.e. frozen).
 */
export function getOwCeilingForYear(
  rules: CpfRulesConfig,
  year: number,
  assumptions: ProjectionAssumptions,
): number {
  return lookupYearValue(
    rules.owCeilingSchedule.map((e) => ({ year: e.year, value: e.ceiling })),
    year,
    assumptions.owCeilingGrowthRate,
  );
}

/**
 * Returns the Basic Healthcare Sum ($) applicable to members below 65 in a
 * given calendar year.
 *
 * - For years within the published `bhsSchedule`, returns the exact (or
 *   most recently effective) published value.
 * - For years before the earliest published entry, returns the earliest
 *   published value.
 * - For years after the latest published entry, projects forward by
 *   compounding `assumptions.bhsGrowthRate`.
 */
export function getBhsForYear(
  rules: CpfRulesConfig,
  year: number,
  assumptions: ProjectionAssumptions,
): number {
  return lookupYearValue(
    rules.bhsSchedule.map((e) => ({ year: e.year, value: e.belowAge65 })),
    year,
    assumptions.bhsGrowthRate,
  );
}

/** Basic, Full and Enhanced Retirement Sums for a given cohort year. Reserved for Phase 2 use. */
export interface RetirementSums {
  brs: number;
  frs: number;
  ers: number;
}

/**
 * Returns the BRS, FRS and ERS applicable to a member who turns 55 in
 * `cohortYear`.
 *
 * - BRS and FRS are looked up from `rules.retirementSums` (cohort-locked
 *   for life). For cohort years beyond the latest published entry, BRS and
 *   FRS are projected forward by compounding
 *   `assumptions.retirementSumGrowthRate`, and FRS = 2 x BRS is preserved.
 * - ERS is looked up from `rules.enhancedRetirementSums` for the SAME
 *   calendar year requested (ERS is not cohort-locked - it applies to
 *   everyone 55+ in a given year). For years beyond the latest published
 *   entry, ERS is projected the same way, preserving ERS = 4 x BRS for
 *   that year.
 *
 * Reserved for use by the Phase 2 (age-55 transformation) module.
 */
export function getRetirementSumsForYear(
  rules: CpfRulesConfig,
  year: number,
  assumptions: ProjectionAssumptions,
): RetirementSums {
  const brs = lookupYearValue(
    rules.retirementSums.map((e) => ({ year: e.cohortYear, value: e.brs })),
    year,
    assumptions.retirementSumGrowthRate,
  );
  const frs = lookupYearValue(
    rules.retirementSums.map((e) => ({ year: e.cohortYear, value: e.frs })),
    year,
    assumptions.retirementSumGrowthRate,
  );
  const ers = lookupYearValue(
    rules.enhancedRetirementSums.map((e) => ({ year: e.year, value: e.ers })),
    year,
    assumptions.retirementSumGrowthRate,
  );
  return { brs, frs, ers };
}

/**
 * Generic "step schedule with forward projection" lookup.
 *
 * `schedule` must be sorted ascending by year (this holds for all schedules
 * in `cpfRules2026.ts`).
 */
function lookupYearValue(schedule: { year: number; value: number }[], year: number, growthRate: number): number {
  if (schedule.length === 0) {
    throw new Error('Cannot look up a value from an empty schedule.');
  }

  const first = schedule[0]!;
  const last = schedule[schedule.length - 1]!;

  if (year <= first.year) {
    return first.value;
  }
  if (year >= last.year) {
    if (year === last.year) return last.value;
    const yearsBeyond = year - last.year;
    return last.value * Math.pow(1 + growthRate, yearsBeyond);
  }

  // year is strictly between first.year and last.year: find the most
  // recently effective entry at or before `year`.
  let result = first.value;
  for (const entry of schedule) {
    if (entry.year <= year) {
      result = entry.value;
    } else {
      break;
    }
  }
  return result;
}
