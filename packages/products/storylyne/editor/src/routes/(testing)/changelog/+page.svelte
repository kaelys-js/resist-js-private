<script lang="ts">
  /**
   * What's New — library-wide changelog from git history.
   *
   * Displays a timeline of commits touching the component library,
   * grouped by date with component badges, search, filter chips,
   * and collapsible date groups.
   */
  import type { Bool, Num, Str } from '@/schemas/common';
  import LensEmpty from '@/ui/lens-empty/LensEmpty.svelte';
  import * as DropdownMenu from '@/ui/dropdown-menu/index.js';
  import * as Tooltip from '@/ui/tooltip/index.js';
  import Badge from '@/ui/badge/badge.svelte';
  import Newspaper from '@lucide/svelte/icons/newspaper';
  import GitCommitHorizontal from '@lucide/svelte/icons/git-commit-horizontal';
  import Plus from '@lucide/svelte/icons/plus';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Bug from '@lucide/svelte/icons/bug';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import Search from '@lucide/svelte/icons/search';
  import SearchX from '@lucide/svelte/icons/search-x';
  import X from '@lucide/svelte/icons/x';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
  import Check from '@lucide/svelte/icons/check';
  import Clipboard from '@lucide/svelte/icons/clipboard';
  import ClipboardCopy from '@lucide/svelte/icons/clipboard-copy';
  import FileText from '@lucide/svelte/icons/file-text';
  import DownloadIcon from '@lucide/svelte/icons/download';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
  import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
  import ChevronsDownUp from '@lucide/svelte/icons/chevrons-down-up';
  import LayoutList from '@lucide/svelte/icons/layout-list';
  import Input from '@/ui/input/input.svelte';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import ComponentIcon from '@lucide/svelte/icons/component';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import { fade, slide } from 'svelte/transition';
  import type { ChangelogData } from './+page.server.js';

  const { data }: { data: ChangelogData } = $props();

  /* ------------------------------------------------------------------ */
  /*  State                                                              */
  /* ------------------------------------------------------------------ */

  /** Search query for filtering entries. */
  let searchQuery: Str = $state('' as Str);

  /** Active type filters — empty means show all. */
  let activeFilters: Set<Str> = $state(new Set());

  /** Number of date groups currently visible. */
  let visibleGroups: Num = $state(10 as Num);

  /** View mode: 'timeline' (default), 'compact', 'list'. */
  let viewMode: Str = $state('timeline' as Str);

  /** Active sort field (empty string = default/newest first). */
  let sortField: Str = $state('' as Str);

  /** Sort direction: 'asc' | 'desc'. Only meaningful when sortField is set. */
  let sortDir: 'asc' | 'desc' = $state('asc');

  /** Set of collapsed date group keys. */
  let collapsedGroups: Set<Str> = $state(new Set());

  /** Set of expanded commit body rows (by hash). */
  let expandedRows: Set<Str> = $state(new Set());

  /** Two-step reset confirmation. */
  let confirmingReset: Bool = $state(false as Bool);

  /** Timer for auto-clearing reset confirmation. */
  let confirmResetTimer: ReturnType<typeof setTimeout> | undefined;

  /** Export search query. */
  let exportSearch: Str = $state('' as Str);

  /** View mode search query. */
  let viewModeSearch: Str = $state('' as Str);

  /** Sort search query. */
  let sortSearch: Str = $state('' as Str);

  /* ------------------------------------------------------------------ */
  /*  Entry type detection                                               */
  /* ------------------------------------------------------------------ */

  /** Possible entry types derived from commit message. */
  type EntryType = 'added' | 'updated' | 'fixed' | 'breaking' | 'deprecated';

  /**
   * Detect entry type from commit message.
   *
   * @param message - Commit subject line
   * @param isNew - Whether the server flagged this as new
   * @returns Detected entry type
   */
  function detectEntryType(message: Str, isNew: boolean): EntryType {
    const msg: Str = message.toLowerCase() as Str;
    if (msg.includes('breaking') || msg.includes('break')) return 'breaking';
    if (msg.includes('deprecat')) return 'deprecated';
    if (msg.includes('fix') || msg.includes('bug') || msg.includes('patch')) return 'fixed';
    if (isNew) return 'added';
    return 'updated';
  }

  /** Entry type display config. */
  const ENTRY_TYPE_CONFIG: Record<
    EntryType,
    { label: Str; color: Str; badgeColor: Str; icon: typeof Plus }
  > = {
    added: {
      label: 'New' as Str,
      color: 'text-emerald-600 dark:text-emerald-400' as Str,
      badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' as Str,
      icon: Plus,
    },
    updated: {
      label: 'Updated' as Str,
      color: 'text-blue-600 dark:text-blue-400' as Str,
      badgeColor: 'bg-blue-500/15 text-blue-700 dark:text-blue-400' as Str,
      icon: Pencil,
    },
    fixed: {
      label: 'Fixed' as Str,
      color: 'text-red-600 dark:text-red-400' as Str,
      badgeColor: 'bg-red-500/15 text-red-700 dark:text-red-400' as Str,
      icon: Bug,
    },
    breaking: {
      label: 'Breaking' as Str,
      color: 'text-amber-600 dark:text-amber-400' as Str,
      badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' as Str,
      icon: TriangleAlert,
    },
    deprecated: {
      label: 'Deprecated' as Str,
      color: 'text-gray-600 dark:text-gray-400' as Str,
      badgeColor: 'bg-gray-500/15 text-gray-700 dark:text-gray-400' as Str,
      icon: Trash2,
    },
  };

  /* ------------------------------------------------------------------ */
  /*  Derived data                                                       */
  /* ------------------------------------------------------------------ */

  /** Filtered groups based on search and filter. */
  const filteredGroups = $derived.by(() => {
    const query: Str = searchQuery.toLowerCase() as Str;
    const { groups } = data;

    const result: typeof data.groups = [];

    const matchesFilter = (entry: (typeof groups)[0]['entries'][0]): boolean => {
      const entryType: EntryType = detectEntryType(entry.message as Str, entry.isNew);

      /* Filter by type */
      if (activeFilters.size > 0 && !activeFilters.has(entryType as Str)) return false;

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

    /* Apply sort — default is newest first; 'date' field with asc = oldest first */
    if (sortField === 'date' && sortDir === 'asc') {
      return result.toReversed();
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

  /* ------------------------------------------------------------------ */
  /*  Filter chip config                                                 */
  /* ------------------------------------------------------------------ */

  /** Filter options for the toolbar. */
  const FILTER_OPTIONS: Array<{
    value: Str;
    label: Str;
    icon: typeof Plus | null;
    activeClass: Str;
  }> = [
    {
      value: 'all' as Str,
      label: 'All' as Str,
      icon: null,
      activeClass: 'border-primary bg-primary/10 text-primary' as Str,
    },
    {
      value: 'added' as Str,
      label: 'Added' as Str,
      icon: Plus,
      activeClass:
        'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' as Str,
    },
    {
      value: 'updated' as Str,
      label: 'Updated' as Str,
      icon: Pencil,
      activeClass: 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400' as Str,
    },
    {
      value: 'fixed' as Str,
      label: 'Fixed' as Str,
      icon: Bug,
      activeClass: 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400' as Str,
    },
    {
      value: 'breaking' as Str,
      label: 'Breaking' as Str,
      icon: TriangleAlert,
      activeClass: 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400' as Str,
    },
    {
      value: 'deprecated' as Str,
      label: 'Deprecated' as Str,
      icon: Trash2,
      activeClass: 'border-gray-500 bg-gray-500/10 text-gray-600 dark:text-gray-400' as Str,
    },
  ];

  /* ------------------------------------------------------------------ */
  /*  Export options                                                      */
  /* ------------------------------------------------------------------ */

  /** Export format option descriptor. */
  type ExportOption = {
    /** Unique identifier. */
    id: Str;
    /** Display label. */
    label: Str;
    /** Short description. */
    description: Str;
    /** Lucide icon component. */
    icon: typeof ClipboardCopy;
    /** Grouping category (Clipboard or File). */
    category: Str;
    /** File extension badge text. */
    ext: Str;
  };

  /** Export format options. */
  const EXPORT_OPTIONS: ExportOption[] = [
    {
      id: 'clipboard' as Str,
      label: 'Copy as Text' as Str,
      description: 'Copy visible entries as plain text' as Str,
      icon: ClipboardCopy,
      category: 'Clipboard' as Str,
      ext: '' as Str,
    },
    {
      id: 'json' as Str,
      label: 'Download JSON' as Str,
      description: 'Structured changelog data for tooling' as Str,
      icon: DownloadIcon,
      category: 'File' as Str,
      ext: '.json' as Str,
    },
    {
      id: 'markdown' as Str,
      label: 'Download Markdown' as Str,
      description: 'Formatted changelog for documentation' as Str,
      icon: DownloadIcon,
      category: 'File' as Str,
      ext: '.md' as Str,
    },
    {
      id: 'csv' as Str,
      label: 'Download CSV' as Str,
      description: 'Spreadsheet-compatible tabular format' as Str,
      icon: DownloadIcon,
      category: 'File' as Str,
      ext: '.csv' as Str,
    },
  ];

  /** Filtered export options. */
  const filteredExports: ExportOption[] = $derived.by((): ExportOption[] => {
    if (!exportSearch) return EXPORT_OPTIONS;
    const q: Str = exportSearch.toLowerCase() as Str;
    return EXPORT_OPTIONS.filter(
      (o: ExportOption): boolean =>
        o.label.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q) ||
        o.category.toLowerCase().includes(q),
    );
  });

  /** Unique export categories present after filtering. */
  const filteredExportCategories: Str[] = $derived([
    ...new Set(filteredExports.map((o: ExportOption): Str => o.category)),
  ]);

  /** Filtered view mode options. */
  const filteredViewModes = $derived.by(() => {
    if (!viewModeSearch) return VIEW_MODES;
    const q: Str = viewModeSearch.toLowerCase() as Str;
    return VIEW_MODES.filter(
      (o) => o.label.toLowerCase().includes(q) || o.description.toLowerCase().includes(q),
    );
  });

  /** Filtered sort options. */
  /** Whether any settings differ from defaults. */
  const hasChanges: Bool = $derived(
    (searchQuery !== '' ||
      activeFilters.size > 0 ||
      viewMode !== 'timeline' ||
      sortField !== '' ||
      collapsedGroups.size > 0) as Bool,
  );

  /** All date keys in the currently filtered groups. */
  const allGroupKeys: Str[] = $derived(filteredGroups.map((g) => g.date as Str));

  /** Whether all date groups are expanded (none collapsed). */
  const allExpanded: Bool = $derived(
    (allGroupKeys.length > 0 && allGroupKeys.every((k: Str) => !collapsedGroups.has(k))) as Bool,
  );

  /** Whether all date groups are collapsed. */
  const allCollapsed: Bool = $derived(
    (allGroupKeys.length > 0 && allGroupKeys.every((k: Str) => collapsedGroups.has(k))) as Bool,
  );

  /** Current view mode display label. */
  const viewModeLabel: Str = $derived.by((): Str => {
    if (viewMode === 'timeline') return 'Timeline' as Str;
    if (viewMode === 'table') return 'Table' as Str;
    if (viewMode === 'compact') return 'Compact' as Str;
    return 'List' as Str;
  });

  /** Current sort display label (field + direction arrow, or empty if default). */
  const sortLabel: Str = $derived.by((): Str => {
    if (!sortField) return '' as Str;
    const names: Record<string, string> = {
      date: 'Date',
    };
    const arrow: Str = (sortDir === 'asc' ? '\u2191' : '\u2193') as Str;
    return `${names[sortField] ?? sortField} ${arrow}` as Str;
  });

  /* ------------------------------------------------------------------ */
  /*  View mode options                                                   */
  /* ------------------------------------------------------------------ */

  /** View mode options. */
  const VIEW_MODES: Array<{ id: Str; label: Str; description: Str }> = [
    {
      id: 'timeline' as Str,
      label: 'Timeline' as Str,
      description: 'Cards grouped by date with timeline indicators' as Str,
    },
    {
      id: 'table' as Str,
      label: 'Table' as Str,
      description: 'Full details with columns' as Str,
    },
    {
      id: 'compact' as Str,
      label: 'Compact' as Str,
      description: 'Dense rows without cards' as Str,
    },
    {
      id: 'list' as Str,
      label: 'Simple List' as Str,
      description: 'Flat list with minimal detail' as Str,
    },
  ];

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */

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
    activeFilters = new Set();
  }

  /**
   * Toggle a date group collapsed state.
   *
   * @param dateKey - Date key to toggle
   */
  function toggleGroup(dateKey: Str): void {
    const next: Set<Str> = new Set(collapsedGroups);
    if (next.has(dateKey)) {
      next.delete(dateKey);
    } else {
      next.add(dateKey);
    }
    collapsedGroups = next;
  }

  /**
   * Toggle a commit body expanded state.
   *
   * @param hash - Commit hash to toggle
   */
  function toggleRowExpand(hash: Str): void {
    const next: Set<Str> = new Set(expandedRows);
    if (next.has(hash)) {
      next.delete(hash);
    } else {
      next.add(hash);
    }
    expandedRows = next;
  }

  /**
   * Reset all settings to defaults.
   */
  function resetDefaults(): void {
    searchQuery = '' as Str;
    activeFilters = new Set();
    viewMode = 'timeline' as Str;
    sortField = '' as Str;
    sortDir = 'asc';
    visibleGroups = 10 as Num;
    collapsedGroups = new Set();
  }

  /** Expand all date groups. */
  function expandAllGroups(): void {
    collapsedGroups = new Set();
  }

  /** Collapse all date groups. */
  function collapseAllGroups(): void {
    collapsedGroups = new Set(filteredGroups.map((g) => g.date as Str));
  }

  /**
   * Handle two-step reset confirmation.
   *
   * @param e - Select event
   */
  function handleReset(e: Event): void {
    e.preventDefault();
    if (confirmingReset) {
      resetDefaults();
      confirmingReset = false as Bool;
      if (confirmResetTimer) clearTimeout(confirmResetTimer);
    } else {
      confirmingReset = true as Bool;
      confirmResetTimer = setTimeout((): void => {
        confirmingReset = false as Bool;
      }, 3000);
    }
  }

  /**
   * Handle export action.
   *
   * @param formatId - Export format identifier
   */
  function handleExport(formatId: Str): void {
    const entriesData = displayGroups.flatMap((g) =>
      g.entries.map((e) => ({
        date: g.date,
        hash: e.hash,
        message: e.message,
        author: e.author,
        components: e.components,
        type: detectEntryType(e.message as Str, e.isNew),
      })),
    );

    if (formatId === 'json') {
      const blob: Blob = new Blob([JSON.stringify(entriesData, null, 2)], {
        type: 'application/json',
      });
      const url: string = URL.createObjectURL(blob);
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = url;
      a.download = 'changelog.json';
      a.click();
      URL.revokeObjectURL(url);
    } else if (formatId === 'clipboard') {
      const text: string = entriesData
        .map((e) => `[${e.type}] ${e.message} (${e.components.join(', ')})`)
        .join('\n');
      navigator.clipboard.writeText(text);
    } else if (formatId === 'markdown') {
      const md: string = displayGroups
        .map(
          (g) =>
            `## ${formatGroupDate(g.date)}\n\n${g.entries
              .map((e) => {
                const t: EntryType = detectEntryType(e.message as Str, e.isNew);
                return `- **[${t}]** ${e.message} (${e.components.join(', ')})`;
              })
              .join('\n')}`,
        )
        .join('\n\n');
      const blob: Blob = new Blob([md], { type: 'text/markdown' });
      const url: string = URL.createObjectURL(blob);
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = url;
      a.download = 'changelog.md';
      a.click();
      URL.revokeObjectURL(url);
    } else if (formatId === 'csv') {
      const rows: string[] = ['Date,Hash,Type,Message,Author,Components'];
      for (const e of entriesData) {
        rows.push(
          `"${e.date}","${e.hash}","${e.type}","${e.message.replaceAll('"', '""')}","${e.author}","${e.components.join('; ')}"`,
        );
      }
      const blob: Blob = new Blob([rows.join('\n')], { type: 'text/csv' });
      const url: string = URL.createObjectURL(blob);
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = url;
      a.download = 'changelog.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  }
</script>

<div class="w-full">
  <!-- Sticky header -->
  <div
    class="sticky top-(--header-height) z-10 flex flex-col gap-3 border-b bg-background px-6 pb-4 pt-6 md:px-10 md:pt-10"
  >
    <div class="flex items-center gap-3">
      <div class="flex size-12 items-center justify-center rounded-xl bg-primary/10">
        <Newspaper class="size-6 text-primary" />
      </div>
      <div class="flex-1">
        <h1 class="text-2xl font-bold tracking-tight">What's New</h1>
        <p class="text-sm text-muted-foreground">
          {data.total} changes across the component library
        </p>
      </div>

      <!-- 3-dot menu -->
      <DropdownMenu.Root>
        <Tooltip.Provider>
          <Tooltip.Root delayDuration={300}>
            <Tooltip.Trigger>
              {#snippet child({ props: tooltipProps })}
                <DropdownMenu.Trigger>
                  {#snippet child({ props: triggerProps })}
                    <button
                      type="button"
                      class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      {...tooltipProps}
                      {...triggerProps}
                    >
                      <EllipsisVertical class="size-4" />
                      <span class="sr-only">Page options</span>
                    </button>
                  {/snippet}
                </DropdownMenu.Trigger>
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom" sideOffset={4}>Page options</Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
        <DropdownMenu.Content align="end" sideOffset={4}>
          <!-- Export submenu -->
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>
              <DownloadIcon class="mr-2 size-4" />
              Export
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent class="w-64">
              <div class="shrink-0 px-2 pb-1.5 pt-1">
                <div
                  class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                >
                  <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search formats..."
                    class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    bind:value={exportSearch}
                    onkeydown={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              {#if filteredExports.length === 0}
                <div
                  class="flex flex-col items-center gap-1.5 py-6 text-center text-muted-foreground"
                >
                  <SearchX class="size-4 text-muted-foreground/40" />
                  <span class="text-xs text-muted-foreground/60">No formats match</span>
                </div>
              {:else}
                {#each filteredExportCategories as exportCat (exportCat)}
                  <DropdownMenu.Label
                    class="flex items-center gap-1.5 px-2 text-xs text-muted-foreground/60"
                  >
                    {#if exportCat === 'Clipboard'}
                      <Clipboard class="size-3" />
                    {:else}
                      <DownloadIcon class="size-3" />
                    {/if}
                    {exportCat}
                  </DropdownMenu.Label>
                  {#each filteredExports.filter((o) => o.category === exportCat) as opt (opt.id)}
                    <DropdownMenu.Item onclick={() => handleExport(opt.id)}>
                      <opt.icon class="mr-2 size-4" />
                      <div class="flex min-w-0 flex-1 flex-col">
                        <span class="text-sm">{opt.label}</span>
                        <span class="text-[11px] text-muted-foreground/60">{opt.description}</span>
                      </div>
                      {#if opt.ext}
                        <code
                          class="ml-auto shrink-0 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground"
                          >{opt.ext}</code
                        >
                      {/if}
                    </DropdownMenu.Item>
                  {/each}
                {/each}
              {/if}
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          <!-- View Mode submenu -->
          <DropdownMenu.Sub
            onOpenChange={(open) => {
              if (open) viewModeSearch = '' as Str;
            }}
          >
            <DropdownMenu.SubTrigger>
              <LayoutList class="mr-2 size-4" />
              View Mode
              <span class="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px]"
                >{viewModeLabel}</span
              >
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent class="w-56">
              <div class="shrink-0 px-2 pb-1.5 pt-1">
                <div
                  class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                >
                  <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search views..."
                    class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    bind:value={viewModeSearch}
                    onkeydown={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              {#if filteredViewModes.length === 0}
                <div
                  class="flex flex-col items-center gap-1.5 py-6 text-center text-muted-foreground"
                >
                  <SearchX class="size-4 text-muted-foreground/40" />
                  <span class="text-xs text-muted-foreground/60">No view modes match</span>
                </div>
              {:else}
                {#each filteredViewModes as mode (mode.id)}
                  <DropdownMenu.Item
                    closeOnSelect={false}
                    onclick={() => {
                      viewMode = mode.id;
                    }}
                  >
                    <div class="mr-2 flex size-4 items-center justify-center">
                      {#if viewMode === mode.id}
                        <Check class="size-4 text-primary" />
                      {/if}
                    </div>
                    <div class="flex flex-col">
                      <span>{mode.label}</span>
                      <span class="text-[10px] text-muted-foreground">{mode.description}</span>
                    </div>
                  </DropdownMenu.Item>
                {/each}
              {/if}
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          <!-- Sort By submenu -->
          <DropdownMenu.Sub
            onOpenChange={(open) => {
              if (open) sortSearch = '' as Str;
            }}
          >
            <DropdownMenu.SubTrigger>
              <ArrowUpDown class="mr-2 size-4" />
              Sort By
              {#if sortLabel}
                <span class="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px]"
                  >{sortLabel}</span
                >
              {/if}
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent class="w-56">
              <div class="shrink-0 px-2 pb-1.5 pt-1">
                <div
                  class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                >
                  <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search sort..."
                    class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    bind:value={sortSearch}
                    onkeydown={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              {@const sortOpts = [{ v: 'date', l: 'Date', d: 'Oldest or newest first' }]}
              {@const filteredSortOpts = sortSearch
                ? sortOpts.filter(
                    (o) =>
                      o.l.toLowerCase().includes(sortSearch.toLowerCase()) ||
                      o.d.toLowerCase().includes(sortSearch.toLowerCase()),
                  )
                : sortOpts}
              {#if filteredSortOpts.length === 0}
                <div
                  class="flex flex-col items-center gap-1.5 py-6 text-center text-muted-foreground"
                >
                  <SearchX class="size-4 text-muted-foreground/40" />
                  <span class="text-xs text-muted-foreground/60">No sort options match</span>
                </div>
              {:else}
                {#each filteredSortOpts as opt (opt.v)}
                  <DropdownMenu.Item
                    closeOnSelect={false}
                    onclick={() => {
                      if (sortField === opt.v) {
                        if (sortDir === 'asc') {
                          sortDir = 'desc';
                        } else {
                          sortField = '' as Str;
                          sortDir = 'asc';
                        }
                      } else {
                        sortField = opt.v as Str;
                        sortDir = 'asc';
                      }
                    }}
                  >
                    {#if sortField === opt.v && sortDir === 'asc'}
                      <ArrowUp class="size-4 shrink-0 text-primary" />
                    {:else if sortField === opt.v && sortDir === 'desc'}
                      <ArrowDown class="size-4 shrink-0 text-primary" />
                    {:else}
                      <ArrowUpDown
                        class="size-4 shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-40"
                      />
                    {/if}
                    <div class="flex min-w-0 flex-1 flex-col">
                      <span class="text-sm">{opt.l}</span>
                      <span class="text-[11px] text-muted-foreground/60">{opt.d}</span>
                    </div>
                  </DropdownMenu.Item>
                {/each}
              {/if}
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          <DropdownMenu.Separator />

          <!-- Expand / Collapse All -->
          <DropdownMenu.Item onclick={expandAllGroups} disabled={allExpanded}>
            <ChevronsUpDown class="mr-2 size-4" />
            Expand All
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={collapseAllGroups} disabled={allCollapsed}>
            <ChevronsDownUp class="mr-2 size-4" />
            Collapse All
          </DropdownMenu.Item>

          <DropdownMenu.Separator />

          <!-- Reset to defaults (two-step confirm, disabled when nothing changed) -->
          <DropdownMenu.Item
            variant="destructive"
            disabled={!hasChanges && !confirmingReset}
            onSelect={handleReset}
          >
            <Trash2 class="mr-2 size-4" />
            {confirmingReset ? 'Confirm Reset' : 'Reset to Defaults'}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>

    <!-- Search -->
    <div class="relative">
      <Search
        class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="text"
        placeholder="Search {data.total} changes..."
        class="pl-10 pr-8"
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

    <!-- Filter chips (multi-select, matches Icons page category chip pattern) -->
    <div class="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        class="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors {activeFilters.size ===
        0
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
        onclick={() => {
          activeFilters = new Set();
        }}
      >
        All
      </button>
      {#each FILTER_OPTIONS.filter((o) => o.value !== 'all') as opt (opt.value)}
        {@const isActive = activeFilters.has(opt.value)}
        {@const FilterIcon = opt.icon}
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors {isActive
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
          onclick={() => {
            const next: Set<Str> = new Set(activeFilters);
            if (next.has(opt.value)) {
              next.delete(opt.value);
            } else {
              next.add(opt.value);
            }
            activeFilters = next;
          }}
        >
          {#if FilterIcon}
            <FilterIcon class="size-3 shrink-0 opacity-60" />
          {/if}
          {opt.label}
          {#if isActive}
            <X class="size-3 opacity-70" />
          {/if}
        </button>
      {/each}

      {#if activeFilters.size > 0}
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/30 px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          onclick={() => {
            activeFilters = new Set();
          }}
        >
          <X class="size-3" />
          Clear selection
        </button>
      {/if}
    </div>
  </div>

  <!-- Page content with padding -->
  <div class="flex flex-col gap-6 px-6 py-6 md:px-10 md:py-8">
    <!-- Timeline / Entries -->
    {#if displayGroups.length === 0}
      <LensEmpty
        title="No changes found"
        actionLabel={searchQuery || activeFilters.size > 0 ? 'Clear filters' : undefined}
        onaction={searchQuery || activeFilters.size > 0 ? clearFilters : undefined}
      >
        {#snippet icon()}
          <div class="flex size-16 items-center justify-center rounded-2xl bg-muted/50">
            <SearchX class="size-8 text-muted-foreground/20" />
          </div>
        {/snippet}
        {#snippet descriptionSnippet()}
          {#if searchQuery}
            No changes matching "<span class="font-medium text-muted-foreground/60"
              >{searchQuery}</span
            >".
          {:else if activeFilters.size > 0}
            No changes matching selected filters.
          {:else}
            No git history available for the component library.
          {/if}
        {/snippet}
      </LensEmpty>
    {:else if viewMode === 'timeline'}
      <!-- Timeline view (default) -->
      <div class="space-y-6">
        {#each displayGroups as group (group.date)}
          <div>
            <!-- Date header (collapsible) -->
            <button
              type="button"
              class="mb-3 flex w-full items-center gap-3 text-left"
              onclick={() => toggleGroup(group.date)}
            >
              <ChevronRight
                class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {collapsedGroups.has(
                  group.date,
                )
                  ? ''
                  : 'rotate-90'}"
              />
              <div class="size-2.5 rounded-full bg-primary"></div>
              <h2 class="text-sm font-semibold">{formatGroupDate(group.date)}</h2>
              <span class="text-xs text-muted-foreground">
                {group.entries.length}
                {group.entries.length === 1 ? 'change' : 'changes'}
              </span>
            </button>

            <!-- Entries -->
            {#if !collapsedGroups.has(group.date)}
              <div
                class="ml-1 space-y-2 border-l-2 border-muted pl-5"
                transition:slide={{ duration: 200 }}
              >
                {#each group.entries as entry (entry.hash)}
                  {@const entryType = detectEntryType(entry.message as Str, entry.isNew)}
                  {@const typeConfig = ENTRY_TYPE_CONFIG[entryType]}
                  {@const TypeIcon = typeConfig.icon}
                  <div
                    class="rounded-lg border bg-card p-4 transition-colors hover:border-muted-foreground/20"
                  >
                    <div class="flex items-start justify-between gap-4">
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                          <Badge variant="secondary" class="text-[10px] {typeConfig.badgeColor}">
                            <TypeIcon class="mr-0.5 size-2.5" />
                            {typeConfig.label}
                          </Badge>
                          {#if entry.body}
                            <button
                              type="button"
                              class="shrink-0 rounded p-0.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                              onclick={() => toggleRowExpand(entry.hash)}
                              aria-label={expandedRows.has(entry.hash)
                                ? 'Collapse details'
                                : 'Expand details'}
                            >
                              <ChevronDown
                                class="size-3.5 transition-transform duration-200 {expandedRows.has(
                                  entry.hash,
                                )
                                  ? 'rotate-180'
                                  : ''}"
                              />
                            </button>
                          {/if}
                          <Tooltip.Root delayDuration={500}>
                            <Tooltip.Trigger>
                              {#snippet child({ props: msgTipProps })}
                                <p {...msgTipProps} class="truncate text-sm font-medium">
                                  {entry.message}
                                </p>
                              {/snippet}
                            </Tooltip.Trigger>
                            <Tooltip.Content side="top" sideOffset={4} class="max-w-sm">
                              {entry.message}
                            </Tooltip.Content>
                          </Tooltip.Root>
                        </div>

                        <!-- Expanded commit body -->
                        {#if expandedRows.has(entry.hash) && entry.body}
                          <div
                            class="mt-1.5 whitespace-pre-wrap rounded-md bg-muted/50 px-2.5 py-2 text-xs leading-relaxed text-muted-foreground"
                            transition:slide={{ duration: 150 }}
                          >
                            {entry.body}
                          </div>
                        {/if}

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
                          {#if data.repoUrl}
                            <a
                              href="{data.repoUrl}/commit/{entry.hash}"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-primary hover:underline"
                            >
                              {entry.hash}
                            </a>
                          {:else}
                            <code class="font-mono">{entry.hash}</code>
                          {/if}
                        </div>
                        <span class="text-[10px] text-muted-foreground">{entry.author}</span>
                        <Tooltip.Root delayDuration={300}>
                          <Tooltip.Trigger>
                            {#snippet child({ props: dateTipProps })}
                              <span {...dateTipProps} class="text-[10px] text-muted-foreground">
                                {relativeTime(entry.date)}
                              </span>
                            {/snippet}
                          </Tooltip.Trigger>
                          <Tooltip.Content side="top" sideOffset={4}>
                            {new Date(entry.date).toLocaleString()}
                          </Tooltip.Content>
                        </Tooltip.Root>
                        {#if data.repoUrl}
                          <Tooltip.Root delayDuration={300}>
                            <Tooltip.Trigger>
                              {#snippet child({ props: ghTipProps })}
                                <a
                                  {...ghTipProps}
                                  href="{data.repoUrl}/commit/{entry.hash}"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  class="inline-flex size-5 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
                                >
                                  <ExternalLink class="size-3" />
                                </a>
                              {/snippet}
                            </Tooltip.Trigger>
                            <Tooltip.Content side="top" sideOffset={4}>
                              Open in GitHub
                            </Tooltip.Content>
                          </Tooltip.Root>
                        {/if}
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {:else if viewMode === 'table'}
      <!-- Table view -->
      <div class="rounded-lg border bg-card">
        <table class="w-full table-fixed text-sm">
          <thead>
            <tr class="border-b text-left text-xs text-muted-foreground">
              <th class="w-28 px-4 py-2">Date</th>
              <th class="w-20 px-4 py-2">Type</th>
              <th class="px-4 py-2">Message</th>
              <th class="w-40 px-4 py-2">Components</th>
              <th class="w-20 px-4 py-2">Hash</th>
            </tr>
          </thead>
          <tbody>
            {#each displayGroups as group (group.date)}
              {#each group.entries as entry (entry.hash)}
                {@const entryType = detectEntryType(entry.message as Str, entry.isNew)}
                {@const typeConfig = ENTRY_TYPE_CONFIG[entryType]}
                {@const TypeIcon = typeConfig.icon}
                <tr class="border-b transition-colors last:border-b-0 hover:bg-muted/50">
                  <td class="px-4 py-2.5">
                    <span class="text-xs tabular-nums text-muted-foreground"
                      >{formatGroupDate(group.date)}</span
                    >
                  </td>
                  <td class="px-4 py-2.5">
                    <Badge variant="secondary" class="text-[10px] {typeConfig.badgeColor}">
                      <TypeIcon class="mr-0.5 size-2.5" />
                      {typeConfig.label}
                    </Badge>
                  </td>
                  <td class="px-4 py-2.5">
                    <span class="line-clamp-1 text-xs">{entry.message}</span>
                  </td>
                  <td class="px-4 py-2.5">
                    <div class="flex flex-wrap gap-1">
                      {#each entry.components.slice(0, 3) as comp}
                        <a
                          href="/components/{comp}"
                          class="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                          >{comp}</a
                        >
                      {/each}
                      {#if entry.components.length > 3}
                        <Tooltip.Root delayDuration={300}>
                          <Tooltip.Trigger>
                            {#snippet child({ props: tblMoreTip })}
                              <span
                                class="cursor-default rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground/60"
                                {...tblMoreTip}>+{entry.components.length - 3} more</span
                              >
                            {/snippet}
                          </Tooltip.Trigger>
                          <Tooltip.Content
                            side="bottom"
                            sideOffset={4}
                            class="max-h-64 overflow-y-auto p-3"
                            portalProps={{ disabled: true }}
                          >
                            <div class="flex flex-col gap-0.5">
                              {#each entry.components.slice(3) as extra (extra)}
                                <a
                                  href="/components/{extra}"
                                  class="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
                                >
                                  <ComponentIcon class="size-3 shrink-0 opacity-50" />
                                  <span class="flex-1">{extra}</span>
                                  <ArrowRight class="size-3 shrink-0 opacity-40" />
                                </a>
                              {/each}
                            </div>
                          </Tooltip.Content>
                        </Tooltip.Root>
                      {/if}
                    </div>
                  </td>
                  <td class="px-4 py-2.5">
                    {#if data.repoUrl}
                      <a
                        href="{data.repoUrl}/commit/{entry.hash}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="font-mono text-[10px] text-primary hover:underline"
                      >
                        {entry.hash}
                      </a>
                    {:else}
                      <code class="font-mono text-[10px] text-muted-foreground/60">
                        {entry.hash}
                      </code>
                    {/if}
                  </td>
                </tr>
              {/each}
            {/each}
          </tbody>
        </table>
      </div>
    {:else if viewMode === 'compact'}
      <!-- Compact view — dense rows -->
      <div class="rounded-lg border bg-card">
        {#each displayGroups as group, gi (group.date)}
          <button
            type="button"
            class="flex w-full items-center gap-2 border-b bg-muted/30 px-4 py-2 text-left text-xs font-medium text-muted-foreground"
            onclick={() => toggleGroup(group.date)}
          >
            <ChevronRight
              class="size-3 transition-transform duration-200 {collapsedGroups.has(group.date)
                ? ''
                : 'rotate-90'}"
            />
            {formatGroupDate(group.date)}
            <span class="opacity-60">({group.entries.length})</span>
          </button>
          {#if !collapsedGroups.has(group.date)}
            <div transition:slide={{ duration: 200 }}>
              {#each group.entries as entry (entry.hash)}
                {@const entryType = detectEntryType(entry.message as Str, entry.isNew)}
                {@const typeConfig = ENTRY_TYPE_CONFIG[entryType]}
                {@const TypeIcon = typeConfig.icon}
                <div
                  class="flex items-center gap-3 border-b px-4 py-2 last:border-b-0 hover:bg-accent/30"
                >
                  <TypeIcon class="size-3.5 shrink-0 {typeConfig.color}" />
                  <span class="min-w-0 flex-1 truncate text-sm">{entry.message}</span>
                  {#each entry.components.slice(0, 3) as comp}
                    <a
                      href="/components/{comp}"
                      class="hidden rounded border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground hover:text-foreground sm:inline"
                    >
                      {comp}
                    </a>
                  {/each}
                  {#if entry.components.length > 3}
                    <span class="hidden text-[10px] text-muted-foreground sm:inline">
                      +{entry.components.length - 3}
                    </span>
                  {/if}
                  {#if data.repoUrl}
                    <a
                      href="{data.repoUrl}/commit/{entry.hash}"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="shrink-0 font-mono text-[10px] text-primary hover:underline"
                    >
                      {entry.hash}
                    </a>
                  {:else}
                    <code class="shrink-0 font-mono text-[10px] text-muted-foreground/60">
                      {entry.hash}
                    </code>
                  {/if}
                  <Tooltip.Root delayDuration={300}>
                    <Tooltip.Trigger>
                      {#snippet child({ props: dateTip })}
                        <span {...dateTip} class="shrink-0 text-[10px] text-muted-foreground/60">
                          {relativeTime(entry.date)}
                        </span>
                      {/snippet}
                    </Tooltip.Trigger>
                    <Tooltip.Content side="top" sideOffset={4}>
                      {new Date(entry.date).toLocaleString()}
                    </Tooltip.Content>
                  </Tooltip.Root>
                  {#if data.repoUrl}
                    <Tooltip.Root delayDuration={300}>
                      <Tooltip.Trigger>
                        {#snippet child({ props: ghTip })}
                          <a
                            {...ghTip}
                            href="{data.repoUrl}/commit/{entry.hash}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <ExternalLink class="size-3" />
                          </a>
                        {/snippet}
                      </Tooltip.Trigger>
                      <Tooltip.Content side="top" sideOffset={4}>Open in GitHub</Tooltip.Content>
                    </Tooltip.Root>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        {/each}
      </div>
    {:else}
      <!-- List view — minimal -->
      <div class="flex flex-col gap-1">
        {#each displayGroups as group (group.date)}
          {#each group.entries as entry (entry.hash)}
            {@const entryType = detectEntryType(entry.message as Str, entry.isNew)}
            {@const typeConfig = ENTRY_TYPE_CONFIG[entryType]}
            {@const TypeIcon = typeConfig.icon}
            <div class="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-accent/30">
              <TypeIcon class="size-3.5 shrink-0 {typeConfig.color}" />
              <span class="min-w-0 flex-1 truncate text-sm">{entry.message}</span>
              {#if data.repoUrl}
                <a
                  href="{data.repoUrl}/commit/{entry.hash}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="shrink-0 font-mono text-[10px] text-primary hover:underline"
                >
                  {entry.hash}
                </a>
              {:else}
                <code class="shrink-0 font-mono text-[10px] text-muted-foreground/60">
                  {entry.hash}
                </code>
              {/if}
              <Tooltip.Root delayDuration={300}>
                <Tooltip.Trigger>
                  {#snippet child({ props: dateTip })}
                    <span {...dateTip} class="shrink-0 text-[10px] text-muted-foreground">
                      {relativeTime(entry.date)}
                    </span>
                  {/snippet}
                </Tooltip.Trigger>
                <Tooltip.Content side="top" sideOffset={4}>
                  {new Date(entry.date).toLocaleString()}
                </Tooltip.Content>
              </Tooltip.Root>
              {#if data.repoUrl}
                <a
                  href="{data.repoUrl}/commit/{entry.hash}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ExternalLink class="size-3" />
                </a>
              {/if}
            </div>
          {/each}
        {/each}
      </div>
    {/if}

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
  </div>
</div>
