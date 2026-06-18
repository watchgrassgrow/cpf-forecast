/**
 * Default assumptions for the Accumulation Phase simulation.
 *
 * `DEFAULT_ECONOMIC_ASSUMPTIONS` provides sensible, clearly-documented
 * defaults for the user-adjustable economic assumptions. Callers typically
 * spread this and override only what's relevant, e.g.:
 *
 *   const economics = { ...DEFAULT_ECONOMIC_ASSUMPTIONS, extraInterestEnabled: false };
 */

import { CPF_RULES_2026, DEFAULT_PROJECTION_ASSUMPTIONS } from './cpfRules2026';
import type { CpfRulesConfig } from './configTypes';
import type { EconomicAssumptions, InterestRatesInput } from './types';

export const DEFAULT_ECONOMIC_ASSUMPTIONS: EconomicAssumptions = {
  ...DEFAULT_PROJECTION_ASSUMPTIONS,
  extraInterestEnabled: true,
};

/**
 * Resolves the effective OA / SA-MA-RA interest rates for a simulation,
 * applying any user overrides on top of the rules config's currently
 * published rates.
 */
export function resolveInterestRates(
  economics: EconomicAssumptions,
  rules: CpfRulesConfig = CPF_RULES_2026,
): InterestRatesInput {
  return {
    oa: economics.oaInterestRate ?? rules.interestRates.oa,
    srma: economics.srmaInterestRate ?? rules.interestRates.shma,
  };
}
