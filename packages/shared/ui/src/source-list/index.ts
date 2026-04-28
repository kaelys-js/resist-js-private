/**
 * Barrel re-export for the source-list component — exposes
 * the SourceList Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SourceListProps, SourceListPropsSchema } from './SourceList.svelte';

export {
  Root,
  type SourceListProps,
  SourceListPropsSchema,
  //
  Root as SourceList,
};
