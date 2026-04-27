/**
 * Barrel re-export for the cross-sell component — exposes the
 * `CrossSell` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type CrossSellProps, CrossSellPropsSchema } from './CrossSell.svelte';

export {
  Root,
  type CrossSellProps,
  CrossSellPropsSchema,
  //
  Root as CrossSell,
};
