/**
 * Lens manifest + examples for the Card component (layout
 * category) — content card container with header, content, and
 * footer. Ships basic and with-action examples. Tagged for card /
 * container / content / surface / compound lookups.
 *
 * @module
 */

import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'layout',
  tags: ['card', 'container', 'content', 'surface', 'compound'],
  description: 'Content card container with header, content, and footer.',
};

const examples: LensExample[] = [
  { name: 'basic', title: 'Basic Card', description: 'Card with header, content, and footer.' },
  { name: 'with-action', title: 'With Action', description: 'Card header with an action slot.' },
];

export default examples;
