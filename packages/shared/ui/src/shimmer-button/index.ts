/**
 * Barrel re-export for the shimmer-button component —
 * exposes the ShimmerButton Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type ShimmerButtonProps, ShimmerButtonPropsSchema } from './ShimmerButton.svelte';

export {
  Root,
  type ShimmerButtonProps,
  ShimmerButtonPropsSchema,
  //
  Root as ShimmerButton,
};
