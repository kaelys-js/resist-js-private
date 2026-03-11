/**
 * Finance data schemas.
 *
 * Defines all Valibot schemas for the personal finance dashboard data:
 * settings, debts, income sources, purchases, lifetime expenses,
 * lifetime replacements, monthly expenses, travel, and inflation config.
 *
 * All schemas use `v.strictObject()`, JSDoc on every field,
 * and `v.InferOutput` for type derivation.
 *
 * @module
 */

import * as v from 'valibot';

// ── Settings ─────────────────────────────────────────────────────────

/**
 * Schema for global finance settings.
 *
 * @example
 * ```typescript
 * const result = safeParse(SettingsSchema, {
 *     birthDate: '1989-04-03',
 *     retirementAge: 65,
 *     defaultInflationRate: 0.02,
 * });
 * ```
 */
export const SettingsSchema = v.strictObject({
  /** User's date of birth (ISO 8601 date string). */
  birthDate: v.pipe(v.string(), v.minLength(1)),
  /** Target retirement age. */
  retirementAge: v.pipe(v.number(), v.minValue(1), v.maxValue(120)),
  /** Default annual inflation rate (e.g. 0.02 for 2%). */
  defaultInflationRate: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
});

/** Global finance settings. */
export type Settings = v.InferOutput<typeof SettingsSchema>;

// ── Debt ─────────────────────────────────────────────────────────────

/**
 * Schema for a single debt item.
 *
 * @example
 * ```typescript
 * const result = safeParse(DebtItemSchema, {
 *     id: 'debt-001',
 *     name: 'Tangerine LOC',
 *     balance: 4111.80,
 *     isEstimate: false,
 *     notes: '',
 * });
 * ```
 */
export const DebtItemSchema = v.strictObject({
  /** Unique debt identifier. */
  id: v.pipe(v.string(), v.minLength(1)),
  /** Display name for the debt. */
  name: v.pipe(v.string(), v.minLength(1)),
  /** Current outstanding balance in dollars. */
  balance: v.pipe(v.number(), v.minValue(0)),
  /** Whether the balance is an estimate (true) or exact (false). */
  isEstimate: v.boolean(),
  /** Free-text notes about this debt. */
  notes: v.string(),
});

/** A single debt item. */
export type DebtItem = v.InferOutput<typeof DebtItemSchema>;

// ── Income ───────────────────────────────────────────────────────────

/** Supported income frequency values. */
export const INCOME_FREQUENCIES = ['one-time', 'biweekly', 'monthly', 'annual'] as const;

/**
 * Schema for an income source.
 *
 * @example
 * ```typescript
 * const result = safeParse(IncomeSourceSchema, {
 *     id: 'inc-001',
 *     name: 'EI Benefits',
 *     amount: 1256,
 *     frequency: 'biweekly',
 *     startDate: '2026-03-06',
 *     endDate: '2026-10-01',
 *     notes: 'Employment Insurance',
 * });
 * ```
 */
export const IncomeSourceSchema = v.strictObject({
  /** Unique income source identifier. */
  id: v.pipe(v.string(), v.minLength(1)),
  /** Display name for the income source. */
  name: v.pipe(v.string(), v.minLength(1)),
  /** Amount per occurrence in dollars. */
  amount: v.pipe(v.number(), v.minValue(0)),
  /** Payment frequency. */
  frequency: v.picklist(INCOME_FREQUENCIES),
  /** Date the income starts (ISO 8601 date string). */
  startDate: v.pipe(v.string(), v.minLength(1)),
  /** Date the income ends (ISO 8601 date string). Absent for ongoing/one-time. */
  endDate: v.optional(v.string()),
  /** Free-text notes. */
  notes: v.string(),
});

/** An income source. */
export type IncomeSource = v.InferOutput<typeof IncomeSourceSchema>;

// ── Purchases ────────────────────────────────────────────────────────

/** Supported purchase category values. */
export const PURCHASE_CATEGORIES = ['upcoming', 'planned'] as const;

/**
 * Schema for a one-time purchase.
 *
 * @example
 * ```typescript
 * const result = safeParse(PurchaseSchema, {
 *     id: 'pur-001',
 *     name: 'Amazon Purchase #1',
 *     amount: 4000,
 *     date: '',
 *     category: 'upcoming',
 *     notes: '',
 * });
 * ```
 */
export const PurchaseSchema = v.strictObject({
  /** Unique purchase identifier. */
  id: v.pipe(v.string(), v.minLength(1)),
  /** Display name for the purchase. */
  name: v.pipe(v.string(), v.minLength(1)),
  /** Purchase amount in dollars. */
  amount: v.pipe(v.number(), v.minValue(0)),
  /** Planned purchase date (ISO 8601). Empty if not scheduled. */
  date: v.optional(v.string()),
  /** Purchase category. */
  category: v.picklist(PURCHASE_CATEGORIES),
  /** Free-text notes. */
  notes: v.string(),
});

/** A one-time purchase. */
export type Purchase = v.InferOutput<typeof PurchaseSchema>;

// ── Lifetime Expenses ────────────────────────────────────────────────

/**
 * Schema for a recurring lifetime expense (license, membership, etc.).
 *
 * @example
 * ```typescript
 * const result = safeParse(LifetimeExpenseSchema, {
 *     id: 'life-001',
 *     name: "Driver's License Renewal",
 *     totalBudget: 375,
 *     cycleYears: 5,
 *     lastRenewal: '2024-01-15',
 *     nextDue: '2029-01-15',
 *     notes: 'BC license renewal',
 * });
 * ```
 */
export const LifetimeExpenseSchema = v.strictObject({
  /** Unique lifetime expense identifier. */
  id: v.pipe(v.string(), v.minLength(1)),
  /** Display name. */
  name: v.pipe(v.string(), v.minLength(1)),
  /** Total cost per renewal cycle in dollars. */
  totalBudget: v.pipe(v.number(), v.minValue(0)),
  /** Number of years per renewal cycle. */
  cycleYears: v.pipe(v.number(), v.minValue(0.1)),
  /** Date of last renewal (ISO 8601). */
  lastRenewal: v.optional(v.string()),
  /** Date of next renewal (ISO 8601). */
  nextDue: v.optional(v.string()),
  /** Free-text notes. */
  notes: v.string(),
});

/** A recurring lifetime expense. */
export type LifetimeExpense = v.InferOutput<typeof LifetimeExpenseSchema>;

// ── Lifetime Replacements ────────────────────────────────────────────

/**
 * Schema for a lifetime replacement item (phone, mattress, etc.).
 *
 * @example
 * ```typescript
 * const result = safeParse(LifetimeReplacementSchema, {
 *     id: 'rep-001',
 *     name: 'Phone',
 *     totalBudget: 1500,
 *     cycleYears: 3,
 *     notes: '',
 * });
 * ```
 */
export const LifetimeReplacementSchema = v.strictObject({
  /** Unique replacement item identifier. */
  id: v.pipe(v.string(), v.minLength(1)),
  /** Display name. */
  name: v.pipe(v.string(), v.minLength(1)),
  /** Budget per replacement cycle in dollars. */
  totalBudget: v.pipe(v.number(), v.minValue(0)),
  /** Number of years between replacements. */
  cycleYears: v.pipe(v.number(), v.minValue(0.1)),
  /** Free-text notes. */
  notes: v.string(),
});

/** A lifetime replacement item. */
export type LifetimeReplacement = v.InferOutput<typeof LifetimeReplacementSchema>;

// ── Monthly Expenses ─────────────────────────────────────────────────

/** Supported billing cycle values. */
export const BILLING_CYCLES = ['monthly', 'bimonthly'] as const;

/** Supported monthly expense category values. */
export const MONTHLY_CATEGORIES = ['fixed', 'estimated'] as const;

/**
 * Schema for a monthly expense.
 *
 * @example
 * ```typescript
 * const result = safeParse(MonthlyExpenseSchema, {
 *     id: 'mon-001',
 *     name: 'Rent',
 *     amount: 1925,
 *     isEstimate: false,
 *     billingCycle: 'monthly',
 *     category: 'fixed',
 *     notes: '',
 * });
 * ```
 */
export const MonthlyExpenseSchema = v.strictObject({
  /** Unique monthly expense identifier. */
  id: v.pipe(v.string(), v.minLength(1)),
  /** Display name. */
  name: v.pipe(v.string(), v.minLength(1)),
  /** Amount per billing cycle in dollars. */
  amount: v.pipe(v.number(), v.minValue(0)),
  /** Whether the amount is an estimate. */
  isEstimate: v.boolean(),
  /** Billing frequency. */
  billingCycle: v.picklist(BILLING_CYCLES),
  /** Expense category. */
  category: v.picklist(MONTHLY_CATEGORIES),
  /** Free-text notes. */
  notes: v.string(),
});

/** A monthly expense. */
export type MonthlyExpense = v.InferOutput<typeof MonthlyExpenseSchema>;

// ── Travel ───────────────────────────────────────────────────────────

/**
 * Schema for a travel trip/destination.
 *
 * @example
 * ```typescript
 * const result = safeParse(TravelSchema, {
 *     id: 'trv-001',
 *     name: 'Japan',
 *     budget: 4000,
 *     isEstimate: true,
 *     planned: true,
 *     notes: '',
 * });
 * ```
 */
export const TravelSchema = v.strictObject({
  /** Unique travel item identifier. */
  id: v.pipe(v.string(), v.minLength(1)),
  /** Destination or trip name. */
  name: v.pipe(v.string(), v.minLength(1)),
  /** Total trip budget in dollars. */
  budget: v.pipe(v.number(), v.minValue(0)),
  /** Whether the budget is an estimate. */
  isEstimate: v.boolean(),
  /** Whether this trip is actively planned (vs aspirational). */
  planned: v.boolean(),
  /** Free-text notes. */
  notes: v.string(),
});

/** A travel trip/destination. */
export type Travel = v.InferOutput<typeof TravelSchema>;

// ── Inflation Config ─────────────────────────────────────────────────

/**
 * Schema for a per-category inflation rate override.
 *
 * @example
 * ```typescript
 * const result = safeParse(InflationConfigSchema, {
 *     category: 'housing',
 *     rate: 0.03,
 * });
 * ```
 */
export const InflationConfigSchema = v.strictObject({
  /** Category name matching an expense type. */
  category: v.pipe(v.string(), v.minLength(1)),
  /** Annual inflation rate for this category (e.g. 0.03 for 3%). */
  rate: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
});

/** A per-category inflation rate override. */
export type InflationConfig = v.InferOutput<typeof InflationConfigSchema>;
