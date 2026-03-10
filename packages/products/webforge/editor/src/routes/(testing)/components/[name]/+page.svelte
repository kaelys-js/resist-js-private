<script lang="ts">
/**
 * Lens: auto-generated component documentation page.
 *
 * Extracts props, TV variants, and examples from raw component source
 * at runtime — no hand-written Demo.svelte files needed.
 */
import type { Bool, Num, Str, Void } from '@/schemas/common';
import type { Component } from 'svelte';
import type { PropMeta, VariantMeta, VariantKeyMeta, LensExample, LensMeta } from '@/ui/lens/types.js';
import type { SearchItem } from '@/ui/search-autocomplete/search-item.js';
import { extractProps, extractDescription, extractPropsVariants } from '@/ui/lens/extract-props.js';
import { extractVariants } from '@/ui/lens/extract-variants.js';
import { extractDeps, extractReverseDeps, type DepTree, type ReverseDep } from '@/ui/lens/extract-deps.js';
import { extractSourceSizes } from '@/ui/lens/extract-sizes.js';
import type { Result } from '@/schemas/result/result';
import { extractDir, extractStem, toTitle, isInternalFile, findPrimaryKey, parseLensMeta } from '@/ui/lens/lens-utils.js';
import { page } from '$app/state';
import LensEmpty from '@/ui/lens-empty/LensEmpty.svelte';
import LensError from '@/ui/lens-error/LensError.svelte';
import LensHeader from '@/ui/lens-header/LensHeader.svelte';
import LensSection from '@/ui/lens-section/LensSection.svelte';
import LensSource from '@/ui/lens-source/LensSource.svelte';
import LensDependencyTree from '@/ui/lens-dependency-tree/LensDependencyTree.svelte';
import PropsTable from '@/ui/lens-props-table/PropsTable.svelte';
import LensComponentRenderer from '@/ui/lens-component-renderer/LensComponentRenderer.svelte';
import TableProperties from '@lucide/svelte/icons/table-properties';
import ComponentIcon from '@lucide/svelte/icons/component';
import ShieldAlert from '@lucide/svelte/icons/shield-alert';
import Layers from '@lucide/svelte/icons/layers';
import BookOpen from '@lucide/svelte/icons/book-open';
import GitFork from '@lucide/svelte/icons/git-fork';

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
 * Raw .ts sources for cross-file type resolution (e.g. imported types).
 * Eager for the same Vite 7 MIME type reason as `rawSources`.
 */
const rawTsSources: Record<Str, Str> = import.meta.glob(
	'@/ui/*/*.ts',
	{ query: '?raw', import: 'default', eager: true },
) as Record<Str, Str>;

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

/**
 * Sorted list of all component directory names derived from the raw source glob.
 * Used for Previous/Next navigation in the LensHeader.
 */
const componentNames: Str[] = [
	...new Set(Object.keys(rawSources).map(extractDir)),
]
	.filter((n: Str): boolean => n.length > 0)
	.toSorted();

/** Previous component in the sorted list (null if first). */
const prevComponent: Str | null = $derived.by((): Str | null => {
	const idx: number = componentNames.indexOf(name);
	return idx > 0 ? (componentNames[idx - 1] ?? null) : null;
});

/** Next component in the sorted list (null if last). */
const nextComponent: Str | null = $derived.by((): Str | null => {
	const idx: number = componentNames.indexOf(name);
	return idx >= 0 && idx < componentNames.length - 1 ? (componentNames[idx + 1] ?? null) : null;
});

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

			// Pass all .ts sources for cross-file type resolution (e.g. imported types)
			const tsSources: Str[] = Object.values(rawTsSources);
			props = extractProps(srcStr, tsSources.length > 0 ? tsSources : undefined);
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
	// Filter out entries with falsy keys to prevent each_key_duplicate errors
	return merged.filter((v: VariantKeyMeta): boolean => Boolean(v.key));
});

const hasVariants: Bool = $derived(allVariants.length > 0);
const hasExamples: Bool = $derived(lensExamples.length > 0);

/** Categorized dependency tree extracted from raw component source. */
const deps: DepTree = $derived(rawSource ? extractDeps(rawSource) : { internal: [], workspace: [], external: [] });

/** Reverse dependencies — components that import the current one. */
const usedBy: ReverseDep[] = $derived(name ? extractReverseDeps(name, rawSources, extractDir) : []);

/** Whether the component has any dependencies or reverse dependencies. */
const hasDeps: Bool = $derived(deps.internal.length + deps.workspace.length + deps.external.length > 0 || usedBy.length > 0);

/** Source sizes per component directory (computed from raw sources). */
const sourceSizes: Record<Str, Num> = extractSourceSizes(rawSources, extractDir);

/** Compiled bundle sizes fetched from the server API (svelte compile + esbuild minify + gzip). */
let bundleSizes: Record<Str, { compiled: Num; gzip: Num }> = $state({});

/** Combined sizes map passed to LensDependencyTree. */
const componentSizes: Record<Str, { source: Num; compiled?: Num; gzip?: Num }> = $derived.by(() => {
	const result: Record<Str, { source: Num; compiled?: Num; gzip?: Num }> = {};
	for (const [dir, source] of Object.entries(sourceSizes)) {
		const bundle = bundleSizes[dir];
		result[dir] = {
			source: source as Num,
			compiled: bundle?.compiled,
			gzip: bundle?.gzip,
		};
	}
	return result;
});

// Fetch compiled sizes from server API (non-blocking, populates async)
$effect(() => {
	let cancelled: Bool = false;
	(async (): Promise<void> => {
		try {
			const response: Response = await fetch('/api/lens/bundle-sizes');
			if (cancelled) return;
			if (response.ok) {
				const data: unknown = await response.json();
				if (cancelled) return;
				// Server returns Record<string, { compiled, gzip }> — safe to assign
				bundleSizes = data as Record<Str, { compiled: Num; gzip: Num }>;
			}
		} catch {
			/* Bundle size fetch failed — sizes remain empty, source sizes still shown */
		}
	})();
	return (): void => {
		cancelled = true;
	};
});

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

	// Props — searchable by name, type, default, description, typeFields, mockValues
	for (const prop of props) {
		const kw: Str[] = [prop.type, prop.default, prop.description].filter(Boolean);
		// Include nested field names, types, accepts, and descriptions from expandable schemas
		if (prop.typeFields) {
			for (const tf of prop.typeFields) {
				kw.push(tf.field, tf.type, tf.accepts, tf.description);
			}
		}
		// Include explicit @values JSDoc annotations
		if (prop.mockValues) {
			kw.push(...prop.mockValues);
		}
		items.push({
			value: `prop:${prop.name}`,
			label: prop.name,
			group: 'Props',
			keywords: kw.filter(Boolean),
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

	// Sections — navigable section anchors
	items.push({
		value: 'section:error-boundary',
		label: 'Error Boundary',
		group: 'Sections',
		keywords: ['error', 'boundary', 'validation', 'safeParse', 'fallback'],
	});
	if (hasDeps) {
		items.push({
			value: 'section:dependencies',
			label: 'Dependencies',
			group: 'Sections',
			keywords: ['deps', 'imports', 'internal', 'external', 'workspace', 'packages'],
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
	else if (section === 'section') selector = `#${id}`;

	if (selector) {
		document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' });
	}
}

</script>

<div class="w-full">
	<div class="sticky top-(--header-height) z-10 border-b bg-background px-8 pb-4 pt-10">
		<LensHeader {name} description={componentDescription} meta={lensMeta} {hasVariants} {hasExamples} hasSource={!!rawSource} {hasDeps} searchItems={loading || loadError ? [] : searchItems} onSearchSelect={handleSearchSelect} {prevComponent} {nextComponent} />
	</div>

	<div class="px-8 py-8">
	<svelte:boundary>
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
			{#if PrimaryComponent}
				<section id="default" class="scroll-mt-60">
					<h2 class="mb-3 flex items-center gap-2 text-lg font-semibold"><ComponentIcon class="size-5" /> Default</h2>
					<LensSection title="Default" description="Component rendered with default props.">
						<LensComponentRenderer component={PrimaryComponent} {props} tagName={toTag(name)} componentName={name} />
					</LensSection>
				</section>
			{/if}

			<!-- ═══ Error Boundary ═══ -->
			{#if PrimaryComponent}
				<section id="error-boundary" class="scroll-mt-60">
					<h2 class="mb-3 flex items-center gap-2 text-lg font-semibold"><ShieldAlert class="size-5" /> Error Boundary</h2>
					<div class="space-y-4">
						<LensSection title="Missing Required Props" description="Component rendered with no props — triggers safeParse validation and shows the error boundary fallback.">
							<LensComponentRenderer component={PrimaryComponent} tagName={toTag(name)} componentName={name} label="" silent={true} codeText={`<!-- Missing required props — validation error -->\n<${toTag(name)} />`} />
						</LensSection>
						<LensSection title="Invalid Props" description="Component rendered with an unknown prop key — triggers strictObject validation and shows the error boundary fallback.">
							<LensComponentRenderer component={PrimaryComponent} props={[{ name: '__invalid__', type: 'unknown', default: "'test'", optional: false, bindable: false, description: '' }]} tagName={toTag(name)} componentName={name} label="" silent={true} codeText={`<!-- Unknown prop key — strictObject rejection -->\n<${toTag(name)} __invalid__="test" />`} />
						</LensSection>
						<LensSection title="Only Required Props" description="Component rendered with only required props at minimum values — shows the baseline functional state.">
							<LensComponentRenderer component={PrimaryComponent} props={props.filter((p) => !p.optional && p.default === '')} tagName={toTag(name)} componentName={name} label="" codeText={`<!-- Only required props (minimum values) -->\n<${toTag(name)} ... />`} />
						</LensSection>
					</div>
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
									<LensSection title={example.title} description={example.description}>
										<LensComponentRenderer component={ExComponent} componentName={name} codeText={exSource}>
											{#snippet children()}
												<ExComponent />
											{/snippet}
										</LensComponentRenderer>
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

			<!-- ═══ Dependencies ═══ -->
			{#if hasDeps}
				<section id="dependencies" class="scroll-mt-60">
					<h2 class="mb-3 flex items-center gap-2 text-lg font-semibold"><GitFork class="size-5" /> Dependencies</h2>
					<LensDependencyTree {deps} {usedBy} currentComponent={name} sizes={componentSizes} knownComponents={componentNames} {rawSources} />
				</section>
			{/if}
		</div>
	{/if}
	{#snippet failed(error)}
		<LensError title="Page render error" description={error instanceof Error ? error.message : JSON.stringify(error)} />
	{/snippet}
	</svelte:boundary>
	</div>
</div>
