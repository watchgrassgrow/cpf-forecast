/**
 * CPF monthly contribution calculation.
 *
 * Implements the official CPF Board contribution rate tables: three wage
 * bands based on the member's Total Wages (TW = OW + AW) for the month,
 * plus age-band-specific rates that depend on the member's CPF
 * contribution scheme (citizenship / SPR status).
 *
 *   TW <= $50           -> no contribution
 *   $50  < TW <= $500   -> total = lowBandTotalRate x TW; employee = 0
 *   $500 < TW <= $750   -> total = midBandTotalRate x TW + midBandEmployeeFactor x (TW - 500)
 *                          employee = midBandEmployeeFactor x (TW - 500)
 *   TW > $750           -> OW and AW contributions computed separately
 *                          (each subject to its own ceiling), then summed
 *
 * Rounding (per CPF Board's published rounding rules):
 *   - Total contribution: rounded to the nearest dollar (0.50 rounds up)
 *   - Employee's share:   rounded DOWN to the nearest dollar
 *   - Employer's share:   total - employee (never separately rounded)
 */

import { CPF_RULES_2026 } from './cpfRules2026';
import type { ContributionRateBand, ContributionScheme, CpfRulesConfig } from './configTypes';
import type { ContributionResult, WageInput } from './types';

/** Rounds to the nearest dollar, with .50 rounding up (CPF Board's standard rounding rule). */
export function roundToDollar(amount: number): number {
  return Math.floor(amount + 0.5);
}

/** Rounds down to the nearest dollar. */
export function floorToDollar(amount: number): number {
  return Math.floor(amount);
}

/** Finds the contribution rate band that applies to a member of the given age, for the given scheme. */
export function getContributionRateBand(
  age: number,
  scheme: ContributionScheme,
  rules: CpfRulesConfig = CPF_RULES_2026,
): ContributionRateBand {
  const bands = rules.contributionRates[scheme];
  const band = bands.find((b) => age >= b.minAge && age <= b.maxAge);
  if (!band) {
    throw new Error(`No CPF contribution rate band found for age ${age} under scheme "${scheme}".`);
  }
  return band;
}

/**
 * Computes the CPF contribution for one calendar month.
 *
 * @param wage                Ordinary Wage (OW) and Additional Wage (AW) for the month, BEFORE any ceiling.
 * @param age                 Member's age in completed years for this month (see `getAgeAtMonthEnd`).
 * @param scheme              Which CPF contribution rate table applies (citizenship / SPR status).
 * @param owCeiling           The OW ceiling ($/month) for the relevant calendar year.
 * @param remainingAwCeiling  The member's remaining AW ceiling headroom for the calendar year, BEFORE this month's AW.
 * @param rules               CPF rules configuration (defaults to the current `CPF_RULES_2026`).
 */
export function calculateContribution(
  wage: WageInput,
  age: number,
  scheme: ContributionScheme,
  owCeiling: number,
  remainingAwCeiling: number,
  rules: CpfRulesConfig = CPF_RULES_2026,
): ContributionResult {
  const ow = Math.max(0, wage.ow);
  const aw = Math.max(0, wage.aw);
  const band = getContributionRateBand(age, scheme, rules);

  const owSubjectToCpf = Math.min(ow, owCeiling);
  const awSubjectToCpf = Math.min(aw, Math.max(0, remainingAwCeiling));

  // The $50 / $500 / $750 wage bands are based on the member's actual
  // (uncapped) Total Wages for the month.
  const tw = ow + aw;

  let totalContribution: number;
  let employeeContribution: number;

  if (tw <= 50) {
    totalContribution = 0;
    employeeContribution = 0;
  } else if (tw <= 500) {
    totalContribution = roundToDollar(band.lowBandTotalRate * tw);
    employeeContribution = 0;
  } else if (tw <= 750) {
    totalContribution = roundToDollar(band.midBandTotalRate * tw + band.midBandEmployeeFactor * (tw - 500));
    employeeContribution = floorToDollar(band.midBandEmployeeFactor * (tw - 500));
  } else {
    const { totalRateOW, totalCapOW, totalRateAW, employeeRateOW, employeeCapOW, employeeRateAW } = band.highBand;

    const totalOwContribution = Math.min(totalRateOW * owSubjectToCpf, totalCapOW);
    const totalAwContribution = totalRateAW * awSubjectToCpf;
    const employeeOwContribution = Math.min(employeeRateOW * owSubjectToCpf, employeeCapOW);
    const employeeAwContribution = employeeRateAW * awSubjectToCpf;

    totalContribution = roundToDollar(totalOwContribution + totalAwContribution);
    employeeContribution = floorToDollar(employeeOwContribution + employeeAwContribution);
  }

  // Safety net: the employee's share can never exceed the total (guards
  // against rounding edge cases at the wage-band boundaries).
  employeeContribution = Math.min(employeeContribution, totalContribution);
  const employerContribution = totalContribution - employeeContribution;

  return {
    ow,
    owSubjectToCpf,
    aw,
    awSubjectToCpf,
    totalContribution,
    employeeContribution,
    employerContribution,
  };
}
