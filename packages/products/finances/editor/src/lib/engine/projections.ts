/**
 * Financial projection engine.
 *
 * Calculates annual costs, applies inflation, and produces year-by-year
 * expense projections from the current year until retirement.
 *
 * @module
 */

import type { Num, Str } from '@/schemas/common';
import { okUnchecked, type Result } from '@/schemas/result/result';
import type {
	Settings,
	MonthlyExpense,
	LifetimeExpense,
	LifetimeReplacement,
	Travel,
	Purchase,
	InflationConfig,
} from '$lib/schemas/finances';

// ── Types ─────────────────────────────────────────────────────────────

/** Annual cost breakdown for a single year. */
export type YearlyProjection = {
	/** Calendar year. */
	readonly year: Num;
	/** Monthly expenses total for this year. */
	readonly monthly: Num;
	/** Lifetime expenses annual cost for this year. */
	readonly lifetimeExpenses: Num;
	/** Lifetime replacements annual cost for this year. */
	readonly lifetimeReplacements: Num;
	/** Travel budget for this year. */
	readonly travel: Num;
	/** One-time purchases for this year. */
	readonly purchases: Num;
	/** Grand total for this year. */
	readonly total: Num;
};

/** Per-item lifetime cost summary. */
export type LifetimeItemCost = {
	/** Item name. */
	readonly name: Str;
	/** Category (monthly, lifetime-expense, lifetime-replacement, travel, purchase). */
	readonly category: Str;
	/** Total nominal cost over the full horizon (no inflation). */
	readonly nominalTotal: Num;
	/** Total inflation-adjusted cost over the full horizon. */
	readonly inflatedTotal: Num;
	/** Annual cost (nominal). */
	readonly annualCost: Num;
};

/** Summary of all lifetime costs. */
export type LifetimeSummary = {
	/** Total cost from now to retirement (nominal). */
	readonly nominalGrandTotal: Num;
	/** Total cost from now to retirement (inflation-adjusted). */
	readonly inflatedGrandTotal: Num;
	/** Per-item breakdown. */
	readonly items: readonly LifetimeItemCost[];
	/** Year-by-year projections. */
	readonly projections: readonly YearlyProjection[];
};

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Returns the number of years from a birth date to a retirement age.
 *
 * @param settings - Finance settings with birthDate and retirementAge
 * @returns Retirement year (calendar year)
 */
export function getRetirementYear(settings: Settings): Num {
	const birthYear: Num = new Date(settings.birthDate).getFullYear();
	return birthYear + settings.retirementAge;
}

/**
 * Gets the current calendar year.
 *
 * @returns Current year as number
 */
export function getCurrentYear(): Num {
	return new Date().getFullYear();
}

/**
 * Calculates the annualized cost for a monthly expense.
 *
 * @param expense - Monthly expense item
 * @returns Annual cost
 */
export function monthlyToAnnual(expense: MonthlyExpense): Num {
	return expense.billingCycle === 'bimonthly' ? expense.amount * 6 : expense.amount * 12;
}

/**
 * Calculates the annualized cost for a lifetime expense or replacement.
 *
 * @param item - Lifetime expense or replacement
 * @returns Annual cost (totalBudget / cycleYears)
 */
export function lifetimeToAnnual(item: LifetimeExpense | LifetimeReplacement): Num {
	return item.totalBudget / item.cycleYears;
}

/**
 * Applies compound inflation to a base cost.
 *
 * @param baseCost - Starting annual cost
 * @param rate - Annual inflation rate (e.g. 0.02 for 2%)
 * @param yearsFromNow - Number of years to project
 * @returns Inflation-adjusted cost
 */
export function applyInflation(baseCost: Num, rate: Num, yearsFromNow: Num): Num {
	return baseCost * (1 + rate) ** yearsFromNow;
}

/**
 * Finds the inflation rate for a given category.
 *
 * @param category - Category name to look up
 * @param inflationConfig - Array of per-category inflation rates
 * @param defaultRate - Default rate if category not found
 * @returns Inflation rate for the category
 */
export function getInflationRate(
	category: Str,
	inflationConfig: readonly InflationConfig[],
	defaultRate: Num,
): Num {
	const found = inflationConfig.find((c) => c.category === category);
	return found ? found.rate : defaultRate;
}

// ── Projection Engine ─────────────────────────────────────────────────

/**
 * Projects year-by-year expenses from now until retirement.
 *
 * @param data - All finance data collections
 * @param settings - Global finance settings
 * @param inflationConfig - Per-category inflation rates
 * @param useInflation - Whether to apply inflation adjustments
 * @returns Year-by-year projection array
 */
export function projectYearlyExpenses(
	data: {
		readonly monthlyExpenses: readonly MonthlyExpense[];
		readonly lifetimeExpenses: readonly LifetimeExpense[];
		readonly lifetimeReplacements: readonly LifetimeReplacement[];
		readonly travel: readonly Travel[];
		readonly purchases: readonly Purchase[];
	},
	settings: Settings,
	inflationConfig: readonly InflationConfig[],
	useInflation: boolean = true,
): Result<readonly YearlyProjection[]> {
	const currentYear: Num = getCurrentYear();
	const retirementYear: Num = getRetirementYear(settings);
	const projections: YearlyProjection[] = [];

	// Base annual costs
	const baseMonthly: Num = data.monthlyExpenses.reduce((sum, e) => sum + monthlyToAnnual(e), 0);
	const baseLifetimeExp: Num = data.lifetimeExpenses.reduce(
		(sum, e) => sum + lifetimeToAnnual(e),
		0,
	);
	const baseLifetimeRep: Num = data.lifetimeReplacements.reduce(
		(sum, e) => sum + lifetimeToAnnual(e),
		0,
	);
	const baseTravelTotal: Num = data.travel.reduce((sum, t) => sum + t.budget, 0);

	// Inflation rates by broad category
	const housingRate: Num = getInflationRate(
		'housing',
		inflationConfig,
		settings.defaultInflationRate,
	);
	const generalRate: Num = getInflationRate(
		'general',
		inflationConfig,
		settings.defaultInflationRate,
	);
	const travelRate: Num = getInflationRate(
		'travel',
		inflationConfig,
		settings.defaultInflationRate,
	);

	for (let year: Num = currentYear; year < retirementYear; year++) {
		const yearsFromNow: Num = year - currentYear;

		const monthly: Num = useInflation
			? applyInflation(baseMonthly, housingRate, yearsFromNow)
			: baseMonthly;
		const lifetimeExp: Num = useInflation
			? applyInflation(baseLifetimeExp, generalRate, yearsFromNow)
			: baseLifetimeExp;
		const lifetimeRep: Num = useInflation
			? applyInflation(baseLifetimeRep, generalRate, yearsFromNow)
			: baseLifetimeRep;

		// Travel: spread total evenly across all years
		const travelPerYear: Num = baseTravelTotal / Math.max(retirementYear - currentYear, 1);
		const travelCost: Num = useInflation
			? applyInflation(travelPerYear, travelRate, yearsFromNow)
			: travelPerYear;

		// Purchases: one-time in the current year only
		const purchasesCost: Num =
			year === currentYear ? data.purchases.reduce((sum, p) => sum + p.amount, 0) : 0;

		const total: Num = monthly + lifetimeExp + lifetimeRep + travelCost + purchasesCost;

		projections.push({
			year,
			monthly: Math.round(monthly * 100) / 100,
			lifetimeExpenses: Math.round(lifetimeExp * 100) / 100,
			lifetimeReplacements: Math.round(lifetimeRep * 100) / 100,
			travel: Math.round(travelCost * 100) / 100,
			purchases: Math.round(purchasesCost * 100) / 100,
			total: Math.round(total * 100) / 100,
		});
	}

	return okUnchecked(projections);
}

/**
 * Calculates per-item lifetime totals over the full projection horizon.
 *
 * @param data - All finance data collections
 * @param settings - Global finance settings
 * @param inflationConfig - Per-category inflation rates
 * @returns Per-item and grand total lifetime cost summary
 */
export function calculateLifetimeTotals(
	data: {
		readonly monthlyExpenses: readonly MonthlyExpense[];
		readonly lifetimeExpenses: readonly LifetimeExpense[];
		readonly lifetimeReplacements: readonly LifetimeReplacement[];
		readonly travel: readonly Travel[];
		readonly purchases: readonly Purchase[];
	},
	settings: Settings,
	inflationConfig: readonly InflationConfig[],
): Result<LifetimeSummary> {
	const currentYear: Num = getCurrentYear();
	const retirementYear: Num = getRetirementYear(settings);
	const years: Num = Math.max(retirementYear - currentYear, 1);
	const items: LifetimeItemCost[] = [];

	const housingRate: Num = getInflationRate(
		'housing',
		inflationConfig,
		settings.defaultInflationRate,
	);
	const foodRate: Num = getInflationRate('food', inflationConfig, settings.defaultInflationRate);
	const generalRate: Num = getInflationRate(
		'general',
		inflationConfig,
		settings.defaultInflationRate,
	);
	const travelRate: Num = getInflationRate(
		'travel',
		inflationConfig,
		settings.defaultInflationRate,
	);

	// Monthly expenses
	for (const expense of data.monthlyExpenses) {
		const annual: Num = monthlyToAnnual(expense);
		const nominal: Num = annual * years;
		const rate: Num = expense.category === 'fixed' ? housingRate : foodRate;
		let inflated: Num = 0;
		for (let y: Num = 0; y < years; y++) {
			inflated += applyInflation(annual, rate, y);
		}
		items.push({
			name: expense.name,
			category: 'monthly',
			nominalTotal: Math.round(nominal * 100) / 100,
			inflatedTotal: Math.round(inflated * 100) / 100,
			annualCost: Math.round(annual * 100) / 100,
		});
	}

	// Lifetime expenses
	for (const expense of data.lifetimeExpenses) {
		const annual: Num = lifetimeToAnnual(expense);
		const nominal: Num = annual * years;
		let inflated: Num = 0;
		for (let y: Num = 0; y < years; y++) {
			inflated += applyInflation(annual, generalRate, y);
		}
		items.push({
			name: expense.name,
			category: 'lifetime-expense',
			nominalTotal: Math.round(nominal * 100) / 100,
			inflatedTotal: Math.round(inflated * 100) / 100,
			annualCost: Math.round(annual * 100) / 100,
		});
	}

	// Lifetime replacements
	for (const replacement of data.lifetimeReplacements) {
		const annual: Num = lifetimeToAnnual(replacement);
		const nominal: Num = annual * years;
		let inflated: Num = 0;
		for (let y: Num = 0; y < years; y++) {
			inflated += applyInflation(annual, generalRate, y);
		}
		items.push({
			name: replacement.name,
			category: 'lifetime-replacement',
			nominalTotal: Math.round(nominal * 100) / 100,
			inflatedTotal: Math.round(inflated * 100) / 100,
			annualCost: Math.round(annual * 100) / 100,
		});
	}

	// Travel
	for (const trip of data.travel) {
		const nominal: Num = trip.budget;
		let inflated: Num = trip.budget;
		// Apply average inflation over the middle of the horizon
		const midpoint: Num = Math.floor(years / 2);
		inflated = applyInflation(trip.budget, travelRate, midpoint);
		items.push({
			name: trip.name,
			category: 'travel',
			nominalTotal: Math.round(nominal * 100) / 100,
			inflatedTotal: Math.round(inflated * 100) / 100,
			annualCost: Math.round((nominal / years) * 100) / 100,
		});
	}

	// Purchases (one-time, no inflation)
	for (const purchase of data.purchases) {
		items.push({
			name: purchase.name,
			category: 'purchase',
			nominalTotal: purchase.amount,
			inflatedTotal: purchase.amount,
			annualCost: Math.round((purchase.amount / years) * 100) / 100,
		});
	}

	const nominalGrandTotal: Num =
		Math.round(items.reduce((sum, item) => sum + item.nominalTotal, 0) * 100) / 100;
	const inflatedGrandTotal: Num =
		Math.round(items.reduce((sum, item) => sum + item.inflatedTotal, 0) * 100) / 100;

	const projectionsResult = projectYearlyExpenses(data, settings, inflationConfig, true);
	if (!projectionsResult.ok) return projectionsResult;

	return okUnchecked({
		nominalGrandTotal,
		inflatedGrandTotal,
		items,
		projections: projectionsResult.data,
	});
}
