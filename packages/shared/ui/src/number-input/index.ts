/**
 * Barrel re-export for the number-input component — exposes
 * the NumberInput Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type NumberInputProps, NumberInputPropsSchema } from './NumberInput.svelte';

export {
  Root,
  type NumberInputProps,
  NumberInputPropsSchema,
  //
  Root as NumberInput,
};
