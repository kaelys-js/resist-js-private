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
