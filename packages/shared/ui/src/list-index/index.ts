/**
 * Barrel re-export for the list-index component — exposes the
 * ListIndex Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ListIndexProps, ListIndexPropsSchema } from './ListIndex.svelte';

export {
  Root,
  type ListIndexProps,
  ListIndexPropsSchema,
  //
  Root as ListIndex,
};
