/**
 * Barrel re-export for the pick-list component — exposes the
 * PickList Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type PickListProps, PickListPropsSchema } from './PickList.svelte';

export {
  Root,
  type PickListProps,
  PickListPropsSchema,
  //
  Root as PickList,
};
