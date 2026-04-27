/**
 * Barrel re-export for the combo-counter component — exposes
 * the `ComboCounter` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ComboCounterProps, ComboCounterPropsSchema } from './ComboCounter.svelte';

export {
  Root,
  type ComboCounterProps,
  ComboCounterPropsSchema,
  //
  Root as ComboCounter,
};
