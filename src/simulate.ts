import { runFullSimulation } from './engine/fullSimulator';
import { DEFAULT_ECONOMIC_ASSUMPTIONS } from './engine/defaults';
import type { FullSimulationInputs } from './engine/phase2Types';
import type { FormState, SimSummary, AnnualRow } from './types';

function getAgeAtMonthEnd(dob: string, year: number, month: number): number {
  const last = new Date(Date.UTC(year, month, 0));
  const d = new Date(dob + 'T00:00:00Z');
  let age = last.getUTCFullYear() - d.getUTCFullYear();
  const endKey = (last.getUTCMonth() + 1) * 100 + last.getUTCDate();
  const dobKey = (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  if (endKey < dobKey) age--;
  return age;
}

export function runSimulation(form: FormState): SimSummary {
  const inputs: FullSimulationInputs = {
    profile: {
      dateOfBirth: form.dob,
      contributionScheme: form.scheme as any,
    },
    income: {
      monthlyOrdinaryWage: form.monthlyOW,
      annualSalaryGrowthRate: form.salaryGrowth / 100,
      annualAdditionalWage: form.annualAW,
      bonusGrowthMatchesSalary: true,
      bonusPaymentMonth: form.bonusMonth,
    },
    startBalances: {
      oa: form.balOA,
      sa: form.balSA,
      ma: form.balMA,
      ra: 0,
    },
    economics: {
      ...DEFAULT_ECONOMIC_ASSUMPTIONS,
      oaInterestRate: form.oaRate / 100,
      srmaInterestRate: form.srmaRate / 100,
      extraInterestEnabled: form.extraInterest,
    },
    simulationStartDate: `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}-01`,
    retirement: {
      retirementSumTarget: form.rsTarget,
      hasPropertyPledge: form.propertyPledge,
      cpfLifePlan: form.cpfPlan as any,
      payoutStartAge: form.payoutStartAge,
      planningHorizonAge: form.planHorizon,
    },
  };

  const result = runFullSimulation(inputs);

  // Build unified annual rows from all three phases
  const annual: AnnualRow[] = [];
  const inflRate = form.inflationRate / 100;
  const startYear = new Date().getUTCFullYear();

  const addRows = (
    records: { year: number; month: number; age: number; closingBalances: { oa: number; sa: number; ma: number; ra: number } }[],
    isPayout: boolean,
    isPost55: boolean,
    cumPayoutByYear: Map<number, number>,
  ) => {
    const byYear = new Map<number, typeof records[0]>();
    for (const r of records) byYear.set(r.year, r);
    for (const [year, last] of byYear) {
      const inflFactor = Math.pow(1 + inflRate, Math.max(0, year - startYear));
      const b = last.closingBalances;
      annual.push({
        year,
        age: last.age,
        oa: b.oa,
        saOrRa: b.sa + b.ra,
        ma: b.ma,
        total: b.oa + b.sa + b.ra + b.ma,
        cumPayout: cumPayoutByYear.get(year) ?? 0,
        isPayout,
        isPost55,
        is55Event: false,
        inflFactor,
      });
    }
  };

  // Phase 1 – accumulation
  const cumPayEmpty = new Map<number, number>();
  addRows(result.accumulationPhase.monthlyRecords, false, false, cumPayEmpty);

  // Stage B – post-55
  addRows(result.post55MonthlyRecords, false, true, cumPayEmpty);

  // Stage C – payout: build cumulative payout by year
  const cumPayByYear = new Map<number, number>();
  let runningCum = 0;
  for (const r of result.payoutMonthlyRecords) {
    runningCum = r.cumulativePayouts;
    cumPayByYear.set(r.year, runningCum);
  }
  addRows(result.payoutMonthlyRecords, true, true, cumPayByYear);

  // Sort and mark the age-55 event row
  annual.sort((a, b) => a.year - b.year || 0);
  if (result.age55Transformation) {
    const t = result.age55Transformation;
    const row = annual.find(r => r.year === t.year && r.isPost55);
    if (row) row.is55Event = true;
  }

  // Key figures
  const r55 = annual.find(r => r.is55Event) ?? annual.find(r => r.isPost55);
  const rPayout = annual.find(r => r.isPayout);
  const rLast = annual[annual.length - 1];

  const t = result.age55Transformation;

  return {
    annual,
    totalAt55: r55 ? r55.total : 0,
    raAtPayoutStart: result.balancesAtPayoutStart.ra,
    monthlyPayout: result.monthlyPayoutAtStart,
    lifetimePayouts: result.payoutTotals.totalCpfLifePayouts,
    transformation: t ? {
      year: t.year,
      brs: t.retirementSums.brs,
      frs: t.retirementSums.frs,
      ers: t.retirementSums.ers,
      target: t.targetAmount,
      saToRa: t.saToRa,
      oaToRa: t.oaToRa,
      saSurplus: t.withdrawableOaAmount,
      raAfter: t.raAfter,
      oaAfter: t.oaAfter,
    } : null,
    inflAt55: r55?.inflFactor ?? 1,
    inflAtPayout: rPayout?.inflFactor ?? 1,
    inflFinal: rLast?.inflFactor ?? 1,
  };
}

export function getCurrentAge(dob: string): number {
  const now = new Date();
  return getAgeAtMonthEnd(dob, now.getUTCFullYear(), now.getUTCMonth() + 1);
}
