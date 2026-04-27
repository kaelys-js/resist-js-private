<script lang="ts">
  /**
   * Card action — action slot rendered inside the Card header
   * (e.g., a menu trigger or close button). Positioned at the
   * end of the second column, spanning both header rows.
   *
   * @module
   */

  import { cn, type WithElementRef } from '../utils.js';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
  bind:this={ref}
  data-slot="card-action"
  class={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
  {...restProps}
>
  {@render children?.()}
</div>
