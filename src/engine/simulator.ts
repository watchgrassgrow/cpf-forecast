/**
 * CPF Accumulation Phase simulator.
 *
 * Simulates a member's CPF accounts (OA / SA / MA) month-by-month, from a
 * given start date until (but not including) the calendar month in which
 * the member reaches `endAge` (default 55). See `types.ts` for the full
 * input/output shapes.
 *
 * ---------------------------------------------------------------------------
 * Methodology & key assumptions (see README.md for the full write-up)
 * ---------------------------------------------------------------------------
 *
 * 1. AGE BANDS: A member's age for a given calendar month is their age in
 *    completed years as of the LAST DAY of that month (`getAgeAtMonthEnd`).
 *    The simulation stops as soon as this reaches `endAge` - i.e. the
 *    calendar month in which the member turns `endAge` is NOT simulated by
 *    this module (it is the starting point for the Phase 2 "age-55
 *    transformation" module).
 *
 * 2. SALARY PROJECTION: The member's monthly Ordinary Wage is assumed to
 *    stay constant within a calendar year and grow by
 *    `income.annualSalaryGrowthRate` at the start of each subsequent
 *    calendar year (i.e. every January from the simulation start year + 1
 *    onwards) - regardless of which month the simulation actually starts
 *    in. The annual Additional Wage (bonus) is paid once per year, in
 *    `income.bonusPaymentMonth`, and grows the same way if
 *    `income.bonusGrowthMatchesSalary` is true (otherwise it stays constant
 *    in nominal dollars).
 *
 * 3. AW CEILING: The Additional Wage ceiling for a calendar year is
 *    computed as `annualWageCeilingBase - 12 x min(monthlyOW, owCeiling)`
 *    for that year, i.e. assuming a full 12 months of OW at the projected
 *    rate. For a simulation's first or last (partial) calendar year, this
 *    slightly understates the true AW ceiling headroom for that year - a
 *    documented simplification that only matters for members whose OW is
 *    already at/near the OW ceiling AND who receive a very large bonus in a
 *    partial year.
 *
 * 4. INTEREST: See `interest.ts` for the monthly-compounding-on-opening-
 *    balance methodology.
 *
 * 5. ROUNDING: Contributions follow CPF Board's official dollar-rounding
 *    rules (see `contributions.ts`); allocations and interest are rounded
 *    to the nearest cent.
 */

import { CPF_RULES_2026 } from './cpfRules2026';
import type { CpfRulesConfig } from './configTypes';
import { allocateContribution } from './allocations';
import { calculateContribution } from './contributions';
import { getAgeAtMonthEnd, isoToYearMonth, nextMonth, todayYearMonth, type YearMonth } from './dateUtils';
import { resolveInterestRates } from './defaults';
import { calculateMonthlyInterest } from './interest';
import { getBhsForYear, getOwCeilingForYear } from './lookups';
import type {
  AccountBalances,
  AnnualSummary,
  MonthlyRecord,
  SimulationInputs,
  SimulationResult,
  SimulationTotals,
} from './types';

const DEFAULT_END_AGE = 55;

/** Safety guard against pathological inputs (e.g. a date of birth in the future) - caps the loop at 90 years. */
const MAX_MONTHS = 12 * 90;

/**
 * Runs the Phase 1 Accumulation Phase simulation.
 *
 * @param inputs  Simulation inputs. See `SimulationInputs` for details.
 * @param rules   CPF rules configuration to use (defaults to `CPF_RULES_2026`). Pass a different
 *                config to reproduce historical forecasts made under an earlier rules version.
 */
export function runAccumulationSimulation(
  inputs: SimulationInputs,
  rules: CpfRulesConfig = CPF_RULES_2026,
): SimulationResult {
  const endAge = inputs.endAge ?? DEFAULT_END_AGE;
  const start: YearMonth = inputs.simulationStartDate ? isoToYearMonth(inputs.simulationStartDate) : todayYearMonth();
  const interestRates = resolveInterestRates(inputs.economics, rules);

  let balances: AccountBalances = {
    oa: inputs.startBalances.oa,
    sa: inputs.startBalances.sa,
    ma: inputs.startBalances.ma,
    ra: inputs.startBalances.ra ?? 0,
  };

  const monthlyRecords: MonthlyRecord[] = [];
  const awCeilingRemainingByYear = new Map<number, number>();

  let cursor: YearMonth = { ...start };
  let monthsSimulated = 0;

  while (monthsSimulated < MAX_MONTHS) {
    const age = getAgeAtMonthEnd(inputs.profile.dateOfBirth, cursor.year, cursor.month);
    if (age >= endAge) {
      break;
    }

    const owCeiling = getOwCeilingForYear(rules, cursor.year, inputs.economics);
    const bhs = getBhsForYear(rules, cursor.year, inputs.economics);

    const ow = projectedMonthlyOw(inputs, cursor.year, start.year);
    const aw = cursor.month === inputs.income.bonusPaymentMonth ? projectedAnnualAw(inputs, cursor.year, start.year) : 0;

    if (!awCeilingRemainingByYear.has(cursor.year)) {
      const annualOwSubjectToCpf = 12 * Math.min(projectedMonthlyOw(inputs, cursor.year, start.year), owCeiling);
      awCeilingRemainingByYear.set(cursor.year, Math.max(0, rules.annualWageCeilingBase - annualOwSubjectToCpf));
    }
    const remainingAwCeiling = awCeilingRemainingByYear.get(cursor.year)!;

    const contribution = calculateContribution(
      { ow, aw },
      age,
      inputs.profile.contributionScheme,
      owCeiling,
      remainingAwCeiling,
      rules,
    );
    awCeilingRemainingByYear.set(cursor.year, remainingAwCeiling - contribution.awSubjectToCpf);

    const allocation = allocateContribution(contribution.totalContribution, age, balances, bhs, Infinity, rules);

    const openingBalances: AccountBalances = { ...balances };

    // Interest is computed on the opening (pre-contribution) balances.
    const interest = calculateMonthlyInterest(openingBalances, age, interestRates, inputs.economics.extraInterestEnabled, rules);

    balances = {
      oa: openingBalances.oa + allocation.oa + interest.oaInterest,
      sa: openingBalances.sa + allocation.sa + interest.saInterest,
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

  const annualSummaries = buildAnnualSummaries(monthlyRecords, rules, inputs);
  const totals = buildTotals(monthlyRecords);
  const finalAge =
    monthlyRecords.length > 0
      ? monthlyRecords[monthlyRecords.length - 1]!.age
      : getAgeAtMonthEnd(inputs.profile.dateOfBirth, start.year, start.month);

  return {
    monthlyRecords,
    annualSummaries,
    finalBalances: balances,
    finalAge,
    totals,
  };
}

/**
 * Projected monthly Ordinary Wage for a given calendar year. Salary is
 * assumed constant within a calendar year and to grow by
 * `income.annualSalaryGrowthRate` at the start of each subsequent calendar
 * year after `startYear`.
 */
function projectedMonthlyOw(inputs: SimulationInputs, year: number, startYear: number): number {
  const yearsElapsed = Math.max(0, year - startYear);
  return inputs.income.monthlyOrdinaryWage * Math.pow(1 + inputs.income.annualSalaryGrowthRate, yearsElapsed);
}

/** Projected annual Additional Wage (e.g. bonus) for a given calendar year. */
function projectedAnnualAw(inputs: SimulationInputs, year: number, startYear: number): number {
  const yearsElapsed = Math.max(0, year - startYear);
  const growthRate = inputs.income.bonusGrowthMatchesSalary ? inputs.income.annualSalaryGrowthRate : 0;
  return inputs.income.annualAdditionalWage * Math.pow(1 + growthRate, yearsElapsed);
}

function buildAnnualSummaries(records: MonthlyRecord[], rules: CpfRulesConfig, inputs: SimulationInputs): AnnualSummary[] {
  const byYear = new Map<number, MonthlyRecord[]>();
  for (const record of records) {
    const list = byYear.get(record.year);
    if (list) {
      list.push(record);
    } else {
      byYear.set(record.year, [record]);
    }
  }

  const summaries: AnnualSummary[] = [];
  for (const [year, yearRecords] of byYear) {
    const last = yearRecords[yearRecords.length - 1]!;
    summaries.push({
      year,
      ageAtYearEnd: last.age,
      totalContributions: round2(sum(yearRecords, (r) => r.contribution.totalContribution)),
      employeeContributions: round2(sum(yearRecords, (r) => r.contribution.employeeContribution)),
      employerContributions: round2(sum(yearRecords, (r) => r.contribution.employerContribution)),
      interestEarned: round2(
        sum(yearRecords, (r) => r.interest.oaInterest + r.interest.saInterest + r.interest.maInterest + r.interest.raInterest),
      ),
      closingBalances: roundBalances(last.closingBalances),
      owCeiling: getOwCeilingForYear(rules, year, inputs.economics),
      bhs: getBhsForYear(rules, year, inputs.economics),
    });
  }

  return summaries.sort((a, b) => a.year - b.year);
}

function buildTotals(records: MonthlyRecord[]): SimulationTotals {
  return {
    totalContributions: round2(sum(records, (r) => r.contribution.totalContribution)),
    totalEmployeeContributions: round2(sum(records, (r) => r.contribution.employeeContribution)),
    totalEmployerContributions: round2(sum(records, (r) => r.contribution.employerContribution)),
    totalInterestEarned: round2(
      sum(records, (r) => r.interest.oaInterest + r.interest.saInterest + r.interest.maInterest + r.interest.raInterest),
    ),
    totalOaInterest: round2(sum(records, (r) => r.interest.oaInterest)),
    totalSaInterest: round2(sum(records, (r) => r.interest.saInterest)),
    totalMaInterest: round2(sum(records, (r) => r.interest.maInterest)),
    totalExtraInterest: round2(sum(records, (r) => r.interest.extraInterestTotal)),
    totalMaOverflow: round2(sum(records, (r) => r.allocation.maOverflow)),
  };
}

function sum<T>(items: T[], fn: (item: T) => number): number {
  return items.reduce((acc, item) => acc + fn(item), 0);
}

function round2(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function roundBalances(balances: AccountBalances): AccountBalances {
  return {
    oa: round2(balances.oa),
    sa: round2(balances.sa),
    ma: round2(balances.ma),
    ra: round2(balances.ra),
  };
}
