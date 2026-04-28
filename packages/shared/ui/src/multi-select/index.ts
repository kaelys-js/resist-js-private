/**
 * Barrel re-export for the multi-select component — exposes
 * the MultiSelect Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type MultiSelectProps, MultiSelectPropsSchema } from './MultiSelect.svelte';

export {
  Root,
  type MultiSelectProps,
  MultiSelectPropsSchema,
  //
  Root as MultiSelect,
};
