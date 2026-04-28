/**
 * Barrel re-export for the item-tooltip component — exposes
 * the ItemTooltip Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ItemTooltipProps, ItemTooltipPropsSchema } from './ItemTooltip.svelte';

export {
  Root,
  type ItemTooltipProps,
  ItemTooltipPropsSchema,
  //
  Root as ItemTooltip,
};
