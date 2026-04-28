<script lang="ts">
  /**
   * NativeSelect.Option — single `<option>` child of a
   * `NativeSelect`. @module
   */
  import type { HTMLOptionAttributes } from 'svelte/elements';
  import type { WithElementRef } from '../utils.js';

  let {
    ref = $bindable(null),
    children,
    ...restProps
  }: WithElementRef<HTMLOptionAttributes> = $props();
</script>

<option bind:this={ref} data-slot="native-select-option" {...restProps}>
  {@render children?.()}
</option>
