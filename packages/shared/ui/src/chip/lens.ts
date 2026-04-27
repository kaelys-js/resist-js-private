/**
 * Lens manifest for the Chip component (display category) —
 * compact removable element representing an input, attribute, or
 * action; similar to a tag but with interaction capabilities.
 * Tagged for chip / tag / token / removable lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'display',
  tags: ['chip', 'tag', 'token', 'removable'],
  description:
    'A compact element representing an input, attribute, or action. Similar to a tag but often with interaction capabilities.',
};
