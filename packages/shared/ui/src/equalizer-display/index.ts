/**
 * Barrel re-export for the equalizer-display component —
 * exposes the EqualizerDisplay Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type EqualizerDisplayProps,
  EqualizerDisplayPropsSchema,
} from './EqualizerDisplay.svelte';

export {
  Root,
  type EqualizerDisplayProps,
  EqualizerDisplayPropsSchema,
  //
  Root as EqualizerDisplay,
};
