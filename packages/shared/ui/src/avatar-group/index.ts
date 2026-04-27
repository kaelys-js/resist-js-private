/**
 * Barrel re-export for the avatar-group component — exposes the
 * `AvatarGroup` Svelte component, its props types
 * (`AvatarGroupProps` / `AvatarGroupInputProps`), the props
 * schema, and the `avatarGroupVariants` TV helper under stable
 * public names.
 *
 * @module
 */

import Root, {
  type AvatarGroupInputProps,
  type AvatarGroupProps,
  AvatarGroupPropsSchema,
  avatarGroupVariants,
} from './AvatarGroup.svelte';

export {
  Root,
  type AvatarGroupInputProps,
  type AvatarGroupProps,
  AvatarGroupPropsSchema,
  avatarGroupVariants,
  //
  Root as AvatarGroup,
};
