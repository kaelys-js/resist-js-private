import type { Str } from '@/schemas/common';
import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'display',
  tags: ['avatar', 'group', 'stack', 'overflow-count', 'tv-variant'],
  description: 'Stacks multiple avatars with overlap spacing, max count, and "+N" overflow badge.',
  defaultLabel: '' as Str,
  childComponent: 'avatar' as Str,
};
