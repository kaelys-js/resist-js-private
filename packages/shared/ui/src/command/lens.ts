/**
 * Lens manifest + examples for the Command component (overlay
 * category) — command palette with search and keyboard
 * navigation. Ships inline and dialog examples.
 *
 * @module
 */

import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'overlay',
  tags: ['command', 'palette', 'search', 'keyboard', 'compound'],
  description: 'Command palette with search and keyboard navigation.',
};

const examples: LensExample[] = [
  {
    name: 'inline',
    title: 'Inline Command',
    description: 'A command palette rendered inline with grouped items.',
  },
  {
    name: 'dialog',
    title: 'Command Dialog',
    description: 'A command palette inside a dialog overlay.',
  },
];

export default examples;
