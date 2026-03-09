<script lang="ts">
	import { RadioGroup as RadioGroupPrimitive } from "bits-ui";
	import { cn } from "../utils.js";

	let {
		ref = $bindable(null),
		class: className,
		/** The selected radio button value. @values option-1, option-2, option-3 */
		value = $bindable(""),
		...restProps
	}: RadioGroupPrimitive.RootProps = $props();
</script>

<RadioGroupPrimitive.Root
	bind:ref
	bind:value
	data-slot="radio-group"
	class={cn("grid gap-3", className)}
	{...restProps}
/>
