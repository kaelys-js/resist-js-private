<script lang="ts">
/**
 * Dynamic variant renderer for component documentation.
 *
 * Renders each variant option as a labeled row with the component
 * instance and a monospace value label. Each card includes per-option
 * code expand/collapse and copy-to-clipboard. Options are displayed
 * individually for clear visual comparison.
 */
import type { Bool, Str, Void } from '@/schemas/common';
import type { PropMeta, VariantMeta } from '../lens/types.js';
import type { Component } from 'svelte';
import { buildBaseProps } from '../lens/extract-props.js';
import LensError from '../lens-error/LensError.svelte';
import CopyButton from '../copy-button/CopyButton.svelte';
import CodeBlock from '../code-block/CodeBlock.svelte';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import Code from '@lucide/svelte/icons/code';
import * as Tooltip from '../tooltip/index.js';
import { slide } from 'svelte/transition';
import { cn } from '../utils.js';

type VariantGridProps = {
	/** The Svelte component to render for each variant option. */
	component: Component;
	/** Extracted variant metadata (TV or props-based). */
	meta: VariantMeta;
	/** Full prop metadata for building base props from defaults/mock values. */
	props?: PropMeta[];
	/** PascalCase tag name for generating per-option code snippets. @values Button, Input, Badge */
	tagName?: Str;
	/** Default slot content text for each rendered component. @values Example, Click me, Label */
	label?: Str;
	/** Additional CSS classes for the root element. */
	class?: Str;
};

const {
	component: Target,
	meta,
	props: propsMeta = [],
	tagName,
	label = 'Example',
	class: className,
}: VariantGridProps = $props();

const baseProps: Record<Str, unknown> = $derived(buildBaseProps(propsMeta));

/** Per-option code panel visibility keyed by "variantKey:option". */
let openCards: Record<Str, Bool> = $state({});

/**
 * Toggle the code panel for a specific option card.
 *
 * @param key - Unique key for the option card ("variantKey:option")
 */
function toggleCode(key: Str): Void {
	openCards[key] = !openCards[key];
}

/**
 * Generate a code snippet for a specific variant option.
 *
 * @param variantKey - The variant prop name
 * @param option - The option value
 * @returns A Svelte code snippet string
 */
function codeSnippet(variantKey: Str, option: Str): Str {
	if (!tagName) return '';
	return `<${tagName} ${variantKey}="${option}">${label}</${tagName}>`;
}

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
				{@const cardKey: Str = `${variantName}:${option}`}
				{@const snippet: Str = codeSnippet(variantName, option)}
				<svelte:boundary>
					<div class="overflow-hidden rounded-md border bg-background">
						<div class="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
							<code class="text-xs text-muted-foreground">{option}</code>
							{#if tagName}
								<div class="flex items-center gap-1">
									<Tooltip.Provider>
										<Tooltip.Root delayDuration={300}>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<button
														type="button"
														{...tipProps}
														class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
														onclick={() => toggleCode(cardKey)}
														aria-expanded={!!openCards[cardKey]}
													>
														<Code class="size-3" aria-hidden="true" />
														<ChevronDown
															class={cn('size-2.5 transition-transform', openCards[cardKey] && 'rotate-180')}
															aria-hidden="true"
														/>
													</button>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="top" sideOffset={4}>
												{openCards[cardKey] ? 'Collapse code' : 'Expand code'}
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>
									<CopyButton text={snippet} label="Copy code" class="size-5 [&_svg]:size-2.5" />
								</div>
							{/if}
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
						{#if tagName && openCards[cardKey]}
							<div class="overflow-hidden border-t bg-muted/20" transition:slide={{ duration: 200 }}>
								<div class="min-w-0 overflow-x-auto p-3 text-sm">
									<CodeBlock code={snippet} lang="svelte" />
								</div>
							</div>
						{/if}
					</div>
					{#snippet failed()}
						<div class="overflow-hidden rounded-md border border-dashed bg-background">
							<div class="border-b bg-muted/30 px-3 py-1.5">
								<code class="text-xs text-muted-foreground">{option}</code>
							</div>
							<LensError title="Preview unavailable" description="Could not render this variant option." class="rounded-none border-0 py-4" />
						</div>
					{/snippet}
				</svelte:boundary>
			{/each}
		</div>
	{/each}
</div>
