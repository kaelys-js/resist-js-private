import { describe, expect, it, vi } from 'vitest';
import type { Num } from '@/schemas/common';
import type {
	Settings,
	MonthlyExpense,
	LifetimeExpense,
	LifetimeReplacement,
	Travel,
	Purchase,
	InflationConfig,
} from '$lib/schemas/finances';
import {
	monthlyToAnnual,
	lifetimeToAnnual,
	applyInflation,
	getInflationRate,
	getRetirementYear,
	getCurrentYear,
	projectYearlyExpenses,
	calculateLifetimeTotals,
} from './projections';

// ── Test fixtures ─────────────────────────────────────────────────────

const testSettings: Settings = {
	birthDate: '1989-04-03',
	retirementAge: 65,
	defaultInflationRate: 0.02,
};

const testInflationConfig: readonly InflationConfig[] = [
	{ category: 'housing', rate: 0.03 },
	{ category: 'food', rate: 0.03 },
	{ category: 'general', rate: 0.02 },
	{ category: 'travel', rate: 0.03 },
];

const testMonthlyExpenses: readonly MonthlyExpense[] = [
	{
		id: 'mon-001',
		name: 'Rent',
		amount: 1000,
		isEstimate: false,
		billingCycle: 'monthly',
		category: 'fixed',
		notes: '',
	},
	{
		id: 'mon-002',
		name: 'Hydro',
		amount: 60,
		isEstimate: false,
		billingCycle: 'bimonthly',
		category: 'fixed',
		notes: '',
	},
];

const testLifetimeExpenses: readonly LifetimeExpense[] = [
	{
		id: 'life-001',
		name: "Driver's License",
		totalBudget: 500,
		cycleYears: 5,
		notes: '',
	},
];

const testLifetimeReplacements: readonly LifetimeReplacement[] = [
	{
		id: 'rep-001',
		name: 'Phone',
		totalBudget: 1500,
		cycleYears: 3,
		notes: '',
	},
];

const testTravel: readonly Travel[] = [
	{
		id: 'trv-001',
		name: 'Japan',
		budget: 4000,
		isEstimate: true,
		planned: true,
		notes: '',
	},
];

const testPurchases: readonly Purchase[] = [
	{
		id: 'pur-001',
		name: 'Laptop',
		amount: 2000,
		category: 'upcoming',
		notes: '',
	},
];

const testData = {
	monthlyExpenses: testMonthlyExpenses,
	lifetimeExpenses: testLifetimeExpenses,
	lifetimeReplacements: testLifetimeReplacements,
	travel: testTravel,
	purchases: testPurchases,
};

// ── monthlyToAnnual ───────────────────────────────────────────────────

describe('monthlyToAnnual', () => {
	it('calculates annual cost for monthly billing', () => {
		const expense: MonthlyExpense = {
			id: 'mon-001',
			name: 'Rent',
			amount: 1000,
			isEstimate: false,
			billingCycle: 'monthly',
			category: 'fixed',
			notes: '',
		};
		expect(monthlyToAnnual(expense)).toBe(12000);
	});

	it('calculates annual cost for bimonthly billing', () => {
		const expense: MonthlyExpense = {
			id: 'mon-002',
			name: 'Hydro',
			amount: 60,
			isEstimate: false,
			billingCycle: 'bimonthly',
			category: 'fixed',
			notes: '',
		};
		expect(monthlyToAnnual(expense)).toBe(360);
	});

	it('handles zero amount', () => {
		const expense: MonthlyExpense = {
			id: 'mon-003',
			name: 'Free',
			amount: 0,
			isEstimate: false,
			billingCycle: 'monthly',
			category: 'fixed',
			notes: '',
		};
		expect(monthlyToAnnual(expense)).toBe(0);
	});
});

// ── lifetimeToAnnual ──────────────────────────────────────────────────

describe('lifetimeToAnnual', () => {
	it('calculates annual cost for a 5-year cycle', () => {
		const item: LifetimeExpense = {
			id: 'life-001',
			name: "Driver's License",
			totalBudget: 500,
			cycleYears: 5,
			notes: '',
		};
		expect(lifetimeToAnnual(item)).toBe(100);
	});

	it('calculates annual cost for a 1-year cycle', () => {
		const item: LifetimeReplacement = {
			id: 'rep-001',
			name: 'Membership',
			totalBudget: 700,
			cycleYears: 1,
			notes: '',
		};
		expect(lifetimeToAnnual(item)).toBe(700);
	});

	it('calculates annual cost for a 3-year cycle', () => {
		const item: LifetimeReplacement = {
			id: 'rep-002',
			name: 'Phone',
			totalBudget: 1500,
			cycleYears: 3,
			notes: '',
		};
		expect(lifetimeToAnnual(item)).toBe(500);
	});

	it('handles fractional cycle years', () => {
		const item: LifetimeExpense = {
			id: 'life-002',
			name: 'Quarterly Fee',
			totalBudget: 100,
			cycleYears: 0.25,
			notes: '',
		};
		expect(lifetimeToAnnual(item)).toBe(400);
	});
});

// ── applyInflation ────────────────────────────────────────────────────

describe('applyInflation', () => {
	it('returns base cost when yearsFromNow is 0', () => {
		expect(applyInflation(100, 0.02, 0)).toBe(100);
	});

	it('applies 2% inflation for 1 year', () => {
		expect(applyInflation(100, 0.02, 1)).toBeCloseTo(102, 2);
	});

	it('applies 2% compound inflation for 10 years', () => {
		// $100 * (1.02)^10 = $121.899...
		expect(applyInflation(100, 0.02, 10)).toBeCloseTo(121.9, 1);
	});

	it('applies 0% inflation (no change)', () => {
		expect(applyInflation(500, 0, 20)).toBe(500);
	});

	it('applies 5% inflation for 5 years', () => {
		// $1000 * (1.05)^5 = $1276.28...
		expect(applyInflation(1000, 0.05, 5)).toBeCloseTo(1276.28, 1);
	});

	it('handles zero base cost', () => {
		expect(applyInflation(0, 0.1, 50)).toBe(0);
	});
});

// ── getInflationRate ──────────────────────────────────────────────────

describe('getInflationRate', () => {
	const config: readonly InflationConfig[] = [
		{ category: 'housing', rate: 0.03 },
		{ category: 'food', rate: 0.04 },
		{ category: 'general', rate: 0.02 },
	];

	it('returns rate for a found category', () => {
		expect(getInflationRate('housing', config, 0.02)).toBe(0.03);
	});

	it('returns rate for another found category', () => {
		expect(getInflationRate('food', config, 0.02)).toBe(0.04);
	});

	it('returns default rate for a not-found category', () => {
		expect(getInflationRate('entertainment', config, 0.05)).toBe(0.05);
	});

	it('returns default rate for empty config', () => {
		expect(getInflationRate('housing', [], 0.02)).toBe(0.02);
	});
});

// ── getRetirementYear ─────────────────────────────────────────────────

describe('getRetirementYear', () => {
	it('calculates retirement year from birthDate and retirementAge', () => {
		const result = getRetirementYear(testSettings);
		// 1989 + 65 = 2054
		expect(result).toBe(2054);
	});

	it('handles different birth years', () => {
		// Use mid-year date to avoid timezone boundary issues with Date parsing
		const settings: Settings = {
			birthDate: '2000-06-15',
			retirementAge: 60,
			defaultInflationRate: 0.02,
		};
		expect(getRetirementYear(settings)).toBe(2060);
	});
});

// ── getCurrentYear ────────────────────────────────────────────────────

describe('getCurrentYear', () => {
	it('returns the current calendar year', () => {
		const year = getCurrentYear();
		expect(year).toBe(new Date().getFullYear());
	});
});

// ── projectYearlyExpenses ─────────────────────────────────────────────

describe('projectYearlyExpenses', () => {
	it('returns ok result with projections array', () => {
		const result = projectYearlyExpenses(testData, testSettings, testInflationConfig);
		expect(result.ok).toBe(true);
	});

	it('produces correct year range from current year to retirement', () => {
		const result = projectYearlyExpenses(testData, testSettings, testInflationConfig);
		if (!result.ok) return;
		const currentYear: Num = getCurrentYear();
		const retirementYear: Num = getRetirementYear(testSettings);
		expect(result.data.length).toBe(retirementYear - currentYear);
		expect(result.data[0].year).toBe(currentYear);
		expect(result.data[result.data.length - 1].year).toBe(retirementYear - 1);
	});

	it('includes purchases only in the current year', () => {
		const result = projectYearlyExpenses(testData, testSettings, testInflationConfig);
		if (!result.ok) return;
		// First year should have purchases
		expect(result.data[0].purchases).toBe(2000);
		// Second year should have zero purchases
		if (result.data.length > 1) {
			expect(result.data[1].purchases).toBe(0);
		}
	});

	it('each projection has all required fields', () => {
		const result = projectYearlyExpenses(testData, testSettings, testInflationConfig);
		if (!result.ok) return;
		for (const proj of result.data) {
			expect(proj).toHaveProperty('year');
			expect(proj).toHaveProperty('monthly');
			expect(proj).toHaveProperty('lifetimeExpenses');
			expect(proj).toHaveProperty('lifetimeReplacements');
			expect(proj).toHaveProperty('travel');
			expect(proj).toHaveProperty('purchases');
			expect(proj).toHaveProperty('total');
		}
	});

	it('total equals sum of all components', () => {
		const result = projectYearlyExpenses(testData, testSettings, testInflationConfig);
		if (!result.ok) return;
		for (const proj of result.data) {
			const sum =
				proj.monthly +
				proj.lifetimeExpenses +
				proj.lifetimeReplacements +
				proj.travel +
				proj.purchases;
			expect(proj.total).toBeCloseTo(sum, 1);
		}
	});

	it('without inflation, base costs remain constant', () => {
		const result = projectYearlyExpenses(testData, testSettings, testInflationConfig, false);
		if (!result.ok) return;
		// Monthly base: 1000*12 + 60*6 = 12360
		const expectedMonthly = 12360;
		for (const proj of result.data) {
			expect(proj.monthly).toBe(expectedMonthly);
		}
	});

	it('with inflation, costs increase over time', () => {
		const result = projectYearlyExpenses(testData, testSettings, testInflationConfig, true);
		if (!result.ok) return;
		if (result.data.length > 1) {
			expect(result.data[1].monthly).toBeGreaterThan(result.data[0].monthly);
		}
	});

	it('handles empty data collections', () => {
		const emptyData = {
			monthlyExpenses: [] as MonthlyExpense[],
			lifetimeExpenses: [] as LifetimeExpense[],
			lifetimeReplacements: [] as LifetimeReplacement[],
			travel: [] as Travel[],
			purchases: [] as Purchase[],
		};
		const result = projectYearlyExpenses(emptyData, testSettings, testInflationConfig);
		expect(result.ok).toBe(true);
		if (result.ok) {
			for (const proj of result.data) {
				expect(proj.total).toBe(0);
			}
		}
	});
});

// ── calculateLifetimeTotals ───────────────────────────────────────────

describe('calculateLifetimeTotals', () => {
	it('returns ok result with LifetimeSummary', () => {
		const result = calculateLifetimeTotals(testData, testSettings, testInflationConfig);
		expect(result.ok).toBe(true);
	});

	it('returns valid LifetimeSummary shape', () => {
		const result = calculateLifetimeTotals(testData, testSettings, testInflationConfig);
		if (!result.ok) return;
		expect(result.data).toHaveProperty('nominalGrandTotal');
		expect(result.data).toHaveProperty('inflatedGrandTotal');
		expect(result.data).toHaveProperty('items');
		expect(result.data).toHaveProperty('projections');
		expect(typeof result.data.nominalGrandTotal).toBe('number');
		expect(typeof result.data.inflatedGrandTotal).toBe('number');
		expect(Array.isArray(result.data.items)).toBe(true);
		expect(Array.isArray(result.data.projections)).toBe(true);
	});

	it('inflated grand total is greater than or equal to nominal', () => {
		const result = calculateLifetimeTotals(testData, testSettings, testInflationConfig);
		if (!result.ok) return;
		expect(result.data.inflatedGrandTotal).toBeGreaterThanOrEqual(result.data.nominalGrandTotal);
	});

	it('produces items for each data entry', () => {
		const result = calculateLifetimeTotals(testData, testSettings, testInflationConfig);
		if (!result.ok) return;
		// 2 monthly + 1 lifetime expense + 1 lifetime replacement + 1 travel + 1 purchase = 6
		expect(result.data.items.length).toBe(6);
	});

	it('categorizes items correctly', () => {
		const result = calculateLifetimeTotals(testData, testSettings, testInflationConfig);
		if (!result.ok) return;
		const categories = result.data.items.map((i) => i.category);
		expect(categories).toContain('monthly');
		expect(categories).toContain('lifetime-expense');
		expect(categories).toContain('lifetime-replacement');
		expect(categories).toContain('travel');
		expect(categories).toContain('purchase');
	});

	it('purchase items have no inflation adjustment', () => {
		const result = calculateLifetimeTotals(testData, testSettings, testInflationConfig);
		if (!result.ok) return;
		const purchaseItem = result.data.items.find((i) => i.category === 'purchase');
		expect(purchaseItem).toBeDefined();
		if (purchaseItem) {
			expect(purchaseItem.nominalTotal).toBe(purchaseItem.inflatedTotal);
		}
	});

	it('nominal grand total equals sum of item nominals', () => {
		const result = calculateLifetimeTotals(testData, testSettings, testInflationConfig);
		if (!result.ok) return;
		const sumNominal = result.data.items.reduce((sum, item) => sum + item.nominalTotal, 0);
		expect(result.data.nominalGrandTotal).toBeCloseTo(sumNominal, 1);
	});

	it('includes projections matching projectYearlyExpenses', () => {
		const result = calculateLifetimeTotals(testData, testSettings, testInflationConfig);
		if (!result.ok) return;
		const currentYear: Num = getCurrentYear();
		const retirementYear: Num = getRetirementYear(testSettings);
		expect(result.data.projections.length).toBe(retirementYear - currentYear);
	});
});
