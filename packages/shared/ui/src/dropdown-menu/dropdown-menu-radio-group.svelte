<script lang="ts">
  /**
   * DropdownMenu radio group — exclusive selection group with a
   * single bindable `value`. Children are
   * `DropdownMenu.RadioItem` components keyed by their `value`.
   *
   * @module
   */
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

  let {
    ref = $bindable(null),
    /** The selected radio item value. */
    value = $bindable(),
    ...restProps
  }: DropdownMenuPrimitive.RadioGroupProps = $props();
</script>

<DropdownMenuPrimitive.RadioGroup
  bind:ref
  bind:value
  data-slot="dropdown-menu-radio-group"
  {...restProps}
/>
