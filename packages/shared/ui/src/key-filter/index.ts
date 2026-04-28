/**
 * Barrel re-export for the key-filter component — exposes the
 * KeyFilter Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type KeyFilterProps, KeyFilterPropsSchema } from './KeyFilter.svelte';

export {
  Root,
  type KeyFilterProps,
  KeyFilterPropsSchema,
  //
  Root as KeyFilter,
};
