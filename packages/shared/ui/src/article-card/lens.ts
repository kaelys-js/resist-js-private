/**
 * Lens manifest for the ArticleCard component (content category)
 * — blog / article summary card with title, excerpt, and meta.
 * Tagged for article / card / blog / post lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'content',
  tags: ['article', 'card', 'blog', 'post'],
  description: 'Article summary card.',
};
