/**
 * Barrel re-export for the column-layout component — exposes
 * the `ColumnLayout` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ColumnLayoutProps, ColumnLayoutPropsSchema } from './ColumnLayout.svelte';

export {
  Root,
  type ColumnLayoutProps,
  ColumnLayoutPropsSchema,
  //
  Root as ColumnLayout,
};
