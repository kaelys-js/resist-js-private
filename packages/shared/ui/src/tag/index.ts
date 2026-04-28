/**
 * Barrel re-export for the tag component — exposes the Tag
 * Svelte component, its props type, and the props schema
 * under stable public names.
 *
 * @module
 */

import Root, { type TagProps, TagPropsSchema } from './Tag.svelte';

export {
  Root,
  type TagProps,
  TagPropsSchema,
  //
  Root as Tag,
};
