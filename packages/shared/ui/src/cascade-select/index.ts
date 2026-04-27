/**
 * Barrel re-export for the cascade-select component — exposes
 * the `CascadeSelect` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type CascadeSelectProps, CascadeSelectPropsSchema } from './CascadeSelect.svelte';

export {
  Root,
  type CascadeSelectProps,
  CascadeSelectPropsSchema,
  //
  Root as CascadeSelect,
};
