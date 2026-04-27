<script lang="ts">
  /**
   * Command link-item — anchor-rendered selectable item that
   * navigates via `href`. Wraps Bits UI's `Command.LinkItem`
   * with our `data-slot="command-item"` styling.
   *
   * @module
   */

  import { Command as CommandPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: CommandPrimitive.LinkItemProps = $props();
</script>

<CommandPrimitive.LinkItem
  bind:ref
  data-slot="command-item"
  class={cn(
    "aria-selected:bg-accent aria-selected:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    className,
  )}
  {...restProps}
/>
