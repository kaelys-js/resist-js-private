/**
 * Barrel re-export for the masonry component — exposes the
 * Masonry Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type MasonryProps, MasonryPropsSchema } from './Masonry.svelte';

export {
  Root,
  type MasonryProps,
  MasonryPropsSchema,
  //
  Root as Masonry,
};
