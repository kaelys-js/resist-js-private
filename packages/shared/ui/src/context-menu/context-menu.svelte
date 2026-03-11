<!-- @convert-to-lens -->
<script lang="ts">
	import { ContextMenu as ContextMenuPrimitive } from "bits-ui";

	let {
		/** Whether the context menu is open. */
		open = $bindable(false),
		...restProps
	}: ContextMenuPrimitive.RootProps = $props();
</script>

<ContextMenuPrimitive.Root bind:open {...restProps} />
