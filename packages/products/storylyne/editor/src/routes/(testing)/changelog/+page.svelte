<script lang="ts">
  /**
   * What's New — library-wide changelog from git history.
   *
   * Displays a timeline of commits touching the component library,
   * grouped by date with component badges, search, and filter chips.
   */
  import type { Bool, Num, Str } from '@/schemas/common';
  import LensEmpty from '@/ui/lens-empty/LensEmpty.svelte';
  import GitCommitHorizontal from '@lucide/svelte/icons/git-commit-horizontal';
  import Plus from '@lucide/svelte/icons/plus';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Search from '@lucide/svelte/icons/search';
  import X from '@lucide/svelte/icons/x';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import { fade } from 'svelte/transition';
  import type { ChangelogData } from './+page.server.js';

  const { data }: { data: ChangelogData } = $props();

  /** Search query for filtering entries. */
  let searchQuery: Str = $state('' as Str);

  /** Active filter: 'all', 'added', or 'updated'. */
  let activeFilter: Str = $state('all' as Str);

  /** Number of date groups currently visible. */
  let visibleGroups: Num = $state(10 as Num);

  /** Filtered groups based on search and filter. */
  const filteredGroups = $derived.by(() => {
    const query: Str = searchQuery.toLowerCase() as Str;
    const { groups } = data;

    const result: typeof data.groups = [];

    const matchesFilter = (entry: (typeof groups)[0]['entries'][0]): boolean => {
      /* Filter by type */
      if (activeFilter === 'added' && !entry.isNew) return false;
      if (activeFilter === 'updated' && entry.isNew) return false;

      /* Filter by search query */
      if (query.length === 0) return true;
      if (entry.message.toLowerCase().includes(query)) return true;
      if (entry.author.toLowerCase().includes(query)) return true;
      if (entry.components.some((c) => c.toLowerCase().includes(query))) return true;
      return false;
    };

    for (const group of groups) {
      const filteredEntries = group.entries.filter(matchesFilter);

      if (filteredEntries.length > 0) {
        result.push({ date: group.date, entries: filteredEntries });
      }
    }

    return result;
  });

  /** Total visible entries across all filtered groups. */
  const totalFiltered: Num = $derived(
    filteredGroups.reduce((sum, g) => sum + g.entries.length, 0) as Num,
  );

  /** Whether there are more groups to show. */
  const hasMore: Bool = $derived((visibleGroups as number) < filteredGroups.length);

  /** Groups to render (paginated). */
  const displayGroups = $derived(filteredGroups.slice(0, visibleGroups as number));

  /**
   * Format an ISO date string to a human-readable relative label.
   *
   * @param iso - ISO 8601 date string
   * @returns Relative time string
   */
  function relativeTime(iso: Str): Str {
    const now: number = Date.now();
    const then: number = new Date(iso).getTime();
    const diffMs: number = now - then;
    const diffMin: number = Math.floor(diffMs / 60_000);
    const diffHr: number = Math.floor(diffMin / 60);
    const diffDay: number = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'just now' as Str;
    if (diffMin < 60) return `${diffMin}m ago` as Str;
    if (diffHr < 24) return `${diffHr}h ago` as Str;
    if (diffDay < 7) return `${diffDay}d ago` as Str;
    if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago` as Str;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) as Str;
  }

  /**
   * Format a date string for the group header.
   *
   * @param dateStr - YYYY-MM-DD date string
   * @returns Formatted date like "March 16, 2026"
   */
  function formatGroupDate(dateStr: Str): Str {
    const d: Date = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) as Str;
  }

  /**
   * Show more groups.
   */
  function showMore(): void {
    visibleGroups = ((visibleGroups as number) + 10) as Num;
  }

  /**
   * Clear search and filters.
   */
  function clearFilters(): void {
    searchQuery = '' as Str;
    activeFilter = 'all' as Str;
  }
</script>

<div class="mx-auto max-w-4xl space-y-6 p-8">
  <!-- Page header -->
  <div>
    <h1 class="text-3xl font-bold tracking-tight">What's New</h1>
    <p class="mt-2 text-muted-foreground">Recent changes to the component library.</p>
  </div>

  <!-- Search + filters -->
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div class="relative flex-1">
      <Search
        class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        type="text"
        placeholder="Search commits, components, or authors..."
        class="w-full rounded-lg border bg-card py-2 pl-10 pr-8 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
        bind:value={searchQuery}
      />
      {#if searchQuery}
        <button
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          onclick={() => {
            searchQuery = '' as Str;
          }}
          aria-label="Clear search"
        >
          <X class="size-4" />
        </button>
      {/if}
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        class="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors {activeFilter ===
        'all'
          ? 'border-primary bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground'}"
        onclick={() => {
          activeFilter = 'all' as Str;
        }}
      >
        All
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors {activeFilter ===
        'added'
          ? 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400'
          : 'text-muted-foreground hover:text-foreground'}"
        onclick={() => {
          activeFilter = 'added' as Str;
        }}
      >
        <Plus class="size-3" /> Added
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors {activeFilter ===
        'updated'
          ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
          : 'text-muted-foreground hover:text-foreground'}"
        onclick={() => {
          activeFilter = 'updated' as Str;
        }}
      >
        <Pencil class="size-3" /> Updated
      </button>

      {#if searchQuery || activeFilter !== 'all'}
        <button
          type="button"
          class="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          onclick={clearFilters}
        >
          Clear
        </button>
      {/if}
    </div>
  </div>

  <!-- Result count -->
  {#if searchQuery || activeFilter !== 'all'}
    <p class="text-xs text-muted-foreground" transition:fade={{ duration: 150 }}>
      {totalFiltered}
      {totalFiltered === 1 ? 'result' : 'results'}
      {#if searchQuery}matching "{searchQuery}"{/if}
    </p>
  {/if}

  <!-- Timeline -->
  {#if displayGroups.length === 0}
    <LensEmpty
      title="No changes found"
      description={searchQuery
        ? 'Try a different search term or clear filters.'
        : 'No git history available for the component library.'}
    />
  {:else}
    <div class="space-y-8">
      {#each displayGroups as group (group.date)}
        <div>
          <!-- Date header -->
          <div class="mb-3 flex items-center gap-3">
            <div class="size-2.5 rounded-full bg-primary"></div>
            <h2 class="text-sm font-semibold">{formatGroupDate(group.date)}</h2>
            <span class="text-xs text-muted-foreground">
              {group.entries.length}
              {group.entries.length === 1 ? 'change' : 'changes'}
            </span>
          </div>

          <!-- Entries -->
          <div class="ml-1 space-y-2 border-l-2 border-muted pl-5">
            {#each group.entries as entry (entry.hash)}
              <div
                class="rounded-lg border bg-card p-4 transition-colors hover:border-muted-foreground/20"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      {#if entry.isNew}
                        <span
                          class="inline-flex items-center gap-0.5 rounded-full bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400"
                        >
                          <Plus class="size-2.5" /> new
                        </span>
                      {/if}
                      <p class="truncate text-sm font-medium">{entry.message}</p>
                    </div>

                    <!-- Component badges -->
                    {#if entry.components.length > 0}
                      <div class="mt-2 flex flex-wrap gap-1">
                        {#each entry.components.slice(0, 8) as comp}
                          <a
                            href="/components/{comp}"
                            class="inline-flex items-center rounded-md border bg-muted/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                          >
                            {comp}
                          </a>
                        {/each}
                        {#if entry.components.length > 8}
                          <span
                            class="inline-flex items-center px-1 text-[10px] text-muted-foreground"
                          >
                            +{entry.components.length - 8} more
                          </span>
                        {/if}
                      </div>
                    {/if}
                  </div>

                  <div class="flex shrink-0 flex-col items-end gap-1">
                    <div class="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <GitCommitHorizontal class="size-3" />
                      <code class="font-mono">{entry.hash}</code>
                    </div>
                    <span class="text-[10px] text-muted-foreground">{entry.author}</span>
                    <span class="text-[10px] text-muted-foreground">{relativeTime(entry.date)}</span
                    >
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <!-- Load more -->
    {#if hasMore}
      <div class="flex justify-center pt-4">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          onclick={showMore}
        >
          <ChevronDown class="size-4" />
          Show more
        </button>
      </div>
    {/if}
  {/if}
</div>
