/**
 * Lens manifest for the BankAccountCard component (finance
 * category) — summary card for a single bank account (balance,
 * type, last activity). Tagged for bank / account / card lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'finance',
  tags: ['bank', 'account', 'card'],
  description: 'Bank account summary card.',
};
