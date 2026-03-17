import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'overlay',
  tags: ['dialog', 'modal', 'popup', 'window', 'compound'],
  description: 'Modal dialog window with backdrop overlay.',
};

const examples: LensExample[] = [
  {
    name: 'basic',
    title: 'Basic Dialog',
    description: 'A simple dialog with title, description, and close button.',
  },
  {
    name: 'with-form',
    title: 'Form Dialog',
    description: 'A dialog containing a form with input fields.',
  },
];

export default examples;
