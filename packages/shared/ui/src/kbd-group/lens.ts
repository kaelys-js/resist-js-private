/**
 * Lens manifest for the KbdGroup component (typography
 * category) — multi-key keyboard shortcut group. @module
 */

import type { Str } from '@/schemas/common';
import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'typography',
  tags: ['keyboard', 'shortcut', 'group', 'key-combo', 'kbd'],
  description: 'Groups multiple Kbd components with a separator between them.',
  defaultLabel: '' as Str,
  childComponent: 'kbd' as Str,
};
