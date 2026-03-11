<!-- @convert-to-lens -->
<script lang="ts">
/**
 * Container for grouped content with a rounded border, background, and shadow.
 *
 * Compose with CardHeader, CardContent, CardFooter, CardTitle, and CardDescription for structured layouts.
 */
import type { HTMLAttributes } from 'svelte/elements';
import { cn, type WithElementRef } from '../utils.js';

let {
	/** The underlying DOM element reference. */
	ref = $bindable(null),
	/** Additional CSS classes to apply. */
	class: className,
	/** The card content. */
	children,
	...restProps
}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	class={cn(
		"bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
