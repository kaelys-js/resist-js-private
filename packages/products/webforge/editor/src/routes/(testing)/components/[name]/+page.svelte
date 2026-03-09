<script lang="ts">
import type { Num, Str } from '@/schemas/common';
import type { Component } from 'svelte';
import { page } from '$app/state';
import CopyImport from '@/ui/copy-import/CopyImport.svelte';
import SearchAutocomplete from '@/ui/search-autocomplete/SearchAutocomplete.svelte';
import type { SearchItem } from '@/ui/search-autocomplete/search-item.js';
import ChevronLeft from '@lucide/svelte/icons/chevron-left';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import ComponentIcon from '@lucide/svelte/icons/component';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';

/**
 * Dynamic demo renderer.
 *
 * Matches the URL `[name]` param against the auto-discovered glob of
 * `Demo.svelte` files and lazy-loads the matching component.
 */
// Vite's import.meta.glob return type is complex — let TS infer it.
const demoModules = import.meta.glob('@/ui/*/Demo.svelte');

/**
 * Extract component name from a glob key like `…/<name>/Demo.svelte`.
 *
 * @param key - The full glob-resolved module path
 * @returns The kebab-case component directory name, or empty string if unmatched
 */
const extractName = (key: Str): Str => {
	const match: RegExpMatchArray | null = key.match(/\/([^/]+)\/Demo\.svelte$/);
	return match?.[1] ?? '';
};

/**
 * Convert kebab-case to Title Case for display.
 *
 * @param n - A kebab-case string like `help-tooltip`
 * @returns Title-cased string like `Help Tooltip`
 */
const toTitle = (n: Str): Str =>
	n
		.split('-')
		.map((w: Str): Str => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');

const allNames: Str[] = Object.keys(demoModules)
	.map(extractName)
	.filter((n: Str): boolean => n.length > 0)
	.toSorted();

const name: Str = $derived(page.params.name ?? '');
const currentIndex: Num = $derived(allNames.indexOf(name));
const prevName: Str | null = $derived(currentIndex > 0 ? allNames[currentIndex - 1] : null);
const nextName: Str | null = $derived(
	currentIndex < allNames.length - 1 ? allNames[currentIndex + 1] : null,
);

const matchingKey: Str | undefined = $derived(
	Object.keys(demoModules).find((key: Str): boolean => extractName(key) === name),
);

/** Search items for navigating between components. */
const searchItems: SearchItem[] = allNames.map(
	(n: Str): SearchItem => ({
		value: n,
		label: toTitle(n),
		href: `/components/${n}`,
	}),
);

let DemoComponent: Component | null = $state(null);
let loadError: Str | null = $state(null);

$effect(() => {
	DemoComponent = null;
	loadError = null;

	if (!matchingKey) {
		loadError = `No demo found for component "${name}"`;
		return;
	}

	const loader = matchingKey ? demoModules[matchingKey] : undefined;
	if (!loader) {
		loadError = `Loader missing for "${name}"`;
		return;
	}

	/**
	 * Lazy-load the demo module and extract the default export.
	 * Wrapped in an async IIFE because $effect callbacks are synchronous.
	 */
	(async (): Promise<void> => {
		try {
			const mod: unknown = await loader();
			// Glob modules export { default: SvelteComponent } — cast from unknown
			const m = mod as Record<Str, unknown>;
			DemoComponent = m.default as Component;
		} catch {
			/* Dynamic import failed — show error state instead of blank page */
			loadError = `Failed to load demo for "${name}"`;
		}
	})();
});
</script>

<div class="w-full px-8 py-10">
	<!-- Breadcrumb nav -->
	<div class="mb-6 flex items-center justify-between">
		<div class="flex items-center gap-2 text-sm">
			<a
				href="/components"
				class="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
			>
				<ArrowLeft class="size-3.5" />
				Gallery
			</a>
			<span class="text-muted-foreground/40">/</span>
			<span class="font-medium">{toTitle(name)}</span>
		</div>
		<SearchAutocomplete
			items={searchItems}
			placeholder="Search components..."
			emptyText="No matching components."
		/>
	</div>

	<!-- Component header -->
	<div class="mb-8 flex items-start gap-4">
		<div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
			<ComponentIcon class="size-6 text-primary" />
		</div>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">{toTitle(name)}</h1>
			<div class="mt-1.5">
				<CopyImport text="@/ui/{name}" copyText="import ... from '@/ui/{name}/...';" />
			</div>
		</div>
	</div>

	<!-- Demo area -->
	{#if loadError}
		<div class="flex flex-col items-center justify-center rounded-lg border border-dashed border-destructive/50 bg-destructive/5 py-20 text-center">
			<p class="text-sm font-medium text-destructive">{loadError}</p>
		</div>
	{:else if DemoComponent}
		<DemoComponent />
	{:else}
		<div class="flex items-center justify-center rounded-xl border py-20">
			<div class="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"></div>
		</div>
	{/if}

	<!-- Prev / Next navigation -->
	{#if prevName || nextName}
		<div class="mt-8 flex items-center justify-between">
			{#if prevName}
				<a
					href="/components/{prevName}"
					class="group flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
				>
					<ChevronLeft class="size-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
					<div class="text-left">
						<span class="block text-xs text-muted-foreground">Previous</span>
						<span class="font-medium">{toTitle(prevName)}</span>
					</div>
				</a>
			{:else}
				<div></div>
			{/if}
			{#if nextName}
				<a
					href="/components/{nextName}"
					class="group flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
				>
					<div class="text-right">
						<span class="block text-xs text-muted-foreground">Next</span>
						<span class="font-medium">{toTitle(nextName)}</span>
					</div>
					<ChevronRight class="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
				</a>
			{/if}
		</div>
	{/if}
</div>
