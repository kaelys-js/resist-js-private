/**
 * Barrel re-export for the avatar compound component — exposes
 * Root / Image / Fallback sub-components under both internal
 * aliases and the `Avatar*` public names, plus props types,
 * the props schema, and the `avatarVariants` TV helper.
 *
 * @module
 */

import Root, {
  type AvatarInputProps,
  type AvatarProps,
  AvatarPropsSchema,
  avatarVariants,
} from './avatar.svelte';
import Image from './avatar-image.svelte';
import Fallback from './avatar-fallback.svelte';

export {
  Root,
  Image,
  Fallback,
  type AvatarInputProps,
  type AvatarProps,
  AvatarPropsSchema,
  avatarVariants,
  //
  Root as Avatar,
  Image as AvatarImage,
  Fallback as AvatarFallback,
};
