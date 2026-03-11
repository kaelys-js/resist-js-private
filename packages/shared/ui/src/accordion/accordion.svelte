<!-- @convert-to-lens -->
<script lang="ts">
	import { Accordion as AccordionPrimitive } from "bits-ui";

	let {
		ref = $bindable(null),
		/** The currently expanded item value(s). */
		value = $bindable(),
		...restProps
	}: AccordionPrimitive.RootProps = $props();
</script>

<AccordionPrimitive.Root
	bind:ref
	bind:value={value as never}
	data-slot="accordion"
	{...restProps}
/>
