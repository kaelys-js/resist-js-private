import { describe, expect, it } from 'vitest';
import { readCollection, readSingleton } from './finance-service';
import {
	SettingsSchema,
	DebtItemSchema,
	IncomeSourceSchema,
	PurchaseSchema,
	LifetimeExpenseSchema,
	LifetimeReplacementSchema,
	MonthlyExpenseSchema,
	TravelSchema,
	InflationConfigSchema,
} from '$lib/schemas/finances';
import * as v from 'valibot';

// ── readSingleton ─────────────────────────────────────────────────────

describe('readSingleton', () => {
	it('reads and validates settings.json', async () => {
		const result = await readSingleton('settings.json', SettingsSchema);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.birthDate).toBe('1989-04-03');
			expect(result.data.retirementAge).toBe(65);
			expect(result.data.defaultInflationRate).toBe(0.02);
		}
	});

	it('returns error for non-existent file', async () => {
		const result = await readSingleton('does-not-exist.json', SettingsSchema);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBeDefined();
		}
	});

	it('returns error when data fails validation', async () => {
		// Use a schema that will not match the settings shape
		const StrictNumSchema = v.strictObject({ value: v.number() });
		const result = await readSingleton('settings.json', StrictNumSchema);
		expect(result.ok).toBe(false);
	});
});

// ── readCollection ────────────────────────────────────────────────────

describe('readCollection', () => {
	it('reads and validates debts.json', async () => {
		const result = await readCollection('debts.json', DebtItemSchema);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.length).toBe(8);
			expect(result.data[0].id).toBe('debt-001');
			expect(result.data[0].name).toBe('Afterpay');
		}
	});

	it('reads and validates income.json', async () => {
		const result = await readCollection('income.json', IncomeSourceSchema);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.length).toBe(5);
			expect(result.data[0].frequency).toBe('one-time');
			expect(result.data[4].frequency).toBe('biweekly');
		}
	});

	it('reads and validates purchases.json', async () => {
		const result = await readCollection('purchases.json', PurchaseSchema);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.length).toBe(3);
			expect(result.data[0].category).toBe('upcoming');
			expect(result.data[2].category).toBe('planned');
		}
	});

	it('reads and validates lifetime-expenses.json', async () => {
		const result = await readCollection('lifetime-expenses.json', LifetimeExpenseSchema);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.length).toBe(4);
			expect(result.data[0].name).toBe("Driver's License Renewal");
			expect(result.data[0].cycleYears).toBe(5);
		}
	});

	it('reads and validates lifetime-replacements.json', async () => {
		const result = await readCollection('lifetime-replacements.json', LifetimeReplacementSchema);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.length).toBe(17);
			expect(result.data[0].name).toBe('Phone');
			expect(result.data[0].totalBudget).toBe(1500);
		}
	});

	it('reads and validates monthly-expenses.json', async () => {
		const result = await readCollection('monthly-expenses.json', MonthlyExpenseSchema);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.length).toBe(14);
			expect(result.data[0].name).toBe('Rent');
			expect(result.data[0].billingCycle).toBe('monthly');
			expect(result.data[3].billingCycle).toBe('bimonthly');
		}
	});

	it('reads and validates travel.json', async () => {
		const result = await readCollection('travel.json', TravelSchema);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.length).toBe(15);
			expect(result.data[0].name).toBe('Thailand');
		}
	});

	it('reads and validates inflation.json', async () => {
		const result = await readCollection('inflation.json', InflationConfigSchema);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.length).toBe(11);
			expect(result.data[0].category).toBe('housing');
			expect(result.data[0].rate).toBe(0.03);
		}
	});

	it('returns error for non-existent file', async () => {
		const result = await readCollection('nonexistent.json', DebtItemSchema);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBeDefined();
		}
	});

	it('returns error when collection items fail validation', async () => {
		// Try to parse debts.json as IncomeSourceSchema (schema mismatch)
		const result = await readCollection('debts.json', IncomeSourceSchema);
		expect(result.ok).toBe(false);
	});
});
