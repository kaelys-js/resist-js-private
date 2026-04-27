/**
 * Lens manifest + examples for the Breadcrumb component
 * (navigation category) — breadcrumb trail navigation with
 * separator icons; ships simple and ellipsis-collapsed examples.
 * Tagged for breadcrumb / trail / navigation / path / compound
 * lookups.
 *
 * @module
 */

import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'navigation',
  tags: ['breadcrumb', 'trail', 'navigation', 'path', 'compound'],
  description: 'Breadcrumb trail navigation with separator icons.',
};

const examples: LensExample[] = [
  {
    name: 'simple',
    title: 'Simple Path',
    description: 'Basic breadcrumb trail with links and current page.',
  },
  {
    name: 'ellipsis',
    title: 'With Ellipsis',
    description: 'Long paths collapsed with an ellipsis.',
  },
];

export default examples;
