<script lang="ts">
  /**
   * ScrollAreaScrollbar Svelte component — single styled
   * scrollbar track + thumb (horizontal or vertical) used
   * inside the ScrollArea root.
   *
   * @module
   */
  import { ScrollArea as ScrollAreaPrimitive } from 'bits-ui';
  import { cn, type WithoutChild } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    /** Scrollbar axis orientation. @values horizontal, vertical */
    orientation = 'vertical',
    children,
    ...restProps
  }: WithoutChild<ScrollAreaPrimitive.ScrollbarProps> = $props();
</script>

<ScrollAreaPrimitive.Scrollbar
  bind:ref
  data-slot="scroll-area-scrollbar"
  {orientation}
  class={cn(
    'flex touch-none p-px transition-colors select-none',
    orientation === 'vertical' && 'h-full w-2.5 border-s border-s-transparent',
    orientation === 'horizontal' && 'h-2.5 flex-col border-t border-t-transparent',
    className,
  )}
  {...restProps}
>
  {@render children?.()}
  <ScrollAreaPrimitive.Thumb
    data-slot="scroll-area-thumb"
    class="bg-border relative flex-1 rounded-full"
  />
</ScrollAreaPrimitive.Scrollbar>
