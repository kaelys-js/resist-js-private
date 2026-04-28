/**
 * Barrel re-export for the group component — exposes the
 * Group Svelte component, its props type, and the props schema
 * under stable public names.
 *
 * @module
 */

import Root, { type GroupProps, GroupPropsSchema } from './Group.svelte';

export {
  Root,
  type GroupProps,
  GroupPropsSchema,
  //
  Root as Group,
};
