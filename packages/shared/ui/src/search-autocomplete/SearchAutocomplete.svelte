<script lang="ts">
import type { Bool, Str } from '@/schemas/common';
import SearchIcon from '@lucide/svelte/icons/search';
import type { SearchItem } from './search-item.js';
import * as Command from '../command/index.js';
import * as Popover from '../popover/index.js';
import { cn } from '../utils.js';

/**
 * Search input with popover autocomplete dropdown.
 *
 * Composes `Popover` and `Command` (cmdk-sv) to provide a keyboard-
 * navigable, filterable search experience. Items can have navigation
 * links (`href`) or fire a callback (`onSelect`).
 *
 * @example
 * ```svelte
 * <SearchAutocomplete
 *   items={[{ value: 'button', label: 'Button', href: '/components/button' }]}
 *   placeholder="Search components..."
 * />
 * ```
 */
type SearchAutocompleteProps = {
	/** The list of items to search through. */
	items: SearchItem[];
	/** Placeholder text for the search input. */
	placeholder?: Str;
	/** Additional CSS classes for the trigger button. */
	class?: Str;
	/** Callback fired when an item is selected. */
	onSelect?: (item: SearchItem) => void;
	/** Text shown when no items match the search query. */
	emptyText?: Str;
};

const {
	items,
	placeholder = 'Search...',
	class: className,
	onSelect,
	emptyText = 'No results.',
}: SearchAutocompleteProps = $props();

let open: Bool = $state(false);
let searchValue: Str = $state('');

/**
 * Group items by their `group` field.
 *
 * Items without a `group` are placed under an empty-string key.
 *
 * @returns Array of `{ name, items }` tuples preserving insertion order.
 */
const groupedItems: Array<{ name: Str; items: SearchItem[] }> = $derived.by(() => {
	const groups: Map<Str, SearchItem[]> = new Map();
	for (const item of items) {
		const key: Str = item.group ?? '';
		const existing: SearchItem[] | undefined = groups.get(key);
		if (existing) {
			existing.push(item);
		} else {
			groups.set(key, [item]);
		}
	}
	return [...groups.entries()].map(([name, groupItems]: [Str, SearchItem[]]) => ({
		name,
		items: groupItems,
	}));
});

/**
 * Handle item selection — fire callback, close popover, reset search.
 *
 * @param item - The selected search item
 */
function handleSelect(item: SearchItem): void {
	onSelect?.(item);
	open = false;
	searchValue = '';
}
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<button
				{...props}
				type="button"
				class={cn(
					'inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground',
					className,
				)}
				aria-label="Search"
			>
				<SearchIcon class="size-4" aria-hidden="true" />
				<span>{placeholder}</span>
			</button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-[280px] p-0" align="start" sideOffset={8}>
		<Command.Root shouldFilter={true}>
			<Command.Input placeholder={placeholder} bind:value={searchValue} />
			<Command.List>
				<Command.Empty>{emptyText}</Command.Empty>
				{#each groupedItems as group (group.name)}
					{#if group.name}
						<Command.Group heading={group.name}>
							{#each group.items as item (item.value)}
								{#if item.href}
									<Command.LinkItem
										href={item.href}
										value={item.value}
										onSelect={() => handleSelect(item)}
									>
										{item.label}
									</Command.LinkItem>
								{:else}
									<Command.Item
										value={item.value}
										onSelect={() => handleSelect(item)}
									>
										{item.label}
									</Command.Item>
								{/if}
							{/each}
						</Command.Group>
					{:else}
						{#each group.items as item (item.value)}
							{#if item.href}
								<Command.LinkItem
									href={item.href}
									value={item.value}
									onSelect={() => handleSelect(item)}
								>
									{item.label}
								</Command.LinkItem>
							{:else}
								<Command.Item
									value={item.value}
									onSelect={() => handleSelect(item)}
								>
									{item.label}
								</Command.Item>
							{/if}
						{/each}
					{/if}
				{/each}
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
