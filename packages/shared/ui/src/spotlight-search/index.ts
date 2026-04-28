/**
 * Barrel re-export for the spotlight-search component —
 * exposes the SpotlightSearch Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type SpotlightSearchProps,
  SpotlightSearchPropsSchema,
} from './SpotlightSearch.svelte';

export {
  Root,
  type SpotlightSearchProps,
  SpotlightSearchPropsSchema,
  //
  Root as SpotlightSearch,
};
