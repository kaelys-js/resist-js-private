import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'layout',
  tags: ['island', 'interactive', 'hydration', 'isolation', 'container'],
  description: 'Isolates interactive content within static pages for independent hydration.',
  status: 'placeholder',
};

export { default as IslandDemo } from './IslandDemo.svelte';

export const examples = [
  {
    title: 'Basic Island',
    component: 'IslandDemo',
  },
];
