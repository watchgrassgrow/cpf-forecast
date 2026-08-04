/**
 * CPF monthly interest calculation.
 *
 * Simplifying assumptions (see also README.md "Methodology & Assumptions"):
 *  - Interest for a calendar month is computed on each account's balance at
 *    the START of that month (i.e. BEFORE that month's contributions are
 *    credited), using 1/12 of the relevant annual rate.
 *  - "Extra interest" is computed on those same opening balances, following
 *    CPF's combined-balance ordering:
 *      - Ages <= 55: OA (capped at $20,000) -> SA -> MA
 *      - Ages > 55:  RA -> OA (capped at $20,000) -> SA -> MA  (Phase 2)
 *  - Extra interest attributable to the OA balance is NOT credited to OA
 *    (OA itself never earns extra interest); instead it is redirected to SA
 *    (ages <= 55) or RA (ages > 55).
 *
 * In reality, CPF computes interest based on the LOWEST balance in each
 * account during the month and credits it once a year (in January).
 * Compounding it monthly on the opening balance, as this engine does, is a
 * common simplification that very slightly overstates compounding within a
 * year but converges to materially the same long-run result. This can be
 * refined in a later phase if higher fidelity is needed.
 */

import { CPF_RULES_2026 } from './cpfRules2026';
import type { CpfRulesConfig, ExtraInterestBracket } from './configTypes';
import type { AccountBalances, InterestRatesInput, InterestResult } from './types';

type AccountKey = 'oa' | 'sa' | 'ma' | 'ra';

/**
 * Computes CPF interest for one calendar month.
 *
 * @param balances              Account balances at the START of the month (before this month's contributions).
 * @param age                   Member's age in completed years.
 * @param rates                 OA and SA/MA/RA base interest rates (annual).
 * @param extraInterestEnabled  Whether to apply the "extra interest" scheme on the first $60,000 of combined balances.
 * @param rules                 CPF rules configuration (defaults to the current `CPF_RULES_2026`), used for the
 *                               extra-interest brackets and the OA cap.
 */
export function calculateMonthlyInterest(
  balances: AccountBalances,
  age: number,
  rates: InterestRatesInput,
  extraInterestEnabled: boolean,
  rules: CpfRulesConfig = CPF_RULES_2026,
): InterestResult {
  const oaMonthly = rates.oa / 12;
  const srmaMonthly = rates.srma / 12;

  const oaInterestBase = balances.oa * oaMonthly;
  const saInterestBase = balances.sa * srmaMonthly;
  const maInterestBase = balances.ma * srmaMonthly;
  const raInterestBase = balances.ra * srmaMonthly;

  let extraTotal = 0;
  let extraFromOa = 0;
  let extraToSa = 0;
  let extraToMa = 0;
  let extraToRa = 0;

  if (extraInterestEnabled) {
    const { oaCapForExtraInterest, extraInterestBelow55, extraInterestFrom55 } = rules.interestRates;
    const tiers: ExtraInterestBracket[] = age <= 55 ? extraInterestBelow55 : extraInterestFrom55;
    const cappedOa = Math.min(balances.oa, oaCapForExtraInterest);

    // Combined-balance order: see module doc comment above.
    const order: { key: AccountKey; amount: number }[] =
      age <= 55
        ? [
            { key: 'oa', amount: cappedOa },
            { key: 'sa', amount: balances.sa },
            { key: 'ma', amount: balances.ma },
          ]
        : [
            { key: 'ra', amount: balances.ra },
            { key: 'oa', amount: cappedOa },
            { key: 'sa', amount: balances.sa },
            { key: 'ma', amount: balances.ma },
          ];

    let cumulative = 0;
    for (const { key, amount } of order) {
      if (amount <= 0) {
        continue;
      }
      let remaining = amount;
      let segmentStart = cumulative;

      for (const tier of tiers) {
        if (segmentStart >= tier.upTo) {
          continue;
        }
        const tierRoom = tier.upTo - segmentStart;
        const amountInTier = Math.min(remaining, tierRoom);
        if (amountInTier <= 0) {
          continue;
        }

        const extra = (amountInTier * tier.rate) / 12;
        extraTotal += extra;
        switch (key) {
          case 'oa':
            extraFromOa += extra;
            break;
          case 'sa':
            extraToSa += extra;
            break;
          case 'ma':
            extraToMa += extra;
            break;
          case 'ra':
            extraToRa += extra;
            break;
        }

        remaining -= amountInTier;
        segmentStart += amountInTier;
        if (remaining <= 0) {
          break;
        }
      }
      cumulative += amount;
    }
  }

  return {
    oaInterest: oaInterestBase,
    saInterest: saInterestBase + extraToSa + (age <= 55 ? extraFromOa : 0),
    maInterest: maInterestBase + extraToMa,
    raInterest: raInterestBase + extraToRa + (age > 55 ? extraFromOa : 0),
    extraInterestTotal: extraTotal,
    extraInterestFromOa: extraFromOa,
  };
}
