<script lang="ts">
/**
 * Lens: auto-generated component documentation page.
 *
 * Extracts props, TV variants, and examples from raw component source
 * at runtime — no hand-written Demo.svelte files needed.
 */
import type { Bool, Num, Str, Void } from '@/schemas/common';
import { tick, type Component } from 'svelte';
import { slide } from 'svelte/transition';
import type { PropMeta, VariantMeta, VariantKeyMeta, LensExample, LensMeta } from '@/ui/lens/types.js';
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
import LensDependencyTree from '@/ui/lens-dependency-tree/LensDependencyTree.svelte';
import PropsTable from '@/ui/lens-props-table/PropsTable.svelte';
import LensComponentRenderer from '@/ui/lens-component-renderer/LensComponentRenderer.svelte';
import CodeBlock from '@/ui/code-block/CodeBlock.svelte';
import TableProperties from '@lucide/svelte/icons/table-properties';
import ComponentIcon from '@lucide/svelte/icons/component';
import ShieldAlert from '@lucide/svelte/icons/shield-alert';
import Layers from '@lucide/svelte/icons/layers';
import BookOpen from '@lucide/svelte/icons/book-open';
import GitFork from '@lucide/svelte/icons/git-fork';
import FileCode from '@lucide/svelte/icons/file-code';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import SearchX from '@lucide/svelte/icons/search-x';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';

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
let lensContextWrapper: Component | null = $state(null);
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
	lensContextWrapper = null;
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
				// Load optional context wrapper component (e.g. DropdownMenu.Root for Sub-menu components)
				if (typeof lm.contextWrapper === 'function') {
					lensContextWrapper = lm.contextWrapper as Component;
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
/** Compound components require parent context — silence auto-preview console warnings. */
const isCompound: Bool = $derived.by((): Bool => {
	if (!lensMeta) return false;
	return lensMeta.tags.includes('compound');
});

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

/* ------------------------------------------------------------------ */
/*  Section collapsibility                                            */
/* ------------------------------------------------------------------ */

/** All page sections are expanded by default. */
let sectionOpen: Record<Str, Bool> = $state({
	props: true,
	default: true,
	'error-boundary': true,
	variants: true,
	examples: true,
	source: true,
	dependencies: true,
});

/**
 * Toggle a section open/closed.
 *
 * @param id - Section identifier key
 */
function toggleSection(id: Str): Void {
	sectionOpen[id] = !sectionOpen[id];
}

/**
 * Listen for `lens:scroll-to` events from LensHeader.
 * Opens the target section if collapsed, waits a tick for DOM update,
 * then smooth-scrolls to it.
 */
$effect(() => {
	async function handleScrollTo(e: Event): Promise<void> {
		const id: Str = (e as CustomEvent).detail;
		// Open the section if collapsed
		if (sectionOpen[id] === false) {
			sectionOpen[id] = true;
		}
		await tick();
		document.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
	function handleExpandAll(): Void {
		for (const key of Object.keys(sectionOpen)) {
			sectionOpen[key] = true;
		}
	}
	function handleCollapseAll(): Void {
		for (const key of Object.keys(sectionOpen)) {
			sectionOpen[key] = false;
		}
	}
	document.addEventListener('lens:scroll-to', handleScrollTo);
	document.addEventListener('lens:expand-all', handleExpandAll);
	document.addEventListener('lens:collapse-all', handleCollapseAll);
	return (): void => {
		document.removeEventListener('lens:scroll-to', handleScrollTo);
		document.removeEventListener('lens:expand-all', handleExpandAll);
		document.removeEventListener('lens:collapse-all', handleCollapseAll);
	};
});

</script>

<div class="w-full">
	{#if !loadError}
		<div class="sticky top-(--header-height) z-10 border-b bg-background px-8 pb-4 pt-10">
			<LensHeader {name} description={componentDescription} meta={lensMeta} {hasVariants} {hasExamples} hasSource={!!rawSource} {hasDeps} {prevComponent} {nextComponent} />
		</div>
	{/if}

	<div class="px-8 py-8">
	<svelte:boundary>
	{#if loading}
		<div class="flex items-center justify-center rounded-xl border py-20">
			<div
				class="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
			></div>
		</div>
	{:else if loadError}
		<div class="flex flex-col items-center justify-center py-20 text-center">
			<SearchX class="mb-4 size-12 text-muted-foreground/30" strokeWidth={1.5} />
			<h2 class="text-lg font-semibold text-muted-foreground">Component not found</h2>
			<p class="mt-1 max-w-sm text-sm text-muted-foreground/70">There is no component named "{name}". Check the URL or use search to find what you're looking for.</p>
			<a href="/components" class="mt-6 inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
				<ArrowLeft class="size-4" />
				Back to gallery
			</a>
		</div>
	{:else}
		<div class="space-y-10">
			<!-- ═══ Props ═══ -->
			<section id="props" class="scroll-mt-60">
				<button type="button" onclick={() => toggleSection('props')} class="mb-3 flex w-full items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80">
					<ChevronRight class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen.props ? 'rotate-90' : ''}" />
					<TableProperties class="size-5" /> Props
				</button>
				{#if sectionOpen.props}
					<div transition:slide={{ duration: 200 }}>
						<PropsTable {props} variantKeys={allVariants.map((v) => v.key)} />
					</div>
				{/if}
			</section>

			<!-- ═══ Default ═══ -->
			{#if PrimaryComponent}
				<section id="default" class="scroll-mt-60">
					<button type="button" onclick={() => toggleSection('default')} class="mb-3 flex w-full items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80">
						<ChevronRight class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen.default ? 'rotate-90' : ''}" />
						<ComponentIcon class="size-5" /> Default
					</button>
					{#if sectionOpen.default}
						<div transition:slide={{ duration: 200 }}>
							<LensSection title="Default" description="Component rendered with default props.">
								<LensComponentRenderer component={PrimaryComponent} {props} tagName={toTag(name)} componentName={name} silent={isCompound} contextWrapper={lensContextWrapper ?? undefined} />
							</LensSection>
						</div>
					{/if}
				</section>
			{/if}

			<!-- ═══ Error Boundary ═══ -->
			{#if PrimaryComponent}
				<section id="error-boundary" class="scroll-mt-60">
					<button type="button" onclick={() => toggleSection('error-boundary')} class="mb-3 flex w-full items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80">
						<ChevronRight class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen['error-boundary'] ? 'rotate-90' : ''}" />
						<ShieldAlert class="size-5" /> Error Boundary
					</button>
					{#if sectionOpen['error-boundary']}
					<div transition:slide={{ duration: 200 }}>
					<div class="space-y-4">
						<LensSection title="Missing Required Props" description="Component rendered with no props — triggers safeParse validation and shows the error boundary fallback.">
							<LensComponentRenderer component={PrimaryComponent} tagName={toTag(name)} componentName={name} label="" silent={true} contextWrapper={lensContextWrapper ?? undefined} codeText={`<!-- Missing required props — validation error -->\n<${toTag(name)} />`} />
						</LensSection>
						<LensSection title="Invalid Props" description="Component rendered with an unknown prop key — triggers strictObject validation and shows the error boundary fallback.">
							<LensComponentRenderer component={PrimaryComponent} props={[{ name: '__invalid__', type: 'unknown', default: "'test'", optional: false, bindable: false, description: '' }]} tagName={toTag(name)} componentName={name} label="" silent={true} contextWrapper={lensContextWrapper ?? undefined} codeText={`<!-- Unknown prop key — strictObject rejection -->\n<${toTag(name)} __invalid__="test" />`} />
						</LensSection>
						<LensSection title="Only Required Props" description="Component rendered with only required props at minimum values — shows the baseline functional state.">
							<LensComponentRenderer component={PrimaryComponent} props={props.filter((p) => !p.optional && p.default === '')} tagName={toTag(name)} componentName={name} label="" silent={isCompound} contextWrapper={lensContextWrapper ?? undefined} codeText={`<!-- Only required props (minimum values) -->\n<${toTag(name)} ... />`} />
						</LensSection>
					</div>
					</div>
					{/if}
				</section>
			{/if}

			<!-- ═══ Variants ═══ -->
			<section id="variants" class="scroll-mt-60">
				<button type="button" onclick={() => toggleSection('variants')} class="mb-3 flex w-full items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80">
					<ChevronRight class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen.variants ? 'rotate-90' : ''}" />
					<Layers class="size-5" /> Variants
				</button>
				{#if sectionOpen.variants}
					<div transition:slide={{ duration: 200 }}>
						{#if hasVariants && PrimaryComponent}
							<div class="space-y-4">
								{#each allVariants as variantKey (variantKey.key)}
									{@const singleMeta: VariantMeta = { variants: [variantKey] }}
									<div id="variant-{variantKey.key}" class="scroll-mt-60">
										<LensSection title={toTitle(variantKey.key)} description="Options for the {variantKey.key} prop." propName={variantKey.key}>
											<LensComponentRenderer component={PrimaryComponent} meta={singleMeta} {props} tagName={toTag(name)} componentName={name} silent={isCompound} contextWrapper={lensContextWrapper ?? undefined} />
										</LensSection>
									</div>
								{/each}
							</div>
						{:else}
							<LensEmpty title="No variants detected" description="Add a tv() call in the component's <script module> to auto-generate variant cards." />
						{/if}
					</div>
				{/if}
			</section>

			<!-- ═══ Examples ═══ -->
			<section id="examples" class="scroll-mt-60">
				<button type="button" onclick={() => toggleSection('examples')} class="mb-3 flex w-full items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80">
					<ChevronRight class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen.examples ? 'rotate-90' : ''}" />
					<BookOpen class="size-5" /> Examples
				</button>
				{#if sectionOpen.examples}
					<div transition:slide={{ duration: 200 }}>
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
							<LensEmpty title="No examples" description="Create a lens.ts and examples/ directory in this component's folder to add live examples." />
						{/if}
					</div>
				{/if}
			</section>

			<!-- ═══ Source ═══ -->
			{#if rawSource}
				<section id="source" class="scroll-mt-60">
					<button type="button" onclick={() => toggleSection('source')} class="mb-3 flex w-full items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80">
						<ChevronRight class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen.source ? 'rotate-90' : ''}" />
						<FileCode class="size-5" /> Source
					</button>
					{#if sectionOpen.source}
						<div transition:slide={{ duration: 200 }}>
							<LensSection title={toTitle(name)} description="Component source code." codeText={rawSource}>
								{#snippet code()}
									<CodeBlock code={rawSource} lang="svelte" />
								{/snippet}
							</LensSection>
						</div>
					{/if}
				</section>
			{/if}

			<!-- ═══ Dependencies ═══ -->
			{#if hasDeps}
				<section id="dependencies" class="scroll-mt-60">
					<button type="button" onclick={() => toggleSection('dependencies')} class="mb-3 flex w-full items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80">
						<ChevronRight class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen.dependencies ? 'rotate-90' : ''}" />
						<GitFork class="size-5" /> Dependencies
					</button>
					{#if sectionOpen.dependencies}
						<div transition:slide={{ duration: 200 }}>
							<LensDependencyTree {deps} {usedBy} currentComponent={name} sizes={componentSizes} knownComponents={componentNames} {rawSources} />
						</div>
					{/if}
				</section>
			{/if}
		</div>
	{/if}
	{#snippet failed(error)}
		<div class="overflow-hidden rounded-lg border border-dashed">
			<LensError title="Page render error" description={error instanceof Error ? error.message : String(error)} class="rounded-none border-0 py-4" />
			<div class="max-h-64 overflow-auto border-t bg-muted/20 text-xs">
				<CodeBlock code={error instanceof Error ? JSON.stringify({ name: error.name, message: error.message, stack: error.stack }, null, 2) : JSON.stringify(error, null, 2)} lang="json" />
			</div>
		</div>
	{/snippet}
	</svelte:boundary>
	</div>
</div>
