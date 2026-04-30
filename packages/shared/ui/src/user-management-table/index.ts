/**
 * Barrel re-export for the user-management-table component —
 * exposes the UserManagementTable Svelte component, its
 * props type, and the props schema under stable public
 * names.
 *
 * @module
 */

import Root, {
  type UserManagementTableProps,
  UserManagementTablePropsSchema,
} from './UserManagementTable.svelte';

export {
  Root,
  type UserManagementTableProps,
  UserManagementTablePropsSchema,
  //
  Root as UserManagementTable,
};
