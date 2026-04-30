/**
 * Barrel re-export for the under-construction component —
 * exposes the UnderConstruction Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type UnderConstructionProps,
  UnderConstructionPropsSchema,
} from './UnderConstruction.svelte';

export {
  Root,
  type UnderConstructionProps,
  UnderConstructionPropsSchema,
  //
  Root as UnderConstruction,
};
