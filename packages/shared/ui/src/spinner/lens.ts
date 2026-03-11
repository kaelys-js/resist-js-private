import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'display',
  tags: ['spinner', 'loading', 'progress', 'indicator'],
  description: 'Animated loading spinner with configurable size.',
};

const examples: LensExample[] = [
  { name: 'basic', title: 'Sizes', description: 'Spinner in various sizes using utility classes.' },
  { name: 'with-text', title: 'With Text', description: 'Spinner paired with a loading message.' },
];

export default examples;
