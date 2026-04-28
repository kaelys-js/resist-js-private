/**
 * Barrel re-export for the list component — exposes the List
 * Svelte component, its props type, and the props schema under
 * stable public names.
 *
 * @module
 */

import Root, { type ListProps, ListPropsSchema } from './List.svelte';

export {
  Root,
  type ListProps,
  ListPropsSchema,
  //
  Root as List,
};
