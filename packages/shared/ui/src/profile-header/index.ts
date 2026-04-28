/**
 * Barrel re-export for the profile-header component — exposes
 * the ProfileHeader Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ProfileHeaderProps, ProfileHeaderPropsSchema } from './ProfileHeader.svelte';

export {
  Root,
  type ProfileHeaderProps,
  ProfileHeaderPropsSchema,
  //
  Root as ProfileHeader,
};
