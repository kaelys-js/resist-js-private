<script lang="ts">
import type { Str } from '@/schemas/common';
import type { Snippet } from 'svelte';

/**
 * Reusable demo section wrapper for the component gallery.
 *
 * Provides a consistent card layout with title, optional description,
 * and a bordered preview area. Use this in every `Demo.svelte` file
 * to keep the gallery visually uniform.
 *
 * @example
 * ```svelte
 * <DemoSection title="Default" description="Basic usage with default props.">
 *   <MyComponent />
 * </DemoSection>
 * ```
 */
type DemoSectionProps = {
	/** Section heading. */
	title: Str;
	/** Optional description text below the heading. */
	description?: Str;
	/** The demo content to render inside the preview area. */
	children: Snippet;
};

const { title, description, children }: DemoSectionProps = $props();
</script>

<section class="rounded-lg border bg-card">
	<div class="border-b px-5 py-3">
		<h3 class="text-sm font-semibold">{title}</h3>
		{#if description}
			<p class="mt-0.5 text-xs text-muted-foreground">{description}</p>
		{/if}
	</div>
	<div class="p-6">
		{@render children()}
	</div>
</section>
