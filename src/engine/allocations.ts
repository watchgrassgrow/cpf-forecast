/**
 * CPF monthly allocation calculation.
 *
 * Splits one month's total CPF contribution across the Ordinary Account
 * (OA), Special Account (SA, ages <= 55) or Retirement Account (RA, ages >
 * 55), and MediSave Account (MA), following the official CPF Board
 * allocation rates.
 *
 * Per CPF Board's published methodology, the MediSave allocation is
 * computed first, then the Special/Retirement Account allocation, with the
 * remainder going to the Ordinary Account. Each ratio is applied to the
 * TOTAL contribution and rounded to the nearest cent.
 *
 * Two "overflow" redirections are modelled:
 *  - If the MA allocation would push the MA balance above the Basic
 *    Healthcare Sum (BHS), the excess is redirected to SA (ages <= 55) or
 *    RA (ages > 55).
 *  - If the SA/RA allocation (including any redirected MA excess) would
 *    push the RA balance above the member's Full Retirement Sum (or Basic
 *    Retirement Sum, if pledged), the excess is redirected to OA. This only
 *    applies for ages > 55 (Phase 2); for ages <= 55, `saRaOverflow` is
 *    always 0.
 */

import { CPF_RULES_2026 } from './cpfRules2026';
import type { AllocationBand, CpfRulesConfig } from './configTypes';
import type { AllocationResult } from './types';

/** Rounds to the nearest cent. */
function round2(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function findAllocationBand(bands: AllocationBand[], age: number): AllocationBand | undefined {
  return bands.find((b) => age >= b.minAge && age <= b.maxAge);
}

/**
 * Returns the allocation band (OA/SA-or-RA/MA ratios) applicable to a
 * member of the given age, automatically choosing the pre-55 or post-55
 * table. Exposed for reuse by other modules (e.g. voluntary top-up
 * processing) that need to mirror the mandatory-contribution split ratios
 * without duplicating the lookup logic.
 */
export function findAllocationBandForAge(age: number, rules: CpfRulesConfig = CPF_RULES_2026): AllocationBand {
  const pre55 = findAllocationBand(rules.allocationRatesPre55, age);
  if (pre55) return pre55;
  const post55 = findAllocationBand(rules.allocationRatesPost55, age);
  if (post55) return post55;
  throw new Error(`No CPF allocation rate band found for age ${age}.`);
}

/**
 * Allocates one month's total CPF contribution across OA / SA (or RA) / MA.
 *
 * @param totalContribution  The total CPF contribution for the month (employer + employee).
 * @param age                Member's age in completed years.
 * @param currentBalances    SA, RA and MA balances at the START of the month (before this contribution).
 * @param bhsLimit           The Basic Healthcare Sum applicable this year.
 * @param frsLimit           The Full Retirement Sum (or Basic Retirement Sum, if pledged) applicable to
 *                            this member. Ignored for ages <= 55. Defaults to `Infinity` (no cap) -
 *                            Phase 1 never reaches age 56, so this only matters once Phase 2 reuses
 *                            this function.
 * @param rules              CPF rules configuration (defaults to the current `CPF_RULES_2026`).
 */
export function allocateContribution(
  totalContribution: number,
  age: number,
  currentBalances: { sa: number; ra: number; ma: number },
  bhsLimit: number,
  frsLimit: number = Infinity,
  rules: CpfRulesConfig = CPF_RULES_2026,
): AllocationResult {
  const pre55Band = findAllocationBand(rules.allocationRatesPre55, age);

  if (pre55Band) {
    const maRaw = round2(totalContribution * pre55Band.ma);
    const saRaw = round2(totalContribution * pre55Band.saOrRa);
    const oa = round2(totalContribution - maRaw - saRaw);

    const maHeadroom = Math.max(0, bhsLimit - currentBalances.ma);
    const maAllocated = Math.min(maRaw, maHeadroom);
    const maOverflow = round2(maRaw - maAllocated);

    return {
      oa,
      sa: round2(saRaw + maOverflow),
      ra: 0,
      ma: maAllocated,
      maOverflow,
      saRaOverflow: 0,
    };
  }

  // Ages > 55. Reserved for Phase 2; included here so this function is a
  // complete, independently-testable building block for that phase.
  const post55Band = findAllocationBand(rules.allocationRatesPost55, age);
  if (!post55Band) {
    throw new Error(`No CPF allocation rate band found for age ${age}.`);
  }

  const maRaw = round2(totalContribution * post55Band.ma);
  const raRaw = round2(totalContribution * post55Band.saOrRa);
  const oaRaw = round2(totalContribution - maRaw - raRaw);

  const maHeadroom = Math.max(0, bhsLimit - currentBalances.ma);
  const maAllocated = Math.min(maRaw, maHeadroom);
  const maOverflow = round2(maRaw - maAllocated);

  const raTarget = round2(raRaw + maOverflow);
  const raHeadroom = Math.max(0, frsLimit - currentBalances.ra);
  const raAllocated = Math.min(raTarget, raHeadroom);
  const saRaOverflow = round2(raTarget - raAllocated);

  return {
    oa: round2(oaRaw + saRaOverflow),
    sa: 0,
    ra: raAllocated,
    ma: maAllocated,
    maOverflow,
    saRaOverflow,
  };
}
