/**
 * Lens manifest for the Avatar component (display category) —
 * user avatar with image, automatic initials fallback, status
 * indicators, and badge overlay. Tagged for avatar / user /
 * profile / image / fallback / initials / status / tv-variant
 * lookups.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'display',
  tags: ['avatar', 'user', 'profile', 'image', 'fallback', 'initials', 'status', 'tv-variant'],
  description:
    'User avatar with image, automatic initials fallback, status indicators, and badge overlay.',
  defaultLabel: '' as Str,
};
