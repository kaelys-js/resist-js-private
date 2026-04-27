<script lang="ts">
  /**
   * Avatar image element — renders the user's profile picture.
   *
   * Wraps the Bits UI Avatar.Image primitive. Used internally by Avatar
   * but can be composed directly for custom layouts.
   *
   * @example
   * ```svelte
   * <Avatar.Image src="/user.jpg" alt="Profile" />
   * ```
   *
   * @module
   */
  import { Avatar as AvatarPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    /** The underlying DOM element reference. */
    ref = $bindable(null),
    /** Additional CSS classes. @values object-cover, grayscale */
    class: className,
    ...restProps
  }: AvatarPrimitive.ImageProps = $props();
</script>

<AvatarPrimitive.Image
  bind:ref
  data-slot="avatar-image"
  class={cn('aspect-square size-full object-cover', className)}
  {...restProps}
/>
