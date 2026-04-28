/**
 * Lens manifest for the Editable component (form category) —
 * inline text that turns into an input on interaction for
 * in-place editing. Tagged for editable / inline-edit / text /
 * click-to-edit lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'form',
  tags: ['editable', 'inline-edit', 'text', 'click-to-edit'],
  description:
    'An inline text display that transforms into an input field on interaction for in-place editing.',
};
