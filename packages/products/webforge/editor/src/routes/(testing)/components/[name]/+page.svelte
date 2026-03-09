<script lang="ts">
/**
 * Lens: auto-generated component documentation page.
 *
 * Extracts props, TV variants, and examples from raw component source
 * at runtime — no hand-written Demo.svelte files needed.
 */
import type { Bool, Str, Void } from '@/schemas/common';
import type { Component } from 'svelte';
import type { PropMeta, VariantMeta, VariantKeyMeta, LensExample, LensMeta } from '@/ui/lens/types.js';
import type { SearchItem } from '@/ui/search-autocomplete/search-item.js';
import { extractProps, extractDescription, extractPropsVariants } from '@/ui/lens/extract-props.js';
import { extractVariants } from '@/ui/lens/extract-variants.js';
import type { Result } from '@/schemas/result/result';
import { extractDir, extractStem, toTitle, isInternalFile, findPrimaryKey, parseLensMeta } from '@/ui/lens/lens-utils.js';
import { page } from '$app/state';
import LensEmpty from '@/ui/lens-empty/LensEmpty.svelte';
import LensError from '@/ui/lens-error/LensError.svelte';
import LensHeader from '@/ui/lens-header/LensHeader.svelte';
import LensSection from '@/ui/lens-section/LensSection.svelte';
import LensSource from '@/ui/lens-source/LensSource.svelte';
import PropsTable from '@/ui/lens-props-table/PropsTable.svelte';
import CodeBlock from '@/ui/code-block/CodeBlock.svelte';
import LensComponentRenderer from '@/ui/lens-component-renderer/LensComponentRenderer.svelte';
import TableProperties from '@lucide/svelte/icons/table-properties';
import ComponentIcon from '@lucide/svelte/icons/component';
import Layers from '@lucide/svelte/icons/layers';
import BookOpen from '@lucide/svelte/icons/book-open';

/* ------------------------------------------------------------------ */
/*  Globs                                                             */
/* ------------------------------------------------------------------ */

/**
 * Raw .svelte sources for prop/variant extraction.
 *
 * Must be `eager` because Vite 7 + the Svelte plugin serves `.svelte?raw`
 * with an empty Content-Type header, causing MIME type errors for lazy
 * `import()` calls. Eager resolution inlines raw strings at compile time.
 */
const rawSources: Record<Str, Str> = import.meta.glob(
	'@/ui/*/*.svelte',
	{ query: '?raw', import: 'default', eager: true },
) as Record<Str, Str>;

/** Live component modules for LensComponentRenderer rendering. */
const componentModules: Record<Str, () => Promise<unknown>> = import.meta.glob(
	'@/ui/*/*.svelte',
);

/** Lens metadata (compound components only). */
const lensModules: Record<Str, () => Promise<unknown>> = import.meta.glob(
	'@/ui/*/lens.ts',
);

/** Live example components (compound components only). */
const exampleLiveModules: Record<Str, () => Promise<unknown>> = import.meta.glob(
	'@/ui/*/examples/*.svelte',
);

/**
 * Raw example sources for code display.
 *
 * Eager for the same Vite 7 + Svelte MIME type reason as `rawSources`.
 */
const exampleRawModules: Record<Str, Str> = import.meta.glob(
	'@/ui/*/examples/*.svelte',
	{ query: '?raw', import: 'default', eager: true },
) as Record<Str, Str>;

/* ------------------------------------------------------------------ */
/*  Reactive state                                                    */
/* ------------------------------------------------------------------ */

const name: Str = $derived(page.params.name ?? '');

let rawSource: Str = $state('');
let props: PropMeta[] = $state([]);
let variantMeta: VariantMeta | null = $state(null);
let PrimaryComponent: Component | null = $state(null);
let lensExamples: LensExample[] = $state([]);
let exampleComponents: Map<Str, Component> = $state(new Map());
let exampleSources: Map<Str, Str> = $state(new Map());
let componentDescription: Str = $state('');
let lensMeta: LensMeta | null = $state(null);
let loading: Bool = $state(true);
let loadError: Str | null = $state(null);

$effect(() => {
	const currentName: Str = name;
	let cancelled: Bool = false;

	rawSource = '';
	props = [];
	variantMeta = null;
	PrimaryComponent = null;
	lensExamples = [];
	exampleComponents = new Map();
	exampleSources = new Map();
	componentDescription = '';
	lensMeta = null;
	loading = true;
	loadError = null;

	if (!currentName) {
		loading = false;
		loadError = 'No component name specified.';
		return;
	}

	(async (): Promise<void> => {
		try {
			// 1. Load raw source for prop/variant extraction
			const sourceKey: Str | undefined = findPrimaryKey(currentName, rawSources);
			if (!sourceKey) {
				if (!cancelled) loadError = `No source found for "${currentName}"`;
				return;
			}

			const srcStr: Str = rawSources[sourceKey] ?? '';
			rawSource = srcStr;
			props = extractProps(srcStr);
			variantMeta = extractVariants(srcStr);
			componentDescription = extractDescription(srcStr);

			// 2. Load live component for LensComponentRenderer
			const compKey: Str | undefined = Object.keys(componentModules).find(
				(k: Str): boolean =>
					extractDir(k) === currentName
					&& extractStem(k) === currentName
					&& !isInternalFile(k),
			) ?? Object.keys(componentModules).find(
				(k: Str): boolean => extractDir(k) === currentName && !isInternalFile(k),
			);

			if (compKey) {
				const mod: unknown = await componentModules[compKey]?.();
				if (cancelled) return;
				// Glob modules export { default: Component } — cast from unknown
				const m = mod as Record<Str, unknown>;
				PrimaryComponent = m.default as Component;
			}

			// 3. Load lens.ts metadata if present
			const lensKey: Str | undefined = Object.keys(lensModules).find(
				(k: Str): boolean => extractDir(k) === currentName,
			);
			if (lensKey) {
				const lensMod: unknown = await lensModules[lensKey]?.();
				if (cancelled) return;
				const lm = lensMod as Record<Str, unknown>;
				const examples: unknown = lm.default ?? lm.examples ?? [];
				if (Array.isArray(examples)) {
					lensExamples = examples as LensExample[];
				}
				// Validate component meta against LensMetaSchema
				if (lm.meta) {
					const metaResult: Result<LensMeta> = parseLensMeta(lm.meta);
					if (metaResult.ok) {
						// Spread to unfreeze — Result.data is deep-frozen but $state needs mutable shape
						lensMeta = { ...metaResult.data, tags: [...metaResult.data.tags] };
					} else {
						// Error propagates to loadError — renders visible error state
						if (!cancelled) loadError = `Invalid lens metadata: ${metaResult.error.message}`;
						return;
					}
				}
			}

			// 4. Load example components + raw sources
			const exKeys: Str[] = Object.keys(exampleLiveModules).filter(
				(k: Str): boolean => k.includes(`/${currentName}/examples/`),
			);

			const newComponents: Map<Str, Component> = new Map();
			const newSources: Map<Str, Str> = new Map();

			await Promise.all(
				exKeys.map(async (k: Str): Promise<void> => {
					const stem: Str = extractStem(k);

					const mod: unknown = await exampleLiveModules[k]?.();
					if (cancelled) return;
					const m = mod as Record<Str, unknown>;
					newComponents.set(stem, m.default as Component);

					// Find matching raw source key
					const rawKey: Str | undefined = Object.keys(exampleRawModules).find(
						(rk: Str): boolean => rk.includes(`/${currentName}/examples/${stem}.svelte`),
					);
					if (rawKey) {
						const rawStr: Str = exampleRawModules[rawKey] ?? '';
						if (rawStr) {
							newSources.set(stem, rawStr);
						}
					}
				}),
			);

			if (!cancelled) {
				exampleComponents = newComponents;
				exampleSources = newSources;
			}
		} catch {
			/* Load failed — show error state instead of blank page */
			if (!cancelled) loadError = `Failed to load component "${currentName}"`;
		} finally {
			if (!cancelled) loading = false;
		}
	})();

	return (): void => {
		cancelled = true;
	};
});

/**
 * Merge TV variants and props-based variants, deduplicating by key name.
 * TV variants take priority since they have exact values from source.
 */
const allVariants: VariantKeyMeta[] = $derived.by((): VariantKeyMeta[] => {
	const tvKeys: VariantKeyMeta[] = variantMeta?.variants ?? [];
	const propsKeys: VariantKeyMeta[] = extractPropsVariants(props);

	// TV keys take priority — collect their key names
	const tvKeyNames: Set<Str> = new Set(tvKeys.map((k: VariantKeyMeta): Str => k.key));

	// Add props-based variants that don't overlap with TV variants
	const merged: VariantKeyMeta[] = [...tvKeys];
	for (const pk of propsKeys) {
		if (!tvKeyNames.has(pk.key)) {
			merged.push(pk);
		}
	}
	return merged;
});

const hasVariants: Bool = $derived(allVariants.length > 0);
const hasExamples: Bool = $derived(lensExamples.length > 0);

/**
 * Build a PascalCase tag name from a kebab-case component directory name.
 *
 * @param componentName - The component directory name (kebab-case)
 * @returns PascalCase tag string
 */
function toTag(componentName: Str): Str {
	return toTitle(componentName).replaceAll(' ', '');
}

/**
 * Unified search items combining props, variants, and examples.
 * Grouped by section for the SearchAutocomplete dropdown.
 */
const searchItems: SearchItem[] = $derived.by((): SearchItem[] => {
	const items: SearchItem[] = [];

	// Props — searchable by name, type, default, description
	for (const prop of props) {
		items.push({
			value: `prop:${prop.name}`,
			label: prop.name,
			group: 'Props',
			keywords: [prop.type, prop.default, prop.description].filter(Boolean),
		});
	}

	// Variants — searchable by key name and option values
	for (const v of allVariants) {
		items.push({
			value: `variant:${v.key}`,
			label: toTitle(v.key),
			group: 'Variants',
			keywords: v.options,
		});
	}

	// Examples — searchable by title, name, description
	for (const ex of lensExamples) {
		items.push({
			value: `example:${ex.name}`,
			label: ex.title,
			group: 'Examples',
			keywords: [ex.name, ex.description].filter(Boolean),
		});
	}

	return items;
});

/**
 * Handle search item selection — scroll to the matching section element.
 *
 * @param item - The selected search item
 */
function handleSearchSelect(item: SearchItem): Void {
	const [section, id]: Str[] = item.value.split(':');
	let selector: Str = '';

	if (section === 'prop') selector = `#prop-${id}`;
	else if (section === 'variant') selector = `#variant-${id}`;
	else if (section === 'example') selector = `#example-${id}`;

	if (selector) {
		document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' });
	}
}

</script>

<div class="w-full">
	<div class="sticky top-(--header-height) z-10 border-b bg-background px-8 pb-4 pt-10">
		<LensHeader {name} description={componentDescription} meta={lensMeta} {hasVariants} {hasExamples} hasSource={!!rawSource} searchItems={loading || loadError ? [] : searchItems} onSearchSelect={handleSearchSelect} />
	</div>

	<div class="px-8 py-8">
	{#if loading}
		<div class="flex items-center justify-center rounded-xl border py-20">
			<div
				class="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
			></div>
		</div>
	{:else if loadError}
		<LensError title={loadError} description="Check that the component exists and has a valid source file." />
	{:else}
		<div class="space-y-10">
			<!-- ═══ Props ═══ -->
			<section id="props" class="scroll-mt-60">
				<h2 class="mb-3 flex items-center gap-2 text-lg font-semibold"><TableProperties class="size-5" /> Props</h2>
				<PropsTable {props} variantKeys={allVariants.map((v) => v.key)} />
			</section>

			<!-- ═══ Default ═══ -->
			{#if PrimaryComponent && hasVariants}
				<section id="default" class="scroll-mt-60">
					<h2 class="mb-3 flex items-center gap-2 text-lg font-semibold"><ComponentIcon class="size-5" /> Default</h2>
					<LensSection title="Default" description="Component rendered with default props.">
						<LensComponentRenderer component={PrimaryComponent} {props} tagName={toTag(name)} componentName={name} />
					</LensSection>
				</section>
			{/if}

			<!-- ═══ Variants ═══ -->
			<section id="variants" class="scroll-mt-60">
				<h2 class="mb-3 flex items-center gap-2 text-lg font-semibold"><Layers class="size-5" /> Variants</h2>
				{#if hasVariants && PrimaryComponent}
					<div class="space-y-4">
						{#each allVariants as variantKey (variantKey.key)}
							{@const singleMeta: VariantMeta = { variants: [variantKey] }}
							<div id="variant-{variantKey.key}" class="scroll-mt-60">
								<LensSection title={toTitle(variantKey.key)} description="Options for the {variantKey.key} prop." propName={variantKey.key}>
									<LensComponentRenderer component={PrimaryComponent} meta={singleMeta} {props} tagName={toTag(name)} componentName={name} />
								</LensSection>
							</div>
						{/each}
					</div>
				{:else}
					<LensEmpty title="No renderable variants" description="This component has no detected variant props or TV definitions." />
				{/if}
			</section>

			<!-- ═══ Examples ═══ -->
			<section id="examples" class="scroll-mt-60">
				<h2 class="mb-3 flex items-center gap-2 text-lg font-semibold"><BookOpen class="size-5" /> Examples</h2>
				{#if hasExamples}
					<div class="space-y-4">
						{#each lensExamples as example (example.name)}
							{@const ExComponent: Component | undefined = exampleComponents.get(example.name)}
							{@const exSource: Str = exampleSources.get(example.name) ?? ''}
							{#if ExComponent}
								<div id="example-{example.name}" class="scroll-mt-60">
									<LensSection title={example.title} description={example.description} codeText={exSource}>
										{#snippet code()}
											{#if exSource}
												<CodeBlock code={exSource} lang="svelte" />
											{/if}
										{/snippet}
										<ExComponent />
									</LensSection>
								</div>
							{/if}
						{/each}
					</div>
				{:else}
					<LensEmpty title="No hand-written examples" description="Add examples to this component's examples/ directory." />
				{/if}
			</section>

			<!-- ═══ Source ═══ -->
			{#if rawSource}
				<LensSource {name} source={rawSource} />
			{/if}
		</div>
	{/if}
	</div>
</div>
