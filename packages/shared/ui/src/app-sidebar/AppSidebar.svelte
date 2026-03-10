<script module lang="ts">
import * as v from 'valibot';
import { StrSchema, BoolSchema } from '@/schemas/common';
import type { Snippet } from 'svelte';
import { NavItemSchema } from '../nav-secondary/NavSecondary.svelte';

/** Schema for the AppSidebar component props — uses objectWithRest to allow passthrough props. */
export const AppSidebarPropsSchema = v.objectWithRest({
	/** Application display name. @values WebForge RPG, Finance Tracker, My App */
	appName: StrSchema,
	/** Pre-resolved tagline. @values Build your world, Track your finances, Create something great */
	tagline: StrSchema,
	/** Sidebar root aria-label. @values Main sidebar, Application sidebar, Navigation */
	sidebarLabel: StrSchema,
	/** Whether to show the app icon in the header. */
	showIcon: BoolSchema,
	/** Whether to show the app name in the header. */
	showName: BoolSchema,
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
import type { Str } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';
import * as Sidebar from '../sidebar/index.js';
import AppLogo from '../app-logo/AppLogo.svelte';
import NavSecondary from '../nav-secondary/NavSecondary.svelte';
import { stripSvelteProps } from '../lens/lens-utils.js';

const allProps: AppSidebarProps = $props();
const validated: AppSidebarProps = $derived.by(() => {
	const rawProps: AppSidebarProps = stripSvelteProps(allProps);
	const result = safeParse(AppSidebarPropsSchema, rawProps);
	if (!result.ok) throw result.error;
	// Cast to mutable — Result.data is deep-frozen via Object.freeze but component only reads, never mutates
	return result.data as AppSidebarProps;
});
const restProps = $derived.by(() => {
	const { appName: _a, tagline: _b, sidebarLabel: _c, showIcon: _d, showName: _e, navItems: _f, content: _g, footer: _h, ...rest }: AppSidebarProps = validated;
	return rest;
});
</script>

<Sidebar.Root variant="inset" collapsible="icon" aria-label={validated.sidebarLabel} {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton size="lg">
					{#if validated.showIcon}
						<div
							class="flex aspect-square size-8 items-center justify-center"
						>
							<AppLogo size={28} />
						</div>
					{/if}
					{#if validated.showName}
						<div class="grid flex-1 text-left leading-tight">
							<span
								class="truncate text-base font-semibold tracking-tight"
								style="font-family: 'Rajdhani', sans-serif;"
								>{validated.appName}</span
							>
							<span class="truncate text-xs text-muted-foreground">{validated.tagline}</span>
						</div>
					{/if}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		{@render validated.content()}
		<NavSecondary items={validated.navItems} class="mt-auto" />
	</Sidebar.Content>
	<Sidebar.Footer>
		{@render validated.footer()}
	</Sidebar.Footer>
</Sidebar.Root>
