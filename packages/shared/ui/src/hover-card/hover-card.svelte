<script lang="ts">
	import { LinkPreview as HoverCardPrimitive } from "bits-ui";

	let {
		/** Whether the hover card is visible. */
		open = $bindable(false),
		...restProps
	}: HoverCardPrimitive.RootProps = $props();
</script>

<HoverCardPrimitive.Root bind:open {...restProps} />
