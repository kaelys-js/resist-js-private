/**
 * Lens manifest for the Directions component (maps category) —
 * turn-by-turn directions list. Tagged for directions /
 * turn-by-turn / navigation lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'maps',
  tags: ['directions', 'turn-by-turn', 'navigation'],
  description: 'Turn-by-turn directions list.',
};
