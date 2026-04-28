/**
 * Barrel re-export for the group-avatar component — exposes
 * the GroupAvatar Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type GroupAvatarProps, GroupAvatarPropsSchema } from './GroupAvatar.svelte';

export {
  Root,
  type GroupAvatarProps,
  GroupAvatarPropsSchema,
  //
  Root as GroupAvatar,
};
