/**
 * Lens manifest for the Autocomplete component (form category) —
 * text input with a dropdown of filtered suggestions that update
 * as the user types. Tagged for autocomplete / search / combobox
 * / typeahead lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'form',
  tags: ['autocomplete', 'search', 'combobox', 'typeahead'],
  description:
    'A text input with a dropdown of filtered suggestions that updates as the user types.',
};
