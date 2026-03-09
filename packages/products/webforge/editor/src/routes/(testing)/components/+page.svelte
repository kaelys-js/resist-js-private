<script lang="ts">
import type { Num, Str } from '@/schemas/common';
import SearchAutocomplete from '@/ui/search-autocomplete/SearchAutocomplete.svelte';
import type { SearchItem } from '@/ui/search-autocomplete/search-item.js';
import LayoutGrid from '@lucide/svelte/icons/layout-grid';
import Component from '@lucide/svelte/icons/component';
import ArrowRight from '@lucide/svelte/icons/arrow-right';

/**
 * Auto-discovered component gallery.
 *
 * Any `Demo.svelte` placed inside an `@/ui/<name>/` directory is picked up
 * automatically by `import.meta.glob` — no manual registration needed.
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
 * @param name - A kebab-case string like `help-tooltip`
 * @returns Title-cased string like `Help Tooltip`
 */
const toTitle = (name: Str): Str =>
	name
		.split('-')
		.map((w: Str): Str => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');

const componentNames: Str[] = Object.keys(demoModules)
	.map(extractName)
	.filter((n: Str): boolean => n.length > 0)
	.toSorted();

const count: Num = componentNames.length;

/** Search items for the autocomplete — one per discovered component. */
const searchItems: SearchItem[] = componentNames.map(
	(n: Str): SearchItem => ({
		value: n,
		label: toTitle(n),
		href: `/components/${n}`,
	}),
);
</script>

<div class="mx-auto w-full max-w-5xl px-8 py-10">
	<!-- Header -->
	<div class="mb-10 flex items-start justify-between gap-4">
		<div class="flex items-start gap-4">
			<div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
				<LayoutGrid class="size-6 text-primary" />
			</div>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">Component Gallery</h1>
				<p class="mt-1 text-muted-foreground">
					{count} shared component{count === 1 ? '' : 's'} with interactive demos.
				</p>
			</div>
		</div>
		<SearchAutocomplete
			items={searchItems}
			placeholder="Search components..."
			emptyText="No matching components."
		/>
	</div>

	<!-- How-to banner -->
	<div class="mb-8 rounded-lg border border-dashed border-muted-foreground/25 bg-muted/40 px-5 py-4">
		<p class="text-sm text-muted-foreground">
			<strong class="text-foreground">Auto-discovered.</strong> Drop a
			<code class="rounded bg-background px-1.5 py-0.5 text-xs font-mono">Demo.svelte</code>
			into any
			<code class="rounded bg-background px-1.5 py-0.5 text-xs font-mono">@/ui/&lt;name&gt;/</code>
			directory — it appears here automatically. No registration needed.
		</p>
	</div>

	<!-- Component grid -->
	{#if count === 0}
		<div class="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
			<Component class="mb-3 size-10 text-muted-foreground/50" />
			<p class="text-sm font-medium text-muted-foreground">No demos found</p>
			<p class="mt-1 text-xs text-muted-foreground/70">
				Create a Demo.svelte file in any @/ui component directory to get started.
			</p>
		</div>
	{:else}
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each componentNames as name (name)}
				<a
					href="/components/{name}"
					class="group flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
				>
					<div class="flex items-center gap-3">
						<div class="flex size-9 items-center justify-center rounded-md bg-muted">
							<Component class="size-4 text-muted-foreground" />
						</div>
						<div>
							<span class="text-sm font-medium">{toTitle(name)}</span>
							<span class="block text-xs text-muted-foreground font-mono">@/ui/{name}</span>
						</div>
					</div>
					<ArrowRight class="size-4 text-muted-foreground/0 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
				</a>
			{/each}
		</div>
	{/if}
</div>
