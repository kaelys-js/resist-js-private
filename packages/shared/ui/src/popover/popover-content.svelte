<script lang="ts">
  /**
   * Popover content panel rendered inside a portal with enter/exit animations.
   */
  import { Popover as PopoverPrimitive } from 'bits-ui';
  import PopoverPortal from './popover-portal.svelte';
  import { cn, type WithoutChildrenOrChild } from '../utils.js';
  import type { ComponentProps } from 'svelte';

  let {
    /** The underlying DOM element reference. */
    ref = $bindable(null),
    /** Additional CSS classes to apply. */
    class: className,
    /** Distance in pixels from the trigger. @values 0, 4, 8, 16 */
    sideOffset = 4,
    /** Horizontal alignment relative to the trigger. @values start, center, end */
    align = 'center',
    /** Props forwarded to the portal wrapper. */
    portalProps,
    ...restProps
  }: PopoverPrimitive.ContentProps & {
    portalProps?: WithoutChildrenOrChild<ComponentProps<typeof PopoverPortal>>;
  } = $props();
</script>

<PopoverPortal {...portalProps}>
  <PopoverPrimitive.Content
    bind:ref
    data-slot="popover-content"
    {sideOffset}
    {align}
    class={cn(
      'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-end-2 data-[side=right]:slide-in-from-start-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--bits-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden',
      className,
    )}
    {...restProps}
  />
</PopoverPortal>
