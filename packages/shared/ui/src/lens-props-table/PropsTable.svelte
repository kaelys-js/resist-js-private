<script module lang="ts">
import * as v from 'valibot';
import { StrSchema } from '@/schemas/common';
import { PropMetaSchema, type PropMeta, type TypeField } from '../lens/types.js';

export const PropsTablePropsSchema = v.strictObject({
	/** Array of prop metadata to render. @values [{name: "variant", type: "Str", default: "default", description: "Visual style", bindable: false}] */
	props: v.array(PropMetaSchema),
	/** Variant key names — props matching these get a "See variants" action. @values variant, size, disabled */
	variantKeys: v.optional(v.array(StrSchema)),
	/** Additional CSS classes for the root element. */
	class: v.optional(StrSchema),
});
/** Props for the PropsTable component. */
export type PropsTableProps = v.InferOutput<typeof PropsTablePropsSchema>;
</script>

<script lang="ts">
/**
 * Renders a table of component props extracted by the Lens system.
 *
 * Displays Name, Required, Type, Accepts, Default, and Description columns from
 * auto-extracted `PropMeta[]` data. Props with complex object types show collapsible
 * child rows for their type fields inside a `transition:slide` wrapper. Both parent
 * and nested tables use `table-layout: fixed` to guarantee column alignment.
 */
import { slide } from 'svelte/transition';
import type { Bool, Num, Str, Void } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';
import Badge from '../badge/badge.svelte';
import LensEmpty from '../lens-empty/LensEmpty.svelte';
import * as DropdownMenu from '../dropdown-menu/index.js';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import CircleHelp from '@lucide/svelte/icons/circle-help';
import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
import Layers from '@lucide/svelte/icons/layers';
import * as Tooltip from '../tooltip/index.js';
import { cn } from '../utils.js';
import { stripSvelteProps } from '../lens/lens-utils.js';

const allProps: PropsTableProps = $props();
const validated: PropsTableProps = $derived.by(() => {
	const rawProps: PropsTableProps = stripSvelteProps(allProps);
	const result = safeParse(PropsTablePropsSchema, rawProps);
	if (!result.ok) throw result.error;
	// Cast to mutable — Result.data is deep-frozen via Object.freeze but component only reads, never mutates
	return result.data as PropsTableProps;
});

/** Resolved variant keys with empty-array default. */
const variantKeys: readonly Str[] = $derived(validated.variantKeys ?? []);

/** Set of variant keys for O(1) lookup. */
const variantKeySet: Set<Str> = $derived(new Set(variantKeys));

/** Set of prop names whose type fields are currently expanded. */
let expandedTypeFields: Set<Str> = $state(new Set());

/**
 * Toggle the expanded state of a prop's type fields.
 *
 * @param propName - The prop name to toggle
 */
function toggleTypeFields(propName: Str): Void {
	const next: Set<Str> = new Set(expandedTypeFields);
	if (next.has(propName)) {
		next.delete(propName);
	} else {
		next.add(propName);
	}
	expandedTypeFields = next;
}

/**
 * Smooth-scroll to a specific variant section by prop name.
 *
 * @param propName - The prop/variant key name to scroll to
 */
function scrollToVariant(propName: Str): Void {
	// Escape dots for CSS selector (dotted keys like meta.category → meta\.category)
	const escaped: Str = propName.replaceAll('.', String.raw`\.`);
	document.querySelector(`#variant-${escaped}`)?.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Determine if a prop is required (no default value and not marked optional).
 *
 * @param prop - The prop metadata
 * @returns True if the prop has no default and is not optional
 */
function isRequired(prop: PropMeta): Bool {
	if (prop.optional) return false;
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
	if (/^(string|number|boolean|Str|Num|Bool|Void)$/.test(type)) return false;
	if (/^'[^']*'$/.test(type)) return false;
	// Union types get their own pretty rendering — not "complex"
	if (isUnionType(type)) return false;
	return true;
}

/**
 * Check whether a type string is a pipe-separated union (e.g., `'a' | 'b' | 'c'`).
 *
 * @param type - The TypeScript type string
 * @returns True if the type contains ` | `
 */
function isUnionType(type: Str): Bool {
	return type.includes(' | ');
}

/**
 * Split a union type string into individual members, stripping surrounding quotes.
 *
 * @param type - Union type string like `'a' | 'b' | undefined`
 * @returns Array of cleaned member strings
 */
function parseUnionMembers(type: Str): Str[] {
	return type
		.split(' | ')
		.map((m: Str): Str => m.trim())
		.filter(Boolean)
		.map((m: Str): Str => m.replaceAll(/^'|'$/g, ''));
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

	if (type.includes("['")) {
		const parent: Str = type.split("['")[0] ?? '';
		return `Type inherited from ${parent}. See the parent type definition for details.`;
	}

	if (type.endsWith('[]')) {
		const base: Str = type.slice(0, -2);
		return `An array of ${base} values.`;
	}

	if (type.includes(' | ')) {
		const options: Str[] = type.split(' | ').map((o: Str): Str => o.trim());
		const allLiterals: Bool = options.every(
			(o: Str): boolean => o.startsWith("'") || o === 'undefined' || o === 'null',
		);
		if (allLiterals) return `Accepts one of: ${type}`;
		return `A union type — can be any of: ${options.join(', ')}`;
	}

	if (type.includes('<')) {
		const baseName: Str = type.split('<')[0] ?? '';
		return `A ${baseName} generic type. See TypeScript docs for details.`;
	}

	return `Type: ${type}`;
}

/**
 * Get accepted values for the Accepts column.
 *
 * Prefers explicit `@values` (mockValues), then parses string literal unions
 * from the type string.
 *
 * @param prop - The prop metadata
 * @returns Comma-separated accepted values, or '—' if none
 */
function getAccepts(prop: PropMeta): Str {
	// Normalize type: strip nullable/undefined suffixes and array brackets for base matching
	const baseType: Str = prop.type
		.replaceAll(/\s*\|\s*(null|undefined)\b/g, '')
		.replaceAll(/^(null|undefined)\s*\|\s*/g, '')
		.replace(/\[]$/, '')
		.trim();
	const isNullable: Bool = prop.type.includes('| null');
	const isArray: Bool = prop.type.endsWith('[]');

	// Primitives — match base type after stripping nullable/array wrappers
	const primitiveMap: Record<Str, Str> = {
		string: 'text',
		Str: 'text',
		number: 'number',
		Num: 'number',
		boolean: 'true, false',
		Bool: 'true, false',
		Snippet: 'snippet',
		Component: 'component',
	};
	const primitiveAccepts: Str | undefined = primitiveMap[baseType];
	if (primitiveAccepts) {
		const label: Str = isArray ? `list of ${primitiveAccepts}` : primitiveAccepts;
		return isNullable ? `${label} or empty` : label;
	}

	// Inline string literal union: 'a' | 'b' | 'c' (possibly with null/undefined)
	if (prop.type.includes(' | ')) {
		const options: Str[] = prop.type.split(' | ').map((o: Str): Str => o.trim());
		const allLiterals: Bool = options.every(
			(o: Str): boolean => o.startsWith("'") || o === 'undefined' || o === 'null',
		);
		if (allLiterals) {
			return options
				.filter((o: Str): boolean => o !== 'undefined' && o !== 'null')
				.map((o: Str): Str => o.replaceAll(/^'|'$/g, ''))
				.join(', ');
		}
		// Non-literal union with a primitive base (e.g., Str | null handled above,
		// but mixed unions like Str | Num fall through)
	}

	// Resolved type definition: named type → 'default' | 'secondary' | ...
	if (prop.typeDefinition?.includes(' | ')) {
		const options: Str[] = prop.typeDefinition.split(' | ').map((o: Str): Str => o.trim());
		const allLiterals: Bool = options.every(
			(o: Str): boolean => o.startsWith("'") || o === 'undefined' || o === 'null',
		);
		if (allLiterals) {
			return options
				.filter((o: Str): boolean => o !== 'undefined' && o !== 'null')
				.map((o: Str): Str => o.replaceAll(/^'|'$/g, ''))
				.join(', ');
		}
	}

	return '—';
}

/**
 * Whether a prop has expandable type fields.
 *
 * @param prop - The prop metadata
 * @returns True if the prop has type fields to display
 */
function hasTypeFields(prop: PropMeta): Bool {
	return prop.typeFields !== undefined && prop.typeFields.length > 0;
}

/**
 * Check whether a comma-separated accepts string represents a union of literal values.
 *
 * @param accepts - The accepts string from a TypeField
 * @returns True if it looks like a comma-separated union
 */
function isAcceptsUnion(accepts: Str): Bool {
	if (!accepts || accepts === '—') return false;
	// "text", "number", "true / false" are not unions
	if (/^(text|number|true \/ false|true, false)$/.test(accepts)) return false;
	return accepts.includes(', ');
}

/**
 * Split an accepts string into individual members for chip rendering.
 *
 * @param accepts - Comma-separated accepts string
 * @returns Array of individual values
 */
function parseAcceptsMembers(accepts: Str): Str[] {
	return accepts
		.split(', ')
		.map((m: Str): Str => m.trim())
		.filter(Boolean);
}

/**
 * Check whether a TypeField has nested expandable sub-fields.
 *
 * @param tf - The type field to check
 * @returns True if the field has nested typeFields
 */
function hasNestedFields(tf: TypeField): Bool {
	return tf.typeFields !== undefined && tf.typeFields.length > 0;
}

/** Number of columns in the table — 7 if variant actions shown, else 6. */
const colCount: Num = $derived(variantKeys.length > 0 ? 7 : 6);
</script>

<div class={cn('overflow-x-auto rounded-lg border', validated.class)}>
	{#if validated.props.length === 0}
		<LensEmpty title="No props detected" description="This component's $props() destructuring has no typed fields. Add typed props or a Valibot schema to see them here." />
	{:else}
		<table class="w-full table-fixed text-sm">
			<thead>
				<tr class="border-b bg-muted/50">
					<th class="px-4 py-2 text-left font-medium text-muted-foreground">Name</th>
					<th class="px-4 py-2 text-left font-medium text-muted-foreground">Required</th>
					<th class="px-4 py-2 text-left font-medium text-muted-foreground">Type</th>
					<th class="px-4 py-2 text-left font-medium text-muted-foreground">Accepts</th>
					<th class="px-4 py-2 text-left font-medium text-muted-foreground">Default</th>
					<th class="px-4 py-2 text-left font-medium text-muted-foreground">Description</th>
					{#if variantKeys.length > 0}
						<th class="w-10 px-2 py-2"><span class="sr-only">Actions</span></th>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#each validated.props as prop (prop.name)}
					<tr id="prop-{prop.name}" class="border-b last:border-b-0">
						<td class="px-4 py-2 font-mono text-xs font-medium">
							<span class="inline-flex items-center gap-1">
								{#if hasTypeFields(prop)}
									<button
										type="button"
										class="inline-flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground/60 transition-all hover:text-foreground"
										onclick={() => toggleTypeFields(prop.name)}
										aria-expanded={expandedTypeFields.has(prop.name)}
										aria-label="Toggle {prop.name} type fields"
									>
										<ChevronRight
											class="size-3 transition-transform duration-200 {expandedTypeFields.has(prop.name) ? 'rotate-90' : ''}"
											aria-hidden="true"
										/>
									</button>
									<button
										type="button"
										class="cursor-pointer hover:text-foreground hover:underline"
										onclick={() => toggleTypeFields(prop.name)}
									>
										{prop.name}
									</button>
								{:else}
									{prop.name}
								{/if}
							</span>
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
											Supports two-way binding with bind:{prop.name}
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
							{#if isUnionType(prop.type)}
								<span class="inline-flex flex-wrap items-center gap-1">
									{#each parseUnionMembers(prop.type) as member, mi (mi)}
										{#if mi > 0}
											<span class="text-[10px] text-muted-foreground/40">|</span>
										{/if}
										<code class="rounded bg-muted px-1 py-0.5 text-[11px]">{member}</code>
									{/each}
								</span>
							{:else if isComplexType(prop.type)}
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
											<Tooltip.Content side="top" sideOffset={4}>
												{explainType(prop.type)}
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>
								</span>
							{:else}
								{#if prop.type}
									{prop.type}
								{:else}
									<span class="text-muted-foreground/40">—</span>
								{/if}
							{/if}
						</td>
						<td class="max-w-48 px-4 py-2 font-mono text-xs text-muted-foreground">
							{#if getAccepts(prop) === '—'}
								<span class="text-muted-foreground/40">—</span>
							{:else}
								{getAccepts(prop)}
							{/if}
						</td>
						<td class="px-4 py-2 font-mono text-xs text-muted-foreground">
							{#if prop.default}
								{prop.default}
							{:else}
								<span class="text-muted-foreground/40">—</span>
							{/if}
						</td>
						<td class="px-4 py-2 text-xs text-muted-foreground">
							{#if prop.description}
								{prop.description}
							{:else}
								<span class="text-muted-foreground/40">—</span>
							{/if}
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
					{#if hasTypeFields(prop) && expandedTypeFields.has(prop.name)}
						<tr class="border-b">
							<td colspan={colCount} class="p-0">
								<div transition:slide={{ duration: 150 }} class="overflow-hidden">
									<table class="w-full table-fixed text-sm">
										<tbody>
											{#each prop.typeFields ?? [] as tf (tf.field)}
												{@const nestedKey = `${prop.name}.${tf.field}`}
												<tr class="border-b bg-muted/30 last:border-b-0">
													<td class="py-1.5 pl-12 pr-4 font-mono text-xs text-muted-foreground">
														{#if hasNestedFields(tf)}
															<span class="inline-flex items-center gap-1">
																<button
																	type="button"
																	class="inline-flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground/60 transition-all hover:text-foreground"
																	onclick={() => toggleTypeFields(nestedKey)}
																	aria-expanded={expandedTypeFields.has(nestedKey)}
																	aria-label="Toggle {tf.field} type fields"
																>
																	<ChevronRight
																		class="size-3 transition-transform duration-200 {expandedTypeFields.has(nestedKey) ? 'rotate-90' : ''}"
																		aria-hidden="true"
																	/>
																</button>
																<button
																	type="button"
																	class="cursor-pointer hover:text-foreground hover:underline"
																	onclick={() => toggleTypeFields(nestedKey)}
																>
																	{tf.field}
																</button>
															</span>
														{:else}
															{tf.field}
														{/if}
													</td>
													<td class="px-4 py-1.5">
														{#if tf.required}
															<Badge variant="default" class="rounded-md px-1.5 py-0 text-[10px]">Required</Badge>
														{:else}
															<Badge variant="secondary" class="rounded-md px-1.5 py-0 text-[10px] text-muted-foreground">Optional</Badge>
														{/if}
													</td>
													<td class="px-4 py-1.5 font-mono text-xs text-muted-foreground">
														{#if isUnionType(tf.type)}
															<span class="inline-flex flex-wrap items-center gap-1">
																{#each parseUnionMembers(tf.type) as member, mi (mi)}
																	{#if mi > 0}
																		<span class="text-[10px] text-muted-foreground/40">|</span>
																	{/if}
																	<code class="rounded bg-muted px-1 py-0.5 text-[11px]">{member}</code>
																{/each}
															</span>
														{:else if tf.type}
															{tf.type}
														{:else}
															<span class="text-muted-foreground/40">—</span>
														{/if}
													</td>
													<td class="px-4 py-1.5 font-mono text-xs text-muted-foreground">
														{#if isAcceptsUnion(tf.accepts)}
															<span class="inline-flex flex-wrap items-center gap-1">
																{#each parseAcceptsMembers(tf.accepts) as member, mi (mi)}
																	{#if mi > 0}
																		<span class="text-[10px] text-muted-foreground/40">|</span>
																	{/if}
																	<code class="rounded bg-muted px-1 py-0.5 text-[11px]">{member}</code>
																{/each}
															</span>
														{:else if tf.accepts}
															{tf.accepts}
														{:else}
															<span class="text-muted-foreground/40">—</span>
														{/if}
													</td>
													<td class="px-4 py-1.5 font-mono text-xs text-muted-foreground">
														<span class="text-muted-foreground/40">—</span>
													</td>
													<td class="px-4 py-1.5 text-xs text-muted-foreground">
														{#if tf.description}
															{tf.description}
														{:else}
															<span class="text-muted-foreground/40">—</span>
														{/if}
													</td>
													{#if variantKeys.length > 0}
														<td class="w-10 px-2 py-1.5">
															{#if variantKeySet.has(`${prop.name}.${tf.field}`)}
																<DropdownMenu.Root>
																	<DropdownMenu.Trigger>
																		{#snippet child({ props: triggerProps })}
																			<button
																				type="button"
																				class="inline-flex size-6 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
																				{...triggerProps}
																			>
																				<EllipsisVertical class="size-3.5" />
																				<span class="sr-only">Field actions</span>
																			</button>
																		{/snippet}
																	</DropdownMenu.Trigger>
																	<DropdownMenu.Content align="end" sideOffset={4}>
																		<DropdownMenu.Item onclick={() => scrollToVariant(`${prop.name}.${tf.field}`)}>
																			<Layers class="mr-2 size-4" />
																			See variants
																		</DropdownMenu.Item>
																	</DropdownMenu.Content>
																</DropdownMenu.Root>
															{/if}
														</td>
													{/if}
												</tr>
												{#if hasNestedFields(tf) && expandedTypeFields.has(nestedKey)}
													{#each tf.typeFields ?? [] as ntf (ntf.field)}
														<tr class="border-b bg-muted/20 last:border-b-0">
															<td class="py-1.5 pl-20 pr-4 font-mono text-xs text-muted-foreground/80">
																{ntf.field}
															</td>
															<td class="px-4 py-1.5">
																{#if ntf.required}
																	<Badge variant="default" class="rounded-md px-1.5 py-0 text-[10px]">Required</Badge>
																{:else}
																	<Badge variant="secondary" class="rounded-md px-1.5 py-0 text-[10px] text-muted-foreground">Optional</Badge>
																{/if}
															</td>
															<td class="px-4 py-1.5 font-mono text-xs text-muted-foreground">
																{#if isUnionType(ntf.type)}
																	<span class="inline-flex flex-wrap items-center gap-1">
																		{#each parseUnionMembers(ntf.type) as member, mi (mi)}
																			{#if mi > 0}
																				<span class="text-[10px] text-muted-foreground/40">|</span>
																			{/if}
																			<code class="rounded bg-muted px-1 py-0.5 text-[11px]">{member}</code>
																		{/each}
																	</span>
																{:else if ntf.type}
																	{ntf.type}
																{:else}
																	<span class="text-muted-foreground/40">—</span>
																{/if}
															</td>
															<td class="px-4 py-1.5 font-mono text-xs text-muted-foreground">
																{#if isAcceptsUnion(ntf.accepts)}
																	<span class="inline-flex flex-wrap items-center gap-1">
																		{#each parseAcceptsMembers(ntf.accepts) as member, mi (mi)}
																			{#if mi > 0}
																				<span class="text-[10px] text-muted-foreground/40">|</span>
																			{/if}
																			<code class="rounded bg-muted px-1 py-0.5 text-[11px]">{member}</code>
																		{/each}
																	</span>
																{:else if ntf.accepts}
																	{ntf.accepts}
																{:else}
																	<span class="text-muted-foreground/40">—</span>
																{/if}
															</td>
															<td class="px-4 py-1.5 font-mono text-xs text-muted-foreground">
																<span class="text-muted-foreground/40">—</span>
															</td>
															<td class="px-4 py-1.5 text-xs text-muted-foreground">
																{#if ntf.description}
																	{ntf.description}
																{:else}
																	<span class="text-muted-foreground/40">—</span>
																{/if}
															</td>
															{#if variantKeys.length > 0}
																<td class="w-10 px-2 py-1.5"></td>
															{/if}
														</tr>
													{/each}
												{/if}
											{/each}
										</tbody>
									</table>
								</div>
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	{/if}
</div>
