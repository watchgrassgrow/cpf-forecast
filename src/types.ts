export type Scheme = 'SC_PR3' | 'SPR2_GG' | 'SPR1_GG';
export type RSTarget = 'BRS' | 'FRS' | 'ERS';
export type CpfPlan = 'Standard' | 'Escalating' | 'Basic';

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

  // Step 3 – Retirement
  rsTarget: RSTarget;
  propertyPledge: boolean;
  cpfPlan: CpfPlan;
  payoutStartAge: number;
  planHorizon: number;

  // Step 4 – Assumptions
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
  rsTarget: 'FRS',
  propertyPledge: false,
  cpfPlan: 'Standard',
  payoutStartAge: 65,
  planHorizon: 90,
  oaRate: 2.5,
  srmaRate: 4.0,
  inflationRate: 2.5,
  extraInterest: true,
};

export interface AnnualRow {
  year: number;
  age: number;
  oa: number;
  saOrRa: number;
  ma: number;
  total: number;
  cumPayout: number;
  isPayout: boolean;
  isPost55: boolean;
  is55Event: boolean;
  inflFactor: number;
}

export interface SimSummary {
  annual: AnnualRow[];
  totalAt55: number;
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
}
