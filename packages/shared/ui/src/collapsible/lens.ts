import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'disclosure',
  tags: ['collapsible', 'expand', 'toggle', 'disclosure', 'compound'],
  description: 'Expandable and collapsible content section.',
};

const examples: LensExample[] = [
  { name: 'basic', title: 'Basic Collapsible', description: 'Expandable section starting closed.' },
  {
    name: 'open',
    title: 'Open by Default',
    description: 'Collapsible starting in the expanded state.',
  },
];

export default examples;
