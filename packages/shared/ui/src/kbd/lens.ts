/**
 * Lens manifest for the Kbd component (typography category) —
 * keyboard shortcut indicator with platform-aware symbols.
 * @module
 */

import type { Str } from '@/schemas/common';
import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'typography',
  tags: ['keyboard', 'shortcut', 'key', 'hotkey', 'kbd', 'tv-variant'],
  description:
    'Keyboard shortcut indicator with platform-aware key symbol mapping, size variants, and grouping.',
  defaultLabel: '' as Str,
};
