/**
 * Lens manifest for the PageFadeIn component (animation
 * category) — page-content fade-in wrapper. @module
 */

import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'animation',
  tags: ['fade-in', 'entrance', 'page-transition', 'mount'],
  description: 'Page-level fade-in entrance animation.',
};

const examples: LensExample[] = [
  {
    name: 'basic',
    title: 'Basic Fade In',
    description: 'A card that fades in on mount.',
  },
];

export default examples;
