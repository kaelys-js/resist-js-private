<script lang="ts">
/**
 * Footer area of a Card for action buttons or supplementary content.
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
	data-slot="card-footer"
	class={cn("flex items-center px-6 [.border-t]:pt-6", className)}
	{...restProps}
>
	{@render children?.()}
</div>
