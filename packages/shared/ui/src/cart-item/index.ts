/**
 * Barrel re-export for the cart-item component — exposes the
 * `CartItem` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type CartItemProps, CartItemPropsSchema } from './CartItem.svelte';

export {
  Root,
  type CartItemProps,
  CartItemPropsSchema,
  //
  Root as CartItem,
};
