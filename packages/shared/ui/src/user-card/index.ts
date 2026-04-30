/**
 * Barrel re-export for the user-card component — exposes
 * the UserCard Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type UserCardProps, UserCardPropsSchema } from './UserCard.svelte';

export {
  Root,
  type UserCardProps,
  UserCardPropsSchema,
  //
  Root as UserCard,
};
