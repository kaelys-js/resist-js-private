<!-- @convert-to-lens -->
<script lang="ts">
  /**
   * Root navigation landmark for breadcrumb trails.
   *
   * Renders a semantic `<nav>` element with an aria-label of "breadcrumb".
   *
   * @module
   */
  import type { WithElementRef } from '../utils.js';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLElement>> = $props();
</script>

<nav
  bind:this={ref}
  data-slot="breadcrumb"
  class={className}
  aria-label="breadcrumb"
  {...restProps}
>
  {@render children?.()}
</nav>
