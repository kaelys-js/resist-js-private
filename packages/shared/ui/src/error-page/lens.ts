/**
 * Lens manifest for the ErrorPage component (feedback
 * category) — full-page error display with status code and
 * message. Tagged for error / page / status-code / fallback
 * lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'feedback',
  tags: ['error', 'page', 'status-code', 'fallback'],
  description: 'Full-page error display with status code and message.',
};
