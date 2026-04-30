/**
 * Barrel re-export for the user-presence component — exposes
 * the UserPresence Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type UserPresenceProps, UserPresencePropsSchema } from './UserPresence.svelte';

export {
  Root,
  type UserPresenceProps,
  UserPresencePropsSchema,
  //
  Root as UserPresence,
};
