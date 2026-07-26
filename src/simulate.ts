import { runFullSimulationWithEvents } from './engine/fullSimulatorWithEvents';
import { DEFAULT_ECONOMIC_ASSUMPTIONS } from './engine/defaults';
import type { FullSimulationInputs } from './engine/phase2Types';
import type { LifeEvents, TopUpEvent, HousingEvent } from './engine/lifeEventTypes';
import { simulateCpfis } from './engine/cpfis';
import type { FormState, SimSummary, AnnualRow, UiTopUpEvent, UiHousingEvent } from './types';

function getAgeAtMonthEnd(dob: string, year: number, month: number): number {
  const last = new Date(Date.UTC(year, month, 0));
  const d = new Date(dob + 'T00:00:00Z');
  let age = last.getUTCFullYear() - d.getUTCFullYear();
  const endKey = (last.getUTCMonth() + 1) * 100 + last.getUTCDate();
  const dobKey  = (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  if (endKey < dobKey) age--;
  return age;
}

function toEngineTopUp(e: UiTopUpEvent): TopUpEvent {
  return {
    id: e.id, kind: e.kind, date: e.date, amount: e.amount,
    repeatUntilYear: e.repeatAnnually ? e.repeatUntilYear : undefined,
  };
}

function toEngineHousing(e: UiHousingEvent): HousingEvent {
  return {
    id: e.id,
    purchaseDate: e.purchaseDate,
    oaDownpayment: e.oaDownpayment,
    monthlyOaInstalment: e.monthlyOaInstalment,
    loanTenureMonths: Math.round(e.loanTenureYears * 12),
    saleDate: e.planSale ? e.saleDate : undefined,
    saleProceeds: e.planSale ? e.saleProceeds : undefined,
    label: e.label,
  };
}

export function runSimulation(form: FormState): SimSummary {
  const inputs: FullSimulationInputs = {
    profile: { dateOfBirth: form.dob, contributionScheme: form.scheme as any },
    income: {
      monthlyOrdinaryWage: form.monthlyOW,
      annualSalaryGrowthRate: form.salaryGrowth / 100,
      annualAdditionalWage: form.annualAW,
      bonusGrowthMatchesSalary: true,
      bonusPaymentMonth: form.bonusMonth,
    },
    startBalances: { oa: form.balOA, sa: form.balSA, ma: form.balMA, ra: 0 },
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

  const events: LifeEvents = {
    topUps: form.topUps.map(toEngineTopUp),
    housing: form.housing.map(toEngineHousing),
  };

  const result = runFullSimulationWithEvents(inputs, events);

  // ── Build annual rows ──────────────────────────────────────────────────────
  const annualRaw: Omit<AnnualRow, 'cpfis' | 'totalWithCpfis'>[] = [];
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
      annualRaw.push({
        year, age: last.age,
        oa: b.oa, saOrRa: b.sa + b.ra, ma: b.ma,
        total: b.oa + b.sa + b.ra + b.ma,
        cumPayout: cumPayoutByYear.get(year) ?? 0,
        isPayout, isPost55, is55Event: false, inflFactor,
      });
    }
  };

  const cumPayEmpty = new Map<number, number>();
  addRows(result.accumulationPhase.monthlyRecords, false, false, cumPayEmpty);
  addRows(result.post55MonthlyRecords, false, true, cumPayEmpty);

  const cumPayByYear = new Map<number, number>();
  let runningCum = 0;
  for (const r of result.payoutMonthlyRecords) {
    runningCum = r.cumulativePayouts;
    cumPayByYear.set(r.year, runningCum);
  }
  addRows(result.payoutMonthlyRecords, true, true, cumPayByYear);

  annualRaw.sort((a, b) => a.year - b.year);

  if (result.age55Transformation) {
    const t = result.age55Transformation;
    const row = annualRaw.find(r => r.year === t.year && r.isPost55);
    if (row) row.is55Event = true;
  }

  // ── CPFIS simulation (runs in parallel, uses CPF OA balance as reference) ─
  const cpfisEnabled = form.cpfisEnabled;
  const cpfisResult = cpfisEnabled
    ? simulateCpfis(
        annualRaw.map(r => ({ year: r.year, age: r.age, oa: r.oa })),
        form.cpfisBalance,
        form.cpfisMonthlyContrib,
        form.cpfisAnnualReturn,
        form.cpfisStopAge,
        form.oaRate,
      )
    : null;

  // Build the cpfis-by-year lookup
  const cpisByYear = new Map<number, number>();
  if (cpfisResult) {
    for (const yr of cpfisResult.yearlyResults) {
      cpisByYear.set(yr.year, yr.closingBalance);
    }
  }

  // Merge CPFIS into annual rows
  const annual: AnnualRow[] = annualRaw.map(r => {
    const cpfis = cpisByYear.get(r.year) ?? 0;
    return { ...r, cpfis, totalWithCpfis: r.total + cpfis };
  });

  // Key milestone rows
  const r55    = annual.find(r => r.is55Event) ?? annual.find(r => r.isPost55);
  const rPayout = annual.find(r => r.isPayout);
  const rLast   = annual[annual.length - 1];

  const t = result.age55Transformation;

  // CPFIS at-55 figures
  const cpfisAt55 = r55 ? (cpisByYear.get(r55.year) ?? 0) : 0;

  return {
    annual,
    totalAt55: r55 ? r55.total : 0,
    totalWithCpfisAt55: r55 ? r55.total + cpfisAt55 : 0,
    cpfisAt55,
    cpfisEquivalentOaAt55: cpfisResult?.equivalentOaValue ?? 0,
    raAtPayoutStart: result.balancesAtPayoutStart.ra,
    monthlyPayout: result.monthlyPayoutAtStart,
    lifetimePayouts: result.payoutTotals.totalCpfLifePayouts,
    transformation: t ? {
      year: t.year,
      brs: t.retirementSums.brs, frs: t.retirementSums.frs, ers: t.retirementSums.ers,
      target: t.targetAmount,
      saToRa: t.saToRa, oaToRa: t.oaToRa, saSurplus: t.withdrawableOaAmount,
      raAfter: t.raAfter, oaAfter: t.oaAfter,
    } : null,
    inflAt55:   r55?.inflFactor    ?? 1,
    inflAtPayout: rPayout?.inflFactor ?? 1,
    inflFinal:  rLast?.inflFactor  ?? 1,
    lifeEvents: {
      totalTopUpsApplied: result.accumulationPhase.totalTopUpsApplied,
      totalTopUpsRejected: result.accumulationPhase.totalTopUpsRejected,
      housingLiability: result.accumulationPhase.finalHousingLiability,
    },
  };
}

export function getCurrentAge(dob: string): number {
  const now = new Date();
  return getAgeAtMonthEnd(dob, now.getUTCFullYear(), now.getUTCMonth() + 1);
}
