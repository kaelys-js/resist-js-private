<script module lang="ts">
import * as v from 'valibot';
import { StrSchema, BoolSchema } from '@/schemas/common';
import { LensMetaSchema, type LensMeta } from '../lens/types.js';
import { SearchItemSchema, type SearchItem } from '../search-autocomplete/search-item.js';

/** Schema for the LensHeader component props. */
export const LensHeaderPropsSchema = v.strictObject({
	/** Component directory name (kebab-case). @values button, dialog, sidebar */
	name: StrSchema,
	/** Component description extracted from source JSDoc. @values A clickable button, An overlay dialog, A navigation sidebar */
	description: v.optional(StrSchema),
	/** Validated lens metadata for category/tag badges. */
	meta: v.optional(v.nullable(LensMetaSchema)),
	/** Import path shown in the copy-import chip. @values @/ui/button, @/ui/dialog, @/ui/sidebar */
	importPath: v.optional(StrSchema),
	/** Whether the component has renderable variants. */
	hasVariants: v.optional(BoolSchema),
	/** Whether the component has hand-written examples. */
	hasExamples: v.optional(BoolSchema),
	/** Whether the component has raw source available. */
	hasSource: v.optional(BoolSchema),
	/** Search items for the search popover. Empty array hides the search button. */
	searchItems: v.optional(v.array(SearchItemSchema)),
	/** Callback fired when a search item is selected. */
	onSearchSelect: v.optional(v.custom<(item: SearchItem) => void>((val: unknown): boolean => typeof val === 'function')),
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
 * an optional search popover for filtering props/variants/examples.
 */
import type { Bool, Str, Void } from '@/schemas/common';
import { toTitle } from '../lens/lens-utils.js';
import Badge from '../badge/badge.svelte';
import CopyImport from '../copy-import/CopyImport.svelte';
import * as Command from '../command/index.js';
import * as DropdownMenu from '../dropdown-menu/index.js';
import * as Popover from '../popover/index.js';
import * as Tooltip from '../tooltip/index.js';
import ComponentIcon from '@lucide/svelte/icons/component';
import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
import SearchIcon from '@lucide/svelte/icons/search';
import TableProperties from '@lucide/svelte/icons/table-properties';
import Layers from '@lucide/svelte/icons/layers';
import BookOpen from '@lucide/svelte/icons/book-open';
import FileCode from '@lucide/svelte/icons/file-code';

const {
	name,
	description,
	meta,
	importPath,
	hasVariants = false,
	hasExamples = false,
	hasSource = false,
	searchItems = [],
	onSearchSelect,
}: LensHeaderProps = $props();

/** Whether the search popover is open. */
let searchOpen: Bool = $state(false);

/** Current search input value. */
let searchValue: Str = $state('');

/**
 * Smooth-scroll to a section by its element ID.
 *
 * @param id - The DOM element ID to scroll to
 */
function scrollTo(id: Str): Void {
	document.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Group search items by their `group` field for Command rendering.
 *
 * @returns Array of `{ name, items }` tuples preserving insertion order.
 */
const groupedItems: Array<{ name: Str; items: SearchItem[] }> = $derived.by(() => {
	const groups: Map<Str, SearchItem[]> = new Map();
	for (const item of searchItems) {
		const key: Str = item.group ?? '';
		const existing: SearchItem[] | undefined = groups.get(key);
		if (existing) {
			existing.push(item);
		} else {
			groups.set(key, [item]);
		}
	}
	return [...groups.entries()].map(([groupName, groupItems]: [Str, SearchItem[]]) => ({
		name: groupName,
		items: groupItems,
	}));
});

/**
 * Handle search item selection — fire callback, close popover, reset search.
 *
 * @param item - The selected search item
 */
function handleSelect(item: SearchItem): Void {
	onSearchSelect?.(item);
	searchOpen = false;
	searchValue = '';
}
</script>

<div class="flex items-start gap-4">
	<div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
		<ComponentIcon class="size-6 text-primary" />
	</div>
	<div class="min-w-0 flex-1">
		<div class="flex items-baseline gap-4">
			<h1 class="text-3xl font-bold tracking-tight">{toTitle(name)}</h1>

			<div class="flex items-center gap-1">
				<!-- Search icon → Popover → Command search -->
				{#if searchItems.length > 0}
					<Popover.Root bind:open={searchOpen}>
						<Tooltip.Root delayDuration={300}>
							<Tooltip.Trigger>
								{#snippet child({ props: tooltipProps })}
									<Popover.Trigger>
										{#snippet child({ props: triggerProps })}
											<button
												type="button"
												class="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
												{...tooltipProps}
												{...triggerProps}
											>
												<SearchIcon class="size-4" />
												<span class="sr-only">Search props, variants, examples</span>
											</button>
										{/snippet}
									</Popover.Trigger>
								{/snippet}
							</Tooltip.Trigger>
							<Tooltip.Content side="right" sideOffset={4}>
								Search
							</Tooltip.Content>
						</Tooltip.Root>
						<Popover.Content class="w-[280px] p-0" align="start" sideOffset={8}>
							<Command.Root shouldFilter={true}>
								<Command.Input placeholder="Search props, variants..." bind:value={searchValue} />
								<Command.List>
									<Command.Empty>No matches.</Command.Empty>
									{#each groupedItems as group (group.name)}
										{#if group.name}
											<Command.Group heading={group.name}>
												{#each group.items as item (item.value)}
													<Command.Item
														value={item.value}
														keywords={item.keywords}
														onSelect={() => handleSelect(item)}
													>
														{item.label}
													</Command.Item>
												{/each}
											</Command.Group>
										{:else}
											{#each group.items as item (item.value)}
												<Command.Item
													value={item.value}
													keywords={item.keywords}
													onSelect={() => handleSelect(item)}
												>
													{item.label}
												</Command.Item>
											{/each}
										{/if}
									{/each}
								</Command.List>
							</Command.Root>
						</Popover.Content>
					</Popover.Root>
				{/if}

				<!-- Section navigation dropdown -->
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
										<span class="sr-only">Section navigation</span>
									</button>
								{/snippet}
							</DropdownMenu.Trigger>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="right" sideOffset={4}>
						Section navigation
					</Tooltip.Content>
				</Tooltip.Root>
				<DropdownMenu.Content align="start" sideOffset={4}>
					<DropdownMenu.Item onclick={() => scrollTo('props')}>
						<TableProperties class="mr-2 size-4" />
						Go to Props
					</DropdownMenu.Item>
					{#if hasVariants}
						<DropdownMenu.Item onclick={() => scrollTo('default')}>
							<ComponentIcon class="mr-2 size-4" />
							Go to Default
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
				</DropdownMenu.Content>
			</DropdownMenu.Root>
			</div>
		</div>
		{#if description}
			<p class="mt-1 text-sm text-muted-foreground">{description}</p>
		{/if}
		{#if meta}
			<div class="mt-2 flex flex-wrap items-center gap-1.5">
				<Badge variant="secondary" class="text-xs capitalize">{meta.category}</Badge>
				{#each meta.tags as tag (tag)}
					<Badge variant="outline" class="text-xs">{tag}</Badge>
				{/each}
			</div>
		{/if}
		<div class="mt-1.5">
			<CopyImport text={importPath ?? `@/ui/${name}`} copyText="import ... from '@/ui/{name}/...';" />
		</div>
	</div>
</div>
