<script module lang="ts">
import * as v from 'valibot';
import { StrSchema, BoolSchema } from '@/schemas/common';
import type { Snippet } from 'svelte';

/**
 * Props for the shared SiteHeader component.
 *
 * Product-specific breadcrumb content and right-side actions are injected via snippets.
 */
export const SiteHeaderPropsSchema = v.strictObject({
	/** Whether to show the sidebar toggle button. */
	showSidebarToggle: BoolSchema,
	/** Sidebar toggle aria-label. @values Toggle Sidebar, Show/Hide Sidebar, Sidebar */
	sidebarToggleLabel: StrSchema,
	/** Sidebar toggle keyboard shortcut display string. @values ⌘B, Ctrl+B, ⌘\\ */
	sidebarToggleShortcut: StrSchema,
	/** Whether to show the breadcrumb bar. */
	showBreadcrumb: BoolSchema,
	/** Product-specific breadcrumb list children. */
	breadcrumbs: v.custom<Snippet>((val: unknown): boolean => typeof val === 'function'),
	/** Right-side action controls (HeaderUser, ModeToggle, etc.). */
	actions: v.custom<Snippet>((val: unknown): boolean => typeof val === 'function'),
});
/** Props for the SiteHeader component. */
export type SiteHeaderProps = v.InferOutput<typeof SiteHeaderPropsSchema>;
</script>

<script lang="ts">
/**
 * Top header bar with optional sidebar toggle, breadcrumb navigation, and right-side action slots.
 */
import type { Str } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';
import * as Breadcrumb from '../breadcrumb/index.js';
import SidebarToggle from '../sidebar-toggle/SidebarToggle.svelte';
import { stripSvelteProps } from '../lens/lens-utils.js';

const allProps: SiteHeaderProps = $props();
const validated: SiteHeaderProps = $derived.by(() => {
	const rawProps: SiteHeaderProps = stripSvelteProps(allProps);
	const result = safeParse(SiteHeaderPropsSchema, rawProps);
	if (!result.ok) throw result.error;
	// DeepReadonly from safeParse is safe to cast — props are read-only in templates
	return result.data as SiteHeaderProps;
});
</script>

<header
	class="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height,color,background-color,border-color] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)"
>
	<div class="flex w-full items-center gap-1 px-4">
		{#if validated.showSidebarToggle}
			<SidebarToggle label={validated.sidebarToggleLabel} shortcutLabel={validated.sidebarToggleShortcut} />
		{/if}
		{#if validated.showBreadcrumb}
		<Breadcrumb.Root>
			<Breadcrumb.List>
				{@render validated.breadcrumbs()}
			</Breadcrumb.List>
		</Breadcrumb.Root>
		{/if}
		<div class="ml-auto flex items-center gap-2">
			{@render validated.actions()}
		</div>
	</div>
</header>
