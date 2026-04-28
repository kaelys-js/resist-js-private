<script lang="ts">
  /**
   * DropdownMenu trigger — element that toggles the menu's open
   * state. Wraps Bits UI's `DropdownMenu.Trigger` with our
   * `data-slot` convention for shared styling hooks.
   *
   * @module
   */
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

  let { ref = $bindable(null), ...restProps }: DropdownMenuPrimitive.TriggerProps = $props();
</script>

<DropdownMenuPrimitive.Trigger bind:ref data-slot="dropdown-menu-trigger" {...restProps} />
