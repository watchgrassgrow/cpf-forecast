/**
 * Type definitions for the CPF "rules" configuration data.
 *
 * These types describe officially-published, government-set parameters:
 * contribution rates, allocation rates, interest rates, wage ceilings,
 * retirement sums and the Basic Healthcare Sum (BHS).
 *
 * Values themselves live in `cpfRules2026.ts` (and future `cpfRulesYYYY.ts`
 * files) so that updating to a new year's Budget announcements never
 * requires touching the calculation engine.
 */

/** Rates & dollar caps that apply once Total Wages (TW) > $750/month. */
export interface HighWageBandRates {
  /** Rate applied to Ordinary Wages (after OW ceiling) for the TOTAL contribution, e.g. 0.37 = 37% */
  totalRateOW: number;
  /** Dollar cap on the TOTAL contribution computed from OW */
  totalCapOW: number;
  /** Rate applied to Additional Wages (after AW ceiling) for the TOTAL contribution */
  totalRateAW: number;
  /** Rate applied to Ordinary Wages for the EMPLOYEE's share */
  employeeRateOW: number;
  /** Dollar cap on the EMPLOYEE's share computed from OW */
  employeeCapOW: number;
  /** Rate applied to Additional Wages for the EMPLOYEE's share */
  employeeRateAW: number;
}

/**
 * A single age-band row of a CPF contribution rate table.
 *
 * Mirrors the structure of the official CPF contribution rate tables, which
 * define three wage bands:
 *  - Total Wages (TW) <= $50            -> Nil
 *  - $50  < TW <= $500                  -> lowBandTotalRate * TW (employee share = 0)
 *  - $500 < TW <= $750                  -> midBandTotalRate * TW + midBandEmployeeFactor * (TW - 500)
 *                                           (employee share = midBandEmployeeFactor * (TW - 500))
 *  - TW > $750                          -> highBand rates apply separately to OW and AW
 */
export interface ContributionRateBand {
  /** Inclusive lower bound of the age band, in completed years */
  minAge: number;
  /** Inclusive upper bound of the age band, in completed years (use Infinity for "and above") */
  maxAge: number;
  /** Total contribution rate applied to TW when $50 < TW <= $500 */
  lowBandTotalRate: number;
  /** Total contribution rate applied to TW when $500 < TW <= $750 (numerically equal to lowBandTotalRate) */
  midBandTotalRate: number;
  /** Factor applied to (TW - 500) to get the EMPLOYEE's share when $500 < TW <= $750 */
  midBandEmployeeFactor: number;
  /** Rates & caps that apply once TW > $750 */
  highBand: HighWageBandRates;
}

/**
 * Identifies which official CPF contribution rate table applies to a member.
 *
 * - SC_PR3  : Singapore Citizens, and Singapore Permanent Residents (SPRs)
 *             from their 3rd year of SPR status onwards (Table 1 - full
 *             employer & employee rates). Also applies to 1st/2nd year SPRs
 *             whose employer & employee have jointly applied to contribute
 *             at full rates.
 * - SPR1_GG : SPR, 1st year of SPR status, Graduated Employer / Graduated
 *             Employee rates (Table 2)
 * - SPR2_GG : SPR, 2nd year of SPR status, Graduated Employer / Graduated
 *             Employee rates (Table 3)
 * - SPR1_FG : SPR, 1st year of SPR status, Full Employer / Graduated
 *             Employee rates (Table 4)
 * - SPR2_FG : SPR, 2nd year of SPR status, Full Employer / Graduated
 *             Employee rates (Table 5)
 */
export type ContributionScheme =
  | 'SC_PR3'
  | 'SPR1_GG'
  | 'SPR2_GG'
  | 'SPR1_FG'
  | 'SPR2_FG';

/** A single age-band row of a CPF allocation rate table (pre-55: OA/SA/MA, post-55: OA/RA/MA). */
export interface AllocationBand {
  /** Inclusive lower bound of the age band, in completed years */
  minAge: number;
  /** Inclusive upper bound of the age band, in completed years (use Infinity for "and above") */
  maxAge: number;
  /** Ratio of contribution allocated to Ordinary Account */
  oa: number;
  /** Ratio of contribution allocated to Special Account (pre-55) or Retirement Account (55+) */
  saOrRa: number;
  /** Ratio of contribution allocated to MediSave Account */
  ma: number;
}

/** A single "extra interest" bracket on combined CPF balances. */
export interface ExtraInterestBracket {
  /**
   * Cumulative ceiling of combined balance (in dollars) that this bracket
   * applies up to. E.g. for "+2% on first $30,000, +1% on next $30,000":
   * brackets = [{ upTo: 30000, rate: 0.02 }, { upTo: 60000, rate: 0.01 }]
   */
  upTo: number;
  /** Additional interest rate (on top of the base rate) for this bracket */
  rate: number;
}

/** CPF interest rate configuration for a given quarter/period. */
export interface InterestRateConfig {
  /** Ordinary Account interest rate (annual), e.g. 0.025 = 2.5% */
  oa: number;
  /** Special / MediSave / Retirement Account interest rate (annual), e.g. 0.04 = 4% */
  shma: number;
  /** Maximum OA balance counted towards the "combined balance" for extra interest purposes */
  oaCapForExtraInterest: number;
  /** Extra interest brackets for members below 55 */
  extraInterestBelow55: ExtraInterestBracket[];
  /** Extra interest brackets for members aged 55 and above */
  extraInterestFrom55: ExtraInterestBracket[];
}

/** Basic / Full Retirement Sum for a cohort (the year the member turns 55). These are fixed for life for that cohort. */
export interface RetirementSumCohort {
  /** The calendar year in which the member turns 55 */
  cohortYear: number;
  /** Basic Retirement Sum applicable to this cohort */
  brs: number;
  /** Full Retirement Sum applicable to this cohort (currently = 2 x BRS) */
  frs: number;
}

/**
 * Basic Healthcare Sum that applies to members BELOW age 65 in a given
 * calendar year. When a member turns 65 in year Y, their personal BHS
 * becomes permanently fixed at this value for the rest of their life.
 */
export interface BhsScheduleEntry {
  /** Calendar year */
  year: number;
  /** BHS applicable to members below 65 in that year */
  belowAge65: number;
}

/** Ordinary Wage ceiling (monthly cap on OW subject to CPF) for a given calendar year. */
export interface OwCeilingScheduleEntry {
  year: number;
  ceiling: number;
}

/** Full CPF rules configuration bundle for a given "rules version". */
export interface CpfRulesConfig {
  /** Human-readable label, e.g. "CPF rules effective 1 January 2026" */
  label: string;
  /** ISO date this configuration was last verified against cpf.gov.sg */
  lastVerified: string;
  /** Source references for traceability */
  sources: string[];
  /** Contribution rate tables, keyed by scheme */
  contributionRates: Record<ContributionScheme, ContributionRateBand[]>;
  /** Allocation rates for members aged 55 and below (OA / SA / MA) */
  allocationRatesPre55: AllocationBand[];
  /** Allocation rates for members above 55 (OA / RA / MA) */
  allocationRatesPost55: AllocationBand[];
  /** Interest rates (current quarter's published rates, used as the simulation default) */
  interestRates: InterestRateConfig;
  /** Ordinary Wage ceiling schedule (known historical + currently announced years) */
  owCeilingSchedule: OwCeilingScheduleEntry[];
  /**
   * The constant used in the Additional Wage (AW) ceiling formula:
   *   AW Ceiling for the year = annualWageCeilingBase - Total Ordinary Wages
   *                              subject to CPF for that year
   * Currently $102,000 (equivalent to 17 x the $6,000 OW ceiling that was in
   * place when the formula was set; the constant itself has not changed even
   * as the monthly OW ceiling has increased).
   */
  annualWageCeilingBase: number;
  /** Basic & Full Retirement Sums by cohort year (year member turns 55) */
  retirementSums: RetirementSumCohort[];
  /**
   * Enhanced Retirement Sum (ERS) by calendar year. Unlike BRS/FRS, the ERS
   * is NOT cohort-locked: it applies to everyone aged 55+ in that year and
   * rises annually. Currently defined as 4 x that year's BRS (since 2025).
   */
  enhancedRetirementSums: { year: number; ers: number }[];
  /** Basic Healthcare Sum schedule (applies to members below 65) */
  bhsSchedule: BhsScheduleEntry[];
}

/** Assumptions for projecting rules beyond the years with officially announced figures. */
export interface ProjectionAssumptions {
  /** Annual growth rate used to project the OW ceiling beyond the last known year (default: 0, i.e. frozen) */
  owCeilingGrowthRate: number;
  /** Annual growth rate used to project BRS/FRS beyond the last known cohort year */
  retirementSumGrowthRate: number;
  /** Annual growth rate used to project the BHS beyond the last known year */
  bhsGrowthRate: number;
}
