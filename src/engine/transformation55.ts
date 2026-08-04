/**
 * Stage A: Age-55 Transformation
 *
 * When a CPF member reaches age 55, the following one-time sequence occurs
 * (in this exact order, per CPF Board rules):
 *
 *  1. A new Retirement Account (RA) is created.
 *  2. The Special Account (SA) is closed and its entire balance is transferred
 *     to the RA.
 *  3. If the RA is still below the member's retirement sum target (BRS, FRS,
 *     or ERS), the shortfall is drawn from the OA (up to the OA balance).
 *  4. The SA is permanently closed (balance = 0 from this point on).
 *  5. Any amount in the OA above the shortfall drawn is NOT touched — it
 *     remains in the OA and may be withdrawn by the member or used for
 *     housing/investment/insurance as before.
 *  6. If the combined SA + OA is LESS than the retirement sum target, the
 *     RA is simply funded to the maximum available (SA + OA), and the member
 *     is considered to have a "retirement sum shortfall" — no error.
 *
 * Property pledge:
 *  - If the member owns a property whose remaining lease covers them to at
 *    least age 95, they may choose to set aside only the BRS (rather than
 *    the FRS). The portion of RA that would have been needed to reach the
 *    FRS is effectively "pledged" against the property instead.
 *  - In this engine, property pledge is modelled by passing 'BRS' as
 *    `retirementSumTarget` when `hasPropertyPledge` is true. The extra cash
 *    that would otherwise have gone to RA stays in OA (withdrawable).
 *
 * ERS top-up:
 *  - If the member selects 'ERS', the engine attempts to transfer enough
 *    from OA to reach the ERS. If OA is insufficient, RA is funded to the
 *    maximum available.
 *
 * Note on timing in the full simulation:
 *  - Phase 1 (accumulation simulator) runs up to but NOT including the
 *    month in which the member turns 55 (i.e. `endAge = 55`).
 *  - Stage A is applied instantaneously at the start of the month the
 *    member turns 55 (before that month's contributions / interest).
 *  - Post-55 accumulation (Stage B) then continues from the same month.
 */

import { CPF_RULES_2026 } from './cpfRules2026';
import type { CpfRulesConfig } from './configTypes';
import { getRetirementSumsForYear } from './lookups';
import type { Age55TransformationResult, RetirementPreferences } from './phase2Types';
import type { AccountBalances, EconomicAssumptions } from './types';

/**
 * Executes the one-time age-55 transformation.
 *
 * @param balancesAt55   CPF account balances immediately before the transformation
 *                       (as returned by the Phase 1 simulator: RA should be 0).
 * @param yearAt55       The calendar year in which the member turns 55 (cohort year
 *                       for BRS/FRS lookup).
 * @param retirement     The member's retirement preferences (target sum, property pledge).
 * @param economics      Economic assumptions used for projecting retirement sums
 *                       beyond the published schedule.
 * @param rules          CPF rules configuration (defaults to CPF_RULES_2026).
 */
export function applyAge55Transformation(
  balancesAt55: AccountBalances,
  yearAt55: number,
  retirement: RetirementPreferences,
  economics: EconomicAssumptions,
  rules: CpfRulesConfig = CPF_RULES_2026,
): Age55TransformationResult {
  const retirementSums = getRetirementSumsForYear(rules, yearAt55, economics);

  // Determine the dollar target for the RA.
  let targetAmount: number;
  switch (retirement.retirementSumTarget) {
    case 'BRS':
      targetAmount = retirementSums.brs;
      break;
    case 'ERS':
      targetAmount = retirementSums.ers;
      break;
    case 'FRS':
    default:
      targetAmount = retirementSums.frs;
      break;
  }

  const saBalanceBefore = balancesAt55.sa;
  const oaBalanceBefore = balancesAt55.oa;
  const maBalanceBefore = balancesAt55.ma;

  // Step 1 & 2: Transfer SA → RA.
  const saToRa = Math.min(saBalanceBefore, targetAmount);
  let raAfter = saToRa;
  let oaAfter = oaBalanceBefore;

  // Step 3: Cover shortfall from OA.
  const shortfallAfterSa = Math.max(0, targetAmount - saToRa);
  const oaToRa = Math.min(shortfallAfterSa, oaAfter);
  raAfter += oaToRa;
  oaAfter -= oaToRa;

  // Any SA surplus above the target stays in OA (withdrawable).
  const saSurplus = Math.max(0, saBalanceBefore - targetAmount);
  oaAfter += saSurplus;

  const withdrawableOaAmount = saSurplus;

  return {
    year: yearAt55,
    retirementSums,
    targetAmount,
    saBalanceBefore,
    oaBalanceBefore,
    saToRa,
    oaToRa,
    raAfter: round2(raAfter),
    oaAfter: round2(oaAfter),
    saAfter: 0,
    maAfter: maBalanceBefore,
    withdrawableOaAmount: round2(withdrawableOaAmount),
  };
}

/** Returns the transformed balances as an AccountBalances object ready for Stage B. */
export function balancesAfterTransformation(t: Age55TransformationResult): AccountBalances {
  return {
    oa: t.oaAfter,
    sa: 0,
    ma: t.maAfter,
    ra: t.raAfter,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
