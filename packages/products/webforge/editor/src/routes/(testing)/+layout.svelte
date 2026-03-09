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
import type { LensMeta, CategoryGroup } from '@/ui/lens/types.js';
import { extractDir, toTitle } from '@/ui/lens/lens-utils.js';
import * as Sidebar from '@/ui/sidebar/index.js';
import * as Breadcrumb from '@/ui/breadcrumb/index.js';
import * as Collapsible from '@/ui/collapsible/index.js';
import SearchAutocomplete from '@/ui/search-autocomplete/SearchAutocomplete.svelte';
import type { SearchItem } from '@/ui/search-autocomplete/search-item.js';
import SidebarToggle from '@/ui/sidebar-toggle/SidebarToggle.svelte';
import ModeToggle from '@/ui/mode-toggle/ModeToggle.svelte';
import AppLogo from '@/ui/app-logo/AppLogo.svelte';
import Badge from '@/ui/badge/badge.svelte';
import ComponentIcon from '@lucide/svelte/icons/component';
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
const lensMetaModules: Record<Str, { meta?: LensMeta }> = import.meta.glob(
	'@/ui/*/lens.ts',
	{ import: '*', eager: true },
) as Record<Str, { meta?: LensMeta }>;

const componentNames: Str[] = [
	...new Set(Object.keys(allModules).map(extractDir)),
]
	.filter((n: Str): boolean => n.length > 0)
	.toSorted();

/**
 * Build a metadata lookup by component name from lens.ts glob results.
 */
const metaByName: Map<Str, LensMeta> = new Map();
for (const [key, mod] of Object.entries(lensMetaModules)) {
	const dir: Str = extractDir(key);
	if (mod.meta) {
		metaByName.set(dir, mod.meta);
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

/** Search items for the autocomplete — one per discovered component with keywords. */
const searchItems: SearchItem[] = componentNames.map(
	(n: Str): SearchItem => {
		const m: LensMeta | undefined = metaByName.get(n);
		const keywords: Str[] = [
			...(m?.tags ?? []),
			m?.category ?? '',
			m?.description ?? '',
		].filter((k: Str): boolean => k.length > 0);

		return {
			value: n,
			label: toTitle(n),
			href: `/components/${n}`,
			group: m?.category ? m.category.charAt(0).toUpperCase() + m.category.slice(1) : undefined,
			keywords,
		};
	},
);

/** Current component name from the URL params. */
const currentName: Str = $derived(page.params.name ?? '');

/** Current mode from mode-watcher for the toggle. */
const currentMode: Str = $derived(derivedMode.current ?? 'system');

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
			<div class="px-2 pb-2">
				<SearchAutocomplete
					items={searchItems}
					placeholder="Find components"
					emptyText="No matching components."
					class="w-full"
				/>
			</div>
		</Sidebar.Header>
		<Sidebar.Content>
			<Collapsible.Root open class="group/collapsible">
				<Sidebar.Group>
					<Sidebar.GroupLabel>
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
										<span class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">{group.label}</span>
										<Badge variant="secondary" class="h-4 rounded px-1 text-[10px] leading-none">{group.components.length}</Badge>
									</Collapsible.Trigger>
									<Collapsible.Content>
										<Sidebar.Menu>
											{#each group.components as name (name)}
												<Sidebar.MenuItem>
													<Sidebar.MenuButton isActive={currentName === name}>
														{#snippet child({ props })}
															<a href="/components/{name}" {...props}>
																<ComponentIcon class="size-4" />
																<span>{toTitle(name)}</span>
															</a>
														{/snippet}
													</Sidebar.MenuButton>
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
		<main class="flex flex-1 flex-col">
			{@render children()}
		</main>
	</Sidebar.Inset>
</Sidebar.Provider>
