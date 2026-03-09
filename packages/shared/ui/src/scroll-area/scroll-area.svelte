<script lang="ts">
/**
 * Custom scrollbar container with styled vertical and/or horizontal scrollbar tracks.
 */
import { ScrollArea as ScrollAreaPrimitive } from 'bits-ui';
import Scrollbar from './scroll-area-scrollbar.svelte';
import { cn, type WithoutChild } from '../utils.js';

let {
	/** The underlying DOM element reference. */
	ref = $bindable(null),
	/** Reference to the scrollable viewport element. */
	viewportRef = $bindable(null),
	/** Additional CSS classes to apply. */
	class: className,
	/** Which scrollbar directions to show. */
	orientation = 'vertical',
	/** Additional CSS classes for the horizontal scrollbar. */
	scrollbarXClasses = '',
	/** Additional CSS classes for the vertical scrollbar. */
	scrollbarYClasses = '',
	/** The scrollable content. */
	children,
	...restProps
}: WithoutChild<ScrollAreaPrimitive.RootProps> & {
	orientation?: 'vertical' | 'horizontal' | 'both' | undefined;
	scrollbarXClasses?: string | undefined;
	scrollbarYClasses?: string | undefined;
	viewportRef?: HTMLElement | null;
} = $props();
</script>

<ScrollAreaPrimitive.Root
	bind:ref
	data-slot="scroll-area"
	class={cn("relative", className)}
	{...restProps}
>
	<ScrollAreaPrimitive.Viewport
		bind:ref={viewportRef}
		data-slot="scroll-area-viewport"
		class="ring-ring/10 dark:ring-ring/20 dark:outline-ring/40 outline-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] focus-visible:ring-4 focus-visible:outline-1"
	>
		{@render children?.()}
	</ScrollAreaPrimitive.Viewport>
	{#if orientation === "vertical" || orientation === "both"}
		<Scrollbar orientation="vertical" class={scrollbarYClasses} />
	{/if}
	{#if orientation === "horizontal" || orientation === "both"}
		<Scrollbar orientation="horizontal" class={scrollbarXClasses} />
	{/if}
	<ScrollAreaPrimitive.Corner />
</ScrollAreaPrimitive.Root>
