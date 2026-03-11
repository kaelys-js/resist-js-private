import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'display',
  tags: ['empty', 'placeholder', 'no-data', 'illustration'],
  description: 'Empty state placeholder with optional illustration, title, and description.',
};

const examples: LensExample[] = [
  {
    name: 'basic',
    title: 'Basic Empty State',
    description: 'An empty state with icon, title, and description.',
  },
];

export default examples;
