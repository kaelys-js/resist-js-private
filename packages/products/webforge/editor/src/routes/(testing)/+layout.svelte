<script lang="ts">
/**
 * Layout for the `(testing)` route group.
 *
 * Sits under the minimal root layout (CSS only) — the editor's app
 * shell (sidebar, header, resizable panes) lives in `(app)/+layout.svelte`.
 * Provides its own sidebar + breadcrumb chrome for the component gallery.
 */
import { ModeWatcher, mode as derivedMode, setMode as rawSetMode } from 'mode-watcher';
import { page } from '$app/state';
import { storageKey } from '$lib/config/app-meta';
import type { Str, Num } from '@/schemas/common';
import * as Sidebar from '@/ui/sidebar/index.js';
import * as Breadcrumb from '@/ui/breadcrumb/index.js';
import * as Collapsible from '@/ui/collapsible/index.js';
import SearchAutocomplete from '@/ui/search-autocomplete/SearchAutocomplete.svelte';
import type { SearchItem } from '@/ui/search-autocomplete/search-item.js';
import SidebarToggle from '@/ui/sidebar-toggle/SidebarToggle.svelte';
import ModeToggle from '@/ui/mode-toggle/ModeToggle.svelte';
import ComponentIcon from '@lucide/svelte/icons/component';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import LayoutGrid from '@lucide/svelte/icons/layout-grid';

const { children } = $props();

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
				<div class="flex size-7 items-center justify-center rounded-md bg-primary/10">
					<LayoutGrid class="size-4 text-primary" />
				</div>
				<span class="text-sm font-semibold tracking-tight">Component Gallery</span>
			</div>
			<div class="px-2 pb-2">
				<SearchAutocomplete
					items={searchItems}
					placeholder="Search {count} components..."
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
							<Sidebar.Menu>
								{#each componentNames as name (name)}
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
								<Breadcrumb.Link href="/components">Gallery</Breadcrumb.Link>
							{:else}
								<Breadcrumb.Page>Gallery</Breadcrumb.Page>
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
