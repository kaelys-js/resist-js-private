<script lang="ts">
  /**
   * Avatar fallback — content shown when the image is loading or fails.
   *
   * Wraps the Bits UI Avatar.Fallback primitive. Displays initials, an icon,
   * or custom content. Used internally by Avatar but can be composed directly.
   *
   * @example
   * ```svelte
   * <Avatar.Fallback>JD</Avatar.Fallback>
   * ```
   *
   * @module
   */
  import { Avatar as AvatarPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    /** The underlying DOM element reference. */
    ref = $bindable(null),
    /** Additional CSS classes. @values bg-primary, text-lg */
    class: className,
    ...restProps
  }: AvatarPrimitive.FallbackProps = $props();
</script>

<AvatarPrimitive.Fallback
  bind:ref
  data-slot="avatar-fallback"
  class={cn('flex size-full items-center justify-center', className)}
  {...restProps}
/>
