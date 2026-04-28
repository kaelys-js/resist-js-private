<script lang="ts">
  /**
   * HoverCard.Content — floating panel slot for a HoverCard,
   * portalled and positioned relative to the trigger.
   *
   * @module
   */
  import { LinkPreview as HoverCardPrimitive } from 'bits-ui';
  import { cn, type WithoutChildrenOrChild } from '../utils.js';
  import HoverCardPortal from './hover-card-portal.svelte';
  import type { ComponentProps } from 'svelte';

  let {
    ref = $bindable(null),
    class: className,
    /** Horizontal alignment relative to the trigger. @values start, center, end */
    align = 'center',
    /** Distance in pixels from the trigger. @values 0, 4, 8, 16 */
    sideOffset = 4,
    /** Props forwarded to the portal container. */
    portalProps,
    ...restProps
  }: HoverCardPrimitive.ContentProps & {
    portalProps?: WithoutChildrenOrChild<ComponentProps<typeof HoverCardPortal>>;
  } = $props();
</script>

<HoverCardPortal {...portalProps}>
  <HoverCardPrimitive.Content
    bind:ref
    data-slot="hover-card-content"
    {align}
    {sideOffset}
    class={cn(
      'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-end-2 data-[side=right]:slide-in-from-start-2 data-[side=top]:slide-in-from-bottom-2 z-50 mt-3 w-64 rounded-md border p-4 shadow-md outline-hidden outline-none',
      className,
    )}
    {...restProps}
  />
</HoverCardPortal>
