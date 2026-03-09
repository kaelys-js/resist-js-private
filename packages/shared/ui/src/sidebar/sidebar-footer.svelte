<script lang="ts">
/**
 * Sidebar bottom section for persistent footer content like user menus.
 */
import type { HTMLAttributes } from 'svelte/elements';
import { cn, type WithElementRef } from '../utils.js';

let {
	ref = $bindable(null),
	class: className,
	children,
	...restProps
}: WithElementRef<HTMLAttributes<HTMLElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="sidebar-footer"
	data-sidebar="footer"
	class={cn("flex flex-col gap-2 p-2", className)}
	{...restProps}
>
	{@render children?.()}
</div>
