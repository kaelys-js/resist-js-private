/**
 * Lens manifest for the Inplace component (form category) —
 * display / edit toggle for in-place content. Tagged for
 * inplace / inline-edit / toggle / click-to-edit lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'form',
  tags: ['inplace', 'inline-edit', 'toggle', 'click-to-edit'],
  description:
    'A component that toggles between a display view and an editable/interactive content view.',
};
