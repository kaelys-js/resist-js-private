/**
 * Lens manifest for the Mention component (form category) —
 * @username mention picker. @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'form',
  tags: ['mention', 'at-mention', 'autocomplete', 'tagging'],
  description:
    'A text input that triggers suggestions when typing a trigger character (e.g., @user).',
};
