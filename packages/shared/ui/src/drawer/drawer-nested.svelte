<script lang="ts">
	import { Drawer as DrawerPrimitive } from "vaul-svelte";

	let {
		/** Whether to scale the background when the drawer opens. */
		shouldScaleBackground = true,
		/** Whether the nested drawer is open. */
		open = $bindable(false),
		/** The currently active snap point for drawer positioning. */
		activeSnapPoint = $bindable(null),
		...restProps
	}: DrawerPrimitive.RootProps = $props();
</script>

<DrawerPrimitive.NestedRoot {shouldScaleBackground} bind:open bind:activeSnapPoint {...restProps} />
