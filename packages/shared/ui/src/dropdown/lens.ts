/**
 * Lens manifest for the Dropdown component (overlay category)
 * — generic floating menu triggered by a button click, simpler
 * than DropdownMenu and often used for single actions. Tagged
 * for dropdown / trigger / menu / floating lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'overlay',
  tags: ['dropdown', 'trigger', 'menu', 'floating'],
  description:
    'A generic floating menu triggered by a button click, distinct from DropdownMenu by being simpler and often used for single actions.',
};
