<script lang="ts">
  import { Menubar as MenubarPrimitive } from 'bits-ui';

  let {
    /** Whether the submenu is open. */
    open = $bindable(false),
    ...restProps
  }: MenubarPrimitive.SubProps = $props();
</script>

<MenubarPrimitive.Sub bind:open {...restProps} />
