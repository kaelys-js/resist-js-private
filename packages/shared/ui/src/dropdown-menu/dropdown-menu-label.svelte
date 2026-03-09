<script lang="ts">
/**
 * Non-interactive section label within a dropdown menu, rendered as semibold small text.
 *
 * Use to visually group related menu items under a heading.
 */
import { cn, type WithElementRef } from '../utils.js';
import type { HTMLAttributes } from 'svelte/elements';

let {
	ref = $bindable(null),
	class: className,
	inset,
	children,
	...restProps
}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
	inset?: boolean;
} = $props();
</script>

<div
	bind:this={ref}
	data-slot="dropdown-menu-label"
	data-inset={inset}
	class={cn("px-2 py-1.5 text-sm font-semibold data-[inset]:ps-8", className)}
	{...restProps}
>
	{@render children?.()}
</div>
