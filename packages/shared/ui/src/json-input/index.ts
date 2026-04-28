/**
 * Barrel re-export for the json-input component — exposes
 * the JsonInput Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type JsonInputProps, JsonInputPropsSchema } from './JsonInput.svelte';

export {
  Root,
  type JsonInputProps,
  JsonInputPropsSchema,
  //
  Root as JsonInput,
};
