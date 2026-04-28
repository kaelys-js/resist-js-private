<!-- @convert-to-lens -->
<script lang="ts">
  /**
   * Skeleton Svelte component — pulsing rounded rectangle
   * placeholder used while real content is loading.
   *
   * @module
   */
  import { cn, type WithElementRef, type WithoutChildren } from '../utils.js';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    /** The underlying DOM element reference. */
    ref = $bindable(null),
    /** Additional CSS classes to apply. */
    class: className,
    ...restProps
  }: WithoutChildren<WithElementRef<HTMLAttributes<HTMLDivElement>>> = $props();
</script>

<div
  bind:this={ref}
  data-slot="skeleton"
  class={cn('bg-accent animate-pulse rounded-md', className)}
  {...restProps}
></div>
