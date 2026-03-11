import { describe, expect, it } from 'vitest';
import { safeParse } from '@/utils/result/safe';
import {
  SettingsSchema,
  DebtItemSchema,
  IncomeSourceSchema,
  INCOME_FREQUENCIES,
  PurchaseSchema,
  PURCHASE_CATEGORIES,
  LifetimeExpenseSchema,
  LifetimeReplacementSchema,
  MonthlyExpenseSchema,
  BILLING_CYCLES,
  MONTHLY_CATEGORIES,
  TravelSchema,
  InflationConfigSchema,
} from './finances';

// ── SettingsSchema ────────────────────────────────────────────────────

describe('SettingsSchema', () => {
  const validSettings = {
    birthDate: '1989-04-03',
    retirementAge: 65,
    defaultInflationRate: 0.02,
  };

  it('accepts valid settings', () => {
    const result = safeParse(SettingsSchema, validSettings);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.birthDate).toBe('1989-04-03');
      expect(result.data.retirementAge).toBe(65);
      expect(result.data.defaultInflationRate).toBe(0.02);
    }
  });

  it('rejects missing birthDate', () => {
    const { birthDate: _, ...rest } = validSettings;
    const result = safeParse(SettingsSchema, rest);
    expect(result.ok).toBe(false);
  });

  it('rejects empty birthDate', () => {
    const result = safeParse(SettingsSchema, { ...validSettings, birthDate: '' });
    expect(result.ok).toBe(false);
  });

  it('rejects retirementAge below 1', () => {
    const result = safeParse(SettingsSchema, { ...validSettings, retirementAge: 0 });
    expect(result.ok).toBe(false);
  });

  it('rejects retirementAge above 120', () => {
    const result = safeParse(SettingsSchema, { ...validSettings, retirementAge: 121 });
    expect(result.ok).toBe(false);
  });

  it('rejects defaultInflationRate below 0', () => {
    const result = safeParse(SettingsSchema, { ...validSettings, defaultInflationRate: -0.01 });
    expect(result.ok).toBe(false);
  });

  it('rejects defaultInflationRate above 1', () => {
    const result = safeParse(SettingsSchema, { ...validSettings, defaultInflationRate: 1.01 });
    expect(result.ok).toBe(false);
  });

  it('rejects unknown keys (strictObject)', () => {
    const result = safeParse(SettingsSchema, { ...validSettings, extra: 'nope' });
    expect(result.ok).toBe(false);
  });

  it('rejects non-number retirementAge', () => {
    const result = safeParse(SettingsSchema, { ...validSettings, retirementAge: '65' });
    expect(result.ok).toBe(false);
  });

  it('accepts boundary values', () => {
    const result = safeParse(SettingsSchema, {
      birthDate: 'x',
      retirementAge: 1,
      defaultInflationRate: 0,
    });
    expect(result.ok).toBe(true);
  });

  it('accepts max boundary values', () => {
    const result = safeParse(SettingsSchema, {
      birthDate: 'x',
      retirementAge: 120,
      defaultInflationRate: 1,
    });
    expect(result.ok).toBe(true);
  });
});

// ── DebtItemSchema ────────────────────────────────────────────────────

describe('DebtItemSchema', () => {
  const validDebt = {
    id: 'debt-001',
    name: 'Tangerine LOC',
    balance: 4111.8,
    isEstimate: false,
    notes: '',
  };

  it('accepts valid debt item', () => {
    const result = safeParse(DebtItemSchema, validDebt);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe('debt-001');
      expect(result.data.name).toBe('Tangerine LOC');
      expect(result.data.balance).toBe(4111.8);
      expect(result.data.isEstimate).toBe(false);
    }
  });

  it('rejects missing id', () => {
    const { id: _, ...rest } = validDebt;
    const result = safeParse(DebtItemSchema, rest);
    expect(result.ok).toBe(false);
  });

  it('rejects empty id', () => {
    const result = safeParse(DebtItemSchema, { ...validDebt, id: '' });
    expect(result.ok).toBe(false);
  });

  it('rejects empty name', () => {
    const result = safeParse(DebtItemSchema, { ...validDebt, name: '' });
    expect(result.ok).toBe(false);
  });

  it('rejects negative balance', () => {
    const result = safeParse(DebtItemSchema, { ...validDebt, balance: -1 });
    expect(result.ok).toBe(false);
  });

  it('rejects non-boolean isEstimate', () => {
    const result = safeParse(DebtItemSchema, { ...validDebt, isEstimate: 'yes' });
    expect(result.ok).toBe(false);
  });

  it('rejects missing notes', () => {
    const { notes: _, ...rest } = validDebt;
    const result = safeParse(DebtItemSchema, rest);
    expect(result.ok).toBe(false);
  });

  it('rejects unknown keys (strictObject)', () => {
    const result = safeParse(DebtItemSchema, { ...validDebt, extra: true });
    expect(result.ok).toBe(false);
  });

  it('accepts zero balance', () => {
    const result = safeParse(DebtItemSchema, { ...validDebt, balance: 0 });
    expect(result.ok).toBe(true);
  });
});

// ── IncomeSourceSchema ────────────────────────────────────────────────

describe('IncomeSourceSchema', () => {
  const validIncome = {
    id: 'inc-001',
    name: 'EI Benefits',
    amount: 1256,
    frequency: 'biweekly' as const,
    startDate: '2026-03-06',
    endDate: '2026-10-01',
    notes: 'Employment Insurance',
  };

  it('accepts valid income source', () => {
    const result = safeParse(IncomeSourceSchema, validIncome);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe('inc-001');
      expect(result.data.frequency).toBe('biweekly');
      expect(result.data.endDate).toBe('2026-10-01');
    }
  });

  it('endDate is optional', () => {
    const { endDate: _, ...rest } = validIncome;
    const result = safeParse(IncomeSourceSchema, rest);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.endDate).toBeUndefined();
    }
  });

  it.each(INCOME_FREQUENCIES)('accepts valid frequency: %s', (freq) => {
    const result = safeParse(IncomeSourceSchema, { ...validIncome, frequency: freq });
    expect(result.ok).toBe(true);
  });

  it('rejects invalid frequency', () => {
    const result = safeParse(IncomeSourceSchema, { ...validIncome, frequency: 'weekly' });
    expect(result.ok).toBe(false);
  });

  it('rejects missing startDate', () => {
    const { startDate: _, ...rest } = validIncome;
    const result = safeParse(IncomeSourceSchema, rest);
    expect(result.ok).toBe(false);
  });

  it('rejects empty startDate', () => {
    const result = safeParse(IncomeSourceSchema, { ...validIncome, startDate: '' });
    expect(result.ok).toBe(false);
  });

  it('rejects negative amount', () => {
    const result = safeParse(IncomeSourceSchema, { ...validIncome, amount: -100 });
    expect(result.ok).toBe(false);
  });

  it('rejects unknown keys (strictObject)', () => {
    const result = safeParse(IncomeSourceSchema, { ...validIncome, extra: 'nope' });
    expect(result.ok).toBe(false);
  });
});

// ── PurchaseSchema ────────────────────────────────────────────────────

describe('PurchaseSchema', () => {
  const validPurchase = {
    id: 'pur-001',
    name: 'Amazon Purchase #1',
    amount: 4000,
    date: '2026-04-01',
    category: 'upcoming' as const,
    notes: '',
  };

  it('accepts valid purchase', () => {
    const result = safeParse(PurchaseSchema, validPurchase);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe('pur-001');
      expect(result.data.category).toBe('upcoming');
    }
  });

  it('date is optional', () => {
    const { date: _, ...rest } = validPurchase;
    const result = safeParse(PurchaseSchema, rest);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.date).toBeUndefined();
    }
  });

  it.each(PURCHASE_CATEGORIES)('accepts valid category: %s', (cat) => {
    const result = safeParse(PurchaseSchema, { ...validPurchase, category: cat });
    expect(result.ok).toBe(true);
  });

  it('rejects invalid category', () => {
    const result = safeParse(PurchaseSchema, { ...validPurchase, category: 'luxury' });
    expect(result.ok).toBe(false);
  });

  it('rejects negative amount', () => {
    const result = safeParse(PurchaseSchema, { ...validPurchase, amount: -1 });
    expect(result.ok).toBe(false);
  });

  it('rejects missing name', () => {
    const { name: _, ...rest } = validPurchase;
    const result = safeParse(PurchaseSchema, rest);
    expect(result.ok).toBe(false);
  });

  it('rejects unknown keys (strictObject)', () => {
    const result = safeParse(PurchaseSchema, { ...validPurchase, extra: true });
    expect(result.ok).toBe(false);
  });
});

// ── LifetimeExpenseSchema ─────────────────────────────────────────────

describe('LifetimeExpenseSchema', () => {
  const validLifetimeExpense = {
    id: 'life-001',
    name: "Driver's License Renewal",
    totalBudget: 375,
    cycleYears: 5,
    lastRenewal: '2024-01-15',
    nextDue: '2029-01-15',
    notes: 'BC license renewal',
  };

  it('accepts valid lifetime expense', () => {
    const result = safeParse(LifetimeExpenseSchema, validLifetimeExpense);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Driver's License Renewal");
      expect(result.data.cycleYears).toBe(5);
    }
  });

  it('lastRenewal is optional', () => {
    const { lastRenewal: _, ...rest } = validLifetimeExpense;
    const result = safeParse(LifetimeExpenseSchema, rest);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.lastRenewal).toBeUndefined();
    }
  });

  it('nextDue is optional', () => {
    const { nextDue: _, ...rest } = validLifetimeExpense;
    const result = safeParse(LifetimeExpenseSchema, rest);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.nextDue).toBeUndefined();
    }
  });

  it('rejects cycleYears below 0.1', () => {
    const result = safeParse(LifetimeExpenseSchema, {
      ...validLifetimeExpense,
      cycleYears: 0,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects negative totalBudget', () => {
    const result = safeParse(LifetimeExpenseSchema, {
      ...validLifetimeExpense,
      totalBudget: -1,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects missing id', () => {
    const { id: _, ...rest } = validLifetimeExpense;
    const result = safeParse(LifetimeExpenseSchema, rest);
    expect(result.ok).toBe(false);
  });

  it('rejects unknown keys (strictObject)', () => {
    const result = safeParse(LifetimeExpenseSchema, { ...validLifetimeExpense, extra: true });
    expect(result.ok).toBe(false);
  });
});

// ── LifetimeReplacementSchema ─────────────────────────────────────────

describe('LifetimeReplacementSchema', () => {
  const validReplacement = {
    id: 'rep-001',
    name: 'Phone',
    totalBudget: 1500,
    cycleYears: 3,
    notes: '',
  };

  it('accepts valid lifetime replacement', () => {
    const result = safeParse(LifetimeReplacementSchema, validReplacement);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe('Phone');
      expect(result.data.totalBudget).toBe(1500);
      expect(result.data.cycleYears).toBe(3);
    }
  });

  it('rejects missing name', () => {
    const { name: _, ...rest } = validReplacement;
    const result = safeParse(LifetimeReplacementSchema, rest);
    expect(result.ok).toBe(false);
  });

  it('rejects empty name', () => {
    const result = safeParse(LifetimeReplacementSchema, { ...validReplacement, name: '' });
    expect(result.ok).toBe(false);
  });

  it('rejects cycleYears below 0.1', () => {
    const result = safeParse(LifetimeReplacementSchema, {
      ...validReplacement,
      cycleYears: 0.05,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects negative totalBudget', () => {
    const result = safeParse(LifetimeReplacementSchema, {
      ...validReplacement,
      totalBudget: -10,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects non-number cycleYears', () => {
    const result = safeParse(LifetimeReplacementSchema, {
      ...validReplacement,
      cycleYears: '3',
    });
    expect(result.ok).toBe(false);
  });

  it('rejects unknown keys (strictObject)', () => {
    const result = safeParse(LifetimeReplacementSchema, { ...validReplacement, extra: true });
    expect(result.ok).toBe(false);
  });

  it('rejects missing notes', () => {
    const { notes: _, ...rest } = validReplacement;
    const result = safeParse(LifetimeReplacementSchema, rest);
    expect(result.ok).toBe(false);
  });
});

// ── MonthlyExpenseSchema ──────────────────────────────────────────────

describe('MonthlyExpenseSchema', () => {
  const validMonthly = {
    id: 'mon-001',
    name: 'Rent',
    amount: 1925,
    isEstimate: false,
    billingCycle: 'monthly' as const,
    category: 'fixed' as const,
    notes: '',
  };

  it('accepts valid monthly expense', () => {
    const result = safeParse(MonthlyExpenseSchema, validMonthly);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe('Rent');
      expect(result.data.amount).toBe(1925);
      expect(result.data.billingCycle).toBe('monthly');
      expect(result.data.category).toBe('fixed');
    }
  });

  it.each(BILLING_CYCLES)('accepts valid billingCycle: %s', (cycle) => {
    const result = safeParse(MonthlyExpenseSchema, { ...validMonthly, billingCycle: cycle });
    expect(result.ok).toBe(true);
  });

  it('rejects invalid billingCycle', () => {
    const result = safeParse(MonthlyExpenseSchema, { ...validMonthly, billingCycle: 'weekly' });
    expect(result.ok).toBe(false);
  });

  it.each(MONTHLY_CATEGORIES)('accepts valid category: %s', (cat) => {
    const result = safeParse(MonthlyExpenseSchema, { ...validMonthly, category: cat });
    expect(result.ok).toBe(true);
  });

  it('rejects invalid category', () => {
    const result = safeParse(MonthlyExpenseSchema, { ...validMonthly, category: 'variable' });
    expect(result.ok).toBe(false);
  });

  it('rejects negative amount', () => {
    const result = safeParse(MonthlyExpenseSchema, { ...validMonthly, amount: -1 });
    expect(result.ok).toBe(false);
  });

  it('rejects non-boolean isEstimate', () => {
    const result = safeParse(MonthlyExpenseSchema, { ...validMonthly, isEstimate: 1 });
    expect(result.ok).toBe(false);
  });

  it('rejects missing billingCycle', () => {
    const { billingCycle: _, ...rest } = validMonthly;
    const result = safeParse(MonthlyExpenseSchema, rest);
    expect(result.ok).toBe(false);
  });

  it('rejects unknown keys (strictObject)', () => {
    const result = safeParse(MonthlyExpenseSchema, { ...validMonthly, extra: true });
    expect(result.ok).toBe(false);
  });
});

// ── TravelSchema ──────────────────────────────────────────────────────

describe('TravelSchema', () => {
  const validTravel = {
    id: 'trv-001',
    name: 'Japan',
    budget: 4000,
    isEstimate: true,
    planned: true,
    notes: '',
  };

  it('accepts valid travel item', () => {
    const result = safeParse(TravelSchema, validTravel);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe('Japan');
      expect(result.data.budget).toBe(4000);
      expect(result.data.isEstimate).toBe(true);
      expect(result.data.planned).toBe(true);
    }
  });

  it('rejects missing name', () => {
    const { name: _, ...rest } = validTravel;
    const result = safeParse(TravelSchema, rest);
    expect(result.ok).toBe(false);
  });

  it('rejects empty name', () => {
    const result = safeParse(TravelSchema, { ...validTravel, name: '' });
    expect(result.ok).toBe(false);
  });

  it('rejects negative budget', () => {
    const result = safeParse(TravelSchema, { ...validTravel, budget: -1 });
    expect(result.ok).toBe(false);
  });

  it('rejects non-boolean planned', () => {
    const result = safeParse(TravelSchema, { ...validTravel, planned: 'yes' });
    expect(result.ok).toBe(false);
  });

  it('rejects non-boolean isEstimate', () => {
    const result = safeParse(TravelSchema, { ...validTravel, isEstimate: 0 });
    expect(result.ok).toBe(false);
  });

  it('rejects missing notes', () => {
    const { notes: _, ...rest } = validTravel;
    const result = safeParse(TravelSchema, rest);
    expect(result.ok).toBe(false);
  });

  it('rejects unknown keys (strictObject)', () => {
    const result = safeParse(TravelSchema, { ...validTravel, extra: 'nope' });
    expect(result.ok).toBe(false);
  });

  it('accepts zero budget', () => {
    const result = safeParse(TravelSchema, { ...validTravel, budget: 0 });
    expect(result.ok).toBe(true);
  });
});

// ── InflationConfigSchema ─────────────────────────────────────────────

describe('InflationConfigSchema', () => {
  const validInflation = {
    category: 'housing',
    rate: 0.03,
  };

  it('accepts valid inflation config', () => {
    const result = safeParse(InflationConfigSchema, validInflation);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.category).toBe('housing');
      expect(result.data.rate).toBe(0.03);
    }
  });

  it('rejects empty category', () => {
    const result = safeParse(InflationConfigSchema, { ...validInflation, category: '' });
    expect(result.ok).toBe(false);
  });

  it('rejects missing category', () => {
    const result = safeParse(InflationConfigSchema, { rate: 0.03 });
    expect(result.ok).toBe(false);
  });

  it('rejects rate below 0', () => {
    const result = safeParse(InflationConfigSchema, { ...validInflation, rate: -0.01 });
    expect(result.ok).toBe(false);
  });

  it('rejects rate above 1', () => {
    const result = safeParse(InflationConfigSchema, { ...validInflation, rate: 1.01 });
    expect(result.ok).toBe(false);
  });

  it('rejects non-number rate', () => {
    const result = safeParse(InflationConfigSchema, { ...validInflation, rate: '0.03' });
    expect(result.ok).toBe(false);
  });

  it('rejects unknown keys (strictObject)', () => {
    const result = safeParse(InflationConfigSchema, { ...validInflation, extra: true });
    expect(result.ok).toBe(false);
  });

  it('accepts boundary rate values', () => {
    const zeroResult = safeParse(InflationConfigSchema, { category: 'test', rate: 0 });
    expect(zeroResult.ok).toBe(true);

    const maxResult = safeParse(InflationConfigSchema, { category: 'test', rate: 1 });
    expect(maxResult.ok).toBe(true);
  });
});
