<!-- @convert-to-lens -->
<script lang="ts">
  /**
   * Select root Svelte component — Bits UI `Select.Root`
   * wrapper that manages dropdown open/close state and the
   * currently selected value.
   *
   * @module
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
