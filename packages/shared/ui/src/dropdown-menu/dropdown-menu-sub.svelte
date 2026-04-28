<script lang="ts">
  /**
   * DropdownMenu sub — root for a nested submenu. Manages the
   * submenu's bindable `open` state independently of the parent
   * menu's lifecycle.
   *
   * @module
   */
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

  let {
    /** Whether the submenu is open. */ open = $bindable(false),
    ...restProps
  }: DropdownMenuPrimitive.SubProps = $props();
</script>

<DropdownMenuPrimitive.Sub bind:open {...restProps} />
