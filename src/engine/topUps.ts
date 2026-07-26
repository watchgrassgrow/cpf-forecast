/**
 * Top-up event processor.
 *
 * Each of the three top-up mechanisms has its own target account(s) and its
 * own headroom cap, independent of the others:
 *
 *   RSTU         -> SA (<55) or RA (55+), capped by headroom to the
 *                   member's chosen retirement sum target for that phase
 *                   (FRS pre-55 planning target, or the prevailing year's
 *                   ERS once 55+, since members can keep topping up RA
 *                   annually as the ERS rises).
 *   voluntary3   -> OA/SA/MA split via the SAME ratios as mandatory
 *                   contributions for the member's age, capped by
 *                   remaining headroom under the ANNUAL CPF CONTRIBUTION
 *                   LIMIT (same limit mandatory contributions draw from).
 *   medisave     -> MA only, capped by headroom to the BHS.
 *
 * This module is pure / stateless: callers pass in current balances and
 * limits, and get back exactly how much was actually applied and where.
 */

import { CPF_RULES_2026 } from './cpfRules2026';
import type { CpfRulesConfig } from './configTypes';
import { findAllocationBandForAge } from './allocations';
import type { TopUpEvent, TopUpResult } from './lifeEventTypes';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface TopUpContext {
  age: number;
  balances: { oa: number; sa: number; ra: number; ma: number };
  /** FRS or ERS headroom target for RSTU, depending on phase (see applyTopUp doc). */
  rstuTarget: number;
  /** BHS applicable this year, for MediSave top-up headroom. */
  bhsLimit: number;
  /**
   * Remaining headroom under the annual CPF contribution limit for
   * voluntary-3 top-ups THIS CALENDAR YEAR, after accounting for whatever
   * mandatory contributions have already used up this year. Caller is
   * responsible for tracking this across the year (mirrors how the AW
   * ceiling is tracked in the main simulator).
   */
  voluntary3RemainingHeadroom: number;
}

/**
 * Applies one top-up event for the given context. Does not mutate
 * `context.balances` — caller applies the returned allocation.
 */
export function applyTopUp(
  event: TopUpEvent,
  context: TopUpContext,
  rules: CpfRulesConfig = CPF_RULES_2026,
): TopUpResult {
  const requested = Math.max(0, event.amount);

  switch (event.kind) {
    case 'rstu':
      return applyRstu(requested, context);
    case 'medisave':
      return applyMedisaveTopUp(requested, context);
    case 'voluntary3':
      return applyVoluntary3(requested, context, rules);
    default: {
      const _exhaustive: never = event.kind;
      throw new Error(`Unknown top-up kind: ${_exhaustive}`);
    }
  }
}

function applyRstu(requested: number, context: TopUpContext): TopUpResult {
  const isPost55 = context.age >= 55;
  const currentBalance = isPost55 ? context.balances.ra : context.balances.sa;
  const headroom = Math.max(0, context.rstuTarget - currentBalance);
  const applied = round2(Math.min(requested, headroom));
  const excess = round2(requested - applied);

  return {
    kind: 'rstu',
    requestedAmount: requested,
    appliedAmount: applied,
    excessAmount: excess,
    allocation: isPost55
      ? { oa: 0, sa: 0, ra: applied, ma: 0 }
      : { oa: 0, sa: applied, ra: 0, ma: 0 },
    capReason: excess > 0
      ? `Capped at ${isPost55 ? 'ERS' : 'FRS'} headroom ($${headroom.toFixed(2)} available)`
      : undefined,
  };
}

function applyMedisaveTopUp(requested: number, context: TopUpContext): TopUpResult {
  const headroom = Math.max(0, context.bhsLimit - context.balances.ma);
  const applied = round2(Math.min(requested, headroom));
  const excess = round2(requested - applied);

  return {
    kind: 'medisave',
    requestedAmount: requested,
    appliedAmount: applied,
    excessAmount: excess,
    allocation: { oa: 0, sa: 0, ra: 0, ma: applied },
    capReason: excess > 0 ? `Capped at BHS headroom ($${headroom.toFixed(2)} available)` : undefined,
  };
}

function applyVoluntary3(
  requested: number,
  context: TopUpContext,
  rules: CpfRulesConfig,
): TopUpResult {
  const cappedByLimit = Math.min(requested, Math.max(0, context.voluntary3RemainingHeadroom));
  const excessFromLimit = round2(requested - cappedByLimit);

  if (cappedByLimit <= 0) {
    return {
      kind: 'voluntary3',
      requestedAmount: requested,
      appliedAmount: 0,
      excessAmount: round2(requested),
      allocation: { oa: 0, sa: 0, ra: 0, ma: 0 },
      capReason: 'Annual CPF contribution limit already reached',
    };
  }

  // Split using the same age-based ratios as mandatory contributions.
  const band = findAllocationBandForAge(context.age, rules);
  const isPost55 = context.age >= 55;

  const maRaw = round2(cappedByLimit * band.ma);
  const otherRaw = round2(cappedByLimit * band.saOrRa);
  const oaRaw = round2(cappedByLimit - maRaw - otherRaw);

  // Respect BHS / retirement-sum headroom the same way mandatory contributions do:
  // MA overflow -> SA/RA; this module doesn't separately cap RA at FRS since voluntary3
  // amounts are typically modest, but we still guard MA at BHS for correctness.
  const maHeadroom = Math.max(0, context.bhsLimit - context.balances.ma);
  const maApplied = Math.min(maRaw, maHeadroom);
  const maOverflow = round2(maRaw - maApplied);

  const allocation = isPost55
    ? { oa: oaRaw, sa: 0, ra: round2(otherRaw + maOverflow), ma: maApplied }
    : { oa: oaRaw, sa: round2(otherRaw + maOverflow), ra: 0, ma: maApplied };

  return {
    kind: 'voluntary3',
    requestedAmount: requested,
    appliedAmount: cappedByLimit,
    excessAmount: excessFromLimit,
    allocation,
    capReason: excessFromLimit > 0 ? 'Capped at annual CPF contribution limit' : undefined,
  };
}

/**
 * Checks whether a TopUpEvent fires in a given (year, month), accounting
 * for the optional `repeatUntilYear` annual-recurrence field.
 */
export function topUpFiresInMonth(event: TopUpEvent, year: number, month: number): boolean {
  const eventDate = new Date(event.date + 'T00:00:00Z');
  const eventYear = eventDate.getUTCFullYear();
  const eventMonth = eventDate.getUTCMonth() + 1;

  if (eventMonth !== month) return false;
  if (year === eventYear) return true;
  if (event.repeatUntilYear && year > eventYear && year <= event.repeatUntilYear) return true;
  return false;
}
