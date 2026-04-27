<script lang="ts">
  /**
   * ButtonGroup separator — visual divider between adjacent
   * button-group items. Defaults to vertical orientation; uses
   * the shared `Separator` primitive with `bg-input` styling.
   *
   * @module
   */

  import { cn } from '../utils.js';
  import type { ComponentProps } from 'svelte';
  import { Separator } from '../separator/index.js';

  let {
    ref = $bindable(null),
    class: className,
    /** Separator orientation. @values horizontal, vertical */
    orientation = 'vertical',
    ...restProps
  }: ComponentProps<typeof Separator> = $props();
</script>

<Separator
  bind:ref
  data-slot="button-group-separator"
  {orientation}
  class={cn('bg-input relative !m-0 self-stretch data-[orientation=vertical]:h-auto', className)}
  {...restProps}
/>
