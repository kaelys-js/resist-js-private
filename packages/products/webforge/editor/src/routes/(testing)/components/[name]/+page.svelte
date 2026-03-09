<script lang="ts">
/**
 * Dynamic demo renderer for a single component.
 *
 * Matches the URL `[name]` param against the auto-discovered glob of
 * `Demo.svelte` files and lazy-loads the matching component. Breadcrumb
 * and search are handled by the parent layout.
 */
import type { Str } from '@/schemas/common';
import type { Component } from 'svelte';
import { page } from '$app/state';
import CopyImport from '@/ui/copy-import/CopyImport.svelte';
import ComponentIcon from '@lucide/svelte/icons/component';

/** Vite's import.meta.glob return type is complex — let TS infer it. */
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

const name: Str = $derived(page.params.name ?? '');

const matchingKey: Str | undefined = $derived(
	Object.keys(demoModules).find((key: Str): boolean => extractName(key) === name),
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
		<div
			class="flex flex-col items-center justify-center rounded-lg border border-dashed border-destructive/50 bg-destructive/5 py-20 text-center"
		>
			<p class="text-sm font-medium text-destructive">{loadError}</p>
		</div>
	{:else if DemoComponent}
		<DemoComponent />
	{:else}
		<div class="flex items-center justify-center rounded-xl border py-20">
			<div
				class="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
			></div>
		</div>
	{/if}
</div>
