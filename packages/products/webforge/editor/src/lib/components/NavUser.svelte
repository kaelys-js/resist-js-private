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

let { user }: { user: { name: string; avatar: string } } = $props();

const store = useEditorStore();
const sidebar = Sidebar.useSidebar();

/** Two-letter monogram from the project name (e.g. "WebForge Project" → "WP"). */
const monogram: string = $derived(
	user.name
		.split(/\s+/)
		.slice(0, 2)
		.map((w: string) => w[0]?.toUpperCase() ?? '')
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
							<Avatar.Root class="h-8 w-8 rounded-lg">
								<Avatar.Image src={user.avatar} alt={user.name} />
								<Avatar.Fallback class="rounded-lg text-xs font-medium">
									{monogram}
								</Avatar.Fallback>
							</Avatar.Root>
						{/if}
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-medium">{user.name}</span>
							<span class="truncate text-xs text-muted-foreground"
								>{store.app.appName}</span
							>
						</div>
						<ChevronsUpDown class="ml-auto size-4" />
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				class="w-[--bits-dropdown-menu-anchor-width] min-w-56 rounded-lg"
				side={sidebar.isMobile ? 'bottom' : 'right'}
				align="end"
				sideOffset={4}
			>
				<DropdownMenu.Label class="p-0 font-normal">
					<div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
						<Avatar.Root class="h-8 w-8 rounded-lg">
							<Avatar.Image src={user.avatar} alt={user.name} />
							<Avatar.Fallback class="rounded-lg text-xs font-medium">
								{monogram}
							</Avatar.Fallback>
						</Avatar.Root>
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-medium">{user.name}</span>
							<span class="truncate text-xs text-muted-foreground"
								>{store.app.appName}</span
							>
						</div>
					</div>
				</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.Group>
					<DropdownMenu.Item>
						<Folder class="mr-2 size-4" />
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
							<SettingsIcon class="mr-2 size-4" />
							{t(localeStore.t.common.settings, 'Settings')}
						</DropdownMenu.Item>
					{/if}
				</DropdownMenu.Group>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>
