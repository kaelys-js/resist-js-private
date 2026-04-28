/**
 * Lens manifest for the FormField component (form category) —
 * label / help-text / validation wrapper for form inputs.
 * Tagged for form / field / label / validation lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'form',
  tags: ['form', 'field', 'label', 'validation'],
  description:
    'A wrapper component that associates a label, help text, and validation error message with a form input.',
};
