<script lang="ts">
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    /** Whether to inset the trigger for icon alignment. */
    inset,
    children,
    ...restProps
  }: DropdownMenuPrimitive.SubTriggerProps & {
    inset?: boolean;
  } = $props();
</script>

<DropdownMenuPrimitive.SubTrigger
  bind:ref
  data-slot="dropdown-menu-sub-trigger"
  data-inset={inset}
  class={cn(
    "data-highlighted:bg-white/[0.10] data-highlighted:text-foreground transition-colors duration-200 data-[state=open]:bg-white/[0.10] data-[state=open]:text-foreground [&_svg:not([class*='text-'])]:text-muted-foreground flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:ps-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    className,
  )}
  {...restProps}
>
  {@render children?.()}
  <ChevronRightIcon class="ms-auto size-4" />
</DropdownMenuPrimitive.SubTrigger>
