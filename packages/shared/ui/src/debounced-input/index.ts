/**
 * Barrel re-export for the debounced-input component — exposes
 * the `DebouncedInput` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type DebouncedInputProps, DebouncedInputPropsSchema } from './DebouncedInput.svelte';

export {
  Root,
  type DebouncedInputProps,
  DebouncedInputPropsSchema,
  //
  Root as DebouncedInput,
};
