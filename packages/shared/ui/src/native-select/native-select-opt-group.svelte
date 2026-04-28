<script lang="ts">
  /**
   * NativeSelect.OptGroup — `<optgroup>` child for grouping
   * `NativeSelect.Option` children with a label. @module
   */
  import type { HTMLOptgroupAttributes } from 'svelte/elements';
  import type { WithElementRef } from '../utils.js';

  let {
    ref = $bindable(null),
    children,
    ...restProps
  }: WithElementRef<HTMLOptgroupAttributes> = $props();
</script>

<optgroup bind:this={ref} data-slot="native-select-opt-group" {...restProps}>
  {@render children?.()}
</optgroup>
