<!-- @convert-to-lens -->
<script lang="ts">
/**
 * Form field label with disabled-state styling and peer association support.
 */
import { Label as LabelPrimitive } from 'bits-ui';
import { cn } from '../utils.js';

let {
	/** The underlying DOM element reference. */
	ref = $bindable(null),
	/** Additional CSS classes to apply. */
	class: className,
	...restProps
}: LabelPrimitive.RootProps = $props();
</script>

<LabelPrimitive.Root
	bind:ref
	data-slot="label"
	class={cn(
		"flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
		className
	)}
	{...restProps}
/>
