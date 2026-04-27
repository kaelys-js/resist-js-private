/**
 * Barrel re-export for the blog-card component — exposes the
 * `BlogCard` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type BlogCardProps, BlogCardPropsSchema } from './BlogCard.svelte';

export {
  Root,
  type BlogCardProps,
  BlogCardPropsSchema,
  //
  Root as BlogCard,
};
