/**
 * CPFIS (CPF Investment Scheme - OA) Simulator
 *
 * Key rules modelled:
 *  - Only OA funds above $20,000 are investable (CPFIS_OA_FLOOR).
 *  - Monthly contribution: user transfers a fixed amount from OA → CPFIS
 *    each month, subject to the investable headroom.
 *  - While invested, that money does NOT earn OA interest (we reduce the
 *    OA balance used for interest computation by the CPFIS balance).
 *  - Returns compound ANNUALLY, not monthly: the annual return is applied
 *    once at the end of each calendar year to the entire CPFIS balance
 *    (including that year's contributions). This matches how ETF/unit trust
 *    capital appreciation is realised in practice.
 *  - Contributions stop at cpfisStopAge (default 55). After that the
 *    portfolio continues to compound but no new OA is moved in.
 *
 * Important disclaimers embedded in the UI:
 *  - Returns are NOT guaranteed. CPFIS can lose money.
 *  - CPF research found ~45% of CPFIS investors made losses 2013-2022.
 *  - Fees/charges are NOT modelled — real returns will be lower.
 */

export const CPFIS_OA_FLOOR = 20_000; // must remain in OA, not investable

export interface CpfisMonthState {
  /** CPFIS market value at end of this month (before annual return is applied mid-year) */
  balance: number;
  /** Amount transferred from OA to CPFIS this month (0 if headroom exhausted or past stop age) */
  transferred: number;
  /** Running OA balance AFTER the CPFIS transfer (for correct interest calculation by the CPF engine) */
  effectiveOA: number;
}

export interface CpfisYearResult {
  year: number;
  age: number;
  openingBalance: number;
  contributions: number;      // total transferred from OA this year
  returnApplied: number;      // gain/loss from annual return
  closingBalance: number;
  effectiveOaReduction: number; // how much OA was reduced (= closing CPFIS balance, since OA interest only on OA - CPFIS)
}

export interface CpfisSimResult {
  /** Year-by-year CPFIS results */
  yearlyResults: CpfisYearResult[];
  /** Final CPFIS balance at the end of the simulation */
  finalBalance: number;
  /** Total OA transferred into CPFIS over the full period */
  totalTransferred: number;
  /** Total gain/loss from investment returns */
  totalReturnGain: number;
  /**
   * What the SAME total transfers would have been worth if they had
   * simply stayed in OA at 2.5% p.a. — for the "opportunity cost" display.
   */
  equivalentOaValue: number;
}

/**
 * Runs the CPFIS simulation in parallel with the main CPF engine output.
 *
 * @param annualOaBefore    Year-by-year OA closing balances from the CPF engine
 *                          (BEFORE accounting for CPFIS transfers — i.e. the
 *                          CPF engine runs on the full OA, and we separately
 *                          compute how much was diverted to CPFIS).
 * @param startingCpfis     Existing CPFIS market value at simulation start.
 * @param monthlyContrib    Monthly OA→CPFIS transfer amount.
 * @param annualReturnPct   Annual return rate (e.g. 6 for 6%). Can be negative.
 * @param stopAge           Stop new contributions at this age.
 * @param oaRatePct         OA interest rate (e.g. 2.5) — used for opportunity cost calc.
 * @param rows              Annual rows from the main simulation (for age/year reference).
 */
export function simulateCpfis(
  rows: { year: number; age: number; oa: number }[],
  startingCpfis: number,
  monthlyContrib: number,
  annualReturnPct: number,
  stopAge: number,
  oaRatePct: number,
): CpfisSimResult {
  const annualReturn = annualReturnPct / 100;
  const oaRate = oaRatePct / 100;

  const yearlyResults: CpfisYearResult[] = [];
  let cpfisBalance = Math.max(0, startingCpfis);
  let totalTransferred = 0;
  let equivalentOaBalance = startingCpfis;
  let equivalentOaAtStopAge = 0;  // snapshot at stop age for fair comparison
  let cpfisAtStopAge = 0;         // CPFIS value at same point

  for (const row of rows) {
    const openingBalance = cpfisBalance;
    let yearContributions = 0;

    const isContributing = row.age < stopAge;
    if (isContributing && monthlyContrib > 0) {
      for (let m = 0; m < 12; m++) {
        const oaForHeadroom = row.oa;
        const headroom = Math.max(0, oaForHeadroom - CPFIS_OA_FLOOR - cpfisBalance);
        const thisMonthTransfer = Math.min(monthlyContrib, headroom);
        if (thisMonthTransfer > 0) {
          cpfisBalance += thisMonthTransfer;
          yearContributions += thisMonthTransfer;
        }
      }
    }

    // Annual return applied ONCE at year-end
    const returnApplied = cpfisBalance * annualReturn;
    cpfisBalance = Math.max(0, cpfisBalance + returnApplied);

    // Opportunity cost: accumulate at OA rate while contributing
    equivalentOaBalance = (equivalentOaBalance + yearContributions) * (1 + oaRate);

    // Snapshot for comparison at the stop age
    if (!isContributing && equivalentOaAtStopAge === 0) {
      equivalentOaAtStopAge = equivalentOaBalance;
      cpfisAtStopAge = cpfisBalance;
    }

    totalTransferred += yearContributions;

    yearlyResults.push({
      year: row.year,
      age: row.age,
      openingBalance: round2(openingBalance),
      contributions: round2(yearContributions),
      returnApplied: round2(returnApplied),
      closingBalance: round2(cpfisBalance),
      effectiveOaReduction: round2(cpfisBalance),
    });
  }

  // If stop age was never reached in the simulation (member still young),
  // fall back to the running balance for the comparison.
  const finalEquivalentOa = equivalentOaAtStopAge > 0 ? equivalentOaAtStopAge : equivalentOaBalance;
  const finalCpfisForComparison = cpfisAtStopAge > 0 ? cpfisAtStopAge : cpfisBalance;

  return {
    yearlyResults,
    finalBalance: round2(cpfisBalance),
    totalTransferred: round2(totalTransferred),
    totalReturnGain: round2(finalCpfisForComparison - startingCpfis - totalTransferred),
    equivalentOaValue: round2(finalEquivalentOa),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
