/**
 * Barrel re-export for the searchbox component — exposes
 * the Searchbox Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SearchboxProps, SearchboxPropsSchema } from './Searchbox.svelte';

export {
  Root,
  type SearchboxProps,
  SearchboxPropsSchema,
  //
  Root as Searchbox,
};
