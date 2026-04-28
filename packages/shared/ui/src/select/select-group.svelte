<script lang="ts">
  /**
   * SelectGroup Svelte component — semantic wrapper grouping
   * related options inside the Select dropdown.
   *
   * @module
   */
  import { Select as SelectPrimitive } from 'bits-ui';

  let { ref = $bindable(null), ...restProps }: SelectPrimitive.GroupProps = $props();
</script>

<SelectPrimitive.Group bind:ref data-slot="select-group" {...restProps} />
