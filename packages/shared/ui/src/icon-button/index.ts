/**
 * Barrel re-export for the icon-button component — exposes
 * the IconButton Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type IconButtonProps, IconButtonPropsSchema } from './IconButton.svelte';

export {
  Root,
  type IconButtonProps,
  IconButtonPropsSchema,
  //
  Root as IconButton,
};
