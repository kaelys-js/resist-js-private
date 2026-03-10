<script module lang="ts">
import * as v from 'valibot';

/** Schema for feature flags controlling which menu items are visible. */
export const HeaderUserFeaturesSchema = v.strictObject({
	/** Show avatar image (vs monogram-only). */
	avatar: v.boolean(),
	/** Show "Account" menu item. */
	account: v.boolean(),
	/** Show "Subscription" menu item. */
	subscription: v.boolean(),
	/** Show "Notifications" menu item. */
	notifications: v.boolean(),
	/** Show "Keyboard Shortcuts" menu item. */
	shortcuts: v.boolean(),
	/** Show "Settings" menu item. */
	settings: v.boolean(),
	/** Show "What's New" menu item. */
	whatsNew: v.boolean(),
	/** Show "Log Out" menu item. */
	logout: v.boolean(),
});
/** Feature flags controlling which menu items are visible. */
export type HeaderUserFeatures = v.InferOutput<typeof HeaderUserFeaturesSchema>;

/** Schema for localized UI labels in the HeaderUser component. */
export const HeaderUserLabelsSchema = v.strictObject({
	/** Trigger button aria-label (e.g. "User menu"). @values User menu, Open user menu, Account menu */
	userMenu: v.string(),
	/** "Account" menu item label. @values Account, My Account, Profile */
	account: v.string(),
	/** "Subscription" menu item label. @values Subscription, Billing, Plan */
	subscription: v.string(),
	/** "Notifications" menu item label. @values Notifications, Alerts, Updates */
	notifications: v.string(),
	/** "Keyboard Shortcuts" menu item label. @values Keyboard Shortcuts, Shortcuts, Hotkeys */
	keyboardShortcuts: v.string(),
	/** "Settings" menu item label. @values Settings, Preferences, Options */
	settings: v.string(),
	/** "What's New" menu item label. @values What's New, Changelog, Updates */
	whatsNew: v.string(),
	/** "Log Out" menu item label. @values Log Out, Sign Out, Logout */
	logout: v.string(),
});
/** Localized UI labels for the HeaderUser component. */
export type HeaderUserLabels = v.InferOutput<typeof HeaderUserLabelsSchema>;

/** Schema for the HeaderUser component props. */
export const HeaderUserPropsSchema = v.strictObject({
	/** User display name. @values John Doe, Jane Smith, Demo User */
	userName: v.string(),
	/** Optional user email. @values john@example.com, jane@example.com, demo@example.com */
	userEmail: v.optional(v.string()),
	/** Optional avatar image URL. @values https://example.com/avatar.png, /avatars/user.jpg */
	userAvatar: v.optional(v.string()),
	/** Callback when "Log Out" is clicked. */
	onLogOut: v.custom<() => void>((val: unknown): boolean => typeof val === 'function'),
	/** Feature flags controlling menu item visibility. */
	features: HeaderUserFeaturesSchema,
	/** Localized UI labels. */
	labels: HeaderUserLabelsSchema,
});
/** Props for the HeaderUser component. */
export type HeaderUserProps = v.InferOutput<typeof HeaderUserPropsSchema>;
</script>

<script lang="ts">
/**
 * User profile avatar button with a dropdown menu for account, settings, and logout actions.
 *
 * Renders an avatar trigger that opens a feature-flagged dropdown with configurable menu groups.
 */
import UserIcon from '@lucide/svelte/icons/user';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Bell from '@lucide/svelte/icons/bell';
import Keyboard from '@lucide/svelte/icons/keyboard';
import SettingsIcon from '@lucide/svelte/icons/settings';
import Sparkles from '@lucide/svelte/icons/sparkles';
import LogOut from '@lucide/svelte/icons/log-out';
import * as Avatar from '../avatar/index.js';
import * as DropdownMenu from '../dropdown-menu/index.js';
import type { Bool, Str } from '@/schemas/common';

let { userName, userEmail, userAvatar, onLogOut, features, labels }: HeaderUserProps = $props();

/** Monogram from the user name (e.g. "John Doe" → "JD", "User" → "U"). */
const monogram: Str = $derived(
	userName
		.split(/\s+/)
		.slice(0, 2)
		.map((w: Str) => w[0]?.toUpperCase() ?? '')
		.join(''),
);

const hasAccountGroup: Bool = $derived(
	features.account || features.subscription || features.notifications,
);

const hasToolsGroup: Bool = $derived(features.shortcuts || features.settings || features.whatsNew);
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<button
				class="inline-flex items-center justify-center rounded-full size-8 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				aria-label={labels.userMenu}
				data-testid="header-user-trigger"
				{...props}
			>
				<Avatar.Root class="size-8">
					{#if features.avatar && userAvatar}
						<Avatar.Image src={userAvatar} alt={userName} />
					{/if}
					<Avatar.Fallback class="text-xs font-medium">
						{monogram}
					</Avatar.Fallback>
				</Avatar.Root>
			</button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content class="w-56 rounded-lg bg-white/[0.08] dark:bg-white/[0.06] backdrop-blur-2xl backdrop-saturate-150 border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_1px_rgba(255,255,255,0.1)_inset]" align="end" sideOffset={8}>
		<DropdownMenu.Label class="p-0 font-normal -m-1">
			<div class="flex items-center gap-2 px-3 py-2.5 pb-3 text-left text-sm bg-white/[0.06] border-b border-white/[0.06] rounded-t-lg">
				<Avatar.Root class="size-8">
					{#if features.avatar && userAvatar}
						<Avatar.Image src={userAvatar} alt={userName} />
					{/if}
					<Avatar.Fallback class="text-xs font-medium">
						{monogram}
					</Avatar.Fallback>
				</Avatar.Root>
				<div class="grid flex-1 text-left text-sm leading-tight">
					<span class="truncate font-medium">{userName}</span>
					{#if userEmail}
						<span class="truncate text-xs text-muted-foreground">
							{userEmail}
						</span>
					{/if}
				</div>
			</div>
		</DropdownMenu.Label>

		{#if hasAccountGroup}
			<DropdownMenu.Separator />
			<DropdownMenu.Group>
				{#if features.account}
					<DropdownMenu.Item>
						<UserIcon aria-hidden="true" class="mr-2 size-4" />
						{labels.account}
					</DropdownMenu.Item>
				{/if}
				{#if features.subscription}
					<DropdownMenu.Item>
						<CreditCard aria-hidden="true" class="mr-2 size-4" />
						{labels.subscription}
					</DropdownMenu.Item>
				{/if}
				{#if features.notifications}
					<DropdownMenu.Item>
						<Bell aria-hidden="true" class="mr-2 size-4" />
						{labels.notifications}
					</DropdownMenu.Item>
				{/if}
			</DropdownMenu.Group>
		{/if}

		{#if hasToolsGroup}
			<DropdownMenu.Separator />
			<DropdownMenu.Group>
				{#if features.shortcuts}
					<DropdownMenu.Item>
						<Keyboard aria-hidden="true" class="mr-2 size-4" />
						{labels.keyboardShortcuts}
					</DropdownMenu.Item>
				{/if}
				{#if features.settings}
					<DropdownMenu.Item>
						<SettingsIcon aria-hidden="true" class="mr-2 size-4" />
						{labels.settings}
					</DropdownMenu.Item>
				{/if}
				{#if features.whatsNew}
					<DropdownMenu.Item>
						<Sparkles aria-hidden="true" class="mr-2 size-4" />
						{labels.whatsNew}
					</DropdownMenu.Item>
				{/if}
			</DropdownMenu.Group>
		{/if}

		{#if features.logout}
			<DropdownMenu.Separator />
			<DropdownMenu.Group>
				<DropdownMenu.Item variant="destructive" onclick={onLogOut}>
					<LogOut aria-hidden="true" class="mr-2 size-4" />
					{labels.logout}
				</DropdownMenu.Item>
			</DropdownMenu.Group>
		{/if}
	</DropdownMenu.Content>
</DropdownMenu.Root>
