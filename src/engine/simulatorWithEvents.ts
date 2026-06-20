/**
 * Accumulation Phase simulator WITH life events (top-ups and housing).
 *
 * This is a parallel entry point to `runAccumulationSimulation` in
 * simulator.ts. It reuses the exact same primitive building blocks
 * (calculateContribution, allocateContribution, calculateMonthlyInterest)
 * so the core mandatory-contribution math is identical and equally
 * well-tested; it simply interleaves two additional steps into the monthly
 * loop:
 *
 *   1. Apply any TopUpEvent(s) scheduled for this month (RSTU, voluntary-3,
 *      MediSave) — see topUps.ts.
 *   2. Apply any HousingEvent activity for this month (downpayment,
 *      instalment deduction, interest accrual, and sale settlement) — see
 *      housing.ts.
 *
 * Kept as a SEPARATE module (rather than modifying simulator.ts in place)
 * so that:
 *   - The original `runAccumulationSimulation` remains untouched and its
 *     existing test suite continues to guarantee its correctness.
 *   - Callers who don't need life events (e.g. the Phase 2 post-55/payout
 *     orchestrator) are unaffected.
 *   - The new, higher-risk life-event code is isolated and independently
 *     testable without risk of silently changing the baseline simulation.
 */

import { CPF_RULES_2026 } from './cpfRules2026';
import type { CpfRulesConfig } from './configTypes';
import { allocateContribution } from './allocations';
import { calculateContribution } from './contributions';
import { getAgeAtMonthEnd, isoToYearMonth, nextMonth, todayYearMonth, type YearMonth } from './dateUtils';
import { resolveInterestRates } from './defaults';
import { calculateMonthlyInterest } from './interest';
import { getBhsForYear, getOwCeilingForYear, getRetirementSumsForYear } from './lookups';
import { applyTopUp, topUpFiresInMonth, type TopUpContext } from './topUps';
import { initHousingLiability, processHousingEventMonth, totalHousingLiability } from './housing';
import type {
  HousingLiabilityState,
  LifeEvents,
  TopUpResult,
  HousingMonthResult,
} from './lifeEventTypes';
import type {
  AccountBalances,
  AnnualSummary,
  MonthlyRecord,
  SimulationInputs,
  SimulationResult,
  SimulationTotals,
} from './types';

const DEFAULT_END_AGE = 55;
const MAX_MONTHS = 12 * 90;

/** A MonthlyRecord extended with this month's life-event activity, for transparency/UI display. */
export interface MonthlyRecordWithEvents extends MonthlyRecord {
  topUpResults: TopUpResult[];
  housingResults: HousingMonthResult[];
}

export interface SimulationResultWithEvents extends Omit<SimulationResult, 'monthlyRecords'> {
  monthlyRecords: MonthlyRecordWithEvents[];
  /** Outstanding accrued-interest housing liability at the end of the simulation (unsettled properties only). */
  finalHousingLiability: { principal: number; accrued: number; total: number };
  /** Total of all top-up amounts actually applied (across all kinds) over the simulation. */
  totalTopUpsApplied: number;
  /** Total of all top-up amounts requested but rejected due to headroom caps. */
  totalTopUpsRejected: number;
}

/**
 * Runs the Accumulation Phase simulation with life events applied.
 *
 * Life events are applied AFTER mandatory contributions are allocated each
 * month, but BEFORE interest is accrued — so top-ups and housing
 * deductions made in a given month do earn/avoid interest starting that
 * same month, consistent with how CPF actually credits same-month
 * transactions before computing monthly interest.
 */
export function runAccumulationSimulationWithEvents(
  inputs: SimulationInputs,
  events: LifeEvents,
  rules: CpfRulesConfig = CPF_RULES_2026,
): SimulationResultWithEvents {
  const endAge = inputs.endAge ?? DEFAULT_END_AGE;
  const start: YearMonth = inputs.simulationStartDate ? isoToYearMonth(inputs.simulationStartDate) : todayYearMonth();
  const interestRates = resolveInterestRates(inputs.economics, rules);

  let balances: AccountBalances = {
    oa: inputs.startBalances.oa,
    sa: inputs.startBalances.sa,
    ma: inputs.startBalances.ma,
    ra: inputs.startBalances.ra ?? 0,
  };

  const monthlyRecords: MonthlyRecordWithEvents[] = [];
  const awCeilingRemainingByYear = new Map<number, number>();
  const voluntary3RemainingByYear = new Map<number, number>();

  // One liability tracker per housing event, keyed by event id.
  const housingLiabilities = new Map<string, HousingLiabilityState>();
  for (const h of events.housing) {
    housingLiabilities.set(h.id, initHousingLiability(h));
  }

  let totalTopUpsApplied = 0;
  let totalTopUpsRejected = 0;

  let cursor: YearMonth = { ...start };
  let monthsSimulated = 0;

  while (monthsSimulated < MAX_MONTHS) {
    const age = getAgeAtMonthEnd(inputs.profile.dateOfBirth, cursor.year, cursor.month);
    if (age >= endAge) {
      break;
    }

    const owCeiling = getOwCeilingForYear(rules, cursor.year, inputs.economics);
    const bhs = getBhsForYear(rules, cursor.year, inputs.economics);
    const { frs } = getRetirementSumsForYear(rules, cursor.year, inputs.economics);

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

    // Interest is computed on the OPENING (pre-contribution, pre-event)
    // balances, exactly as in the baseline simulator (simulator.ts). This
    // is critical for parity: contributions, top-ups, and housing activity
    // applied THIS month should not themselves earn interest until next
    // month, matching CPF's actual crediting behavior.
    const interest = calculateMonthlyInterest(openingBalances, age, interestRates, inputs.economics.extraInterestEnabled, rules);

    // Apply mandatory contribution allocation first.
    let runningBalances: AccountBalances = {
      oa: openingBalances.oa + allocation.oa,
      sa: openingBalances.sa + allocation.sa,
      ma: openingBalances.ma + allocation.ma,
      ra: openingBalances.ra + allocation.ra,
    };

    // The annual CPF contribution limit headroom for voluntary-3 top-ups,
    // net of whatever the mandatory contribution already used this year.
    if (!voluntary3RemainingByYear.has(cursor.year)) {
      voluntary3RemainingByYear.set(cursor.year, rules.cpfAnnualLimit);
    }
    let voluntary3Remaining = voluntary3RemainingByYear.get(cursor.year)!;
    voluntary3Remaining = Math.max(0, voluntary3Remaining - contribution.totalContribution);

    // ── Step: apply top-up events scheduled this month ──────────────────
    const topUpResults: TopUpResult[] = [];
    for (const event of events.topUps) {
      if (!topUpFiresInMonth(event, cursor.year, cursor.month)) continue;

      const context: TopUpContext = {
        age,
        balances: runningBalances,
        rstuTarget: age >= 55
          ? getRetirementSumsForYear(rules, cursor.year, inputs.economics).ers
          : frs,
        bhsLimit: bhs,
        voluntary3RemainingHeadroom: voluntary3Remaining,
      };

      const result = applyTopUp(event, context, rules);
      topUpResults.push(result);

      runningBalances = {
        oa: runningBalances.oa + result.allocation.oa,
        sa: runningBalances.sa + result.allocation.sa,
        ma: runningBalances.ma + result.allocation.ma,
        ra: runningBalances.ra + result.allocation.ra,
      };

      if (result.kind === 'voluntary3') {
        voluntary3Remaining = Math.max(0, voluntary3Remaining - result.appliedAmount);
      }
      totalTopUpsApplied += result.appliedAmount;
      totalTopUpsRejected += result.excessAmount;
    }
    voluntary3RemainingByYear.set(cursor.year, voluntary3Remaining);

    // ── Step: apply housing events for this month ────────────────────────
    const housingResults: HousingMonthResult[] = [];
    for (const event of events.housing) {
      const liability = housingLiabilities.get(event.id)!;
      const { liability: newLiability, result } = processHousingEventMonth(
        event,
        liability,
        cursor,
        age,
        runningBalances.ra,
        frs,
        interestRates.oa,
        rules,
      );
      housingLiabilities.set(event.id, newLiability);
      housingResults.push(result);

      // Deduct OA for downpayment/instalment.
      runningBalances = { ...runningBalances, oa: runningBalances.oa - result.oaDeducted };

      // Apply refund on sale, if any.
      if (result.soldThisMonth) {
        runningBalances = {
          ...runningBalances,
          oa: runningBalances.oa + (result.refundToOa ?? 0),
          ra: runningBalances.ra + (result.refundToRa ?? 0),
        };
      }
    }

    // Interest (computed earlier on the opening balances) is credited on
    // top of this month's running balance, after all contributions and
    // life events have been applied — same final-assembly pattern as the
    // baseline simulator.
    balances = {
      oa: runningBalances.oa + interest.oaInterest,
      sa: runningBalances.sa + interest.saInterest,
      ma: runningBalances.ma + interest.maInterest,
      ra: runningBalances.ra + interest.raInterest,
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
      topUpResults,
      housingResults,
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
    finalHousingLiability: totalHousingLiability([...housingLiabilities.values()]),
    totalTopUpsApplied: round2(totalTopUpsApplied),
    totalTopUpsRejected: round2(totalTopUpsRejected),
  };
}

function projectedMonthlyOw(inputs: SimulationInputs, year: number, startYear: number): number {
  const yearsElapsed = Math.max(0, year - startYear);
  return inputs.income.monthlyOrdinaryWage * Math.pow(1 + inputs.income.annualSalaryGrowthRate, yearsElapsed);
}

function projectedAnnualAw(inputs: SimulationInputs, year: number, startYear: number): number {
  const yearsElapsed = Math.max(0, year - startYear);
  const growthRate = inputs.income.bonusGrowthMatchesSalary ? inputs.income.annualSalaryGrowthRate : 0;
  return inputs.income.annualAdditionalWage * Math.pow(1 + growthRate, yearsElapsed);
}

function buildAnnualSummaries(
  records: MonthlyRecordWithEvents[],
  rules: CpfRulesConfig,
  inputs: SimulationInputs,
): AnnualSummary[] {
  const byYear = new Map<number, MonthlyRecordWithEvents[]>();
  for (const record of records) {
    const list = byYear.get(record.year);
    if (list) list.push(record);
    else byYear.set(record.year, [record]);
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

function buildTotals(records: MonthlyRecordWithEvents[]): SimulationTotals {
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
