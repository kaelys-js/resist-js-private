<script module lang="ts">
import * as v from 'valibot';
import type { Snippet } from 'svelte';
import { NavItemSchema } from '../nav-secondary/NavSecondary.svelte';

/** Schema for the AppSidebar component props — uses objectWithRest to allow passthrough props. */
export const AppSidebarPropsSchema = v.objectWithRest({
	/** Application display name. @values WebForge RPG, Finance Tracker, My App */
	appName: v.string(),
	/** Pre-resolved tagline. @values Build your world, Track your finances, Create something great */
	tagline: v.string(),
	/** Sidebar root aria-label. @values Main sidebar, Application sidebar, Navigation */
	sidebarLabel: v.string(),
	/** Whether to show the app icon in the header. */
	showIcon: v.boolean(),
	/** Whether to show the app name in the header. */
	showName: v.boolean(),
	/** Secondary nav items (Settings, Help, etc.). */
	navItems: v.array(NavItemSchema),
	/** Product-specific main content area (scene list, finance nav, etc.). */
	content: v.custom<Snippet>((val: unknown): boolean => typeof val === 'function'),
	/** Product-specific footer area (NavProject dropdown, etc.). */
	footer: v.custom<Snippet>((val: unknown): boolean => typeof val === 'function'),
}, v.unknown());
/** Props for the AppSidebar component. */
export type AppSidebarProps = v.InferOutput<typeof AppSidebarPropsSchema>;
</script>

<script lang="ts">
/**
 * Shared application sidebar shell with branding header, secondary navigation, and product-specific content slots.
 *
 * Each product editor provides its own main content and footer via Svelte snippets while sharing
 * the common layout, logo, and secondary nav items (Settings, Help, etc.).
 */
import * as Sidebar from '../sidebar/index.js';
import AppLogo from '../app-logo/AppLogo.svelte';
import NavSecondary from '../nav-secondary/NavSecondary.svelte';

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
