<script lang="ts">
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

  let {
    /** Whether the submenu is open. */ open = $bindable(false),
    ...restProps
  }: DropdownMenuPrimitive.SubProps = $props();
</script>

<DropdownMenuPrimitive.Sub bind:open {...restProps} />
