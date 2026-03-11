import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'display',
  tags: ['shadcn', 'compound'],
  description: 'Data table with header, body, and optional footer.',
};

const examples: LensExample[] = [
  { name: 'basic', title: 'Basic Table', description: 'Simple table with header, body, and rows.' },
  { name: 'with-footer', title: 'With Footer', description: 'Table with a footer row for totals.' },
];

export default examples;
