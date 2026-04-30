/**
 * Barrel re-export for the wishlist-button component —
 * exposes the WishlistButton Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type WishlistButtonProps, WishlistButtonPropsSchema } from './WishlistButton.svelte';

export {
  Root,
  type WishlistButtonProps,
  WishlistButtonPropsSchema,
  //
  Root as WishlistButton,
};
