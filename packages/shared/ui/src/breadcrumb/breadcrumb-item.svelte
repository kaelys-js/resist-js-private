<script lang="ts">
/**
 * Individual list item within a breadcrumb trail.
 *
 * Wraps a breadcrumb link or page indicator as an inline flex `<li>` element.
 */
import type { HTMLLiAttributes } from 'svelte/elements';
import { cn, type WithElementRef } from '../utils.js';

let {
	ref = $bindable(null),
	class: className,
	children,
	...restProps
}: WithElementRef<HTMLLiAttributes> = $props();
</script>

<li
	bind:this={ref}
	data-slot="breadcrumb-item"
	class={cn("inline-flex items-center gap-1.5", className)}
	{...restProps}
>
	{@render children?.()}
</li>
