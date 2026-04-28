/**
 * Barrel re-export for the shopping-cart component — exposes
 * the ShoppingCart Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ShoppingCartProps, ShoppingCartPropsSchema } from './ShoppingCart.svelte';

export {
  Root,
  type ShoppingCartProps,
  ShoppingCartPropsSchema,
  //
  Root as ShoppingCart,
};
