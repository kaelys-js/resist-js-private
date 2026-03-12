<script lang="ts">
  import { ContextMenu as ContextMenuPrimitive } from 'bits-ui';

  let {
    /** Whether the submenu is open. */
    open = $bindable(false),
    ...restProps
  }: ContextMenuPrimitive.SubProps = $props();
</script>

<ContextMenuPrimitive.Sub bind:open {...restProps} />
