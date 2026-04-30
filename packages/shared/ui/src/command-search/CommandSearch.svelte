<script module lang="ts">
  /**
   * CommandSearch — global command-search dialog opening via
   * Cmd/Ctrl+K. Wraps `Dialog` + `Command` primitives to offer a
   * searchable, grouped command palette where items can navigate
   * via `href` or fire an `onSelect` callback.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema, BoolSchema } from '@/schemas/common';
  import { SearchItemSchema, type SearchItem } from '../search-autocomplete/search-item.js';

  /**
   * Global command search dialog with keyboard shortcut. @convert-to-lens
   *
   * Wraps `Dialog` and `Command` primitives to provide a searchable, grouped
   * command palette that opens via Cmd+K (Mac) / Ctrl+K (Win/Linux) or an
   * external trigger. Items can navigate via `href` or fire an `onSelect` callback.
   *
   * @example
   * ```svelte
   * <CommandSearch
   *   items={[{ value: 'button', label: 'Button', href: '/components/button', group: 'Components' }]}
   *   placeholder="Search lens..."
   * />
   * ```
   */
  export const CommandSearchPropsSchema = v.strictObject({
    /** The list of searchable items. @values [{value: "button", label: "Button", href: "/components/button", group: "Components"}] */
    items: v.array(SearchItemSchema),
    /** Placeholder text for the search input. @values Search..., Search lens..., Find anything */
    placeholder: v.optional(StrSchema),
    /** Text shown when no items match the search query. @values No results found, Nothing here, Try a different search */
    emptyText: v.optional(StrSchema),
    /** Whether the dialog is open (bindable). @values true, false */
    open: v.optional(BoolSchema),
    /** Callback fired when an item is selected. @values (item) => void */
    onSelect: v.optional(
      v.custom<(item: SearchItem) => void>((val: unknown): boolean => typeof val === 'function'),
    ),
    /** Whether to enable the Cmd+K / Ctrl+K keyboard shortcut. @values true, false */
    enableShortcut: v.optional(BoolSchema),
  });
  /** Props for the CommandSearch component. */
  export type CommandSearchProps = v.InferOutput<typeof CommandSearchPropsSchema>;
</script>

<script lang="ts">
  /**
   * Global command search dialog with grouped items and keyboard shortcut.
   *
   * Composes Dialog + Command directly (instead of Command.Dialog) for full
   * control over close button visibility, keyboard hint footer, and empty state.
   */
  import type { Bool, Str, Void } from '@/schemas/common';
  import * as Command from '../command/index.js';
  import * as Dialog from '../dialog/index.js';
  import SearchX from '@lucide/svelte/icons/search-x';
  import XIcon from '@lucide/svelte/icons/x';
  import Clock from '@lucide/svelte/icons/clock';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import CornerDownLeft from '@lucide/svelte/icons/corner-down-left';

  let {
    /** The list of searchable items. */
    items = [],
    /** Placeholder text for the search input. */
    placeholder = 'Search...',
    /** Text shown when no items match. */
    emptyText = 'No results found.',
    /** Whether the dialog is open. */
    open = $bindable(false),
    /** Callback fired when an item is selected. */
    onSelect,
    /** Whether to enable the Cmd+K / Ctrl+K keyboard shortcut. */
    enableShortcut = true,
  }: CommandSearchProps = $props();

  /** Current search input value. */
  let searchValue: Str = $state('');

  /** Maximum search history entries. */
  const MAX_HISTORY: number = 5;

  /** localStorage key for search history. */
  const HISTORY_KEY: Str = 'lens-search-history' as Str;

  /** Recent search selections (most recent first). */
  let searchHistory: SearchItem[] = $state([]);

  // Restore search history from localStorage on mount
  $effect(() => {
    try {
      const stored: Str | null = localStorage.getItem(HISTORY_KEY);

      if (stored) {
        searchHistory = JSON.parse(stored) as SearchItem[];
      }
    } catch {
      /* localStorage unavailable (SSR/incognito) — default empty is fine */
    }
  });

  /** Register Cmd+K / Ctrl+K keyboard shortcut. */
  $effect(() => {
    if (!enableShortcut) {
      return;
    }

    function handleKeydown(e: KeyboardEvent): Void {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        open = !open;
      }
    }

    document.addEventListener('keydown', handleKeydown);
    return (): void => {
      document.removeEventListener('keydown', handleKeydown);
    };
  });

  /** Reset search value when dialog closes. */
  $effect(() => {
    if (!open) {
      searchValue = '';
    }
  });

  /**
   * Group items by their `group` field for Command rendering.
   *
   * Items without a `group` are placed under an empty-string key.
   *
   * @returns Array of `{ name, items }` tuples preserving insertion order.
   */
  const groupedItems: Array<{ name: Str; items: SearchItem[] }> = $derived.by(() => {
    const groups: Map<Str, SearchItem[]> = new Map();

    for (const rawItem of items) {
      const key: Str = rawItem.group ?? '';
      const existing: SearchItem[] | undefined = groups.get(key);

      if (existing) {
        existing.push(rawItem);
      } else {
        groups.set(key, [rawItem]);
      }
    }
    return [...groups.entries()].map(([groupName, groupItems]: [Str, SearchItem[]]) => ({
      name: groupName,
      items: groupItems,
    }));
  });

  /**
   * Handle item selection — fire callback, close dialog, reset search.
   *
   * @param item - The selected search item
   */
  function handleSelect(item: SearchItem): Void {
    // Save to search history
    const filtered: SearchItem[] = searchHistory.filter(
      (h: SearchItem): boolean => h.value !== item.value,
    );
    searchHistory = [item, ...filtered].slice(0, MAX_HISTORY);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(searchHistory));
    } catch {
      /* localStorage unavailable (SSR/incognito) — non-critical */
    }
    onSelect?.(item);
    open = false;
    searchValue = '';
  }

  /**
   * Remove a single item from search history.
   *
   * @param value - The value of the history item to remove
   */
  function removeHistoryItem(value: Str): Void {
    searchHistory = searchHistory.filter((h: SearchItem): boolean => h.value !== value);
    try {
      if (searchHistory.length > 0) {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(searchHistory));
      } else {
        localStorage.removeItem(HISTORY_KEY);
      }
    } catch {
      /* localStorage unavailable (SSR/incognito) — non-critical */
    }
  }

  /** Clear all search history entries. */
  function clearAllHistory(): Void {
    searchHistory = [];
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* localStorage unavailable (SSR/incognito) — non-critical */
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Header class="sr-only">
    <Dialog.Title>Search</Dialog.Title>
    <Dialog.Description>Search for components, props, and more</Dialog.Description>
  </Dialog.Header>
  <Dialog.Content class="overflow-hidden p-0" showCloseButton={false}>
    <Command.Root
      class="**:data-[slot=command-input-wrapper]:h-12 [&_[data-command-group]:not([hidden])_~[data-command-group]]:pt-0 [&_[data-command-input-wrapper]_svg]:h-5 [&_[data-command-input-wrapper]_svg]:w-5 [&_[data-command-input]]:h-12 [&_[data-command-item]_svg]:h-5 [&_[data-command-item]_svg]:w-5"
    >
      <div class="relative">
        <Command.Input placeholder={placeholder ?? 'Search...'} bind:value={searchValue} />
        {#if searchValue.length > 0}
          <button
            type="button"
            class="absolute end-2 top-1/2 -translate-y-1/2 rounded-xs p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground"
            onclick={() => {
              searchValue = '';
            }}
            aria-label="Clear search"
          >
            <XIcon class="size-4" />
          </button>
        {/if}
      </div>
      <Command.List>
        <Command.Empty>
          <div class="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <SearchX class="size-10 text-muted-foreground/30" strokeWidth={1.5} />
            <p class="text-sm">{emptyText ?? 'No results found.'}</p>
          </div>
        </Command.Empty>
        {#if searchValue.length === 0 && searchHistory.length > 0}
          <div class="border-b pb-1">
            <div class="flex items-center justify-between px-2 py-1.5">
              <span class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Clock class="size-3" />
                Recent
              </span>
              <button
                type="button"
                class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
                onclick={clearAllHistory}
              >
                <Trash2 class="size-3" />
                Clear all
              </button>
            </div>
            <Command.Group value="__history">
              {#each searchHistory as histItem, hi (histItem.value ?? hi)}
                {#if histItem.href}
                  <Command.LinkItem
                    href={histItem.href}
                    value="history-{histItem.value}"
                    keywords={histItem.keywords}
                    class="group/hist py-1.5 ps-3 pe-2"
                    onSelect={() => handleSelect(histItem)}
                  >
                    <span class="flex-1">{histItem.label}</span>
                    <button
                      type="button"
                      class="shrink-0 rounded p-0.5 text-muted-foreground/30 opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover/hist:opacity-100"
                      onclick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeHistoryItem(histItem.value);
                      }}
                      aria-label="Remove from recent"
                    >
                      <XIcon class="size-3" />
                    </button>
                  </Command.LinkItem>
                {:else}
                  <Command.Item
                    value="history-{histItem.value}"
                    keywords={histItem.keywords}
                    class="group/hist py-1.5 ps-3 pe-2 text-muted-foreground/50 italic"
                    onSelect={() => handleSelect(histItem)}
                  >
                    <span class="flex-1">{histItem.label}</span>
                    <button
                      type="button"
                      class="shrink-0 rounded p-0.5 text-muted-foreground/30 opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover/hist:opacity-100"
                      onclick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeHistoryItem(histItem.value);
                      }}
                      aria-label="Remove from recent"
                    >
                      <XIcon class="size-3" />
                    </button>
                  </Command.Item>
                {/if}
              {/each}
            </Command.Group>
          </div>
        {/if}
        {#each groupedItems as group, gi (gi)}
          {#if group.name}
            {@const parts = group.name.split(' › ')}
            {@const depth = parts.length - 1}
            {@const displayHeading = parts.at(-1) ?? group.name}
            {@const hClass =
              depth === 0
                ? 'text-sm font-semibold py-1.5'
                : depth === 1
                  ? 'ps-3 text-muted-foreground/70'
                  : 'ps-7 text-muted-foreground/60'}
            {@const itemPad = depth === 0 ? 'ps-3' : depth === 1 ? 'ps-5' : 'ps-9'}
            <Command.Group heading={displayHeading} value={group.name} headingClass={hClass}>
              {#each group.items as item, ii (item.value ?? ii)}
                {#if item.href}
                  <Command.LinkItem
                    href={item.href}
                    value={item.value}
                    keywords={item.keywords}
                    class="py-1.5 {itemPad}"
                    onSelect={() => handleSelect(item)}
                  >
                    {item.label}
                  </Command.LinkItem>
                {:else}
                  <Command.Item
                    value={item.value}
                    keywords={item.keywords}
                    class="py-1.5 {itemPad} text-muted-foreground/50 italic"
                    onSelect={() => handleSelect(item)}
                  >
                    {item.label}
                  </Command.Item>
                {/if}
              {/each}
            </Command.Group>
          {/if}
        {/each}
      </Command.List>
      <div
        class="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground"
      >
        <div class="flex items-center gap-3">
          <span class="flex items-center gap-1"
            ><kbd class="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd> navigate</span
          >
          <span class="flex items-center gap-1"><CornerDownLeft class="size-3" /> open</span>
          <span class="flex items-center gap-1"
            ><kbd class="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">esc</kbd> close</span
          >
        </div>
      </div>
    </Command.Root>
  </Dialog.Content>
</Dialog.Root>
