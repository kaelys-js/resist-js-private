<script lang="ts">
/**
 * Empty state placeholder displayed when no command results match the current search query.
 */
import { Command as CommandPrimitive } from 'bits-ui';
import { cn } from '../utils.js';

let {
	ref = $bindable(null),
	class: className,
	...restProps
}: CommandPrimitive.EmptyProps = $props();
</script>

<CommandPrimitive.Empty
	bind:ref
	data-slot="command-empty"
	class={cn("py-6 text-center text-sm", className)}
	{...restProps}
/>
