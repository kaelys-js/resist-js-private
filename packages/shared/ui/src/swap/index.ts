/**
 * Barrel re-export for the swap component — exposes the
 * Swap Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type SwapProps, SwapPropsSchema } from './Swap.svelte';

export {
  Root,
  type SwapProps,
  SwapPropsSchema,
  //
  Root as Swap,
};
