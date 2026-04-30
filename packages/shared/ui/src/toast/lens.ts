/**
 * Lens manifest for the Toast component (feedback category)
 * — auto-dismissing brief notification. @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'feedback',
  tags: ['toast', 'notification', 'popup', 'temporary'],
  description:
    'A brief, auto-dismissing notification that appears temporarily to provide feedback.',
};
