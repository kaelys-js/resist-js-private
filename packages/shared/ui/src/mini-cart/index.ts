/**
 * Barrel re-export for the mini-cart component — exposes the
 * MiniCart Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type MiniCartProps, MiniCartPropsSchema } from './MiniCart.svelte';

export {
  Root,
  type MiniCartProps,
  MiniCartPropsSchema,
  //
  Root as MiniCart,
};
