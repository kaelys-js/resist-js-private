<script lang="ts">
import type { Bool, Str, Void } from '@/schemas/common';
import type { PropMeta } from '../lens/types.js';
import Badge from '../badge/badge.svelte';
import LensEmpty from '../lens-empty/LensEmpty.svelte';
import * as DropdownMenu from '../dropdown-menu/index.js';
import CircleHelp from '@lucide/svelte/icons/circle-help';
import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
import Layers from '@lucide/svelte/icons/layers';
import * as Tooltip from '../tooltip/index.js';
import { cn } from '../utils.js';

/**
 * Renders a table of component props extracted by the Lens system.
 *
 * Displays Name, Type, Default, and Description columns from
 * auto-extracted `PropMeta[]` data. Complex types and bindable props
 * include help icons with explanatory tooltips.
 *
 * @example
 * ```svelte
 * <PropsTable props={extractedProps} />
 * ```
 */
type PropsTableProps = {
	/** Array of prop metadata to render. */
	props: PropMeta[];
	/** Variant key names — props matching these get a "See variants" action. @values variant, size, disabled */
	variantKeys?: Str[];
	/** Additional CSS classes for the root element. */
	class?: Str;
};

const { props, variantKeys = [], class: className }: PropsTableProps = $props();

/** Set of variant keys for O(1) lookup. */
const variantKeySet: Set<Str> = $derived(new Set(variantKeys));

/**
 * Smooth-scroll to a specific variant section by prop name.
 *
 * @param propName - The prop/variant key name to scroll to
 */
function scrollToVariant(propName: Str): Void {
	document.querySelector(`#variant-${propName}`)?.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Determine if a prop is required (has no default value).
 *
 * @param prop - The prop metadata
 * @returns True if the prop has no default value
 */
function isRequired(prop: PropMeta): Bool {
	return !prop.default;
}

/**
 * Check whether a type string is "complex" enough to warrant a help icon.
 *
 * @param type - The TypeScript type string
 * @returns True if the type is non-trivial
 */
function isComplexType(type: Str): Bool {
	if (!type || type === '—') return false;
	// Simple primitives don't need help
	if (/^(string|number|boolean|Str|Num|Bool|Void)$/.test(type)) return false;
	// Simple string literals don't need help
	if (/^'[^']*'$/.test(type)) return false;
	return true;
}

/**
 * Generate a human-readable explanation for a TypeScript type.
 *
 * @param type - The TypeScript type string
 * @returns A plain-English explanation
 */
function explainType(type: Str): Str {
	if (type === 'Snippet') return 'A Svelte snippet — a reusable template block passed as a prop.';
	if (type === 'Component')
		return 'A Svelte component reference that can be rendered dynamically.';
	if (type === 'Snippet | undefined')
		return 'An optional Svelte snippet — a reusable template block.';

	// Indexed access: HTMLAnchorAttributes['href']
	if (type.includes("['")) {
		const parent: Str = type.split("['")[0] ?? '';
		return `Type inherited from ${parent}. See the parent type definition for details.`;
	}

	// Array types: NavItem[], string[], etc.
	if (type.endsWith('[]')) {
		const base: Str = type.slice(0, -2);
		return `An array of ${base} values.`;
	}

	// Union types with |
	if (type.includes(' | ')) {
		const options: Str[] = type.split(' | ').map((o: Str): Str => o.trim());
		const allLiterals: Bool = options.every(
			(o: Str): boolean => o.startsWith("'") || o === 'undefined' || o === 'null',
		);
		if (allLiterals) return `Accepts one of: ${type}`;
		return `A union type — can be any of: ${options.join(', ')}`;
	}

	// Generic types: Map<K, V>, Record<K, V>, etc.
	if (type.includes('<')) {
		const baseName: Str = type.split('<')[0] ?? '';
		return `A ${baseName} generic type. See TypeScript docs for details.`;
	}

	return `Type: ${type}`;
}
</script>

<div class={cn('overflow-x-auto rounded-lg border', className)}>
	{#if props.length === 0}
		<LensEmpty title="No custom props" description="This component accepts only standard HTML attributes." />
	{:else}
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b bg-muted/50">
					<th class="px-4 py-2 text-left font-medium text-muted-foreground">Name</th>
					<th class="px-4 py-2 text-left font-medium text-muted-foreground">Required</th>
					<th class="px-4 py-2 text-left font-medium text-muted-foreground">Type</th>
					<th class="px-4 py-2 text-left font-medium text-muted-foreground">Default</th>
					<th class="px-4 py-2 text-left font-medium text-muted-foreground">Description</th>
					{#if variantKeys.length > 0}
						<th class="w-10 px-2 py-2"><span class="sr-only">Actions</span></th>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#each props as prop (prop.name)}
					<tr class="border-b last:border-b-0">
						<td class="px-4 py-2 font-mono text-xs font-medium">
							{prop.name}
							{#if prop.bindable}
								<Tooltip.Provider>
									<Tooltip.Root delayDuration={300}>
										<Tooltip.Trigger>
											{#snippet child({ props: triggerProps })}
												<Badge
													{...triggerProps}
													variant="outline"
													class="ml-1 cursor-help gap-0.5 rounded-md border-blue-200 bg-blue-50 py-0 text-[10px] text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
												>
													bindable
													<CircleHelp class="size-2.5" aria-hidden="true" />
												</Badge>
											{/snippet}
										</Tooltip.Trigger>
										<Tooltip.Content side="top" sideOffset={4}>
											Supports two-way binding with bind:
											{prop.name}
										</Tooltip.Content>
									</Tooltip.Root>
								</Tooltip.Provider>
							{/if}
						</td>
						<td class="px-4 py-2">
							{#if isRequired(prop)}
								<Badge variant="default" class="rounded-md px-1.5 py-0 text-[10px]">Required</Badge>
							{:else}
								<Badge variant="secondary" class="rounded-md px-1.5 py-0 text-[10px] text-muted-foreground">Optional</Badge>
							{/if}
						</td>
						<td class="px-4 py-2 font-mono text-xs text-muted-foreground">
							{#if isComplexType(prop.type)}
								<span class="inline-flex items-center gap-1">
									<code>{prop.type}</code>
									<Tooltip.Provider>
										<Tooltip.Root delayDuration={300}>
											<Tooltip.Trigger>
												{#snippet child({ props: triggerProps })}
													<button
														{...triggerProps}
														type="button"
														class="cursor-help text-muted-foreground/60 transition-colors hover:text-muted-foreground"
														aria-label="Type info"
													>
														<CircleHelp class="size-3" aria-hidden="true" />
													</button>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="top" sideOffset={4} class="max-w-96">
												<div class="space-y-1.5">
													<code class="block rounded bg-primary-foreground/15 px-1.5 py-0.5 font-mono text-[11px]">{prop.type}</code>
													{#if prop.typeDefinition}
														<code class="block whitespace-pre-wrap rounded bg-primary-foreground/10 px-1.5 py-1 font-mono text-[10px] leading-relaxed">{prop.typeDefinition}</code>
													{:else}
														<p class="text-xs leading-relaxed">{explainType(prop.type)}</p>
													{/if}
												</div>
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>
								</span>
							{:else}
								{prop.type || '—'}
							{/if}
						</td>
						<td class="px-4 py-2 font-mono text-xs text-muted-foreground">
							{prop.default || '—'}
						</td>
						<td class="px-4 py-2 text-xs text-muted-foreground">
							{prop.description || '—'}
						</td>
						{#if variantKeys.length > 0}
							<td class="px-2 py-2">
								{#if variantKeySet.has(prop.name)}
									<DropdownMenu.Root>
										<DropdownMenu.Trigger>
											{#snippet child({ props: triggerProps })}
												<button
													type="button"
													class="inline-flex size-6 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
													{...triggerProps}
												>
													<EllipsisVertical class="size-3.5" />
													<span class="sr-only">Prop actions</span>
												</button>
											{/snippet}
										</DropdownMenu.Trigger>
										<DropdownMenu.Content align="end" sideOffset={4}>
											<DropdownMenu.Item onclick={() => scrollToVariant(prop.name)}>
												<Layers class="mr-2 size-4" />
												See variants
											</DropdownMenu.Item>
										</DropdownMenu.Content>
									</DropdownMenu.Root>
								{/if}
							</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>
