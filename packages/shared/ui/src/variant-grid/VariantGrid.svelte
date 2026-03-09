<script lang="ts">
/**
 * Dynamic variant renderer for component documentation.
 *
 * Renders each variant option as a labeled row with the component
 * instance and a monospace value label. Options are displayed
 * individually for clear visual comparison.
 */
import type { Str } from '@/schemas/common';
import type { PropMeta, VariantMeta } from '../lens/types.js';
import type { Component } from 'svelte';
import { buildBaseProps } from '../lens/extract-props.js';
import { cn } from '../utils.js';

type VariantGridProps = {
	/** The Svelte component to render for each variant option. */
	component: Component;
	/** Extracted variant metadata (TV or props-based). */
	meta: VariantMeta;
	/** Full prop metadata for building base props from defaults/mock values. */
	props?: PropMeta[];
	/** Default slot content text for each rendered component. @values Example, Click me, Label */
	label?: Str;
	/** Additional CSS classes for the root element. */
	class?: Str;
};

const {
	component: Target,
	meta,
	props: propsMeta = [],
	label = 'Example',
	class: className,
}: VariantGridProps = $props();

const baseProps: Record<Str, unknown> = $derived(buildBaseProps(propsMeta));

/**
 * Check if an option name suggests icon-only rendering.
 *
 * @param option - Option name
 * @returns True if the option name contains 'icon'
 */
function isIconOption(option: Str): boolean {
	return option.includes('icon');
}
</script>

<div class={cn('space-y-4', className)}>
	{#each meta.variants as variantKey (variantKey.key)}
		{@const variantName: Str = variantKey.key}
		{@const options: Str[] = variantKey.options}
		<div class="grid gap-3">
			{#each options as option (option)}
				{@const variantProps: Record<Str, Str | boolean | number> =
					option === 'true' || option === 'false'
						? { [variantName]: option === 'true' }
						: !Number.isNaN(Number(option)) && option !== ''
							? { [variantName]: Number(option) }
							: { [variantName]: option }}
				<svelte:boundary>
					<div class="overflow-hidden rounded-md border bg-background">
						<div class="border-b bg-muted/30 px-3 py-1.5">
							<code class="text-xs text-muted-foreground">{option}</code>
						</div>
						<div class="flex w-full items-center justify-center p-4">
							<Target {...baseProps} {...variantProps}>
								{#if isIconOption(option)}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<circle cx="12" cy="12" r="10"></circle>
									</svg>
								{:else}
									{label}
								{/if}
							</Target>
						</div>
					</div>
					{#snippet failed()}
						<div class="overflow-hidden rounded-md border border-dashed bg-background">
							<div class="border-b bg-muted/30 px-3 py-1.5">
								<code class="text-xs text-muted-foreground">{option}</code>
							</div>
							<div class="flex items-center justify-center p-4 text-xs text-muted-foreground">
								Preview unavailable
							</div>
						</div>
					{/snippet}
				</svelte:boundary>
			{/each}
		</div>
	{/each}
</div>
