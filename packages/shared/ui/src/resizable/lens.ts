import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'layout',
  tags: ['resizable', 'panel', 'split', 'drag', 'compound'],
  description: 'Resizable panel layout with drag handles.',
};

const examples: LensExample[] = [
  {
    name: 'horizontal',
    title: 'Horizontal Layout',
    description: 'Two-pane horizontal layout with a draggable handle.',
  },
  {
    name: 'nested',
    title: 'Nested Layout',
    description: 'Horizontal panes with a vertically-split right pane.',
  },
];

export default examples;
