<script lang="ts">
import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
import SettingsIcon from '@lucide/svelte/icons/settings';
import * as Avatar from '$lib/components/ui/avatar/index.js';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import ThemeSwitcher from './ThemeSwitcher.svelte';
import LanguageSwitcher from './LanguageSwitcher.svelte';
import { localeStore, t } from '$lib/i18n.svelte';
import { useEditorStore } from '$lib/stores/editor-state.svelte';
import type { Str } from '@/schemas/common';

const store: ReturnType<typeof useEditorStore> = useEditorStore();
const sidebar: ReturnType<typeof Sidebar.useSidebar> = Sidebar.useSidebar();

/** Display name from store. */
const userName: Str = $derived(store.app.userName);

/** Monogram from the user name (e.g. "Test User" → "TU", "User" → "U"). */
const monogram: Str = $derived(
	userName
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
						<Avatar.Root class="h-8 w-8 rounded-lg shadow-sm">
							<Avatar.Image src={store.app.userAvatar} alt={userName} />
							<Avatar.Fallback class="rounded-lg text-xs font-medium">
								{monogram}
							</Avatar.Fallback>
						</Avatar.Root>
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-medium">{userName}</span>
							<span class="truncate text-xs text-muted-foreground"
								>{store.app.userEmail || '\u2014'}</span
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
							<Avatar.Image src={store.app.userAvatar} alt={userName} />
							<Avatar.Fallback class="rounded-lg text-xs font-medium">
								{monogram}
							</Avatar.Fallback>
						</Avatar.Root>
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-medium">{userName}</span>
							<span class="truncate text-xs text-muted-foreground"
								>{store.app.userEmail || '\u2014'}</span
							>
						</div>
					</div>
				</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.Group>
					{#if store.features.themeSelection}
						<ThemeSwitcher />
					{/if}
					{#if store.features.languageSelection}
						<LanguageSwitcher />
					{/if}
					{#if store.features.headerUserSettings}
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
