<script lang="ts">
/**
 * Search input field for a command palette with a leading search icon.
 *
 * Binds to the command palette's search value and filters results as the user types.
 */
import { Command as CommandPrimitive } from 'bits-ui';
import SearchIcon from '@lucide/svelte/icons/search';
import { cn } from '../utils.js';

let {
	ref = $bindable(null),
	class: className,
	/** The current input text value. @values search, filter, find */
	value = $bindable(''),
	...restProps
}: CommandPrimitive.InputProps = $props();
</script>

<div class="flex h-9 items-center gap-2 border-b ps-3 pe-8" data-slot="command-input-wrapper">
	<SearchIcon class="size-4 shrink-0 opacity-50" />
	<CommandPrimitive.Input
		data-slot="command-input"
		class={cn(
			"placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
			className
		)}
		bind:ref
		{...restProps}
		bind:value
	/>
</div>
