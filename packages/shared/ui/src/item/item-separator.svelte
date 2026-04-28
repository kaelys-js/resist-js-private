<script lang="ts">
  /**
   * Item.Separator — horizontal divider rule between
   * sibling `Item` rows in an `Item.Group`.
   *
   * @module
   */
  import { Separator } from '../separator/index.js';
  import { cn } from '../utils.js';
  import type { ComponentProps } from 'svelte';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: ComponentProps<typeof Separator> = $props();
</script>

<Separator
  bind:ref
  data-slot="item-separator"
  orientation="horizontal"
  class={cn('my-0', className)}
  {...restProps}
/>
