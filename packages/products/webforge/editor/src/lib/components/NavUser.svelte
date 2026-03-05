<script lang="ts">
import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
import Folder from '@lucide/svelte/icons/folder';
import SettingsIcon from '@lucide/svelte/icons/settings';
import * as Avatar from '$lib/components/ui/avatar/index.js';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import ThemeSwitcher from './ThemeSwitcher.svelte';
import LanguageSwitcher from './LanguageSwitcher.svelte';
import { localeStore, t } from '$lib/i18n.svelte';
import { useEditorStore } from '$lib/stores/editor-state.svelte';
import type { ServerProject } from '$lib/server/data/types';
import type { Str } from '@/schemas/common';

let { project = null }: { project?: ServerProject | null } = $props();

const store: ReturnType<typeof useEditorStore> = useEditorStore();
const sidebar: ReturnType<typeof Sidebar.useSidebar> = Sidebar.useSidebar();

/** Display name from project or fallback. */
const projectName: Str = $derived(project?.name ?? 'Project');

/** Subtitle from project or fallback dash. */
const projectSubtitle: Str = $derived(project?.subtitle || '\u2014');

/** Monogram from the project name (e.g. "My Project" → "MP", "Project" → "P"). */
const monogram: Str = $derived(
	projectName
		.split(/\s+/)
		.slice(0, 2)
		.map((w: Str) => w[0]?.toUpperCase() ?? '')
		.join(''),
);
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuButton
						size="lg"
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						{...props}
					>
						{#if store.features.projectDropdownIcon}
							<Avatar.Root class="h-8 w-8 rounded-lg shadow-sm">
								<Avatar.Image src="" alt={projectName} />
								<Avatar.Fallback class="rounded-lg text-xs font-medium">
									{monogram}
								</Avatar.Fallback>
							</Avatar.Root>
						{/if}
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-medium">{projectName}</span>
							<span class="truncate text-xs text-muted-foreground"
								>{projectSubtitle}</span
							>
						</div>
						<ChevronsUpDown aria-hidden="true" class="ml-auto size-4" />
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				class="w-[--bits-dropdown-menu-anchor-width] min-w-56 rounded-lg bg-white/[0.08] dark:bg-white/[0.06] backdrop-blur-2xl backdrop-saturate-150 border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_1px_rgba(255,255,255,0.1)_inset]"
				side={sidebar.isMobile ? 'bottom' : 'right'}
				align="end"
				sideOffset={4}
			>
				<DropdownMenu.Label class="p-0 font-normal -m-1">
					<div class="flex items-center gap-2 px-3 py-2.5 pb-3 text-left text-sm bg-white/[0.06] border-b border-white/[0.06] rounded-t-lg">
						<Avatar.Root class="h-8 w-8 rounded-lg">
							<Avatar.Image src="" alt={projectName} />
							<Avatar.Fallback class="rounded-lg text-xs font-medium">
								{monogram}
							</Avatar.Fallback>
						</Avatar.Root>
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-medium">{projectName}</span>
							<span class="truncate text-xs text-muted-foreground"
								>{projectSubtitle}</span
							>
						</div>
					</div>
				</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.Group>
					<DropdownMenu.Item>
						<Folder aria-hidden="true" class="mr-2 size-4" />
						{t(localeStore.t.project.openProject, 'Open Project')}
					</DropdownMenu.Item>
					{#if store.features.themeSelection}
						<ThemeSwitcher />
					{/if}
					{#if store.features.languageSelection}
						<LanguageSwitcher />
					{/if}
					{#if store.features.projectDropdownSettings}
						<DropdownMenu.Item>
							<SettingsIcon aria-hidden="true" class="mr-2 size-4" />
							{t(localeStore.t.common.settings, 'Settings')}
						</DropdownMenu.Item>
					{/if}
				</DropdownMenu.Group>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>
