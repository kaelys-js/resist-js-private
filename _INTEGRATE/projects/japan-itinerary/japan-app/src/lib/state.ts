import { Preferences } from '@capacitor/preferences';
import * as v from 'valibot';
import {
  ChecklistStateSchema,
  BookingStateSchema,
  ExpenseStateSchema,
} from '../data/schemas';
import type { ChecklistState, BookingState, ExpenseState } from '../data/types';

const KEYS = {
  CHECKLIST: 'japan2026_checklist',
  BOOKINGS: 'japan2026_bookings',
  EXPENSES: 'japan2026_expenses',
} as const;

async function loadState<T>(
  key: string,
  schema: v.GenericSchema<unknown, T>,
  fallback: T,
): Promise<T> {
  try {
    const { value } = await Preferences.get({ key });
    if (!value) return fallback;
    const parsed = JSON.parse(value);
    return v.parse(schema, parsed);
  } catch {
    return fallback;
  }
}

async function saveState(key: string, data: unknown): Promise<void> {
  await Preferences.set({ key, value: JSON.stringify(data) });
}

// Checklist
export async function loadChecklist(): Promise<ChecklistState> {
  return loadState(KEYS.CHECKLIST, ChecklistStateSchema, {});
}

export async function saveChecklist(state: ChecklistState): Promise<void> {
  await saveState(KEYS.CHECKLIST, state);
}

// Bookings
export async function loadBookings(): Promise<BookingState> {
  return loadState(KEYS.BOOKINGS, BookingStateSchema, {});
}

export async function saveBookings(state: BookingState): Promise<void> {
  await saveState(KEYS.BOOKINGS, state);
}

// Expenses
export async function loadExpenses(): Promise<ExpenseState> {
  return loadState(KEYS.EXPENSES, ExpenseStateSchema, {});
}

export async function saveExpenses(state: ExpenseState): Promise<void> {
  await saveState(KEYS.EXPENSES, state);
}
