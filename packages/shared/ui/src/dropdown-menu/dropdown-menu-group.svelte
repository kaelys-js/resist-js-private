<script lang="ts">
  /**
   * DropdownMenu group — semantic wrapper for related items
   * within a `DropdownMenu.Content`. Pair with a
   * `DropdownMenu.GroupHeading` for accessible labelling.
   *
   * @module
   */
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

  let { ref = $bindable(null), ...restProps }: DropdownMenuPrimitive.GroupProps = $props();
</script>

<DropdownMenuPrimitive.Group bind:ref data-slot="dropdown-menu-group" {...restProps} />
