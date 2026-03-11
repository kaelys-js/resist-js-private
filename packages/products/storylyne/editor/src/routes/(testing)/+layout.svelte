<script lang="ts">
/**
 * Layout for the `(testing)` route group.
 *
 * Sits under the minimal root layout (CSS only) — the editor's app
 * shell (sidebar, header, resizable panes) lives in `(app)/+layout.svelte`.
 * Provides its own sidebar + breadcrumb chrome for the Lens documentation system.
 */
import { ModeWatcher, mode as derivedMode, setMode as rawSetMode } from 'mode-watcher';
import { page } from '$app/state';
import { storageKey } from '$lib/config/app-meta';
import type { Str } from '@/schemas/common';
import type { LensMeta, CategoryGroup, LensExample } from '@/ui/lens/types.js';
import type { Result } from '@/schemas/result/result';
import type { SearchItem } from '@/ui/search-autocomplete/search-item.js';
import { extractDir, toTitle, parseLensMeta, findPrimaryKey, extractComponentDescription } from '@/ui/lens/lens-utils.js';
import { extractProps } from '@/ui/lens/extract-props.js';
import { extractVariants } from '@/ui/lens/extract-variants.js';
import { extractDeps, type DepTree } from '@/ui/lens/extract-deps.js';
import { log } from '@/utils/core/logger';
import * as Sidebar from '@/ui/sidebar/index.js';
import * as Breadcrumb from '@/ui/breadcrumb/index.js';
import * as Collapsible from '@/ui/collapsible/index.js';
import CommandSearch from '@/ui/command-search/CommandSearch.svelte';
import SidebarToggle from '@/ui/sidebar-toggle/SidebarToggle.svelte';
import ModeToggle from '@/ui/mode-toggle/ModeToggle.svelte';
import Kbd from '@/ui/kbd/Kbd.svelte';
import AppLogo from '@/ui/app-logo/AppLogo.svelte';
import Badge from '@/ui/badge/badge.svelte';
import ComponentIcon from '@lucide/svelte/icons/component';
import SearchIcon from '@lucide/svelte/icons/search';
import * as Tooltip from '@/ui/tooltip/index.js';
import ChevronRight from '@lucide/svelte/icons/chevron-right';

const { children } = $props();

/**
 * Discover all component directories by globbing all .svelte files.
 * We extract unique directory names as the component listing.
 */
const allModules: Record<Str, unknown> = import.meta.glob('@/ui/*/*.svelte');

/**
 * Eagerly load lens.ts metadata for category grouping and search keywords.
 */
const lensMetaModules: Record<Str, { meta?: LensMeta; default?: LensExample[]; examples?: LensExample[] }> = import.meta.glob(
	'@/ui/*/lens.ts',
	{ import: '*', eager: true },
) as Record<Str, { meta?: LensMeta; default?: LensExample[]; examples?: LensExample[] }>;

/**
 * Raw .svelte sources for prop/variant extraction (global search).
 * Eager to avoid MIME type issues with Vite 7 + Svelte plugin.
 */
const rawSources: Record<Str, Str> = import.meta.glob(
	'@/ui/*/*.svelte',
	{ query: '?raw', import: 'default', eager: true },
) as Record<Str, Str>;

/**
 * Raw .ts sources for cross-file type resolution in prop extraction.
 */
const rawTsSources: Record<Str, Str> = import.meta.glob(
	'@/ui/*/*.ts',
	{ query: '?raw', import: 'default', eager: true },
) as Record<Str, Str>;

const componentNames: Str[] = [
	...new Set(Object.keys(allModules).map(extractDir)),
]
	.filter((n: Str): boolean => n.length > 0)
	.toSorted();

/**
 * Build a metadata lookup by component name from lens.ts glob results.
 * Each meta is validated against LensMetaSchema via the Result pattern.
 * Invalid metadata surfaces as a visible error in the sidebar.
 */
const metaByName: Map<Str, LensMeta> = new Map();
const metaErrors: Map<Str, Str> = new Map();
const examplesByName: Map<Str, LensExample[]> = new Map();
for (const [key, mod] of Object.entries(lensMetaModules)) {
	const dir: Str = extractDir(key);
	if (mod.meta) {
		const result: Result<LensMeta> = parseLensMeta(mod.meta);
		if (result.ok) {
			// Spread to unfreeze — Result.data is deep-frozen but Map<Str, LensMeta> needs mutable shape
			metaByName.set(dir, { ...result.data, tags: [...result.data.tags] });
		} else {
			// UI boundary — sidebar must render; error stored for visible indicator
			log.warn(`Invalid lens.ts for "${dir}": ${result.error.message}`);
			metaErrors.set(dir, result.error.message);
		}
	}
	const examples: unknown = mod.default ?? mod.examples;
	if (Array.isArray(examples) && examples.length > 0) {
		examplesByName.set(dir, examples as LensExample[]);
	}
}

/**
 * Group component names by category for sidebar rendering.
 * Components without metadata default to 'display'.
 */
const categoryOrder: Str[] = ['form', 'layout', 'overlay', 'navigation', 'display', 'utility', 'lens'];

const groupedComponents: CategoryGroup[] = categoryOrder
	.map((cat: Str): CategoryGroup => ({
		name: cat,
		label: cat.charAt(0).toUpperCase() + cat.slice(1),
		components: componentNames.filter((n: Str): boolean => {
			const m: LensMeta | undefined = metaByName.get(n);
			return (m?.category ?? 'display') === cat;
		}),
	}))
	.filter((g: CategoryGroup): boolean => g.components.length > 0);

/**
 * Build global search items with hierarchical grouping.
 *
 * Each component gets multiple groups using " › " as a hierarchy separator:
 *   Component Name          → "Go to Component" link
 *   Component › Props       → individual prop items
 *   Component › Variants    → individual variant items
 *   Component › Examples    → individual example items
 *   Component › Dependencies › UI Components / Workspace / External
 *
 * cmdk automatically hides groups with no matching items during search.
 */
const tsSources: Str[] = Object.values(rawTsSources);
const globalSearchItems: SearchItem[] = [];
for (const n of componentNames) {
	const m: LensMeta | undefined = metaByName.get(n);
	const title: Str = toTitle(n);
	const baseHref: Str = `/components/${n}`;

	// Component-level keywords (tags, category, descriptions)
	const componentKeywords: Str[] = [
		...(m?.tags ?? []),
		m?.category ?? '',
		m?.description ?? '',
	].filter((k: Str): boolean => k.length > 0);

	// — Component group: "Go to Component" link —
	const sourceKey: Str | undefined = findPrimaryKey(n, rawSources);
	if (sourceKey) {
		const src: Str = rawSources[sourceKey] ?? '';
		const jsdocDesc: Str | undefined = extractComponentDescription(src);
		if (jsdocDesc) componentKeywords.push(jsdocDesc);
	}
	globalSearchItems.push({
		value: n,
		label: `Go to ${title}`,
		href: baseHref,
		group: title,
		keywords: componentKeywords,
	});

	if (sourceKey) {
		const src: Str = rawSources[sourceKey] ?? '';
		const componentProps = extractProps(src, tsSources.length > 0 ? tsSources : undefined);
		const variants = extractVariants(src);
		const deps: DepTree = extractDeps(src);

		// — Props group —
		const propsGroup: Str = `${title} › Props`;
		if (componentProps.length > 0) {
			for (const prop of componentProps) {
				const propKeywords: Str[] = [n];
				if (prop.type) propKeywords.push(prop.type);
				if (prop.description) propKeywords.push(prop.description);
				globalSearchItems.push({
					value: `${n}/prop/${prop.name}`,
					label: prop.name,
					href: `${baseHref}#props`,
					group: propsGroup,
					keywords: propKeywords,
				});
			}
		} else {
			globalSearchItems.push({
				value: `${n}/props/empty`,
				label: 'No props',
				group: propsGroup,
				keywords: [n],
			});
		}

		// — Variants group —
		const variantsGroup: Str = `${title} › Variants`;
		if (variants && variants.variants.length > 0) {
			for (const vk of variants.variants) {
				globalSearchItems.push({
					value: `${n}/variant/${vk.key}`,
					label: vk.key,
					href: `${baseHref}#variant-${vk.key}`,
					group: variantsGroup,
					keywords: [n, ...vk.options],
				});
			}
		} else {
			globalSearchItems.push({
				value: `${n}/variants/empty`,
				label: 'No variants',
				group: variantsGroup,
				keywords: [n],
			});
		}

		// — Examples group —
		const examplesGroup: Str = `${title} › Examples`;
		const examples: LensExample[] | undefined = examplesByName.get(n);
		if (examples && examples.length > 0) {
			for (const ex of examples) {
				const exKeywords: Str[] = [n, ex.name];
				if (ex.description) exKeywords.push(ex.description);
				globalSearchItems.push({
					value: `${n}/example/${ex.name}`,
					label: ex.title,
					href: `${baseHref}#example-${ex.name}`,
					group: examplesGroup,
					keywords: exKeywords,
				});
			}
		} else {
			globalSearchItems.push({
				value: `${n}/examples/empty`,
				label: 'No examples',
				group: examplesGroup,
				keywords: [n],
			});
		}

		// — Dependencies groups (sub-categorized) —
		const hasDeps: boolean = deps.internal.length > 0 || deps.workspace.length > 0 || deps.external.length > 0;
		if (hasDeps) {
			globalSearchItems.push({
				value: `${n}/deps/header`,
				label: `Go to dependencies`,
				href: `${baseHref}#dependencies`,
				group: `${title} › Dependencies`,
				keywords: [n],
			});
		}
		const seenInternal: Set<Str> = new Set();
		if (deps.internal.length > 0) {
			for (const dep of deps.internal) {
				if (seenInternal.has(dep.component)) continue;
				seenInternal.add(dep.component);
				globalSearchItems.push({
					value: `${n}/dep/internal/${dep.component}`,
					label: toTitle(dep.component),
					href: `${baseHref}#dependencies`,
					group: `${title} › Dependencies › UI Components`,
					keywords: [n, ...dep.names],
				});
			}
		}
		const seenWorkspace: Set<Str> = new Set();
		if (deps.workspace.length > 0) {
			for (const dep of deps.workspace) {
				if (seenWorkspace.has(dep.path)) continue;
				seenWorkspace.add(dep.path);
				globalSearchItems.push({
					value: `${n}/dep/workspace/${dep.path}`,
					label: dep.path,
					href: `${baseHref}#dependencies`,
					group: `${title} › Dependencies › Workspace`,
					keywords: [n, ...dep.names],
				});
			}
		}
		const seenExternal: Set<Str> = new Set();
		if (deps.external.length > 0) {
			for (const dep of deps.external) {
				if (seenExternal.has(dep.path)) continue;
				seenExternal.add(dep.path);
				globalSearchItems.push({
					value: `${n}/dep/external/${dep.path}`,
					label: dep.path,
					href: `${baseHref}#dependencies`,
					group: `${title} › Dependencies › External`,
					keywords: [n, ...dep.names],
				});
			}
		}
		if (deps.internal.length === 0 && deps.workspace.length === 0 && deps.external.length === 0) {
			globalSearchItems.push({
				value: `${n}/deps/empty`,
				label: 'No dependencies',
				group: `${title} › Dependencies`,
				keywords: [n],
			});
		}
	} else {
		// No source found — show empty sections
		globalSearchItems.push(
			{ value: `${n}/props/empty`, label: 'No props', group: `${title} › Props`, keywords: [n] },
			{ value: `${n}/variants/empty`, label: 'No variants', group: `${title} › Variants`, keywords: [n] },
			{ value: `${n}/examples/empty`, label: 'No examples', group: `${title} › Examples`, keywords: [n] },
			{ value: `${n}/deps/empty`, label: 'No dependencies', group: `${title} › Dependencies`, keywords: [n] },
		);
	}
}

/** Current component name from the URL params. */
const currentName: Str = $derived(page.params.name ?? '');

/** Current mode from mode-watcher for the toggle. */
const currentMode: 'light' | 'dark' | 'system' = $derived(derivedMode.current ?? 'system');

/**
 * Wrapper around mode-watcher's `setMode` to accept `Str` (from shared ModeToggle).
 *
 * mode-watcher's `setMode` only accepts `'light' | 'dark' | 'system'` — the shared
 * ModeToggle passes generic `Str`. Cast is safe because the toggle only emits valid modes.
 *
 * @param m - The mode string to set
 */
const setMode = (m: Str): void => {
	// Shared ModeToggle only emits 'light' | 'dark' | 'system' — cast from Str is safe
	rawSetMode(m as 'light' | 'dark' | 'system');
};

/** Whether the global command search dialog is open. */
let searchOpen: boolean = $state(false);
</script>

<ModeWatcher
	defaultMode="system"
	disableTransitions={false}
	disableHeadScriptInjection
	modeStorageKey={storageKey('mode')}
	themeStorageKey={storageKey('theme')}
/>

<Sidebar.Provider
	class="min-h-svh"
	style="--sidebar-width: 280px; --header-height: calc(var(--spacing) * 12);"
>
	<Sidebar.Root>
		<Sidebar.Header>
			<div class="flex items-center gap-2 px-2 py-1.5">
				<AppLogo size={20} />
				<span class="text-sm font-semibold tracking-tight">Lens</span>
			</div>
		</Sidebar.Header>
		<Sidebar.Content>
			<Collapsible.Root open class="group/collapsible">
				<Sidebar.Group>
					<Sidebar.GroupLabel class="text-sm">
						{#snippet child({ props })}
							<Collapsible.Trigger {...props}>
								Components
								<ChevronRight
									class="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90"
								/>
							</Collapsible.Trigger>
						{/snippet}
					</Sidebar.GroupLabel>
					<Collapsible.Content>
						<Sidebar.GroupContent>
							{#each groupedComponents as group (group.name)}
								<Collapsible.Root open class="group/category mb-0.5">
									<Collapsible.Trigger
										class="flex w-full items-center gap-1.5 rounded-md px-3 py-1 transition-colors hover:bg-accent/50"
									>
										<ChevronRight class="size-3 text-muted-foreground/50 transition-transform group-data-[state=open]/category:rotate-90" />
										<span class="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">{group.label}</span>
										<Badge variant="secondary" class="ml-auto h-5 rounded px-1.5 text-[11px] leading-none">{group.components.length}</Badge>
									</Collapsible.Trigger>
									<Collapsible.Content>
										<Sidebar.Menu class="pl-4">
											{#each group.components as name (name)}
												{@const itemMeta = metaByName.get(name)}
												<Sidebar.MenuItem>
													<Tooltip.Root delayDuration={400}>
														<Tooltip.Trigger>
															{#snippet child({ props: tooltipProps })}
																<Sidebar.MenuButton isActive={currentName === name} {...tooltipProps}>
																	{#snippet child({ props })}
																		<a href="/components/{name}" {...props}>
																			<ComponentIcon class="size-4" />
																			<span>{toTitle(name)}</span>
																		</a>
																	{/snippet}
																</Sidebar.MenuButton>
															{/snippet}
														</Tooltip.Trigger>
														{#if itemMeta?.description}
															<Tooltip.Content side="right" sideOffset={8} class="max-w-64">
																<p class="text-xs">{itemMeta.description}</p>
																{#if itemMeta.tags.length > 0}
																	<div class="mt-1 flex flex-wrap gap-1">
																		{#each itemMeta.tags as tag (tag)}
																			<span class="rounded bg-primary-foreground/20 px-1 py-0.5 text-[10px]">{tag}</span>
																		{/each}
																	</div>
																{/if}
															</Tooltip.Content>
														{/if}
													</Tooltip.Root>
												</Sidebar.MenuItem>
											{/each}
										</Sidebar.Menu>
									</Collapsible.Content>
								</Collapsible.Root>
							{/each}
						</Sidebar.GroupContent>
					</Collapsible.Content>
				</Sidebar.Group>
			</Collapsible.Root>
		</Sidebar.Content>
	</Sidebar.Root>

	<Sidebar.Inset>
		<header
			class="sticky top-0 z-10 flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear"
		>
			<div class="flex w-full items-center gap-1 px-4">
				<SidebarToggle label="Toggle Sidebar" shortcutLabel="⌘B" />
				<Breadcrumb.Root>
					<Breadcrumb.List>
						<Breadcrumb.Item>
							{#if currentName}
								<Breadcrumb.Link href="/components">Lens</Breadcrumb.Link>
							{:else}
								<Breadcrumb.Page>Lens</Breadcrumb.Page>
							{/if}
						</Breadcrumb.Item>
						{#if currentName}
							<Breadcrumb.Separator />
							<Breadcrumb.Item>
								<Breadcrumb.Page>{toTitle(currentName)}</Breadcrumb.Page>
							</Breadcrumb.Item>
						{/if}
					</Breadcrumb.List>
				</Breadcrumb.Root>
				<div class="ml-auto flex items-center gap-2">
					<button
						type="button"
						class="inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
						onclick={() => { searchOpen = true; }}
						aria-label="Search components"
					>
						<SearchIcon class="size-4" />
						<span class="hidden sm:inline">Search...</span>
						<Kbd label="⌘K" class="ml-1" />
					</button>
					<ModeToggle
						mode={currentMode}
						{setMode}
						labels={{
							toggleTheme: 'Toggle theme',
							toggleMode: 'Toggle mode',
							light: 'Light',
							dark: 'Dark',
							system: 'System',
						}}
					/>
				</div>
			</div>
		</header>
		<main class="flex min-w-0 flex-1 flex-col select-text">
			{@render children()}
		</main>
	</Sidebar.Inset>
	<CommandSearch items={globalSearchItems} placeholder="Search lens..." emptyText="No matching results." bind:open={searchOpen} />
</Sidebar.Provider>
