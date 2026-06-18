/**
 * Official CPF parameters effective 1 January 2026.
 *
 * All figures below are transcribed directly from CPF Board / MOH / MOF
 * publications (see `sources`). They represent values that are FIXED BY
 * THE AUTHORITIES and are NOT user-editable in the calculator UI - the UI
 * should surface them as read-only "current official rates" with links back
 * to the source pages.
 *
 * When CPF Board announces new rates (typically each Budget, for effect the
 * following 1 January), create a new `cpfRulesYYYY.ts` file following this
 * same shape and switch the engine's default config - existing forecasts
 * remain reproducible by keeping the old file around.
 */

import type {
  AllocationBand,
  ContributionRateBand,
  ContributionScheme,
  CpfRulesConfig,
  ProjectionAssumptions,
} from './configTypes';

// ---------------------------------------------------------------------------
// Contribution rate tables
// ---------------------------------------------------------------------------
//
// Source: "CPF Contribution Rate Table from 1 January 2026", CPF Board.
// https://www.cpf.gov.sg/content/dam/web/employer/employer-obligations/documents/CPFcontributionratesfrom1Jan2026.pdf
//
// Each table is an array of age bands. `highBand` rates/caps apply once
// Total Wages for the month exceed $750.

// Table 1: Singapore Citizens, and SPRs from 3rd year onwards (full rates)
const TABLE_1_SC_PR3: ContributionRateBand[] = [
  {
    minAge: 0,
    maxAge: 55,
    lowBandTotalRate: 0.17,
    midBandTotalRate: 0.17,
    midBandEmployeeFactor: 0.6,
    highBand: {
      totalRateOW: 0.37,
      totalCapOW: 2960,
      totalRateAW: 0.37,
      employeeRateOW: 0.2,
      employeeCapOW: 1600,
      employeeRateAW: 0.2,
    },
  },
  {
    minAge: 56,
    maxAge: 60,
    lowBandTotalRate: 0.16,
    midBandTotalRate: 0.16,
    midBandEmployeeFactor: 0.54,
    highBand: {
      totalRateOW: 0.34,
      totalCapOW: 2720,
      totalRateAW: 0.34,
      employeeRateOW: 0.18,
      employeeCapOW: 1440,
      employeeRateAW: 0.18,
    },
  },
  {
    minAge: 61,
    maxAge: 65,
    lowBandTotalRate: 0.125,
    midBandTotalRate: 0.125,
    midBandEmployeeFactor: 0.375,
    highBand: {
      totalRateOW: 0.25,
      totalCapOW: 2000,
      totalRateAW: 0.25,
      employeeRateOW: 0.125,
      employeeCapOW: 1000,
      employeeRateAW: 0.125,
    },
  },
  {
    minAge: 66,
    maxAge: 70,
    lowBandTotalRate: 0.09,
    midBandTotalRate: 0.09,
    midBandEmployeeFactor: 0.225,
    highBand: {
      totalRateOW: 0.165,
      totalCapOW: 1320,
      totalRateAW: 0.165,
      employeeRateOW: 0.075,
      employeeCapOW: 600,
      employeeRateAW: 0.075,
    },
  },
  {
    minAge: 71,
    maxAge: Infinity,
    lowBandTotalRate: 0.075,
    midBandTotalRate: 0.075,
    midBandEmployeeFactor: 0.15,
    highBand: {
      totalRateOW: 0.125,
      totalCapOW: 1000,
      totalRateAW: 0.125,
      employeeRateOW: 0.05,
      employeeCapOW: 400,
      employeeRateAW: 0.05,
    },
  },
];

// Table 2: SPR, 1st year of SPR status, Graduated/Graduated (G/G)
const TABLE_2_SPR1_GG: ContributionRateBand[] = [
  {
    minAge: 0,
    maxAge: 55,
    lowBandTotalRate: 0.04,
    midBandTotalRate: 0.04,
    midBandEmployeeFactor: 0.15,
    highBand: {
      totalRateOW: 0.09,
      totalCapOW: 720,
      totalRateAW: 0.09,
      employeeRateOW: 0.05,
      employeeCapOW: 400,
      employeeRateAW: 0.05,
    },
  },
  {
    minAge: 56,
    maxAge: 60,
    lowBandTotalRate: 0.04,
    midBandTotalRate: 0.04,
    midBandEmployeeFactor: 0.15,
    highBand: {
      totalRateOW: 0.09,
      totalCapOW: 720,
      totalRateAW: 0.09,
      employeeRateOW: 0.05,
      employeeCapOW: 400,
      employeeRateAW: 0.05,
    },
  },
  {
    minAge: 61,
    maxAge: 65,
    lowBandTotalRate: 0.035,
    midBandTotalRate: 0.035,
    midBandEmployeeFactor: 0.15,
    highBand: {
      totalRateOW: 0.085,
      totalCapOW: 680,
      totalRateAW: 0.085,
      employeeRateOW: 0.05,
      employeeCapOW: 400,
      employeeRateAW: 0.05,
    },
  },
  {
    minAge: 66,
    maxAge: Infinity,
    lowBandTotalRate: 0.035,
    midBandTotalRate: 0.035,
    midBandEmployeeFactor: 0.15,
    highBand: {
      totalRateOW: 0.085,
      totalCapOW: 680,
      totalRateAW: 0.085,
      employeeRateOW: 0.05,
      employeeCapOW: 400,
      employeeRateAW: 0.05,
    },
  },
];

// Table 3: SPR, 2nd year of SPR status, Graduated/Graduated (G/G)
const TABLE_3_SPR2_GG: ContributionRateBand[] = [
  {
    minAge: 0,
    maxAge: 55,
    lowBandTotalRate: 0.09,
    midBandTotalRate: 0.09,
    midBandEmployeeFactor: 0.45,
    highBand: {
      totalRateOW: 0.24,
      totalCapOW: 1920,
      totalRateAW: 0.24,
      employeeRateOW: 0.15,
      employeeCapOW: 1200,
      employeeRateAW: 0.15,
    },
  },
  {
    minAge: 56,
    maxAge: 60,
    lowBandTotalRate: 0.06,
    midBandTotalRate: 0.06,
    midBandEmployeeFactor: 0.375,
    highBand: {
      totalRateOW: 0.185,
      totalCapOW: 1480,
      totalRateAW: 0.185,
      employeeRateOW: 0.125,
      employeeCapOW: 1000,
      employeeRateAW: 0.125,
    },
  },
  {
    minAge: 61,
    maxAge: 65,
    lowBandTotalRate: 0.035,
    midBandTotalRate: 0.035,
    midBandEmployeeFactor: 0.225,
    highBand: {
      totalRateOW: 0.11,
      totalCapOW: 880,
      totalRateAW: 0.11,
      employeeRateOW: 0.075,
      employeeCapOW: 600,
      employeeRateAW: 0.075,
    },
  },
  {
    minAge: 66,
    maxAge: Infinity,
    lowBandTotalRate: 0.035,
    midBandTotalRate: 0.035,
    midBandEmployeeFactor: 0.15,
    highBand: {
      totalRateOW: 0.085,
      totalCapOW: 680,
      totalRateAW: 0.085,
      employeeRateOW: 0.05,
      employeeCapOW: 400,
      employeeRateAW: 0.05,
    },
  },
];

// Table 4: SPR, 1st year of SPR status, Full Employer / Graduated Employee (F/G)
const TABLE_4_SPR1_FG: ContributionRateBand[] = [
  {
    minAge: 0,
    maxAge: 55,
    lowBandTotalRate: 0.17,
    midBandTotalRate: 0.17,
    midBandEmployeeFactor: 0.15,
    highBand: {
      totalRateOW: 0.22,
      totalCapOW: 1760,
      totalRateAW: 0.22,
      employeeRateOW: 0.05,
      employeeCapOW: 400,
      employeeRateAW: 0.05,
    },
  },
  {
    minAge: 56,
    maxAge: 60,
    lowBandTotalRate: 0.16,
    midBandTotalRate: 0.16,
    midBandEmployeeFactor: 0.15,
    highBand: {
      totalRateOW: 0.21,
      totalCapOW: 1680,
      totalRateAW: 0.21,
      employeeRateOW: 0.05,
      employeeCapOW: 400,
      employeeRateAW: 0.05,
    },
  },
  {
    minAge: 61,
    maxAge: 65,
    lowBandTotalRate: 0.125,
    midBandTotalRate: 0.125,
    midBandEmployeeFactor: 0.15,
    highBand: {
      totalRateOW: 0.175,
      totalCapOW: 1400,
      totalRateAW: 0.175,
      employeeRateOW: 0.05,
      employeeCapOW: 400,
      employeeRateAW: 0.05,
    },
  },
  {
    minAge: 66,
    maxAge: 70,
    lowBandTotalRate: 0.09,
    midBandTotalRate: 0.09,
    midBandEmployeeFactor: 0.15,
    highBand: {
      totalRateOW: 0.14,
      totalCapOW: 1120,
      totalRateAW: 0.14,
      employeeRateOW: 0.05,
      employeeCapOW: 400,
      employeeRateAW: 0.05,
    },
  },
  {
    minAge: 71,
    maxAge: Infinity,
    lowBandTotalRate: 0.075,
    midBandTotalRate: 0.075,
    midBandEmployeeFactor: 0.15,
    highBand: {
      totalRateOW: 0.125,
      totalCapOW: 1000,
      totalRateAW: 0.125,
      employeeRateOW: 0.05,
      employeeCapOW: 400,
      employeeRateAW: 0.05,
    },
  },
];

// Table 5: SPR, 2nd year of SPR status, Full Employer / Graduated Employee (F/G)
const TABLE_5_SPR2_FG: ContributionRateBand[] = [
  {
    minAge: 0,
    maxAge: 55,
    lowBandTotalRate: 0.17,
    midBandTotalRate: 0.17,
    midBandEmployeeFactor: 0.45,
    highBand: {
      totalRateOW: 0.32,
      totalCapOW: 2560,
      totalRateAW: 0.32,
      employeeRateOW: 0.15,
      employeeCapOW: 1200,
      employeeRateAW: 0.15,
    },
  },
  {
    minAge: 56,
    maxAge: 60,
    lowBandTotalRate: 0.16,
    midBandTotalRate: 0.16,
    midBandEmployeeFactor: 0.375,
    highBand: {
      totalRateOW: 0.285,
      totalCapOW: 2280,
      totalRateAW: 0.285,
      employeeRateOW: 0.125,
      employeeCapOW: 1000,
      employeeRateAW: 0.125,
    },
  },
  {
    minAge: 61,
    maxAge: 65,
    lowBandTotalRate: 0.125,
    midBandTotalRate: 0.125,
    midBandEmployeeFactor: 0.225,
    highBand: {
      totalRateOW: 0.2,
      totalCapOW: 1600,
      totalRateAW: 0.2,
      employeeRateOW: 0.075,
      employeeCapOW: 600,
      employeeRateAW: 0.075,
    },
  },
  {
    minAge: 66,
    maxAge: 70,
    lowBandTotalRate: 0.09,
    midBandTotalRate: 0.09,
    midBandEmployeeFactor: 0.15,
    highBand: {
      totalRateOW: 0.14,
      totalCapOW: 1120,
      totalRateAW: 0.14,
      employeeRateOW: 0.05,
      employeeCapOW: 400,
      employeeRateAW: 0.05,
    },
  },
  {
    minAge: 71,
    maxAge: Infinity,
    lowBandTotalRate: 0.075,
    midBandTotalRate: 0.075,
    midBandEmployeeFactor: 0.15,
    highBand: {
      totalRateOW: 0.125,
      totalCapOW: 1000,
      totalRateAW: 0.125,
      employeeRateOW: 0.05,
      employeeCapOW: 400,
      employeeRateAW: 0.05,
    },
  },
];

const CONTRIBUTION_RATES: Record<ContributionScheme, ContributionRateBand[]> = {
  SC_PR3: TABLE_1_SC_PR3,
  SPR1_GG: TABLE_2_SPR1_GG,
  SPR2_GG: TABLE_3_SPR2_GG,
  SPR1_FG: TABLE_4_SPR1_FG,
  SPR2_FG: TABLE_5_SPR2_FG,
};

// ---------------------------------------------------------------------------
// Allocation rates
// ---------------------------------------------------------------------------
//
// Source: "CPF Allocation Rates from 1 January 2026", CPF Board.
// https://www.cpf.gov.sg/content/dam/web/employer/employer-obligations/documents/CPFAllocationRatesfromJanuary2026.pdf
//
// Allocation order per CPF Board: MediSave Account is computed first,
// followed by Special/Retirement Account; the remainder goes to Ordinary
// Account. The ratios below are applied to the TOTAL contribution.

const ALLOCATION_RATES_PRE55: AllocationBand[] = [
  { minAge: 0, maxAge: 35, oa: 0.6217, saOrRa: 0.1621, ma: 0.2162 },
  { minAge: 36, maxAge: 45, oa: 0.5677, saOrRa: 0.1891, ma: 0.2432 },
  { minAge: 46, maxAge: 50, oa: 0.5136, saOrRa: 0.2162, ma: 0.2702 },
  { minAge: 51, maxAge: 55, oa: 0.4055, saOrRa: 0.3108, ma: 0.2837 },
];

const ALLOCATION_RATES_POST55: AllocationBand[] = [
  { minAge: 56, maxAge: 60, oa: 0.353, saOrRa: 0.3382, ma: 0.3088 },
  { minAge: 61, maxAge: 65, oa: 0.14, saOrRa: 0.44, ma: 0.42 },
  { minAge: 66, maxAge: 70, oa: 0.0607, saOrRa: 0.303, ma: 0.6363 },
  { minAge: 71, maxAge: Infinity, oa: 0.08, saOrRa: 0.08, ma: 0.84 },
];

// ---------------------------------------------------------------------------
// Interest rates
// ---------------------------------------------------------------------------
//
// Source: "CPF interest rates", CPF Board - rates for 1 Jul 2026 to 30 Sep 2026.
// https://www.cpf.gov.sg/member/growing-your-savings/earning-higher-returns/earning-attractive-interest
//
// Extra interest source:
// https://www.cpf.gov.sg/service/article/how-much-extra-interest-can-i-earn-on-my-cpf-savings

const INTEREST_RATES = {
  oa: 0.025, // 2.5% p.a. (legislated minimum)
  shma: 0.04, // 4% p.a. (legislated floor for SA/MA/RA, extended through 31 Dec 2026)
  oaCapForExtraInterest: 20000,
  // Below 55: +1% on first $60,000 of combined balances (OA portion capped at $20,000)
  extraInterestBelow55: [{ upTo: 60000, rate: 0.01 }],
  // 55 and above: +2% on first $30,000, +1% on next $30,000 (OA portion capped at $20,000)
  extraInterestFrom55: [
    { upTo: 30000, rate: 0.02 },
    { upTo: 60000, rate: 0.01 },
  ],
};

// ---------------------------------------------------------------------------
// Ordinary Wage (OW) ceiling schedule
// ---------------------------------------------------------------------------
//
// The OW ceiling was raised in stages from $6,000 (pre-Sep 2023) to $8,000
// (2026) per Budget 2023:
//   $6,000 (up to Aug 2023) -> $6,300 (1 Sep 2023) -> $6,800 (1 Jan 2024)
//   -> $7,400 (1 Jan 2025) -> $8,000 (1 Jan 2026)
// No further increase has been announced beyond 2026 as at the last
// verification date below.

const OW_CEILING_SCHEDULE = [
  { year: 2022, ceiling: 6000 },
  { year: 2023, ceiling: 6300 },
  { year: 2024, ceiling: 6800 },
  { year: 2025, ceiling: 7400 },
  { year: 2026, ceiling: 8000 },
];

// The Additional Wage (AW) ceiling formula constant. AW Ceiling for a year =
// 102,000 - Total Ordinary Wages (capped at the OW ceiling) subject to CPF
// for that year. This constant has remained $102,000 since 2016.
const ANNUAL_WAGE_CEILING_BASE = 102000;

// ---------------------------------------------------------------------------
// Retirement sums (BRS / FRS, cohort-locked at age 55) and ERS (annual)
// ---------------------------------------------------------------------------
//
// Source: CPF Board "What is the Enhanced Retirement Sum (ERS)?" and related
// retirement sum pages. BRS/FRS are fixed for life based on the year a
// member turns 55. ERS = 4 x that year's BRS (since 2025) and applies to
// anyone aged 55+ in that calendar year (increases annually).

const RETIREMENT_SUMS = [
  { cohortYear: 2025, brs: 106500, frs: 213000 },
  { cohortYear: 2026, brs: 110200, frs: 220400 },
];

const ENHANCED_RETIREMENT_SUMS = [
  { year: 2025, ers: 426000 },
  { year: 2026, ers: 440800 },
  { year: 2027, ers: 456400 },
];

// ---------------------------------------------------------------------------
// Basic Healthcare Sum (BHS) schedule
// ---------------------------------------------------------------------------
//
// Applies to members below age 65. When a member turns 65 in year Y, their
// personal BHS is fixed at this value for the rest of their life.
// Source: CPF/MOH "CPF interest rates ... and Basic Healthcare Sum for 2026".

const BHS_SCHEDULE = [
  { year: 2024, belowAge65: 71500 },
  { year: 2025, belowAge65: 75500 },
  { year: 2026, belowAge65: 79000 },
];

// ---------------------------------------------------------------------------
// Default projection assumptions for years beyond the published schedules
// ---------------------------------------------------------------------------
//
// CPF Board / MOF / MOH typically only publish OW ceiling, retirement sum and
// BHS figures a year or two ahead. For long-horizon forecasts, the engine
// needs a default growth assumption for years beyond that. These defaults
// are based on recent historical trends and should be clearly surfaced to
// users as EDITABLE assumptions (unlike the rates above, which are official
// and fixed).

export const DEFAULT_PROJECTION_ASSUMPTIONS: ProjectionAssumptions = {
  // No further OW ceiling increase has been announced beyond 2026; default
  // to frozen. Users planning long horizons may wish to model a gradual
  // increase in line with wage growth.
  owCeilingGrowthRate: 0,
  // BRS/FRS have risen ~3.5% p.a. in recent years.
  retirementSumGrowthRate: 0.035,
  // BHS has risen ~4-6% p.a. in recent years; 4% is a conservative midpoint.
  bhsGrowthRate: 0.04,
};

// ---------------------------------------------------------------------------
// Assembled configuration
// ---------------------------------------------------------------------------

export const CPF_RULES_2026: CpfRulesConfig = {
  label: 'CPF rules effective 1 January 2026',
  lastVerified: '2026-06-14',
  sources: [
    'https://www.cpf.gov.sg/member/cpf-overview',
    'https://www.cpf.gov.sg/member/growing-your-savings/cpf-contributions/saving-as-an-employee',
    'https://www.cpf.gov.sg/content/dam/web/employer/employer-obligations/documents/CPFcontributionratesfrom1Jan2026.pdf',
    'https://www.cpf.gov.sg/content/dam/web/employer/employer-obligations/documents/CPFAllocationRatesfromJanuary2026.pdf',
    'https://www.cpf.gov.sg/member/growing-your-savings/earning-higher-returns/earning-attractive-interest',
    'https://www.cpf.gov.sg/service/article/how-much-extra-interest-can-i-earn-on-my-cpf-savings',
    'https://www.cpf.gov.sg/service/article/what-is-the-enhanced-retirement-sum-ers',
    'https://www.moh.gov.sg/newsroom/cpf-interest-rates-from-1-january-to-31-march-2026-and-basic-healthcare-sum-for-2026/',
  ],
  contributionRates: CONTRIBUTION_RATES,
  allocationRatesPre55: ALLOCATION_RATES_PRE55,
  allocationRatesPost55: ALLOCATION_RATES_POST55,
  interestRates: INTEREST_RATES,
  owCeilingSchedule: OW_CEILING_SCHEDULE,
  annualWageCeilingBase: ANNUAL_WAGE_CEILING_BASE,
  retirementSums: RETIREMENT_SUMS,
  enhancedRetirementSums: ENHANCED_RETIREMENT_SUMS,
  bhsSchedule: BHS_SCHEDULE,
};
