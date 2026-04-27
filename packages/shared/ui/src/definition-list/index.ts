/**
 * Barrel re-export for the definition-list component — exposes
 * the `DefinitionList` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type DefinitionListProps, DefinitionListPropsSchema } from './DefinitionList.svelte';

export {
  Root,
  type DefinitionListProps,
  DefinitionListPropsSchema,
  //
  Root as DefinitionList,
};
