<!-- @convert-to-lens -->
<script lang="ts">
  /**
   * Visual separator line supporting horizontal and vertical orientations.
   */
  import { Separator as SeparatorPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    /** The underlying DOM element reference. */
    ref = $bindable(null),
    /** Additional CSS classes to apply. */
    class: className,
    /** The data-slot attribute for styling hooks. */
    'data-slot': dataSlot = 'separator',
    ...restProps
  }: SeparatorPrimitive.RootProps = $props();
</script>

<SeparatorPrimitive.Root
  bind:ref
  data-slot={dataSlot}
  class={cn(
    'bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:min-h-full data-[orientation=vertical]:w-px',
    className,
  )}
  {...restProps}
/>
