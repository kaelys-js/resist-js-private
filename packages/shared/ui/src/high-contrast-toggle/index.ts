/**
 * Barrel re-export for the high-contrast-toggle component —
 * exposes the HighContrastToggle Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type HighContrastToggleProps,
  HighContrastTogglePropsSchema,
} from './HighContrastToggle.svelte';

export {
  Root,
  type HighContrastToggleProps,
  HighContrastTogglePropsSchema,
  //
  Root as HighContrastToggle,
};
