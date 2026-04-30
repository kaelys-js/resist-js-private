/**
 * Lens manifest for the Transition component (animation
 * category) — enter/exit animation wrapper. @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'animation',
  tags: ['transition', 'animation', 'mount', 'enter-leave'],
  description:
    'A wrapper that applies enter/exit animations to its children when they mount/unmount or change state.',
};
