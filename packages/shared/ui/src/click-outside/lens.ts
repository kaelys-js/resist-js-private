/**
 * Lens manifest for the ClickOutside component (utility category)
 * — detector wrapper that emits when clicks land outside the
 * wrapped element. Tagged for click-outside / dismiss / detector
 * lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'utility',
  tags: ['click-outside', 'dismiss', 'detector'],
  description: 'Detect clicks outside element.',
};
