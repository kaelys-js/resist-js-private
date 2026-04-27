/**
 * Lens manifest for the AlertDialog component (overlay category)
 * — modal dialog that interrupts the user with important content
 * requiring acknowledgment. Tagged for dialog / modal / confirm /
 * alert lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'overlay',
  tags: ['dialog', 'modal', 'confirm', 'alert'],
  description:
    'Modal dialog that interrupts the user with important content requiring acknowledgment.',
};
