<!-- @convert-to-lens -->
<script lang="ts">
  /**
   * Select dropdown root that manages open/close state and the selected value.
   */
  import { Select as SelectPrimitive } from 'bits-ui';

  let {
    /** Whether the select dropdown is open. */
    open = $bindable(false),
    /** The currently selected value. */
    value = $bindable(),
    ...restProps
  }: SelectPrimitive.RootProps = $props();
</script>

<SelectPrimitive.Root bind:open bind:value={value as never} {...restProps} />
