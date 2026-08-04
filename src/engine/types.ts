/**
 * Type definitions for the CPF Accumulation-Phase simulation engine.
 *
 * Phase 1 scope: simulate a member's CPF accounts month-by-month from a
 * given start date until (but not including) the month in which they
 * reach `endAge` (default 55). The output balances represent the member's
 * position immediately BEFORE the age-55 transformation (SA closure, RA
 * creation, FRS/BRS allocation, property pledge) - that transformation is
 * the responsibility of the Phase 2 module.
 */

import type { ContributionScheme, ProjectionAssumptions } from './configTypes';

// ---------------------------------------------------------------------------
// Wages & contributions
// ---------------------------------------------------------------------------

/** Ordinary Wages and Additional Wages for one calendar month, BEFORE any CPF ceilings are applied. */
export interface WageInput {
  /** Ordinary Wages (e.g. monthly salary) for the month. */
  ow: number;
  /** Additional Wages (e.g. annual bonus) for the month. */
  aw: number;
}

/** Result of computing one month's CPF contribution. */
export interface ContributionResult {
  /** Ordinary Wages for the month, before the OW ceiling. */
  ow: number;
  /** Ordinary Wages actually subject to CPF (after the OW ceiling). */
  owSubjectToCpf: number;
  /** Additional Wages for the month, before the AW ceiling. */
  aw: number;
  /** Additional Wages actually subject to CPF (after the member's remaining AW ceiling for the year). */
  awSubjectToCpf: number;
  /** Total CPF contribution (employer + employee), rounded to the nearest dollar. */
  totalContribution: number;
  /** Employee's share of the contribution, rounded down to the nearest dollar. */
  employeeContribution: number;
  /** Employer's share of the contribution (= total - employee). */
  employerContribution: number;
}

// ---------------------------------------------------------------------------
// Allocation
// ---------------------------------------------------------------------------

/** Result of allocating one month's total CPF contribution across accounts. */
export interface AllocationResult {
  oa: number;
  /** Special Account allocation. Always 0 for ages > 55. */
  sa: number;
  /** Retirement Account allocation. Always 0 for ages <= 55. */
  ra: number;
  ma: number;
  /** Portion of the "raw" MA allocation redirected elsewhere because it would exceed the Basic Healthcare Sum (BHS). */
  maOverflow: number;
  /** Portion of the "raw" SA/RA allocation redirected to OA because it would exceed the Full Retirement Sum (FRS). Reserved for Phase 2 (always 0 for ages <= 55). */
  saRaOverflow: number;
}

// ---------------------------------------------------------------------------
// Balances & interest
// ---------------------------------------------------------------------------

/** CPF account balances. `ra` is 0 throughout Phase 1 (the Retirement Account does not exist before age 55). */
export interface AccountBalances {
  oa: number;
  sa: number;
  ma: number;
  ra: number;
}

/** Base CPF interest rates to use for a simulation (annual rates). */
export interface InterestRatesInput {
  /** Ordinary Account interest rate, e.g. 0.025 for 2.5% p.a. */
  oa: number;
  /** Special / MediSave / Retirement Account base interest rate, e.g. 0.04 for 4% p.a. */
  srma: number;
}

/** Result of computing one month's interest across all accounts. */
export interface InterestResult {
  /** Interest credited to OA. Never includes "extra interest" - that is rerouted (see below). */
  oaInterest: number;
  /** Interest credited to SA, including any extra interest earned on SA itself plus any extra interest rerouted from OA (ages <= 55 only). */
  saInterest: number;
  /** Interest credited to MA, including any extra interest earned on MA itself. */
  maInterest: number;
  /** Interest credited to RA, including any extra interest earned on RA itself plus any extra interest rerouted from OA (ages > 55 only). Reserved for Phase 2. */
  raInterest: number;
  /** Total extra interest earned this month, across all accounts (for reporting/transparency). */
  extraInterestTotal: number;
  /** Portion of `extraInterestTotal` attributable to the (capped) OA balance - this amount is rerouted to SA (<=55) or RA (>55), not credited to OA. */
  extraInterestFromOa: number;
}

// ---------------------------------------------------------------------------
// Profile / assumptions / inputs
// ---------------------------------------------------------------------------

/** Personal details that determine which official CPF rates apply to a member. */
export interface PersonalProfile {
  /** ISO date string, YYYY-MM-DD. */
  dateOfBirth: string;
  /** Which official CPF contribution rate table applies (citizenship / SPR status). */
  contributionScheme: ContributionScheme;
}

/** User-provided income projection inputs. */
export interface IncomeAssumptions {
  /** Current gross monthly Ordinary Wage, before any CPF ceiling. */
  monthlyOrdinaryWage: number;
  /** Annual salary growth rate, applied at the start of each subsequent calendar year (e.g. 0.03 = 3%). */
  annualSalaryGrowthRate: number;
  /** Current annual Additional Wage (e.g. total annual bonus), before any CPF ceiling. */
  annualAdditionalWage: number;
  /** If true, the Additional Wage grows at the same rate as `annualSalaryGrowthRate`. If false, it stays constant in nominal terms. */
  bonusGrowthMatchesSalary: boolean;
  /** Calendar month (1-12) in which the annual Additional Wage is paid. */
  bonusPaymentMonth: number;
}

/**
 * Economic / projection assumptions that the USER may adjust (as opposed to
 * the official rates in `CpfRulesConfig`, which are fixed by the
 * authorities and only change via a new rules-config file).
 */
export interface EconomicAssumptions extends ProjectionAssumptions {
  /** Override the OA interest rate (annual). Defaults to the rules config's current published rate if omitted. */
  oaInterestRate?: number;
  /** Override the SA/MA/RA base interest rate (annual). Defaults to the rules config's current published rate if omitted. */
  srmaInterestRate?: number;
  /** Whether to apply the "extra interest" scheme on the first $60,000 of combined balances. Default true. */
  extraInterestEnabled: boolean;
}

/** All inputs required to run an Accumulation Phase simulation. */
export interface SimulationInputs {
  profile: PersonalProfile;
  income: IncomeAssumptions;
  /** CPF account balances at the simulation start date. `ra` should be 0 for any member below 55. */
  startBalances: AccountBalances;
  economics: EconomicAssumptions;
  /** ISO date string, YYYY-MM-DD. Defaults to today (UTC) if omitted. */
  simulationStartDate?: string;
  /** Age (in completed years) at which the simulation stops (exclusive). Defaults to 55. */
  endAge?: number;
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

/** A complete record of one simulated calendar month. */
export interface MonthlyRecord {
  year: number;
  /** 1-12 */
  month: number;
  /** Age in completed years as of the last day of this month. */
  age: number;
  contribution: ContributionResult;
  allocation: AllocationResult;
  /** Account balances at the START of the month, before this month's contribution and interest. */
  openingBalances: AccountBalances;
  interest: InterestResult;
  /** Account balances at the END of the month, after this month's contribution and interest. */
  closingBalances: AccountBalances;
}

/** A summary of one calendar year of simulation. */
export interface AnnualSummary {
  year: number;
  /** Age in completed years as of the last simulated month of this year. */
  ageAtYearEnd: number;
  totalContributions: number;
  employeeContributions: number;
  employerContributions: number;
  interestEarned: number;
  closingBalances: AccountBalances;
  /** OW ceiling ($/month) applicable in this year. */
  owCeiling: number;
  /** Basic Healthcare Sum applicable in this year. */
  bhs: number;
}

/** Cumulative totals across the whole simulation. */
export interface SimulationTotals {
  totalContributions: number;
  totalEmployeeContributions: number;
  totalEmployerContributions: number;
  totalInterestEarned: number;
  totalOaInterest: number;
  totalSaInterest: number;
  totalMaInterest: number;
  totalExtraInterest: number;
  totalMaOverflow: number;
}

/** Full result of an Accumulation Phase simulation. */
export interface SimulationResult {
  monthlyRecords: MonthlyRecord[];
  annualSummaries: AnnualSummary[];
  /** Balances at the end of the simulation (i.e. just before the member turns `endAge`). */
  finalBalances: AccountBalances;
  /** The member's age (completed years) at the end of the simulation. */
  finalAge: number;
  totals: SimulationTotals;
}
