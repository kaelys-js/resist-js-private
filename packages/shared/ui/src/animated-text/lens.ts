/**
 * Lens manifest for the AnimatedText component (animation
 * category) — text with effects such as typewriter, word-by-word
 * reveal, gradient shimmer, or morphing between values. Tagged
 * for animated / text / typing / reveal lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'animation',
  tags: ['animated', 'text', 'typing', 'reveal'],
  description:
    'Text with animated effects such as typewriter, word-by-word reveal, gradient shimmer, or morphing between values.',
};
