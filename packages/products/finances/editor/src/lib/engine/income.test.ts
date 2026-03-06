import { describe, expect, it } from 'vitest';
import type { Num } from '@/schemas/common';
import type { Settings, IncomeSource, DebtItem } from '$lib/schemas/finances';
import { projectIncome, calculateNetPosition } from './income';
import { getCurrentYear, getRetirementYear } from './projections';

// ── Test fixtures ─────────────────────────────────────────────────────

const testSettings: Settings = {
	birthDate: '1989-04-03',
	retirementAge: 65,
	defaultInflationRate: 0.02,
};

const currentYear: Num = getCurrentYear();

// ── projectIncome ─────────────────────────────────────────────────────

describe('projectIncome', () => {
	it('returns ok result with projections array', () => {
		const sources: readonly IncomeSource[] = [
			{
				id: 'inc-001',
				name: 'Salary',
				amount: 5000,
				frequency: 'monthly',
				startDate: `${currentYear}-01-01`,
				notes: '',
			},
		];
		const result = projectIncome(sources, testSettings);
		expect(result.ok).toBe(true);
	});

	it('produces correct year range from current year to retirement', () => {
		const sources: readonly IncomeSource[] = [
			{
				id: 'inc-001',
				name: 'Salary',
				amount: 5000,
				frequency: 'monthly',
				startDate: `${currentYear}-01-01`,
				notes: '',
			},
		];
		const result = projectIncome(sources, testSettings);
		if (!result.ok) return;
		const retirementYear: Num = getRetirementYear(testSettings);
		expect(result.data.length).toBe(retirementYear - currentYear);
		expect(result.data[0].year).toBe(currentYear);
		expect(result.data[result.data.length - 1].year).toBe(retirementYear - 1);
	});

	it('one-time income appears only in the start year', () => {
		const sources: readonly IncomeSource[] = [
			{
				id: 'inc-001',
				name: 'Cash',
				amount: 1500,
				frequency: 'one-time',
				startDate: `${currentYear}-03-06`,
				notes: '',
			},
		];
		const result = projectIncome(sources, testSettings);
		if (!result.ok) return;

		// First year should contain the one-time income
		expect(result.data[0].total).toBe(1500);
		expect(result.data[0].sources.length).toBe(1);
		expect(result.data[0].sources[0].name).toBe('Cash');

		// Second year should have no income from this source
		if (result.data.length > 1) {
			expect(result.data[1].total).toBe(0);
			expect(result.data[1].sources.length).toBe(0);
		}
	});

	it('biweekly income maps to ~26 pay periods for a full year', () => {
		const sources: readonly IncomeSource[] = [
			{
				id: 'inc-001',
				name: 'EI Benefits',
				amount: 1000,
				frequency: 'biweekly',
				startDate: `${currentYear}-01-01`,
				notes: '',
			},
		];
		const result = projectIncome(sources, testSettings);
		if (!result.ok) return;

		// For a full year starting in January, amount * 26
		expect(result.data[0].total).toBe(26000);

		// A full middle year should also be 26000
		if (result.data.length > 1) {
			expect(result.data[1].total).toBe(26000);
		}
	});

	it('biweekly income with start and end in same year is prorated', () => {
		const startDateStr = `${currentYear}-03-01`;
		const endDateStr = `${currentYear}-09-30`;
		const sources: readonly IncomeSource[] = [
			{
				id: 'inc-001',
				name: 'EI Benefits',
				amount: 1256,
				frequency: 'biweekly',
				startDate: startDateStr,
				endDate: endDateStr,
				notes: '',
			},
		];
		const result = projectIncome(sources, testSettings);
		if (!result.ok) return;

		// Match the implementation's date parsing (new Date parses in local timezone)
		const startMonth: Num = new Date(startDateStr).getMonth();
		const endMonth: Num = new Date(endDateStr).getMonth();
		const months: Num = Math.max(endMonth - startMonth + 1, 1);
		const expectedAmount: Num = 1256 * ((months / 12) * 26);
		expect(result.data[0].total).toBeCloseTo(expectedAmount, 1);

		// Next year should have no income from this source
		if (result.data.length > 1) {
			expect(result.data[1].total).toBe(0);
		}
	});

	it('monthly income for a full year is amount * 12', () => {
		const sources: readonly IncomeSource[] = [
			{
				id: 'inc-001',
				name: 'Salary',
				amount: 5000,
				frequency: 'monthly',
				startDate: `${currentYear}-01-01`,
				notes: '',
			},
		];
		const result = projectIncome(sources, testSettings);
		if (!result.ok) return;
		expect(result.data[0].total).toBe(60000);
	});

	it('monthly income starting mid-year is prorated', () => {
		const startDateStr = `${currentYear}-07-15`;
		const sources: readonly IncomeSource[] = [
			{
				id: 'inc-001',
				name: 'Salary',
				amount: 5000,
				frequency: 'monthly',
				startDate: startDateStr,
				notes: '',
			},
		];
		const result = projectIncome(sources, testSettings);
		if (!result.ok) return;
		// Match implementation: startMonth = new Date(startDateStr).getMonth()
		const startMonth: Num = new Date(startDateStr).getMonth();
		const remainingMonths: Num = 12 - startMonth;
		expect(result.data[0].total).toBe(5000 * remainingMonths);

		// Full subsequent year
		if (result.data.length > 1) {
			expect(result.data[1].total).toBe(60000);
		}
	});

	it('annual income is the flat amount each year', () => {
		const sources: readonly IncomeSource[] = [
			{
				id: 'inc-001',
				name: 'Dividend',
				amount: 2000,
				frequency: 'annual',
				startDate: `${currentYear}-01-01`,
				notes: '',
			},
		];
		const result = projectIncome(sources, testSettings);
		if (!result.ok) return;
		expect(result.data[0].total).toBe(2000);
		if (result.data.length > 1) {
			expect(result.data[1].total).toBe(2000);
		}
	});

	it('income outside active range returns 0', () => {
		const futureYear: Num = currentYear + 5;
		// Use mid-year date to avoid timezone boundary issues
		const startDateStr = `${futureYear}-06-15`;
		const sources: readonly IncomeSource[] = [
			{
				id: 'inc-001',
				name: 'Future Job',
				amount: 8000,
				frequency: 'monthly',
				startDate: startDateStr,
				notes: '',
			},
		];
		const result = projectIncome(sources, testSettings);
		if (!result.ok) return;

		// Determine the actual start year the implementation will use
		const parsedStartYear: Num = new Date(startDateStr).getFullYear();
		const yearsUntilStart: Num = parsedStartYear - currentYear;

		// Years before the start year should have 0 income
		for (let i = 0; i < yearsUntilStart && i < result.data.length; i++) {
			expect(result.data[i].total).toBe(0);
		}

		// The start year should have income
		if (result.data.length > yearsUntilStart) {
			expect(result.data[yearsUntilStart].total).toBeGreaterThan(0);
		}
	});

	it('multiple sources aggregate correctly', () => {
		const sources: readonly IncomeSource[] = [
			{
				id: 'inc-001',
				name: 'Salary',
				amount: 5000,
				frequency: 'monthly',
				startDate: `${currentYear}-01-01`,
				notes: '',
			},
			{
				id: 'inc-002',
				name: 'Dividend',
				amount: 1000,
				frequency: 'annual',
				startDate: `${currentYear}-01-01`,
				notes: '',
			},
		];
		const result = projectIncome(sources, testSettings);
		if (!result.ok) return;
		expect(result.data[0].total).toBe(61000);
		expect(result.data[0].sources.length).toBe(2);
	});

	it('handles empty sources array', () => {
		const result = projectIncome([], testSettings);
		expect(result.ok).toBe(true);
		if (result.ok) {
			for (const year of result.data) {
				expect(year.total).toBe(0);
				expect(year.sources.length).toBe(0);
			}
		}
	});

	it('sources breakdown lists name and amount', () => {
		const sources: readonly IncomeSource[] = [
			{
				id: 'inc-001',
				name: 'Salary',
				amount: 3000,
				frequency: 'monthly',
				startDate: `${currentYear}-01-01`,
				notes: '',
			},
		];
		const result = projectIncome(sources, testSettings);
		if (!result.ok) return;
		expect(result.data[0].sources[0].name).toBe('Salary');
		expect(result.data[0].sources[0].amount).toBe(36000);
	});

	it('monthly income ending mid-year in end year is prorated', () => {
		const endYear: Num = currentYear + 2;
		const sources: readonly IncomeSource[] = [
			{
				id: 'inc-001',
				name: 'Contract',
				amount: 4000,
				frequency: 'monthly',
				startDate: `${currentYear}-01-01`,
				endDate: `${endYear}-05-15`,
				notes: '',
			},
		];
		const result = projectIncome(sources, testSettings);
		if (!result.ok) return;
		// End year (May = month 4, so endMonth + 1 = 5 months)
		const endYearIdx: Num = endYear - currentYear;
		if (result.data.length > endYearIdx) {
			expect(result.data[endYearIdx].total).toBe(4000 * 5);
		}
	});
});

// ── calculateNetPosition ─────────────────────────────────────────────

describe('calculateNetPosition', () => {
	const testDebts: readonly DebtItem[] = [
		{ id: 'debt-001', name: 'Credit Card', balance: 5000, isEstimate: false, notes: '' },
		{ id: 'debt-002', name: 'Loan', balance: 10000, isEstimate: false, notes: '' },
	];

	const testAssets: readonly IncomeSource[] = [
		{
			id: 'inc-001',
			name: 'Savings',
			amount: 20000,
			frequency: 'one-time',
			startDate: `${currentYear}-01-01`,
			notes: '',
		},
		{
			id: 'inc-002',
			name: 'Investments',
			amount: 30000,
			frequency: 'one-time',
			startDate: `${currentYear}-01-01`,
			notes: '',
		},
	];

	it('returns ok result', () => {
		const result = calculateNetPosition(100000, 80000, testDebts, testAssets);
		expect(result.ok).toBe(true);
	});

	it('calculates total debt correctly', () => {
		const result = calculateNetPosition(100000, 80000, testDebts, testAssets);
		if (!result.ok) return;
		expect(result.data.totalDebt).toBe(15000);
	});

	it('calculates total assets correctly', () => {
		const result = calculateNetPosition(100000, 80000, testDebts, testAssets);
		if (!result.ok) return;
		expect(result.data.totalAssets).toBe(50000);
	});

	it('calculates net worth as assets minus debt', () => {
		const result = calculateNetPosition(100000, 80000, testDebts, testAssets);
		if (!result.ok) return;
		expect(result.data.netWorth).toBe(35000);
	});

	it('calculates net position as assets + income - debt - expenses', () => {
		const result = calculateNetPosition(100000, 80000, testDebts, testAssets);
		if (!result.ok) return;
		// 50000 + 100000 - 15000 - 80000 = 55000
		expect(result.data.netPosition).toBe(55000);
	});

	it('stores income and expenses in result', () => {
		const result = calculateNetPosition(100000, 80000, testDebts, testAssets);
		if (!result.ok) return;
		expect(result.data.totalIncome).toBe(100000);
		expect(result.data.totalExpenses).toBe(80000);
	});

	it('handles zero debts', () => {
		const result = calculateNetPosition(50000, 40000, [], testAssets);
		if (!result.ok) return;
		expect(result.data.totalDebt).toBe(0);
		expect(result.data.netWorth).toBe(50000);
		expect(result.data.netPosition).toBe(60000);
	});

	it('handles zero assets', () => {
		const result = calculateNetPosition(50000, 40000, testDebts, []);
		if (!result.ok) return;
		expect(result.data.totalAssets).toBe(0);
		expect(result.data.netWorth).toBe(-15000);
		expect(result.data.netPosition).toBe(-5000);
	});

	it('handles scenario where expenses exceed income', () => {
		const result = calculateNetPosition(30000, 100000, testDebts, testAssets);
		if (!result.ok) return;
		// 50000 + 30000 - 15000 - 100000 = -35000
		expect(result.data.netPosition).toBe(-35000);
	});

	it('rounds values to 2 decimal places', () => {
		const debts: readonly DebtItem[] = [
			{ id: 'd-1', name: 'Card', balance: 1234.56, isEstimate: false, notes: '' },
		];
		const assets: readonly IncomeSource[] = [
			{
				id: 'a-1',
				name: 'Cash',
				amount: 5678.12,
				frequency: 'one-time',
				startDate: `${currentYear}-06-15`,
				notes: '',
			},
		];
		const result = calculateNetPosition(10000, 5000, debts, assets);
		if (!result.ok) return;
		expect(result.data.totalDebt).toBe(1234.56);
		expect(result.data.totalAssets).toBe(5678.12);
		expect(result.data.netWorth).toBe(4443.56);
		expect(result.data.totalIncome).toBe(10000);
		expect(result.data.totalExpenses).toBe(5000);
		expect(result.data.netPosition).toBe(9443.56);
	});
});
