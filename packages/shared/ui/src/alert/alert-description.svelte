<script lang="ts">
  /**
   * Alert description — supporting body copy beneath the alert
   * title. Renders a `<div>` with muted-foreground / small-text
   * styling and the `data-slot="alert-description"` selector that
   * the alert variant uses for its destructive color override.
   *
   * @module
   */

  import type { HTMLAttributes } from 'svelte/elements';
  import { cn, type WithElementRef } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
  bind:this={ref}
  data-slot="alert-description"
  class={cn(
    'text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed',
    className,
  )}
  {...restProps}
>
  {@render children?.()}
</div>
