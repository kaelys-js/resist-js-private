/**
 * Lens manifest for the ButtonGroup component (layout category)
 * — groups related buttons with consistent spacing and optional
 * separators. Tagged for button-group / group / toolbar / actions
 * / tv-variant lookups.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'layout',
  tags: ['button-group', 'group', 'toolbar', 'actions', 'tv-variant'],
  description: 'Groups related buttons with consistent spacing and optional separators.',
  defaultLabel: '' as Str,
  childComponent: 'button' as Str,
};
