<script lang="ts">
/**
 * Empty state placeholder for the Lens documentation system.
 *
 * Renders a styled dashed-border card with optional icon, title, and
 * description. Supports a `destructive` variant for error states.
 */
import type { Str } from '@/schemas/common';
import type { Snippet } from 'svelte';
import { cn } from '../utils.js';
import PackageOpen from '@lucide/svelte/icons/package-open';

type LensEmptyVariant = 'default' | 'destructive';

type LensEmptyProps = {
	/** Primary message text. @values No variants found, No examples yet, Component not found */
	title: Str;
	/** Secondary description text below the title. @values This component has no renderable variants., Add examples to see them here. */
	description?: Str;
	/** Optional icon snippet — defaults to PackageOpen. */
	icon?: Snippet;
	/** Visual variant. @values default, destructive */
	variant?: LensEmptyVariant;
	/** Additional CSS classes for the root element. */
	class?: Str;
};

const {
	title,
	description,
	icon,
	variant = 'default',
	class: className,
}: LensEmptyProps = $props();
</script>

<div
	class={cn(
		'flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center',
		variant === 'destructive'
			? 'border-destructive/50 bg-destructive/5'
			: 'bg-muted/5',
		className,
	)}
>
	<div class={cn('mb-3', variant === 'destructive' ? 'text-destructive/50' : 'text-muted-foreground/40')}>
		{#if icon}
			{@render icon()}
		{:else}
			<PackageOpen class="size-10" strokeWidth={1.5} />
		{/if}
	</div>
	<p
		class={cn(
			'text-sm font-medium',
			variant === 'destructive' ? 'text-destructive' : 'text-muted-foreground',
		)}
	>
		{title}
	</p>
	{#if description}
		<p class="mt-1 max-w-xs text-xs text-muted-foreground/70">{description}</p>
	{/if}
</div>
