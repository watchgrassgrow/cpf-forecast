export type Scheme = 'SC_PR3' | 'SPR2_GG' | 'SPR1_GG';
export type RSTarget = 'BRS' | 'FRS' | 'ERS';
export type CpfPlan = 'Standard' | 'Escalating' | 'Basic';
export type TopUpKind = 'rstu' | 'voluntary3' | 'medisave';

export interface UiTopUpEvent {
  id: string;
  kind: TopUpKind;
  date: string;       // ISO YYYY-MM-DD
  amount: number;
  repeatAnnually: boolean;
  repeatUntilYear: number;
  label?: string;
}

export interface UiHousingEvent {
  id: string;
  label: string;
  purchaseDate: string;       // ISO YYYY-MM-DD
  oaDownpayment: number;
  monthlyOaInstalment: number;
  loanTenureYears: number;
  planSale: boolean;
  saleDate: string;            // ISO YYYY-MM-DD, only used if planSale
  saleProceeds: number;
}

export interface FormState {
  // Step 1 – Profile
  dob: string;
  scheme: Scheme;
  monthlyOW: number;
  annualAW: number;
  salaryGrowth: number;
  bonusMonth: number;

  // Step 2 – Balances
  balOA: number;
  balSA: number;
  balMA: number;

  // Step 2b – CPFIS
  cpfisEnabled: boolean;
  cpfisBalance: number;         // Current market value of existing CPFIS-OA investments
  cpfisMonthlyContrib: number;  // Monthly OA → CPFIS transfer (Regular Savings Plan style)
  cpfisAnnualReturn: number;    // % p.a. expected return (user assumption, can be negative)
  cpfisStopAge: number;         // Stop making new contributions at this age (default 55)

  // Step 3 – Retirement
  rsTarget: RSTarget;
  propertyPledge: boolean;
  cpfPlan: CpfPlan;
  payoutStartAge: number;
  planHorizon: number;

  // Step 4 – Life events
  topUps: UiTopUpEvent[];
  housing: UiHousingEvent[];

  // Step 5 – Assumptions
  oaRate: number;
  srmaRate: number;
  inflationRate: number;
  extraInterest: boolean;
}

export const DEFAULT_FORM: FormState = {
  dob: '1988-09-20',
  scheme: 'SC_PR3',
  monthlyOW: 6500,
  annualAW: 13000,
  salaryGrowth: 3.0,
  bonusMonth: 12,
  balOA: 35000,
  balSA: 22000,
  balMA: 15000,
  cpfisEnabled: false,
  cpfisBalance: 0,
  cpfisMonthlyContrib: 500,
  cpfisAnnualReturn: 6.0,
  cpfisStopAge: 55,
  rsTarget: 'FRS',
  propertyPledge: false,
  cpfPlan: 'Standard',
  payoutStartAge: 65,
  planHorizon: 90,
  topUps: [],
  housing: [],
  oaRate: 2.5,
  srmaRate: 4.0,
  inflationRate: 2.5,
  extraInterest: true,
};

export function newTopUpEvent(): UiTopUpEvent {
  return {
    id: `tu_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    kind: 'rstu',
    date: `${new Date().getFullYear()}-01-01`,
    amount: 8000,
    repeatAnnually: false,
    repeatUntilYear: new Date().getFullYear() + 5,
  };
}

export function newHousingEvent(): UiHousingEvent {
  const year = new Date().getFullYear();
  return {
    id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label: 'My property',
    purchaseDate: `${year}-01-01`,
    oaDownpayment: 50000,
    monthlyOaInstalment: 1500,
    loanTenureYears: 25,
    planSale: false,
    saleDate: `${year + 10}-01-01`,
    saleProceeds: 0,
  };
}

export interface AnnualRow {
  year: number;
  age: number;
  oa: number;
  saOrRa: number;
  ma: number;
  total: number;
  cpfis: number;          // CPFIS market value this year
  totalWithCpfis: number; // total + cpfis
  cumPayout: number;
  isPayout: boolean;
  isPost55: boolean;
  is55Event: boolean;
  inflFactor: number;
}

export interface SimSummary {
  annual: AnnualRow[];
  totalAt55: number;
  totalWithCpfisAt55: number;   // CPF + CPFIS combined at age 55
  cpfisAt55: number;            // CPFIS value at age 55
  cpfisEquivalentOaAt55: number; // what the same OA money would have been worth at 2.5% — for comparison
  raAtPayoutStart: number;
  monthlyPayout: number;
  lifetimePayouts: number;
  transformation: {
    year: number;
    brs: number; frs: number; ers: number;
    target: number;
    saToRa: number; oaToRa: number; saSurplus: number;
    raAfter: number; oaAfter: number;
  } | null;
  inflAt55: number;
  inflAtPayout: number;
  inflFinal: number;
  lifeEvents: {
    totalTopUpsApplied: number;
    totalTopUpsRejected: number;
    housingLiability: { principal: number; accrued: number; total: number };
  };
}
