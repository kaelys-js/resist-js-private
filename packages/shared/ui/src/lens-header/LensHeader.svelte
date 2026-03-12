<script module lang="ts">
import * as v from 'valibot';
import { StrSchema, BoolSchema } from '@/schemas/common';
import { LensMetaSchema, type LensMeta } from '../lens/types.js';

/** Schema for the LensHeader component props. */
export const LensHeaderPropsSchema = v.strictObject({
	/** Component directory name (kebab-case). @values button, dialog, sidebar */
	name: StrSchema,
	/** Component description extracted from source JSDoc. @values A clickable button, An overlay dialog, A navigation sidebar */
	description: v.optional(StrSchema),
	/** Validated lens metadata for category/tag badges. @values {category: "display", tags: ["interactive"], description: "A clickable button"} */
	meta: v.optional(v.nullable(LensMetaSchema)),
	/** Import path shown in the copy-import chip. @values @/ui/button, @/ui/dialog, @/ui/sidebar */
	importPath: v.optional(StrSchema),
	/** Whether the component has renderable variants. @values true, false */
	hasVariants: v.optional(BoolSchema),
	/** Whether the component has hand-written examples. @values true, false */
	hasExamples: v.optional(BoolSchema),
	/** Whether the component has raw source available. @values true, false */
	hasSource: v.optional(BoolSchema),
	/** Whether the component has any import dependencies. @values true, false */
	hasDeps: v.optional(BoolSchema),
	/** Whether the component has custom docs.md documentation. @values true, false */
	hasDocs: v.optional(BoolSchema),
	/** Whether the component has changelog entries. @values true, false */
	hasChangelog: v.optional(BoolSchema),
	/** Previous component name for sequential navigation (kebab-case). @values button, dialog, sidebar */
	prevComponent: v.optional(v.nullable(StrSchema)),
	/** Next component name for sequential navigation (kebab-case). @values button, dialog, sidebar */
	nextComponent: v.optional(v.nullable(StrSchema)),
});
/** Props for the LensHeader component. */
export type LensHeaderProps = v.InferOutput<typeof LensHeaderPropsSchema>;
</script>

<script lang="ts">
/**
 * Component header for Lens documentation pages.
 *
 * Displays an icon, title, description, category/tag badges, a
 * copy-import shortcut, a section navigation dropdown menu, and
 * previous/next component navigation.
 */
import type { Bool, Str, Void } from '@/schemas/common';
import type { Component } from 'svelte';
import { safeParse } from '@/utils/result/safe';
import { toTitle, stripSvelteProps } from '../lens/lens-utils.js';
import Badge from '../badge/badge.svelte';
import CopyImport from '../copy-import/CopyImport.svelte';
import * as DropdownMenu from '../dropdown-menu/index.js';
import * as Tooltip from '../tooltip/index.js';
import ComponentIcon from '@lucide/svelte/icons/component';
import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
import TableProperties from '@lucide/svelte/icons/table-properties';
import Layers from '@lucide/svelte/icons/layers';
import BookOpen from '@lucide/svelte/icons/book-open';
import FileCode from '@lucide/svelte/icons/file-code';
import ShieldAlert from '@lucide/svelte/icons/shield-alert';
import GitFork from '@lucide/svelte/icons/git-fork';
import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
import ChevronsDownUp from '@lucide/svelte/icons/chevrons-down-up';
import ChevronLeft from '@lucide/svelte/icons/chevron-left';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import History from '@lucide/svelte/icons/history';
import FileText from '@lucide/svelte/icons/file-text';
import Download from '@lucide/svelte/icons/download';
import ClipboardCopy from '@lucide/svelte/icons/clipboard-copy';
import Check from '@lucide/svelte/icons/check';
import Search from '@lucide/svelte/icons/search';
import SearchX from '@lucide/svelte/icons/search-x';
import FileImage from '@lucide/svelte/icons/file-image';
import FileType from '@lucide/svelte/icons/file-type';
import Globe from '@lucide/svelte/icons/globe';
import Clipboard from '@lucide/svelte/icons/clipboard';
import Link from '@lucide/svelte/icons/link';

const allProps: LensHeaderProps = $props();
const validated: LensHeaderProps = $derived.by(() => {
	const rawProps: LensHeaderProps = stripSvelteProps(allProps);
	const result = safeParse(LensHeaderPropsSchema, rawProps);
	if (!result.ok) throw result.error;
	// DeepReadonly from safeParse is safe to cast — props are read-only in templates
	return result.data as LensHeaderProps;
});

/** Whether the component has renderable variants. */
const hasVariants: Bool = $derived(validated.hasVariants ?? false);

/** Whether the component has hand-written examples. */
const hasExamples: Bool = $derived(validated.hasExamples ?? false);

/** Whether the component has raw source available. */
const hasSource: Bool = $derived(validated.hasSource ?? false);

/** Whether the component has any import dependencies. */
const hasDeps: Bool = $derived(validated.hasDeps ?? false);

/** Whether the component has custom docs.md documentation. */
const hasDocs: Bool = $derived(validated.hasDocs ?? false);

/** Whether the component has changelog entries from git log. */
const hasChangelog: Bool = $derived(validated.hasChangelog ?? false);

/**
 * Open a collapsible section and smooth-scroll to it.
 *
 * Dispatches a custom event that the Lens page listens for —
 * the page opens the section (if collapsed), waits a tick for
 * the DOM to update, then scrolls to the element.
 *
 * @param id - The DOM element ID to scroll to
 */
function scrollTo(id: Str): Void {
	document.dispatchEvent(new CustomEvent('lens:scroll-to', { detail: id }));
}

/** Expand all collapsible page sections. */
function expandAll(): Void {
	document.dispatchEvent(new CustomEvent('lens:expand-all'));
}

/** Collapse all collapsible page sections. */
function collapseAll(): Void {
	document.dispatchEvent(new CustomEvent('lens:collapse-all'));
}

/* ------------------------------------------------------------------ */
/*  Component page export                                              */
/* ------------------------------------------------------------------ */

/** Component page export format menu items. */
const PAGE_EXPORT_ITEMS: Array<{ id: Str; label: Str; icon: Component; category: Str }> = [
	{ id: 'copy-json', label: 'Copy as JSON', icon: ClipboardCopy, category: 'Clipboard' },
	{ id: 'copy-markdown', label: 'Copy as Markdown', icon: FileText, category: 'Clipboard' },
	{ id: 'download-json', label: 'Download JSON', icon: Download, category: 'File' },
	{ id: 'download-markdown', label: 'Download Markdown', icon: Download, category: 'File' },
];

/** Search query for page export menu filtering. */
let pageExportSearchQuery: Str = $state('');

/** Page export items filtered by search query. */
const filteredPageExportItems: Array<{ id: Str; label: Str; icon: Component; category: Str }> = $derived(
	pageExportSearchQuery.length === 0
		? PAGE_EXPORT_ITEMS
		: PAGE_EXPORT_ITEMS.filter((p) => p.label.toLowerCase().includes(pageExportSearchQuery.toLowerCase())),
);

/** Unique page export categories present after filtering. */
const filteredPageExportCategories: Str[] = $derived(
	[...new Set(filteredPageExportItems.map((p) => p.category))],
);

/** Feedback state for page export actions (stores format id briefly). */
let pageExportFeedback: Str = $state('');

/**
 * Dispatch a page export event to the parent page.
 *
 * @param formatId - Export format identifier
 */
function handlePageExport(formatId: Str): Void {
	document.dispatchEvent(new CustomEvent('lens:export', { detail: formatId }));
	pageExportFeedback = formatId;
	setTimeout((): Void => {
		pageExportFeedback = '';
	}, 2000);
}

/* ------------------------------------------------------------------ */
/*  Component export (same formats as LensComponentRenderer)            */
/* ------------------------------------------------------------------ */

/** Component export format menu items (identical to LensComponentRenderer). */
const COMPONENT_EXPORT_ITEMS: Array<{ id: Str; label: Str; icon: Component; category: Str }> = [
	{ id: 'png', label: 'PNG', icon: FileImage, category: 'Image' },
	{ id: 'jpeg', label: 'JPEG', icon: FileImage, category: 'Image' },
	{ id: 'svg', label: 'SVG', icon: FileImage, category: 'Image' },
	{ id: 'webp', label: 'WebP', icon: FileImage, category: 'Image' },
	{ id: 'html', label: 'HTML', icon: FileType, category: 'Document' },
	{ id: 'standalone-html', label: 'Standalone HTML', icon: Globe, category: 'Document' },
	{ id: 'copy-image', label: 'Copy as Image', icon: Clipboard, category: 'Clipboard' },
	{ id: 'copy-html', label: 'Copy as HTML', icon: FileType, category: 'Clipboard' },
	{ id: 'copy-svelte', label: 'Copy as Svelte', icon: FileCode, category: 'Clipboard' },
	{ id: 'copy-data-uri', label: 'Copy as Data URI', icon: Link, category: 'Clipboard' },
];

/** Search query for component export menu filtering. */
let componentExportSearchQuery: Str = $state('');

/** Component export items filtered by search query. */
const filteredComponentExportItems: Array<{ id: Str; label: Str; icon: Component; category: Str }> = $derived(
	componentExportSearchQuery.length === 0
		? COMPONENT_EXPORT_ITEMS
		: COMPONENT_EXPORT_ITEMS.filter((p) => p.label.toLowerCase().includes(componentExportSearchQuery.toLowerCase())),
);

/** Unique component export categories present after filtering. */
const filteredComponentExportCategories: Str[] = $derived(
	[...new Set(filteredComponentExportItems.map((p) => p.category))],
);

/** Feedback state for component export actions (stores format id briefly). */
let componentExportFeedback: Str = $state('');

/**
 * Dispatch a component export event to LensComponentRenderer.
 *
 * @param formatId - Export format identifier
 */
function handleComponentExport(formatId: Str): Void {
	document.dispatchEvent(new CustomEvent('lens:export-component', { detail: formatId }));
	componentExportFeedback = formatId;
	setTimeout((): Void => {
		componentExportFeedback = '';
	}, 2000);
}
</script>

<div class="flex items-start gap-4">
	<div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
		<ComponentIcon class="size-6 text-primary" />
	</div>
	<div class="min-w-0 flex-1">
		<div class="flex items-center gap-4">
			<div class="flex items-baseline gap-4">
				<h1 class="text-3xl font-bold tracking-tight">{toTitle(validated.name)}</h1>

				<div class="flex items-center gap-1">
				<!-- Page menu dropdown -->
				<DropdownMenu.Root>
				<Tooltip.Root delayDuration={300}>
					<Tooltip.Trigger>
						{#snippet child({ props: tooltipProps })}
							<DropdownMenu.Trigger>
								{#snippet child({ props: triggerProps })}
									<button
										type="button"
										class="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
										{...tooltipProps}
										{...triggerProps}
									>
										<EllipsisVertical class="size-4" />
										<span class="sr-only">Page menu</span>
									</button>
								{/snippet}
							</DropdownMenu.Trigger>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="right" sideOffset={4}>
						Page menu
					</Tooltip.Content>
				</Tooltip.Root>
				<DropdownMenu.Content align="start" sideOffset={4}>
					<DropdownMenu.Item onclick={() => scrollTo('docs')}>
						<FileText class="mr-2 size-4" />
						Go to Documentation
					</DropdownMenu.Item>
					<DropdownMenu.Item onclick={() => scrollTo('props')}>
						<TableProperties class="mr-2 size-4" />
						Go to Props
					</DropdownMenu.Item>
					{#if hasVariants}
						<DropdownMenu.Item onclick={() => scrollTo('default')}>
							<ComponentIcon class="mr-2 size-4" />
							Go to Default
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={() => scrollTo('error-boundary')}>
							<ShieldAlert class="mr-2 size-4" />
							Go to Error Boundary
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={() => scrollTo('variants')}>
							<Layers class="mr-2 size-4" />
							Go to Variants
						</DropdownMenu.Item>
					{/if}
					<DropdownMenu.Item onclick={() => scrollTo('examples')}>
						<BookOpen class="mr-2 size-4" />
						Go to Examples
					</DropdownMenu.Item>
					{#if hasSource}
						<DropdownMenu.Item onclick={() => scrollTo('source')}>
							<FileCode class="mr-2 size-4" />
							Go to Source
						</DropdownMenu.Item>
					{/if}
					{#if hasDeps}
						<DropdownMenu.Item onclick={() => scrollTo('dependencies')}>
							<GitFork class="mr-2 size-4" />
							Go to Dependencies
						</DropdownMenu.Item>
					{/if}
					{#if hasChangelog}
						<DropdownMenu.Item onclick={() => scrollTo('changelog')}>
							<History class="mr-2 size-4" />
							Go to Changelog
						</DropdownMenu.Item>
					{/if}
					<DropdownMenu.Separator />
					<DropdownMenu.Sub
						onOpenChange={(open) => {
							if (open) pageExportSearchQuery = '';
						}}
					>
						<DropdownMenu.SubTrigger>
							<Download class="mr-2 size-4" />
							Export
						</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent class="flex max-h-80 w-52 flex-col overflow-hidden">
							<div class="shrink-0 px-2 pb-1.5 pt-1">
								<div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
									<Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
									<input
										type="text"
										placeholder="Search formats..."
										class="h-5 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
										bind:value={pageExportSearchQuery}
										onclick={(e) => e.stopPropagation()}
										onkeydown={(e) => e.stopPropagation()}
									/>
								</div>
							</div>
							<div class="flex-1 overflow-y-auto">
								{#if filteredPageExportItems.length === 0}
									<div class="flex flex-col items-center gap-1 px-2 py-4 text-center">
										<SearchX class="size-4 text-muted-foreground/40" />
										<span class="text-xs text-muted-foreground/60">No formats match</span>
									</div>
								{:else}
									{#each filteredPageExportCategories as category (category)}
										<DropdownMenu.Label class="px-2 text-xs text-muted-foreground/60">{category}</DropdownMenu.Label>
										{#each filteredPageExportItems.filter((p) => p.category === category) as item (item.id)}
											<DropdownMenu.Item onclick={() => handlePageExport(item.id)}>
												{#if pageExportFeedback === item.id}
													<Check class="mr-2 size-4 text-green-500" />
												{:else}
													<item.icon class="mr-2 size-4" />
												{/if}
												{item.label}
											</DropdownMenu.Item>
										{/each}
									{/each}
								{/if}
							</div>
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>
					<DropdownMenu.Sub
						onOpenChange={(open) => {
							if (open) componentExportSearchQuery = '';
						}}
					>
						<DropdownMenu.SubTrigger>
							<ComponentIcon class="mr-2 size-4" />
							Export Component
						</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent class="flex max-h-80 w-52 flex-col overflow-hidden">
							<div class="shrink-0 px-2 pb-1.5 pt-1">
								<div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
									<Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
									<input
										type="text"
										placeholder="Search formats..."
										class="h-5 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
										bind:value={componentExportSearchQuery}
										onclick={(e) => e.stopPropagation()}
										onkeydown={(e) => e.stopPropagation()}
									/>
								</div>
							</div>
							<div class="flex-1 overflow-y-auto">
								{#if filteredComponentExportItems.length === 0}
									<div class="flex flex-col items-center gap-1 px-2 py-4 text-center">
										<SearchX class="size-4 text-muted-foreground/40" />
										<span class="text-xs text-muted-foreground/60">No formats match</span>
									</div>
								{:else}
									{#each filteredComponentExportCategories as category (category)}
										<DropdownMenu.Label class="px-2 text-xs text-muted-foreground/60">{category}</DropdownMenu.Label>
										{#each filteredComponentExportItems.filter((p) => p.category === category) as item (item.id)}
											<DropdownMenu.Item onclick={() => handleComponentExport(item.id)}>
												{#if componentExportFeedback === item.id}
													<Check class="mr-2 size-4 text-green-500" />
												{:else}
													<item.icon class="mr-2 size-4" />
												{/if}
												{item.label}
											</DropdownMenu.Item>
										{/each}
									{/each}
								{/if}
							</div>
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>
					<DropdownMenu.Separator />
					<DropdownMenu.Item onclick={expandAll}>
						<ChevronsUpDown class="mr-2 size-4" />
						Expand All
					</DropdownMenu.Item>
					<DropdownMenu.Item onclick={collapseAll}>
						<ChevronsDownUp class="mr-2 size-4" />
						Collapse All
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
				</div>
			</div>

			<!-- Previous / Next component navigation -->
			<div class="ml-auto flex items-center gap-1">
				{#if validated.prevComponent}
					<Tooltip.Root delayDuration={300}>
						<Tooltip.Trigger>
							{#snippet child({ props: tooltipProps })}
								<a
									href="/components/{validated.prevComponent}"
									class="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
									{...tooltipProps}
								>
									<ChevronLeft class="size-4" />
									<span class="sr-only">Previous: {toTitle(validated.prevComponent ?? '')}</span>
								</a>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content side="bottom" sideOffset={4}>
							{toTitle(validated.prevComponent ?? '')}
						</Tooltip.Content>
					</Tooltip.Root>
				{:else}
					<span class="inline-flex size-8 items-center justify-center text-muted-foreground/30">
						<ChevronLeft class="size-4" />
					</span>
				{/if}
				{#if validated.nextComponent}
					<Tooltip.Root delayDuration={300}>
						<Tooltip.Trigger>
							{#snippet child({ props: tooltipProps })}
								<a
									href="/components/{validated.nextComponent}"
									class="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
									{...tooltipProps}
								>
									<ChevronRight class="size-4" />
									<span class="sr-only">Next: {toTitle(validated.nextComponent ?? '')}</span>
								</a>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content side="bottom" sideOffset={4}>
							{toTitle(validated.nextComponent ?? '')}
						</Tooltip.Content>
					</Tooltip.Root>
				{:else}
					<span class="inline-flex size-8 items-center justify-center text-muted-foreground/30">
						<ChevronRight class="size-4" />
					</span>
				{/if}
			</div>
		</div>
		{#if validated.description}
			<p class="mt-1 text-sm text-muted-foreground">{validated.description}</p>
		{/if}
		{#if validated.meta}
			<div class="mt-2 flex flex-wrap items-center gap-1.5">
				<Badge variant="secondary" class="text-xs capitalize">{validated.meta.category}</Badge>
				{#each validated.meta.tags as tag, i (i)}
					<Badge variant="outline" class="text-xs">{tag}</Badge>
				{/each}
			</div>
		{/if}
		<div class="mt-1.5">
			<CopyImport text={validated.importPath ?? `@/ui/${validated.name}`} copyText="import ... from '@/ui/{validated.name}/...';" />
		</div>
	</div>
</div>
