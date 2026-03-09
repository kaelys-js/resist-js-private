<script lang="ts">
/**
 * Top header bar with optional sidebar toggle, breadcrumb navigation, and right-side action slots.
 */
import type { Snippet } from 'svelte';
import * as Breadcrumb from '../breadcrumb/index.js';
import SidebarToggle from '../sidebar-toggle/SidebarToggle.svelte';
import type { Bool, Str } from '@/schemas/common';

/**
 * Props for the shared SiteHeader component.
 *
 * Product-specific breadcrumb content and right-side actions are injected via snippets.
 */
type SiteHeaderProps = {
	/** Whether to show the sidebar toggle button. */
	showSidebarToggle: Bool;
	/** Sidebar toggle aria-label. @values Toggle Sidebar, Show/Hide Sidebar, Sidebar */
	sidebarToggleLabel: Str;
	/** Sidebar toggle keyboard shortcut display string. @values ⌘B, Ctrl+B, ⌘\\ */
	sidebarToggleShortcut: Str;
	/** Whether to show the breadcrumb bar. */
	showBreadcrumb: Bool;
	/** Product-specific breadcrumb list children. */
	breadcrumbs: Snippet;
	/** Right-side action controls (HeaderUser, ModeToggle, etc.). */
	actions: Snippet;
};

let {
	showSidebarToggle,
	sidebarToggleLabel,
	sidebarToggleShortcut,
	showBreadcrumb,
	breadcrumbs,
	actions,
}: SiteHeaderProps = $props();
</script>

<header
	class="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height,color,background-color,border-color] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)"
>
	<div class="flex w-full items-center gap-1 px-4">
		{#if showSidebarToggle}
			<SidebarToggle label={sidebarToggleLabel} shortcutLabel={sidebarToggleShortcut} />
		{/if}
		{#if showBreadcrumb}
		<Breadcrumb.Root>
			<Breadcrumb.List>
				{@render breadcrumbs()}
			</Breadcrumb.List>
		</Breadcrumb.Root>
		{/if}
		<div class="ml-auto flex items-center gap-2">
			{@render actions()}
		</div>
	</div>
</header>
