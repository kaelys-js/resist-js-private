<script lang="ts">
/**
 * Isolation page: renders a single component with zero chrome.
 *
 * Opened via "Open in new tab" from LensComponentRenderer cards.
 * Supports optional ?variant=key&option=value query params.
 */
import type { Bool, Str } from '@/schemas/common';
import type { Component } from 'svelte';
import type { PropMeta, VariantMeta } from '@/ui/lens/types.js';
import { extractProps, extractDescription, buildBaseProps } from '@/ui/lens/extract-props.js';
import { extractVariants } from '@/ui/lens/extract-variants.js';
import { extractDir, extractStem, toTitle, isInternalFile, findPrimaryKey } from '@/ui/lens/lens-utils.js';
import { page } from '$app/state';
import LensError from '@/ui/lens-error/LensError.svelte';

/* ------------------------------------------------------------------ */
/*  Globs                                                             */
/* ------------------------------------------------------------------ */

/**
 * Raw .svelte sources for prop/variant extraction.
 *
 * Eager for the Vite 7 + Svelte MIME type reason.
 */
const rawSources: Record<Str, Str> = import.meta.glob(
	'@/ui/*/*.svelte',
	{ query: '?raw', import: 'default', eager: true },
) as Record<Str, Str>;

/** Live component modules for rendering. */
const componentModules: Record<Str, () => Promise<unknown>> = import.meta.glob(
	'@/ui/*/*.svelte',
);

/* ------------------------------------------------------------------ */
/*  Reactive state                                                    */
/* ------------------------------------------------------------------ */

const name: Str = $derived(page.params.name ?? '');
const variantParam: Str = $derived(page.url.searchParams.get('variant') ?? '');
const optionParam: Str = $derived(page.url.searchParams.get('option') ?? '');

let PrimaryComponent: Component | null = $state(null);
let props: PropMeta[] = $state([]);
let componentDescription: Str = $state('');
let loading: Bool = $state(true);
let loadError: Str | null = $state(null);

$effect(() => {
	const currentName: Str = name;
	let cancelled: Bool = false;

	PrimaryComponent = null;
	props = [];
	componentDescription = '';
	loading = true;
	loadError = null;

	if (!currentName) {
		loading = false;
		loadError = 'No component name specified.';
		return;
	}

	(async (): Promise<void> => {
		try {
			// Load raw source for prop extraction
			const sourceKey: Str | undefined = findPrimaryKey(currentName, rawSources);
			if (!sourceKey) {
				if (!cancelled) loadError = `No source found for "${currentName}"`;
				return;
			}

			const srcStr: Str = rawSources[sourceKey] ?? '';
			props = extractProps(srcStr);
			componentDescription = extractDescription(srcStr);

			// Load live component
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
			} else if (!cancelled) {
				loadError = `Component "${currentName}" not found`;
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

const baseProps: Record<Str, unknown> = $derived(buildBaseProps(props));

/** Build variant props from URL query params. */
const variantProps: Record<Str, Str | boolean | number> = $derived.by(() => {
	if (!variantParam || !optionParam) return {};
	if (optionParam === 'true' || optionParam === 'false') {
		return { [variantParam]: optionParam === 'true' };
	}
	if (!Number.isNaN(Number(optionParam)) && optionParam !== '') {
		return { [variantParam]: Number(optionParam) };
	}
	return { [variantParam]: optionParam };
});
</script>

<svelte:head>
	<title>{toTitle(name)} — Lens Isolation</title>
</svelte:head>

<div class="flex min-h-svh items-center justify-center bg-background p-8">
	{#if loading}
		<div class="flex items-center justify-center">
			<div
				class="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
			></div>
		</div>
	{:else if loadError}
		<LensError title={loadError} description="Check that the component exists and has a valid source file." />
	{:else if PrimaryComponent}
		<div class="flex flex-col items-center gap-4">
			<div class="text-xs text-muted-foreground">
				{toTitle(name)}
				{#if variantParam}
					<span class="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
						{variantParam}="{optionParam}"
					</span>
				{/if}
			</div>
			<svelte:boundary>
				<PrimaryComponent {...baseProps} {...variantProps}>
					Example
				</PrimaryComponent>
				{#snippet failed(error)}
					<LensError
						title="Render failed"
						description={error instanceof Error ? error.message : (typeof error === 'object' && error !== null && 'message' in error ? String((error as Record<string, unknown>).message) : String(error))}
					/>
				{/snippet}
			</svelte:boundary>
		</div>
	{/if}
</div>
