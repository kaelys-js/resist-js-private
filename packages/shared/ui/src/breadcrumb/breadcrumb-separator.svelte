<script lang="ts">
  /**
   * Visual separator between breadcrumb items, defaulting to a chevron-right icon.
   *
   * Hidden from assistive technology via `aria-hidden`. Accepts custom separator content via the default slot.
   */
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { cn, type WithElementRef } from '../utils.js';
  import type { HTMLLiAttributes } from 'svelte/elements';

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLLiAttributes> = $props();
</script>

<li
  bind:this={ref}
  data-slot="breadcrumb-separator"
  role="presentation"
  aria-hidden="true"
  class={cn('[&>svg]:size-3.5', className)}
  {...restProps}
>
  {#if children}
    {@render children?.()}
  {:else}
    <ChevronRightIcon />
  {/if}
</li>
