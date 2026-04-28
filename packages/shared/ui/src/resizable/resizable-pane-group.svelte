<script lang="ts">
  /**
   * ResizablePaneGroup Svelte component — container that
   * arranges one or more resizable panes horizontally or
   * vertically (paneforge `PaneGroup` wrapper).
   *
   * @module
   */
  import * as ResizablePrimitive from 'paneforge';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    this: paneGroup = $bindable(),
    class: className,
    ...restProps
  }: ResizablePrimitive.PaneGroupProps & {
    this?: ResizablePrimitive.PaneGroup;
  } = $props();
</script>

<ResizablePrimitive.PaneGroup
  bind:this={paneGroup}
  data-slot="resizable-pane-group"
  class={cn('flex h-full w-full data-[direction=vertical]:flex-col', className)}
  {...restProps}
/>
