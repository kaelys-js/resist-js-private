/**
 * Barrel re-export for the bento-grid component — exposes the
 * `BentoGrid` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type BentoGridProps, BentoGridPropsSchema } from './BentoGrid.svelte';

export {
  Root,
  type BentoGridProps,
  BentoGridPropsSchema,
  //
  Root as BentoGrid,
};
