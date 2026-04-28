/**
 * Barrel re-export for the simple-grid component — exposes
 * the SimpleGrid Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SimpleGridProps, SimpleGridPropsSchema } from './SimpleGrid.svelte';

export {
  Root,
  type SimpleGridProps,
  SimpleGridPropsSchema,
  //
  Root as SimpleGrid,
};
