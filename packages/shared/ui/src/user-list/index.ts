/**
 * Barrel re-export for the user-list component — exposes
 * the UserList Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type UserListProps, UserListPropsSchema } from './UserList.svelte';

export {
  Root,
  type UserListProps,
  UserListPropsSchema,
  //
  Root as UserList,
};
