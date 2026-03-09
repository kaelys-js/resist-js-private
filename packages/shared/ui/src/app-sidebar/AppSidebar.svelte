<script lang="ts">
import type { Snippet, Component } from 'svelte';
import * as Sidebar from '../sidebar/index.js';
import AppLogo from '../app-logo/AppLogo.svelte';
import NavSecondary from '../nav-secondary/NavSecondary.svelte';
import type { Bool, Str } from '@/schemas/common';

/**
 * A secondary nav item (Settings, Help, etc.).
 */
type NavItem = {
	/** Display label. */
	title: Str;
	/** Link href. */
	url: Str;
	/** Lucide icon component. */
	icon: Component;
};

/**
 * Props for the shared AppSidebar component.
 *
 * Each product editor provides content/footer snippets and resolves locale/store data.
 */
type AppSidebarProps = {
	/** Application display name. */
	appName: Str;
	/** Pre-resolved tagline. */
	tagline: Str;
	/** Sidebar root aria-label. */
	sidebarLabel: Str;
	/** Whether to show the app icon in the header. */
	showIcon: Bool;
	/** Whether to show the app name in the header. */
	showName: Bool;
	/** Secondary nav items (Settings, Help, etc.). */
	navItems: NavItem[];
	/** Product-specific main content area (scene list, finance nav, etc.). */
	content: Snippet;
	/** Product-specific footer area (NavProject dropdown, etc.). */
	footer: Snippet;
	/** Rest props passed through to Sidebar.Root. */
	[key: string]: unknown;
};

let {
	appName,
	tagline,
	sidebarLabel,
	showIcon,
	showName,
	navItems,
	content,
	footer,
	...restProps
}: AppSidebarProps = $props();
</script>

<Sidebar.Root variant="inset" collapsible="icon" aria-label={sidebarLabel} {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton size="lg">
					{#if showIcon}
						<div
							class="flex aspect-square size-8 items-center justify-center"
						>
							<AppLogo size={28} />
						</div>
					{/if}
					{#if showName}
						<div class="grid flex-1 text-left leading-tight">
							<span
								class="truncate text-base font-semibold tracking-tight"
								style="font-family: 'Rajdhani', sans-serif;"
								>{appName}</span
							>
							<span class="truncate text-xs text-muted-foreground">{tagline}</span>
						</div>
					{/if}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		{@render content()}
		<NavSecondary items={navItems} class="mt-auto" />
	</Sidebar.Content>
	<Sidebar.Footer>
		{@render footer()}
	</Sidebar.Footer>
</Sidebar.Root>
