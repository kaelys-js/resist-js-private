/**
 * Lens manifest for the ExpenseCategory component (finance
 * category) — expense category card with budget vs spent
 * breakdown. Tagged for expense / category / breakdown lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'finance',
  tags: ['expense', 'category', 'breakdown'],
  description: 'Expense category breakdown.',
};
