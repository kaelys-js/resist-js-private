<script lang="ts">
/**
 * Clickable anchor within a breadcrumb trail that navigates to a parent route.
 *
 * Supports a `child` render-prop snippet for custom element rendering (e.g., framework-specific link components).
 */
import type { HTMLAnchorAttributes } from 'svelte/elements';
import type { Snippet } from 'svelte';
import { cn, type WithElementRef } from '../utils.js';

let {
	/** The underlying DOM element reference. */
	ref = $bindable(null),
	/** Additional CSS classes to apply. */
	class: className,
	/** The link destination URL. */
	href,
	/** Render-prop snippet for custom element rendering. */
	child,
	/** The link label content. */
	children,
	...restProps
}: WithElementRef<HTMLAnchorAttributes> & {
	child?: Snippet<[{ props: HTMLAnchorAttributes }]>;
} = $props();

const attrs = $derived({
	'data-slot': 'breadcrumb-link',
	class: cn('hover:text-foreground transition-colors', className),
	href,
	...restProps,
});
</script>

{#if child}
	{@render child({ props: attrs })}
{:else}
	<a bind:this={ref} {...attrs}>
		{@render children?.()}
	</a>
{/if}
