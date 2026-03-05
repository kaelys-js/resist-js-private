<script lang="ts">
import UserIcon from '@lucide/svelte/icons/user';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Bell from '@lucide/svelte/icons/bell';
import Keyboard from '@lucide/svelte/icons/keyboard';
import SettingsIcon from '@lucide/svelte/icons/settings';
import Sparkles from '@lucide/svelte/icons/sparkles';
import LogOut from '@lucide/svelte/icons/log-out';
import * as Avatar from '$lib/components/ui/avatar/index.js';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { localeStore, t } from '$lib/i18n.svelte';
import { useEditorStore } from '$lib/stores/editor-state.svelte';

const store = useEditorStore();

/**
 * Handles Log Out click: navigates to the current page with `?wf.auth=false`
 * to simulate a logged-out state in dev mode.
 */
function handleLogOut(): void {
	const url = new URL(page.url);
	url.searchParams.set('wf.auth', 'false');
	goto(url.toString());
}

/** Monogram from the user name (e.g. "John Doe" → "JD", "User" → "U"). */
const monogram: string = $derived(
	store.app.userName
		.split(/\s+/)
		.slice(0, 2)
		.map((w: string) => w[0]?.toUpperCase() ?? '')
		.join(''),
);

const hasAccountGroup: boolean = $derived(
	store.features.headerUserAccount ||
		store.features.headerUserSubscription ||
		store.features.headerUserNotifications,
);

const hasToolsGroup: boolean = $derived(
	store.features.headerUserShortcuts ||
		store.features.headerUserSettings ||
		store.features.headerUserWhatsNew,
);
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<button
				class="inline-flex items-center justify-center rounded-full size-8 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				aria-label={t(localeStore.t.user.userMenu, 'User menu')}
				data-testid="header-user-trigger"
				{...props}
			>
				<Avatar.Root class="size-8">
					{#if store.features.headerUserAvatar && store.app.userAvatar}
						<Avatar.Image src={store.app.userAvatar} alt={store.app.userName} />
					{/if}
					<Avatar.Fallback class="text-xs font-medium">
						{monogram}
					</Avatar.Fallback>
				</Avatar.Root>
			</button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content class="w-56 overflow-hidden bg-popover/70 backdrop-blur-2xl border-border/60 shadow-[0_8px_40px_-8px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.05)_inset] ring-1 ring-white/5" align="end" sideOffset={8}>
		<DropdownMenu.Label class="p-0 font-normal bg-muted/50 -m-1 mb-0">
			<div class="flex items-center gap-2 px-3 py-2.5 text-left text-sm">
				<Avatar.Root class="size-8">
					{#if store.features.headerUserAvatar && store.app.userAvatar}
						<Avatar.Image src={store.app.userAvatar} alt={store.app.userName} />
					{/if}
					<Avatar.Fallback class="text-xs font-medium">
						{monogram}
					</Avatar.Fallback>
				</Avatar.Root>
				<div class="grid flex-1 text-left text-sm leading-tight">
					<span class="truncate font-medium">{store.app.userName}</span>
					{#if store.app.userEmail}
						<span class="truncate text-xs text-muted-foreground">
							{store.app.userEmail}
						</span>
					{/if}
				</div>
			</div>
		</DropdownMenu.Label>

		{#if hasAccountGroup}
			<DropdownMenu.Separator />
			<DropdownMenu.Group>
				{#if store.features.headerUserAccount}
					<DropdownMenu.Item>
						<UserIcon aria-hidden="true" class="mr-2 size-4" />
						{t(localeStore.t.user.account, 'Account')}
					</DropdownMenu.Item>
				{/if}
				{#if store.features.headerUserSubscription}
					<DropdownMenu.Item>
						<CreditCard aria-hidden="true" class="mr-2 size-4" />
						{t(localeStore.t.user.subscription, 'Subscription')}
					</DropdownMenu.Item>
				{/if}
				{#if store.features.headerUserNotifications}
					<DropdownMenu.Item>
						<Bell aria-hidden="true" class="mr-2 size-4" />
						{t(localeStore.t.user.notifications, 'Notifications')}
					</DropdownMenu.Item>
				{/if}
			</DropdownMenu.Group>
		{/if}

		{#if hasToolsGroup}
			<DropdownMenu.Separator />
			<DropdownMenu.Group>
				{#if store.features.headerUserShortcuts}
					<DropdownMenu.Item>
						<Keyboard aria-hidden="true" class="mr-2 size-4" />
						{t(localeStore.t.user.keyboardShortcuts, 'Keyboard Shortcuts')}
					</DropdownMenu.Item>
				{/if}
				{#if store.features.headerUserSettings}
					<DropdownMenu.Item>
						<SettingsIcon aria-hidden="true" class="mr-2 size-4" />
						{t(localeStore.t.user.settings, 'Settings')}
					</DropdownMenu.Item>
				{/if}
				{#if store.features.headerUserWhatsNew}
					<DropdownMenu.Item>
						<Sparkles aria-hidden="true" class="mr-2 size-4" />
						{t(localeStore.t.user.whatsNew, "What's New")}
					</DropdownMenu.Item>
				{/if}
			</DropdownMenu.Group>
		{/if}

		{#if store.features.headerUserLogout}
			<DropdownMenu.Separator />
			<DropdownMenu.Group>
				<DropdownMenu.Item class="text-destructive focus:text-destructive" onclick={handleLogOut}>
					<LogOut aria-hidden="true" class="mr-2 size-4" />
					{t(localeStore.t.user.logout, 'Log Out')}
				</DropdownMenu.Item>
			</DropdownMenu.Group>
		{/if}
	</DropdownMenu.Content>
</DropdownMenu.Root>
