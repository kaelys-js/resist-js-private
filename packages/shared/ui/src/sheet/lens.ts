import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'overlay',
  tags: ['shadcn', 'compound'],
  description: 'Slide-out panel from screen edge.',
};

const examples: LensExample[] = [
  { name: 'right', title: 'Right Sheet', description: 'Slides in from the right with a form.' },
  { name: 'sides', title: 'All Sides', description: 'Sheets sliding from left, top, and bottom.' },
];

export default examples;
