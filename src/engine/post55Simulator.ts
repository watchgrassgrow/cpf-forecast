/**
 * Stage B: Post-55 Accumulation Simulator
 *
 * After the age-55 transformation (Stage A), the member continues to
 * receive CPF contributions (if still employed) and earn interest on their
 * OA, RA, and MA accounts until their chosen CPF LIFE payout start age
 * (65–70).
 *
 * Key differences from Phase 1 (pre-55 accumulation):
 *  - SA is permanently closed (balance = 0 throughout).
 *  - Contributions now flow into OA / RA / MA using the post-55 allocation
 *    tables. Allocation is done by `allocateContribution` (already handles
 *    the post-55 bands); the FRS cap is no longer enforced once the RA has
 *    been set at age 55 — contributions continue to top up the RA beyond
 *    the FRS, effectively growing toward the current year's ERS naturally.
 *  - The extra interest scheme switches to the 55+ tiers:
 *      +2% on the first $30,000 of combined balances (RA → OA cap$20k → SA → MA)
 *      +1% on the next  $30,000
 *    (handled automatically by `calculateMonthlyInterest` which checks `age`).
 *  - Employment is optional — the member may have retired before or shortly
 *    after 55. The `retiredAt` field in `Post55IncomeAssumptions` sets when
 *    contributions stop (defaults to payout start age, i.e. the member keeps
 *    working until they start drawing CPF LIFE).
 *  - Simulation runs until the month BEFORE the member reaches `payoutStartAge`.
 */

import { CPF_RULES_2026 } from './cpfRules2026';
import type { CpfRulesConfig } from './configTypes';
import { allocateContribution } from './allocations';
import { calculateContribution } from './contributions';
import { getAgeAtMonthEnd, isoToYearMonth, nextMonth, type YearMonth } from './dateUtils';
import { resolveInterestRates } from './defaults';
import { calculateMonthlyInterest } from './interest';
import { getBhsForYear, getOwCeilingForYear } from './lookups';
import type { AnnualSummary, AccountBalances, EconomicAssumptions, MonthlyRecord, SimulationTotals } from './types';
import type { FullSimulationInputs } from './phase2Types';

const MAX_MONTHS = 12 * 20; // Stage B runs at most ~20 years (55→75 outer bound)

export interface Post55SimulationResult {
  monthlyRecords: MonthlyRecord[];
  annualSummaries: AnnualSummary[];
  finalBalances: AccountBalances;
  totals: SimulationTotals;
}

/**
 * Runs the Stage B (post-55 accumulation) simulation.
 *
 * @param startBalances   Balances immediately after the age-55 transformation (Stage A output).
 * @param startYearMonth  The year/month in which the member turned 55 (first month of Stage B).
 * @param inputs          Full simulation inputs (profile, income, economics, retirement prefs).
 * @param rules           CPF rules config (defaults to CPF_RULES_2026).
 */
export function runPost55Simulation(
  startBalances: AccountBalances,
  startYearMonth: YearMonth,
  inputs: FullSimulationInputs,
  rules: CpfRulesConfig = CPF_RULES_2026,
): Post55SimulationResult {
  const payoutStartAge = inputs.retirement.payoutStartAge;
  const interestRates = resolveInterestRates(inputs.economics, rules);

  // Determine the year the member turned 55 to anchor salary projection.
  // Stage B salary growth continues from where Stage A left off.
  const phase1StartYear = inputs.simulationStartDate
    ? isoToYearMonth(inputs.simulationStartDate).year
    : new Date().getUTCFullYear();

  let balances: AccountBalances = { ...startBalances };
  const monthlyRecords: MonthlyRecord[] = [];
  const awCeilingRemainingByYear = new Map<number, number>();

  let cursor: YearMonth = { ...startYearMonth };
  let monthsSimulated = 0;

  while (monthsSimulated < MAX_MONTHS) {
    const age = getAgeAtMonthEnd(inputs.profile.dateOfBirth, cursor.year, cursor.month);
    if (age >= payoutStartAge) break;

    const owCeiling = getOwCeilingForYear(rules, cursor.year, inputs.economics);
    const bhs = getBhsForYear(rules, cursor.year, inputs.economics);
    const isRetired = isEmploymentEnded(age, inputs);

    // Contributions (zero if retired).
    let contribution = zeroContribution();
    if (!isRetired) {
      const ow = projectedOw(inputs, cursor.year, phase1StartYear);
      const aw = cursor.month === inputs.income.bonusPaymentMonth
        ? projectedAw(inputs, cursor.year, phase1StartYear)
        : 0;

      if (!awCeilingRemainingByYear.has(cursor.year)) {
        const annualOw = 12 * Math.min(projectedOw(inputs, cursor.year, phase1StartYear), owCeiling);
        awCeilingRemainingByYear.set(cursor.year, Math.max(0, rules.annualWageCeilingBase - annualOw));
      }
      const remainingAw = awCeilingRemainingByYear.get(cursor.year)!;

      contribution = calculateContribution(
        { ow, aw },
        age,
        inputs.profile.contributionScheme,
        owCeiling,
        remainingAw,
        rules,
      );
      awCeilingRemainingByYear.set(cursor.year, remainingAw - contribution.awSubjectToCpf);
    }

    // Post-55 allocation (OA/RA/MA). FRS cap set to Infinity — RA can grow beyond FRS post-55.
    const allocation = allocateContribution(
      contribution.totalContribution,
      age,
      { sa: 0, ra: balances.ra, ma: balances.ma },
      bhs,
      Infinity,
      rules,
    );

    const openingBalances: AccountBalances = { ...balances };
    const interest = calculateMonthlyInterest(openingBalances, age, interestRates, inputs.economics.extraInterestEnabled, rules);

    balances = {
      oa: openingBalances.oa + allocation.oa + interest.oaInterest,
      sa: 0, // SA permanently closed after 55
      ma: openingBalances.ma + allocation.ma + interest.maInterest,
      ra: openingBalances.ra + allocation.ra + interest.raInterest,
    };

    monthlyRecords.push({
      year: cursor.year,
      month: cursor.month,
      age,
      contribution,
      allocation,
      openingBalances,
      interest,
      closingBalances: { ...balances },
    });

    cursor = nextMonth(cursor);
    monthsSimulated++;
  }

  return {
    monthlyRecords,
    annualSummaries: buildAnnualSummaries(monthlyRecords, rules, inputs),
    finalBalances: {
      oa: round2(balances.oa),
      sa: 0,
      ma: round2(balances.ma),
      ra: round2(balances.ra),
    },
    totals: buildTotals(monthlyRecords),
  };
}

function isEmploymentEnded(currentAge: number, inputs: FullSimulationInputs): boolean {
  // The member is considered retired once they reach their planned payout start age
  // (the default) or a custom retiredAtAge if provided in the income block.
  const retiredAt = (inputs.income as { retiredAtAge?: number }).retiredAtAge
    ?? inputs.retirement.payoutStartAge;
  return currentAge >= retiredAt;
}

function projectedOw(inputs: FullSimulationInputs, year: number, startYear: number): number {
  const yearsElapsed = Math.max(0, year - startYear);
  return inputs.income.monthlyOrdinaryWage * Math.pow(1 + inputs.income.annualSalaryGrowthRate, yearsElapsed);
}

function projectedAw(inputs: FullSimulationInputs, year: number, startYear: number): number {
  const yearsElapsed = Math.max(0, year - startYear);
  const growthRate = inputs.income.bonusGrowthMatchesSalary ? inputs.income.annualSalaryGrowthRate : 0;
  return inputs.income.annualAdditionalWage * Math.pow(1 + growthRate, yearsElapsed);
}

function zeroContribution() {
  return {
    ow: 0, owSubjectToCpf: 0,
    aw: 0, awSubjectToCpf: 0,
    totalContribution: 0,
    employeeContribution: 0,
    employerContribution: 0,
  };
}

function buildAnnualSummaries(records: MonthlyRecord[], rules: CpfRulesConfig, inputs: FullSimulationInputs): AnnualSummary[] {
  const byYear = new Map<number, MonthlyRecord[]>();
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
      totalContributions: round2(sum(recs, r => r.contribution.totalContribution)),
      employeeContributions: round2(sum(recs, r => r.contribution.employeeContribution)),
      employerContributions: round2(sum(recs, r => r.contribution.employerContribution)),
      interestEarned: round2(sum(recs, r =>
        r.interest.oaInterest + r.interest.saInterest + r.interest.maInterest + r.interest.raInterest)),
      closingBalances: roundBalances(last.closingBalances),
      owCeiling: getOwCeilingForYear(rules, year, inputs.economics),
      bhs: getBhsForYear(rules, year, inputs.economics),
    };
  });
}

function buildTotals(records: MonthlyRecord[]): SimulationTotals {
  return {
    totalContributions: round2(sum(records, r => r.contribution.totalContribution)),
    totalEmployeeContributions: round2(sum(records, r => r.contribution.employeeContribution)),
    totalEmployerContributions: round2(sum(records, r => r.contribution.employerContribution)),
    totalInterestEarned: round2(sum(records, r =>
      r.interest.oaInterest + r.interest.saInterest + r.interest.maInterest + r.interest.raInterest)),
    totalOaInterest: round2(sum(records, r => r.interest.oaInterest)),
    totalSaInterest: 0,
    totalMaInterest: round2(sum(records, r => r.interest.maInterest)),
    totalExtraInterest: round2(sum(records, r => r.interest.extraInterestTotal)),
    totalMaOverflow: round2(sum(records, r => r.allocation.maOverflow)),
  };
}

function sum<T>(items: T[], fn: (item: T) => number): number {
  return items.reduce((acc, x) => acc + fn(x), 0);
}
function round2(n: number): number { return Math.round(n * 100) / 100; }
function roundBalances(b: AccountBalances): AccountBalances {
  return { oa: round2(b.oa), sa: 0, ma: round2(b.ma), ra: round2(b.ra) };
}
