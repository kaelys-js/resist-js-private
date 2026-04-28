/**
 * Barrel re-export for the responsive-grid component —
 * exposes the ResponsiveGrid Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type ResponsiveGridProps, ResponsiveGridPropsSchema } from './ResponsiveGrid.svelte';

export {
  Root,
  type ResponsiveGridProps,
  ResponsiveGridPropsSchema,
  //
  Root as ResponsiveGrid,
};
