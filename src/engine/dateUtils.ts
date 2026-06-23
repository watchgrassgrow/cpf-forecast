/**
 * Date and age utilities for the CPF simulation engine.
 *
 * All dates are handled as UTC calendar dates (YYYY-MM-DD) to avoid any
 * timezone-related off-by-one issues when the engine runs in a browser.
 */

export interface YearMonth {
  year: number;
  /** 1-12 */
  month: number;
}

/** Parses an ISO date string (YYYY-MM-DD) into its numeric components. */
export function parseIsoDate(iso: string): { year: number; month: number; day: number } {
  const parts = iso.split('-').map(Number);
  const [year, month, day] = parts;
  if (
    parts.length !== 3 ||
    year === undefined ||
    month === undefined ||
    day === undefined ||
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day)
  ) {
    throw new Error(`Invalid ISO date string: "${iso}". Expected format YYYY-MM-DD.`);
  }
  return { year, month, day };
}

/**
 * Returns the member's age, in completed years, as of the LAST DAY of the
 * given (year, month).
 *
 * This is the convention used throughout the engine to decide which
 * contribution / allocation / interest age band applies for a given
 * calendar month: a member's age "for CPF purposes" in a given month is
 * their age once that month has fully elapsed. A practical consequence is
 * that the calendar month in which a member's birthday falls is the LAST
 * month simulated at their "old" age band - the month after that uses the
 * new age band.
 *
 * Special case: if `dateOfBirth` is 29 February and the target month/year
 * has no 29 February (i.e. is not a leap year), the member is treated as
 * not yet having had their birthday in February of that year - their age
 * increments once the calendar reaches March.
 */
export function getAgeAtMonthEnd(dateOfBirth: string, year: number, month: number): number {
  const dob = parseIsoDate(dateOfBirth);

  // Day 0 of the *following* month = the last day of (year, month).
  const lastDay = new Date(Date.UTC(year, month, 0));
  const lastDayMonth = lastDay.getUTCMonth() + 1; // 1-12
  const lastDayDate = lastDay.getUTCDate();

  let age = lastDay.getUTCFullYear() - dob.year;

  const dobKey = dob.month * 100 + dob.day;
  const endKey = lastDayMonth * 100 + lastDayDate;
  if (endKey < dobKey) {
    age -= 1;
  }
  return age;
}

/** Returns the (year, month) that follows the given one. */
export function nextMonth(ym: YearMonth): YearMonth {
  return ym.month === 12 ? { year: ym.year + 1, month: 1 } : { year: ym.year, month: ym.month + 1 };
}

/** The current UTC year and month. */
export function todayYearMonth(): YearMonth {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

/** Converts an ISO date string (YYYY-MM-DD) to a {year, month} pair, ignoring the day. */
export function isoToYearMonth(iso: string): YearMonth {
  const { year, month } = parseIsoDate(iso);
  return { year, month };
}
