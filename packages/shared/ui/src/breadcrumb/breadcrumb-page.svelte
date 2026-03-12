<script lang="ts">
  /**
   * Non-interactive breadcrumb element representing the current page.
   *
   * Rendered as a `<span>` with `aria-current="page"` and `aria-disabled="true"` for accessibility.
   */
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn, type WithElementRef } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLSpanElement>> = $props();
</script>

<span
  bind:this={ref}
  data-slot="breadcrumb-page"
  role="link"
  aria-disabled="true"
  aria-current="page"
  class={cn('text-foreground font-normal', className)}
  {...restProps}
>
  {@render children?.()}
</span>
