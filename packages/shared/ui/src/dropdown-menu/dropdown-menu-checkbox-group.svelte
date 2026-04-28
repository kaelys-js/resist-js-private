<script lang="ts">
  /**
   * DropdownMenu checkbox group — exclusive grouping for a set
   * of `DropdownMenu.CheckboxItem` children with bindable
   * checked-values array. Wraps Bits UI's
   * `DropdownMenu.CheckboxGroup` with our `data-slot` convention.
   *
   * @module
   */
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

  let {
    ref = $bindable(null),
    /** Array of checked item values. */
    value = $bindable([]),
    ...restProps
  }: DropdownMenuPrimitive.CheckboxGroupProps = $props();
</script>

<DropdownMenuPrimitive.CheckboxGroup
  bind:ref
  bind:value
  data-slot="dropdown-menu-checkbox-group"
  {...restProps}
/>
