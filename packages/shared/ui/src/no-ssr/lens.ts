/**
 * Lens manifest for the NoSsr component (utility category) —
 * SSR-skip wrapper. @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'utility',
  tags: ['ssr', 'client-only', 'guard'],
  description: 'Client-only rendering guard.',
};
