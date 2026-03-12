<!-- @convert-to-lens -->
<script lang="ts">
  /**
   * Root state container for a dropdown menu that manages its open/closed lifecycle.
   *
   * Pair with a DropdownMenu.Trigger and DropdownMenu.Content to create a click-activated menu.
   */
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

  let {
    /** Whether the dropdown menu is open. */ open = $bindable(false),
    ...restProps
  }: DropdownMenuPrimitive.RootProps = $props();
</script>

<DropdownMenuPrimitive.Root bind:open {...restProps} />
