/**
 * Barrel re-export for the article-card component — exposes the
 * `ArticleCard` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ArticleCardProps, ArticleCardPropsSchema } from './ArticleCard.svelte';

export {
  Root,
  type ArticleCardProps,
  ArticleCardPropsSchema,
  //
  Root as ArticleCard,
};
