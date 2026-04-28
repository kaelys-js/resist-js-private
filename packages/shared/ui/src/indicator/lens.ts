/**
 * Lens manifest for the Indicator component (feedback
 * category) — corner-mounted status / count badge. Tagged for
 * indicator / badge / dot / status lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'feedback',
  tags: ['indicator', 'badge', 'dot', 'status'],
  description:
    'A small badge or dot positioned at the corner of another element to show status, count, or notification.',
};
