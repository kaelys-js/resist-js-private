/**
 * Income projection engine.
 *
 * Projects income year-by-year from the current year until retirement,
 * and calculates net position (income - expenses - debts + assets).
 *
 * @module
 */

import type { Num, Str } from '@/schemas/common';
import { okUnchecked, type Result } from '@/schemas/result/result';
import type { Settings, IncomeSource, DebtItem } from '$lib/schemas/finances';
import { getCurrentYear, getRetirementYear } from './projections';

// ── Types ─────────────────────────────────────────────────────────────

/** Income for a single year. */
export type YearlyIncome = {
  /** Calendar year. */
  readonly year: Num;
  /** Total income for this year. */
  readonly total: Num;
  /** Breakdown by source. */
  readonly sources: ReadonlyArray<{ readonly name: Str; readonly amount: Num }>;
};

/** Net position summary. */
export type NetPosition = {
  /** Total one-time assets (cash, investments). */
  readonly totalAssets: Num;
  /** Total outstanding debt. */
  readonly totalDebt: Num;
  /** Net worth (assets - debt). */
  readonly netWorth: Num;
  /** Total projected income over the full horizon. */
  readonly totalIncome: Num;
  /** Total projected expenses over the full horizon. */
  readonly totalExpenses: Num;
  /** Net position (assets + income - debt - expenses). */
  readonly netPosition: Num;
};

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Calculates the annual income from a source for a specific year.
 *
 * @param source - Income source
 * @param year - Target year
 * @returns Income amount for that year (0 if outside active range)
 */
function incomeForYear(source: IncomeSource, year: Num): Num {
  const startYear: Num = new Date(source.startDate).getFullYear();
  const endYear: Num = source.endDate ? new Date(source.endDate).getFullYear() : 9999;

  if (year < startYear || year > endYear) return 0;

  switch (source.frequency) {
    case 'one-time': {
      return year === startYear ? source.amount : 0;
    }
    case 'biweekly': {
      // ~26 pay periods per year
      if (year === startYear && year === endYear) {
        // Partial year: estimate based on months active
        const startMonth: Num = new Date(source.startDate).getMonth();
        const endMonth: Num = source.endDate ? new Date(source.endDate).getMonth() : 11;
        const months: Num = Math.max(endMonth - startMonth + 1, 1);
        return source.amount * ((months / 12) * 26);
      }
      if (year === startYear) {
        const startMonth: Num = new Date(source.startDate).getMonth();
        const remainingMonths: Num = 12 - startMonth;
        return source.amount * ((remainingMonths / 12) * 26);
      }
      if (year === endYear && source.endDate) {
        const endMonth: Num = new Date(source.endDate).getMonth();
        return source.amount * (((endMonth + 1) / 12) * 26);
      }
      return source.amount * 26;
    }
    case 'monthly': {
      if (year === startYear && year === endYear && source.endDate) {
        const startMonth: Num = new Date(source.startDate).getMonth();
        const endMonth: Num = new Date(source.endDate).getMonth();
        return source.amount * Math.max(endMonth - startMonth + 1, 1);
      }
      if (year === startYear) {
        const startMonth: Num = new Date(source.startDate).getMonth();
        return source.amount * (12 - startMonth);
      }
      if (year === endYear && source.endDate) {
        const endMonth: Num = new Date(source.endDate).getMonth();
        return source.amount * (endMonth + 1);
      }
      return source.amount * 12;
    }
    case 'annual': {
      return source.amount;
    }
    default: {
      return 0;
    }
  }
}

// ── Projection Engine ─────────────────────────────────────────────────

/**
 * Projects income year-by-year from now until retirement.
 *
 * @param sources - All income sources
 * @param settings - Global finance settings
 * @returns Year-by-year income projection
 */
export function projectIncome(
  sources: readonly IncomeSource[],
  settings: Settings,
): Result<readonly YearlyIncome[]> {
  const currentYear: Num = getCurrentYear();
  const retirementYear: Num = getRetirementYear(settings);
  const projections: YearlyIncome[] = [];

  for (let year: Num = currentYear; year < retirementYear; year++) {
    const yearSources: Array<{ name: Str; amount: Num }> = [];
    let total: Num = 0;

    for (const source of sources) {
      const amount: Num = incomeForYear(source, year);
      if (amount > 0) {
        yearSources.push({ name: source.name, amount: Math.round(amount * 100) / 100 });
        total += amount;
      }
    }

    projections.push({
      year,
      total: Math.round(total * 100) / 100,
      sources: yearSources,
    });
  }

  return okUnchecked(projections);
}

/**
 * Calculates the net financial position.
 *
 * @param income - Total projected income over the horizon
 * @param expenses - Total projected expenses over the horizon
 * @param debts - All current debt items
 * @param oneTimeAssets - Income sources that are one-time (assets/savings)
 * @returns Net position summary
 */
export function calculateNetPosition(
  income: Num,
  expenses: Num,
  debts: readonly DebtItem[],
  oneTimeAssets: readonly IncomeSource[],
): Result<NetPosition> {
  const totalDebt: Num = Math.round(debts.reduce((sum, d) => sum + d.balance, 0) * 100) / 100;
  const totalAssets: Num =
    Math.round(oneTimeAssets.reduce((sum, a) => sum + a.amount, 0) * 100) / 100;
  const netWorth: Num = Math.round((totalAssets - totalDebt) * 100) / 100;
  const netPosition: Num = Math.round((totalAssets + income - totalDebt - expenses) * 100) / 100;

  return okUnchecked({
    totalAssets,
    totalDebt,
    netWorth,
    totalIncome: Math.round(income * 100) / 100,
    totalExpenses: Math.round(expenses * 100) / 100,
    netPosition,
  });
}
