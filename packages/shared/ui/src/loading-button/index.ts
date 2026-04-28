/**
 * Barrel re-export for the loading-button component — exposes
 * the LoadingButton Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type LoadingButtonProps, LoadingButtonPropsSchema } from './LoadingButton.svelte';

export {
  Root,
  type LoadingButtonProps,
  LoadingButtonPropsSchema,
  //
  Root as LoadingButton,
};
