<script lang="ts">
/**
 * Lens: auto-generated component documentation page.
 *
 * Extracts props, TV variants, and examples from raw component source
 * at runtime — no hand-written Demo.svelte files needed.
 */
import type { Bool, Str } from '@/schemas/common';
import type { Component } from 'svelte';
import type { PropMeta, VariantMeta, VariantKeyMeta, LensExample, LensMeta } from '@/ui/lens/types.js';
import { extractProps, extractDescription, extractPropsVariants, buildBaseProps } from '@/ui/lens/extract-props.js';
import { extractVariants } from '@/ui/lens/extract-variants.js';
import { extractDir, extractStem, toTitle, isInternalFile, findPrimaryKey } from '@/ui/lens/lens-utils.js';
import { page } from '$app/state';
import Badge from '@/ui/badge/badge.svelte';
import CopyImport from '@/ui/copy-import/CopyImport.svelte';
import LensEmpty from '@/ui/lens-empty/LensEmpty.svelte';
import LensSection from '@/ui/lens-section/LensSection.svelte';
import PropsTable from '@/ui/props-table/PropsTable.svelte';
import CodeBlock from '@/ui/code-block/CodeBlock.svelte';
import VariantGrid from '@/ui/variant-grid/VariantGrid.svelte';
import ComponentIcon from '@lucide/svelte/icons/component';

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

/** Live component modules for VariantGrid rendering. */
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

			// 2. Load live component for VariantGrid
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
				// Extract component meta (category, tags, description)
				if (lm.meta && typeof lm.meta === 'object') {
					lensMeta = lm.meta as LensMeta;
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

/** Base props for default render — fills required props with defaults/mocks/placeholders. */
const pageBaseProps: Record<Str, unknown> = $derived(buildBaseProps(props));

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
 * Generate a code snippet showing usage of a specific variant option.
 *
 * @param componentName - The component directory name (kebab-case)
 * @param propName - The prop/variant key name
 * @param optionValue - The selected option value
 * @returns A Svelte code snippet string
 */
function variantCodeSnippet(componentName: Str, propName: Str, optionValue: Str): Str {
	const tag: Str = toTag(componentName);
	return `<${tag} ${propName}="${optionValue}">Example</${tag}>`;
}

</script>

<div class="w-full px-8 py-10">
	<!-- Component header -->
	<div class="mb-8 flex items-start gap-4">
		<div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
			<ComponentIcon class="size-6 text-primary" />
		</div>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">{toTitle(name)}</h1>
			{#if componentDescription}
				<p class="mt-1 text-sm text-muted-foreground">{componentDescription}</p>
			{/if}
			{#if lensMeta}
				<div class="mt-2 flex flex-wrap items-center gap-1.5">
					<Badge variant="secondary" class="text-xs capitalize">{lensMeta.category}</Badge>
					{#each lensMeta.tags as tag (tag)}
						<Badge variant="outline" class="text-xs">{tag}</Badge>
					{/each}
				</div>
			{/if}
			<div class="mt-1.5">
				<CopyImport text="@/ui/{name}" copyText="import ... from '@/ui/{name}/...';" />
			</div>
		</div>
	</div>

	{#if loading}
		<div class="flex items-center justify-center rounded-xl border py-20">
			<div
				class="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
			></div>
		</div>
	{:else if loadError}
		<LensEmpty title={loadError} description="Check that the component exists and has a valid source file." variant="destructive" />
	{:else}
		<div class="space-y-10">
			<!-- ═══ Props ═══ -->
			<section>
				<h2 class="mb-3 text-lg font-semibold">Props</h2>
				<PropsTable {props} />
			</section>

			<!-- ═══ Default ═══ -->
			{#if PrimaryComponent && hasVariants}
				<section>
					<h2 class="mb-3 text-lg font-semibold">Default</h2>
					<LensSection title="Default" description="Component rendered with default props.">
						<div class="flex w-full items-center justify-center">
							<svelte:boundary>
								<PrimaryComponent {...pageBaseProps}>Example</PrimaryComponent>
								{#snippet failed()}
									<span class="text-xs text-muted-foreground">Preview unavailable</span>
								{/snippet}
							</svelte:boundary>
						</div>
					</LensSection>
				</section>
			{/if}

			<!-- ═══ Variants ═══ -->
			<section>
				<h2 class="mb-3 text-lg font-semibold">Variants</h2>
				{#if hasVariants && PrimaryComponent}
					<div class="space-y-4">
						{#each allVariants as variantKey (variantKey.key)}
							{@const singleMeta: VariantMeta = { variants: [variantKey] }}
							{@const codeLines: Str = variantKey.options.map((o: Str): Str => variantCodeSnippet(name, variantKey.key, o)).join('\n')}
							<LensSection title={toTitle(variantKey.key)} description="Options for the {variantKey.key} prop." propName={variantKey.key} codeText={codeLines}>
								{#snippet code()}
									<CodeBlock code={codeLines} lang="svelte" />
								{/snippet}
								<VariantGrid component={PrimaryComponent} meta={singleMeta} {props} />
							</LensSection>
						{/each}
					</div>
				{:else}
					<LensEmpty title="No renderable variants" description="This component has no detected variant props or TV definitions." />
				{/if}
			</section>

			<!-- ═══ Examples ═══ -->
			<section>
				<h2 class="mb-3 text-lg font-semibold">Examples</h2>
				{#if hasExamples}
					<div class="space-y-4">
						{#each lensExamples as example (example.name)}
							{@const ExComponent: Component | undefined = exampleComponents.get(example.name)}
							{@const exSource: Str = exampleSources.get(example.name) ?? ''}
							{#if ExComponent}
								<LensSection title={example.title} description={example.description} codeText={exSource}>
									{#snippet code()}
										{#if exSource}
											<CodeBlock code={exSource} lang="svelte" />
										{/if}
									{/snippet}
									<ExComponent />
								</LensSection>
							{/if}
						{/each}
					</div>
				{:else}
					<LensEmpty title="No hand-written examples" description="Add examples to this component's examples/ directory." />
				{/if}
			</section>

			<!-- ═══ Source ═══ -->
			{#if rawSource}
				<section>
					<h2 class="mb-3 text-lg font-semibold">Source</h2>
					<LensSection title={toTitle(name)} description="Component source code." codeText={rawSource}>
						{#snippet code()}
							<CodeBlock code={rawSource} lang="svelte" />
						{/snippet}
					</LensSection>
				</section>
			{/if}
		</div>
	{/if}
</div>
