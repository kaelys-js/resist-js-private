<script lang="ts">
/**
 * Footer area of a dialog, typically containing action buttons.
 *
 * Stacks children vertically on mobile and aligns them horizontally (end-justified) on larger screens.
 */
import { cn, type WithElementRef } from '../utils.js';
import type { HTMLAttributes } from 'svelte/elements';

let {
	ref = $bindable(null),
	class: className,
	children,
	...restProps
}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="dialog-footer"
	class={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
	{...restProps}
>
	{@render children?.()}
</div>
