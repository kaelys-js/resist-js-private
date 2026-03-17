import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'overlay',
  tags: ['toast', 'notification', 'snackbar', 'non-blocking'],
  description: 'Toast notification system for brief, non-intrusive messages.',
};

const examples: LensExample[] = [
  {
    name: 'basic',
    title: 'Basic Toasts',
    description: 'Default, success, and error toast variants triggered by buttons.',
  },
];

export default examples;
