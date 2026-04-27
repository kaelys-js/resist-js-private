/**
 * Barrel re-export for the background-gradient component —
 * exposes the `BackgroundGradient` Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type BackgroundGradientProps,
  BackgroundGradientPropsSchema,
} from './BackgroundGradient.svelte';

export {
  Root,
  type BackgroundGradientProps,
  BackgroundGradientPropsSchema,
  //
  Root as BackgroundGradient,
};
