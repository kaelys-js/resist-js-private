<script lang="ts">
  /**
   * Browser & Device Support page for the Lens documentation system.
   *
   * Displays browser compatibility, framework requirements, and CSS feature
   * dependencies in a searchable, filterable table with category chips,
   * view mode selection, sort options, and export capabilities.
   *
   * Layout and UX patterns match the Tokens page.
   */
  import type { Bool, Num, Str } from '@/schemas/common';
  import Input from '@/ui/input/input.svelte';
  import * as DropdownMenu from '@/ui/dropdown-menu/index.js';
  import * as Tooltip from '@/ui/tooltip/index.js';
  import { cn } from '@/ui/utils.js';
  import { clipboardCopy } from '@/ui/lens/clipboard.js';
  import { fade } from 'svelte/transition';
  import Check from '@lucide/svelte/icons/check';
  import SearchIcon from '@lucide/svelte/icons/search';
  import SearchX from '@lucide/svelte/icons/search-x';
  import X from '@lucide/svelte/icons/x';
  import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
  import ClipboardCopy from '@lucide/svelte/icons/clipboard-copy';
  import DownloadIcon from '@lucide/svelte/icons/download';
  import Clipboard from '@lucide/svelte/icons/clipboard';
  import FileText from '@lucide/svelte/icons/file-text';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Monitor from '@lucide/svelte/icons/monitor';
  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import CircleAlert from '@lucide/svelte/icons/circle-alert';
  import CircleX from '@lucide/svelte/icons/circle-x';
  import Tag from '@lucide/svelte/icons/tag';
  import {
    detectBrowserSupport,
    type BrowserSupport,
    type DetectedFeature,
    type FrameworkEntry,
  } from '@/ui/lens/detect-browser-support.js';

  /* ------------------------------------------------------------------ */
  /*  Dynamic CSS feature scanning                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Load all CSS and Svelte files from the UI library and editor,
   * scan for CSS features, and compute accurate browser support.
   */
  const cssModules: Record<Str, Str> = import.meta.glob(
    ['/src/app.css', '/../../shared/ui/src/**/*.{svelte,css}'],
    { query: '?raw', import: 'default', eager: true },
  ) as unknown as Record<Str, Str>;

  /** Build a filename→content map for the scanner. */
  const scanSources: Record<Str, Str> = Object.fromEntries(
    Object.entries(cssModules).map(([path, content]: [Str, unknown]): [Str, Str] => {
      const shortName: Str = (path.split('/').pop() ?? path) as Str;
      return [shortName, String(content) as Str];
    }),
  );

  /** Dynamic browser support analysis. */
  const supportResult = detectBrowserSupport(scanSources);

  /* ------------------------------------------------------------------ */
  /*  Browser support data (derived from scanner)                        */
  /* ------------------------------------------------------------------ */

  /** Support status for a browser or requirement entry. */
  type SupportStatus = 'supported' | 'partial' | 'unsupported';

  /** A single browser/requirement entry in the support matrix. */
  type BrowserEntry = {
    /** Display name of the browser, framework, or CSS feature. */
    name: Str;
    /** Emoji or text icon identifier. */
    icon: Str;
    /** Rendering engine or technology. */
    engine: Str;
    /** Minimum supported version (or "N/A"). */
    minVersion: Str;
    /** Support status level. */
    status: SupportStatus;
    /** Additional notes about support. */
    notes: Str;
    /** Grouping category. */
    category: Str;
  };

  /**
   * All browser support entries — dynamically derived from codebase scanning.
   * Browser minimum versions are computed from actual CSS features detected.
   * CSS Features section shows each detected feature with usage counts.
   */
  const BROWSER_ENTRIES: BrowserEntry[] = [
    /* Desktop browsers (dynamically computed minimums) */
    ...supportResult.browsers.map(
      (b: BrowserSupport): BrowserEntry => ({
        name: b.name,
        icon: b.name.toLowerCase() as Str,
        engine: b.engine,
        minVersion: b.minVersion,
        status: b.status,
        notes: b.notes,
        category: b.category,
      }),
    ),

    /* Unsupported browsers (static) */
    ...supportResult.unsupported.map(
      (b: BrowserSupport): BrowserEntry => ({
        name: b.name,
        icon: b.name.toLowerCase().replaceAll(/\s+/g, '-') as Str,
        engine: b.engine,
        minVersion: b.minVersion,
        status: b.status,
        notes: b.notes,
        category: b.category,
      }),
    ),

    /* Framework compatibility (from package.json) */
    ...supportResult.frameworks.map(
      (f: FrameworkEntry): BrowserEntry => ({
        name: f.name,
        icon: f.name.toLowerCase() as Str,
        engine: f.role,
        minVersion: f.version,
        status: 'supported',
        notes: `Required — ${f.role}` as Str,
        category: f.category,
      }),
    ),

    /* Detected CSS features (with usage counts from scanner) */
    ...supportResult.features.map(
      (f: DetectedFeature): BrowserEntry => ({
        name: f.name,
        icon: 'css' as Str,
        engine: 'CSS' as Str,
        minVersion: `${f.usageCount} uses` as Str,
        status: 'supported',
        notes:
          `${f.description} — found in ${f.files.length} file${(f.files.length as number) === 1 ? '' : 's'}` as Str,
        category: 'CSS Features' as Str,
      }),
    ),
  ];

  /** All unique category names from entries. */
  const ALL_CATEGORIES: Str[] = [...new Set(BROWSER_ENTRIES.map((e) => e.category))];

  /* ------------------------------------------------------------------ */
  /*  Export items                                                       */
  /* ------------------------------------------------------------------ */

  /** Export menu item descriptor. */
  type ExportItem = {
    /** Unique identifier. */
    id: Str;
    /** Display label. */
    label: Str;
    /** Lucide icon component. */
    icon: typeof ClipboardCopy;
    /** Export category (Clipboard or File). */
    category: Str;
    /** Short description. */
    description: Str;
    /** File extension badge text. */
    ext: Str;
  };

  /** Page-level export menu items. */
  const PAGE_EXPORT_ITEMS: ExportItem[] = [
    {
      id: 'copy-markdown' as Str,
      label: 'Copy as Markdown' as Str,
      icon: ClipboardCopy,
      category: 'Clipboard' as Str,
      description: 'Formatted browser support table' as Str,
      ext: '' as Str,
    },
    {
      id: 'copy-json' as Str,
      label: 'Copy as JSON' as Str,
      icon: ClipboardCopy,
      category: 'Clipboard' as Str,
      description: 'Browser support data' as Str,
      ext: '' as Str,
    },
    {
      id: 'download-markdown' as Str,
      label: 'Download Markdown' as Str,
      icon: DownloadIcon,
      category: 'File' as Str,
      description: 'Browser support table' as Str,
      ext: '.md' as Str,
    },
    {
      id: 'download-json' as Str,
      label: 'Download JSON' as Str,
      icon: DownloadIcon,
      category: 'File' as Str,
      description: 'Structured data file' as Str,
      ext: '.json' as Str,
    },
  ];

  /** Unique export categories. */
  const PAGE_EXPORT_CATEGORIES: Str[] = [...new Set(PAGE_EXPORT_ITEMS.map((p) => p.category))];

  /** Search query for export menu filtering. */
  let exportSearchQuery: Str = $state('' as Str);

  /** Export items filtered by search query. */
  const filteredExportItems: ExportItem[] = $derived(
    exportSearchQuery.length === 0
      ? PAGE_EXPORT_ITEMS
      : PAGE_EXPORT_ITEMS.filter((p: ExportItem): boolean => {
          const q: Str = exportSearchQuery.toLowerCase() as Str;
          return (
            p.label.toLowerCase().includes(q as string) ||
            p.description.toLowerCase().includes(q as string) ||
            p.category.toLowerCase().includes(q as string)
          );
        }),
  );

  /** Unique export categories present after filtering. */
  const filteredExportCategories: Str[] = $derived([
    ...new Set(filteredExportItems.map((p: ExportItem): Str => p.category)),
  ]);

  /* ------------------------------------------------------------------ */
  /*  State                                                             */
  /* ------------------------------------------------------------------ */

  /** Token search query. */
  let searchQuery: Str = $state('' as Str);

  /** Active category filters. */
  let activeCategories: Str[] = $state([]);

  /** Export feedback (shows check icon briefly). */
  let exportFeedback: Str = $state('' as Str);

  /** View mode for entry display. */
  let viewMode: 'table' | 'cards' | 'list' = $state('table');

  /** Sort mode for entries. */
  let sortMode: Str = $state('default' as Str);

  /** Search query inside the View Mode submenu. */
  let viewSearchQuery: Str = $state('' as Str);

  /** Search query inside the Sort By submenu. */
  let sortSearchQuery: Str = $state('' as Str);

  /** Two-step confirm gate for reset. */
  let confirmingReset: Bool = $state(false as Bool);

  /** Timer ID for reset confirm auto-dismiss. */
  let confirmResetTimer: ReturnType<typeof setTimeout> | undefined;

  /* ------------------------------------------------------------------ */
  /*  Derived                                                           */
  /* ------------------------------------------------------------------ */

  /** Total entry count. */
  const entryCount: Num = $derived(BROWSER_ENTRIES.length as Num);

  /** Entries filtered by search query and active categories, then sorted. */
  const filteredEntries: BrowserEntry[] = $derived.by((): BrowserEntry[] => {
    const q: Str = searchQuery.toLowerCase() as Str;
    let result: BrowserEntry[] = BROWSER_ENTRIES;

    /* Category filter */
    if (activeCategories.length > 0) {
      result = result.filter((e) => activeCategories.includes(e.category));
    }

    /* Search filter */
    if (q.length > 0) {
      result = result.filter(
        (e: BrowserEntry): boolean =>
          e.name.toLowerCase().includes(q as string) ||
          e.engine.toLowerCase().includes(q as string) ||
          e.notes.toLowerCase().includes(q as string) ||
          e.category.toLowerCase().includes(q as string),
      );
    }

    /* Sort */
    if (sortMode === 'name-asc') {
      result = [...result].toSorted((a, b) => a.name.localeCompare(b.name) as Num);
    } else if (sortMode === 'name-desc') {
      result = [...result].toSorted((a, b) => b.name.localeCompare(a.name) as Num);
    } else if (sortMode === 'version') {
      result = [...result].toSorted((a, b) => a.minVersion.localeCompare(b.minVersion) as Num);
    }
    /* 'default' keeps original array order (by browser importance) */

    return result;
  });

  /** Filtered entry count. */
  const filteredEntryCount: Num = $derived(filteredEntries.length as Num);

  /** Whether any customization is active (for the reset button). */
  const isCustomized: Bool = $derived(
    (viewMode !== 'table' || sortMode !== 'default' || activeCategories.length > 0) as Bool,
  );

  /** Dynamic subtitle text. */
  const headerSubtitle: Str = $derived.by((): Str => {
    if (searchQuery) {
      return `${filteredEntryCount} result${(filteredEntryCount as number) === 1 ? '' : 's'} for "${searchQuery}"` as Str;
    }
    if (activeCategories.length > 0) {
      return `${filteredEntryCount} entries in ${activeCategories.length} categor${activeCategories.length === 1 ? 'y' : 'ies'}` as Str;
    }
    const featureCount: Num = supportResult.features.length as Num;
    return `${supportResult.browsers.length} browsers \u00B7 ${featureCount} CSS features detected \u00B7 ${supportResult.frameworks.length} frameworks` as Str;
  });

  /** Entries grouped by category for card view. */
  const groupedEntries: Array<{ category: Str; entries: BrowserEntry[] }> = $derived.by(() => {
    const groups: Array<{ category: Str; entries: BrowserEntry[] }> = [];
    for (const entry of filteredEntries) {
      const existing = groups.find((g) => g.category === entry.category);
      if (existing) {
        existing.entries.push(entry);
      } else {
        groups.push({ category: entry.category, entries: [entry] });
      }
    }
    return groups;
  });

  /** Filtered desktop + unsupported browser entries. */
  const browserEntries: BrowserEntry[] = $derived(
    filteredEntries.filter(
      (e) => e.category === ('Desktop' as Str) || e.category === ('Unsupported' as Str),
    ),
  );

  /** Filtered framework entries. */
  const frameworkEntries: BrowserEntry[] = $derived(
    filteredEntries.filter((e) => e.category === ('Framework' as Str)),
  );

  /** Filtered CSS feature entries. */
  const cssFeatureEntries: BrowserEntry[] = $derived(
    filteredEntries.filter((e) => e.category === ('CSS Features' as Str)),
  );

  /** Whether we should show the sectioned layout (no category filter active). */
  const showSections: Bool = $derived((activeCategories.length === 0) as Bool);

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Toggle a category in the active filter list.
   *
   * @param cat - Category name to toggle
   */
  function toggleCategory(cat: Str): void {
    const idx: Num = activeCategories.indexOf(cat) as Num;
    if ((idx as number) >= 0) {
      activeCategories = activeCategories.filter((c) => c !== cat);
    } else {
      activeCategories = [...activeCategories, cat];
    }
  }

  /** Reset all controls to their default values. */
  function resetDefaults(): void {
    activeCategories = [];
    searchQuery = '' as Str;
    viewMode = 'table';
    sortMode = 'default' as Str;
  }

  /**
   * Handle "Reset to defaults" with 2-step confirmation.
   * First click arms, second click executes. Resets after 3s.
   */
  function handleReset(): void {
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
   * Get the CSS classes for a support status badge.
   *
   * @param status - The support status level
   * @returns Tailwind class string for the badge
   */
  function statusClasses(status: SupportStatus): Str {
    if (status === 'supported') {
      return 'bg-green-500/10 text-green-600 dark:text-green-400' as Str;
    }
    if (status === 'partial') {
      return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' as Str;
    }
    return 'bg-red-500/10 text-red-600 dark:text-red-400' as Str;
  }

  /**
   * Get the display label for a support status.
   *
   * @param status - The support status level
   * @returns Human-readable status label
   */
  function statusLabel(status: SupportStatus): Str {
    if (status === 'supported') return 'Supported' as Str;
    if (status === 'partial') return 'Partial' as Str;
    return 'Unsupported' as Str;
  }

  /**
   * Build Markdown table content from entries.
   *
   * @param entries - Browser entries to format
   * @returns Formatted Markdown table string
   */
  function buildMarkdown(entries: BrowserEntry[]): Str {
    const rows: Str[] = entries.map(
      (e) =>
        `| ${e.name} | ${e.minVersion} | ${e.engine} | ${statusLabel(e.status)} | ${e.notes} |` as Str,
    );
    return `| Browser | Version | Engine | Status | Notes |\n|---------|---------|--------|--------|-------|\n${rows.join('\n')}` as Str;
  }

  /**
   * Build JSON content from entries.
   *
   * @param entries - Browser entries to serialize
   * @returns Formatted JSON string
   */
  function buildJson(entries: BrowserEntry[]): Str {
    const data = entries.map((e) => ({
      name: e.name,
      minVersion: e.minVersion,
      engine: e.engine,
      status: e.status,
      notes: e.notes,
      category: e.category,
    }));
    return JSON.stringify(data, null, 2) as Str;
  }

  /**
   * Handle page-level export action.
   *
   * @param formatId - Export format identifier
   */
  async function handleExport(formatId: Str): Promise<void> {
    let content: Str = '' as Str;
    let filename: Str = '' as Str;

    if (formatId === 'copy-markdown') {
      content = buildMarkdown(filteredEntries);
      await clipboardCopy(content);
    } else if (formatId === 'copy-json') {
      content = buildJson(filteredEntries);
      await clipboardCopy(content);
    } else if (formatId === 'download-markdown') {
      content = `# Browser & Device Support\n\n${buildMarkdown(filteredEntries)}\n` as Str;
      filename = 'browser-support.md' as Str;
    } else if (formatId === 'download-json') {
      content = buildJson(filteredEntries);
      filename = 'browser-support.json' as Str;
    }

    if (filename) {
      const blob: Blob = new Blob([content], { type: 'text/plain' });
      const url: Str = URL.createObjectURL(blob) as Str;
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }

    exportFeedback = formatId;
    setTimeout(() => {
      exportFeedback = '' as Str;
    }, 2000);
  }

  /**
   * Svelte action that locks an element's height to its initial rendered value.
   * Prevents SubContent from shrinking when filtering, avoiding GraceArea close.
   *
   * @param node - The scrollable container element
   * @returns Action lifecycle with destroy cleanup
   */
  function lockHeight(node: HTMLElement): { destroy: () => void } {
    const raf: Num = requestAnimationFrame((): void => {
      node.style.minHeight = `${node.offsetHeight}px`;
    }) as Num;
    return {
      destroy(): void {
        cancelAnimationFrame(raf as number);
        node.style.minHeight = '';
      },
    };
  }
</script>

<div class="w-full">
  <!-- Sticky header + controls (matches component page LensHeader pattern) -->
  <div
    class="sticky top-(--header-height) z-10 flex flex-col gap-3 border-b bg-background px-6 pb-4 pt-6 md:px-10 md:pt-10"
  >
    <div class="flex items-center gap-3">
      <div class="flex size-12 items-center justify-center rounded-xl bg-primary/10">
        <Monitor class="size-6 text-primary" />
      </div>
      <div class="flex-1">
        <h1 class="text-2xl font-bold tracking-tight">Browser & Device Support</h1>
        <p class="text-sm text-muted-foreground">{headerSubtitle}</p>
      </div>

      <!-- Page-level three-dot menu -->
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
                  <SearchIcon class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search exports..."
                    class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    bind:value={exportSearchQuery}
                    onkeydown={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              {#if filteredExportItems.length === 0}
                <div
                  class="flex flex-col items-center gap-1.5 py-6 text-center text-muted-foreground"
                >
                  <SearchX class="size-4 text-muted-foreground/40" />
                  <span class="text-xs text-muted-foreground/60">No exports match</span>
                </div>
              {:else}
                {#each filteredExportCategories as category (category)}
                  <DropdownMenu.Label
                    class="flex items-center gap-1.5 px-2 text-xs text-muted-foreground/60"
                  >
                    {#if category === 'Clipboard'}
                      <Clipboard class="size-3" />
                    {:else}
                      <DownloadIcon class="size-3" />
                    {/if}
                    {category}
                  </DropdownMenu.Label>
                  {#each filteredExportItems.filter((p) => p.category === category) as item (item.id)}
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        handleExport(item.id);
                      }}
                    >
                      {#if exportFeedback === item.id}
                        <span in:fade={{ duration: 150 }}
                          ><Check class="mr-2 size-4 text-green-500" /></span
                        >
                      {:else}
                        <item.icon class="mr-2 size-4" />
                      {/if}
                      <div class="flex min-w-0 flex-1 flex-col">
                        <span class="text-sm">{item.label}</span>
                        <span class="text-[11px] text-muted-foreground/60">{item.description}</span>
                      </div>
                      {#if item.ext}
                        <code
                          class="ml-auto shrink-0 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground"
                          >{item.ext}</code
                        >
                      {/if}
                    </DropdownMenu.Item>
                  {/each}
                {/each}
              {/if}
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          <DropdownMenu.Separator />

          <!-- View Mode submenu -->
          <DropdownMenu.Sub
            onOpenChange={(open) => {
              if (open) viewSearchQuery = '' as Str;
            }}
          >
            <DropdownMenu.SubTrigger>
              <LayoutGrid class="mr-2 size-4" />
              View Mode
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent class="w-56">
              <div class="shrink-0 px-2 pb-1.5 pt-1">
                <div
                  class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                >
                  <SearchIcon class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search views..."
                    class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    bind:value={viewSearchQuery}
                    onkeydown={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              {@const viewOpts = [
                { v: 'table', l: 'Table', d: 'Full details with columns' },
                { v: 'cards', l: 'Cards', d: 'Card grid with version badges' },
                { v: 'list', l: 'Simple List', d: 'Browser name and version' },
              ]}
              {@const filteredViewOpts = viewSearchQuery
                ? viewOpts.filter(
                    (o) =>
                      o.l.toLowerCase().includes(viewSearchQuery.toLowerCase()) ||
                      o.d.toLowerCase().includes(viewSearchQuery.toLowerCase()),
                  )
                : viewOpts}
              {#if filteredViewOpts.length === 0}
                <div
                  class="flex flex-col items-center gap-1.5 py-6 text-center text-muted-foreground"
                >
                  <SearchX class="size-4 text-muted-foreground/40" />
                  <span class="text-xs text-muted-foreground/60">No views match</span>
                </div>
              {:else}
                {#each filteredViewOpts as opt (opt.v)}
                  <DropdownMenu.Item
                    closeOnSelect={false}
                    onclick={() => {
                      viewMode = opt.v as 'table' | 'cards' | 'list';
                    }}
                  >
                    <Check
                      class={cn(
                        'size-4 shrink-0 transition-opacity duration-150',
                        viewMode !== opt.v && 'opacity-0',
                      )}
                    />
                    <div class="flex min-w-0 flex-1 flex-col">
                      <span class="text-sm">{opt.l}</span>
                      <span class="text-[11px] text-muted-foreground/60">{opt.d}</span>
                    </div>
                  </DropdownMenu.Item>
                {/each}
              {/if}
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          <!-- Sort By submenu -->
          <DropdownMenu.Sub
            onOpenChange={(open) => {
              if (open) sortSearchQuery = '' as Str;
            }}
          >
            <DropdownMenu.SubTrigger>
              <ArrowUpDown class="mr-2 size-4" />
              Sort By
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent class="w-56">
              <div class="shrink-0 px-2 pb-1.5 pt-1">
                <div
                  class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                >
                  <SearchIcon class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search sort..."
                    class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    bind:value={sortSearchQuery}
                    onkeydown={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              {@const sortOpts = [
                { v: 'default', l: 'Default', d: 'By browser importance' },
                { v: 'name-asc', l: 'Name (A\u2013Z)', d: 'Alphabetical' },
                { v: 'name-desc', l: 'Name (Z\u2013A)', d: 'Reverse alphabetical' },
                { v: 'version', l: 'Version', d: 'By minimum version' },
              ]}
              {@const filteredSortOpts = sortSearchQuery
                ? sortOpts.filter(
                    (o) =>
                      o.l.toLowerCase().includes(sortSearchQuery.toLowerCase()) ||
                      o.d.toLowerCase().includes(sortSearchQuery.toLowerCase()),
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
                      sortMode = opt.v as Str;
                    }}
                  >
                    <Check
                      class={cn(
                        'size-4 shrink-0 transition-opacity duration-150',
                        sortMode !== opt.v && 'opacity-0',
                      )}
                    />
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

          <!-- Reset to defaults -->
          <DropdownMenu.Item
            variant="destructive"
            disabled={!isCustomized}
            onSelect={(e) => {
              e.preventDefault();
              handleReset();
            }}
          >
            <Trash2 class="mr-2 size-4" />
            {confirmingReset ? 'Confirm Reset' : 'Reset to defaults'}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>

    <!-- Search -->
    <div class="flex items-center gap-2">
      <div class="relative flex-1">
        <SearchIcon
          class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="text"
          placeholder="Search {entryCount} entries..."
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
    </div>

    <!-- Category filter chips -->
    <div class="flex flex-wrap gap-1.5">
      <button
        type="button"
        class="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors {activeCategories.length ===
        0
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
        onclick={() => {
          activeCategories = [];
        }}
      >
        All
      </button>
      {#each ALL_CATEGORIES as cat (cat)}
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors {activeCategories.includes(
            cat,
          )
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
          onclick={() => toggleCategory(cat)}
        >
          <Tag class="size-3 shrink-0 opacity-60" />
          {cat}
          {#if activeCategories.includes(cat)}
            <X class="size-3 opacity-70" />
          {/if}
        </button>
      {/each}
      {#if activeCategories.length > 0}
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/30 px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          onclick={() => {
            activeCategories = [];
          }}
        >
          <X class="size-3" />
          Clear selection
        </button>
      {/if}
    </div>
  </div>

  <!-- Page content with padding -->
  <div class="flex flex-col gap-8 px-6 py-6 md:px-10 md:py-8">
    {#if filteredEntries.length === 0}
      <!-- Empty state -->
      <div class="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
        <div class="flex size-16 items-center justify-center rounded-2xl bg-muted/50">
          <SearchX class="size-8 text-muted-foreground/40" />
        </div>
        <div class="space-y-1">
          <p class="text-sm font-medium text-muted-foreground">No entries match your search</p>
          <p class="text-xs text-muted-foreground/60">
            {#if searchQuery}
              No entries match "{searchQuery}"
            {:else}
              No entries in the selected categories
            {/if}
          </p>
        </div>
        <button
          type="button"
          class="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          onclick={() => {
            searchQuery = '' as Str;
            activeCategories = [];
          }}
        >
          Clear filters
        </button>
      </div>
    {:else}
      <!-- === Section 1: Browser Support === -->
      {#if browserEntries.length > 0}
        <section>
          <h2 class="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Monitor class="size-5 text-primary" />
            Browser Support
            <span
              class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground"
              >{browserEntries.length}</span
            >
          </h2>
          {#if viewMode === 'table'}
            <div class="rounded-lg border bg-card">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b text-left text-xs text-muted-foreground">
                    <th class="px-4 py-2.5">Browser</th>
                    <th class="w-28 px-4 py-2.5">Version</th>
                    <th class="w-28 px-4 py-2.5">Engine</th>
                    <th class="w-32 px-4 py-2.5">Status</th>
                    <th class="px-4 py-2.5">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {#each browserEntries as entry (entry.name)}
                    <tr class="border-b transition-colors last:border-b-0 hover:bg-muted/50">
                      <td class="px-4 py-2.5"><span class="font-medium">{entry.name}</span></td>
                      <td class="px-4 py-2.5">
                        <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                          >{entry.minVersion}</code
                        >
                      </td>
                      <td class="px-4 py-2.5">
                        <span class="text-xs text-muted-foreground">{entry.engine}</span>
                      </td>
                      <td class="px-4 py-2.5">
                        <span
                          class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium {statusClasses(
                            entry.status,
                          )}"
                        >
                          {#if entry.status === 'supported'}
                            <CircleCheck class="size-3" />
                          {:else}
                            <CircleX class="size-3" />
                          {/if}
                          {statusLabel(entry.status)}
                        </span>
                      </td>
                      <td class="px-4 py-2.5">
                        <span class="text-xs text-muted-foreground">{entry.notes}</span>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else if viewMode === 'cards'}
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {#each browserEntries as entry (entry.name)}
                <div
                  class={cn(
                    'flex flex-col gap-2 rounded-lg border p-4 transition-colors',
                    entry.status === 'supported' &&
                      'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40',
                    entry.status === 'unsupported' &&
                      'border-red-500/20 bg-red-500/5 hover:border-red-500/40',
                  )}
                >
                  <div class="flex items-start justify-between gap-2">
                    <span class="text-sm font-semibold">{entry.name}</span>
                    {#if entry.status === 'supported'}
                      <CircleCheck class="size-4 shrink-0 text-emerald-500" />
                    {:else}
                      <CircleX class="size-4 shrink-0 text-red-500" />
                    {/if}
                  </div>
                  <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                    >{entry.minVersion}</code
                  >
                  <span class="text-[10px] text-muted-foreground">{entry.engine}</span>
                  <p class="text-[11px] text-muted-foreground">{entry.notes}</p>
                </div>
              {/each}
            </div>
          {:else}
            <div class="rounded-lg border bg-card divide-y">
              {#each browserEntries as entry (entry.name)}
                <div class="flex items-center gap-3 px-4 py-2.5">
                  <span
                    class="inline-flex size-2 shrink-0 rounded-full {entry.status === 'supported'
                      ? 'bg-green-500'
                      : 'bg-red-500'}"
                  ></span>
                  <span class="min-w-0 flex-1 text-sm font-medium">{entry.name}</span>
                  <code
                    class="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
                    >{entry.minVersion}</code
                  >
                </div>
              {/each}
            </div>
          {/if}
        </section>
      {/if}

      <!-- === Section 2: Framework Requirements === -->
      {#if frameworkEntries.length > 0}
        <section>
          <h2 class="mb-4 flex items-center gap-2 text-lg font-semibold">
            <LayoutGrid class="size-5 text-primary" />
            Framework Requirements
            <span
              class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground"
              >{frameworkEntries.length}</span
            >
          </h2>
          {#if viewMode === 'table'}
            <div class="rounded-lg border bg-card">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b text-left text-xs text-muted-foreground">
                    <th class="px-4 py-2.5">Framework</th>
                    <th class="w-32 px-4 py-2.5">Version</th>
                    <th class="px-4 py-2.5">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {#each frameworkEntries as entry (entry.name)}
                    <tr class="border-b transition-colors last:border-b-0 hover:bg-muted/50">
                      <td class="px-4 py-2.5"><span class="font-medium">{entry.name}</span></td>
                      <td class="px-4 py-2.5">
                        <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                          >{entry.minVersion}</code
                        >
                      </td>
                      <td class="px-4 py-2.5">
                        <span class="text-xs text-muted-foreground">{entry.engine}</span>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else if viewMode === 'cards'}
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {#each frameworkEntries as entry (entry.name)}
                <div
                  class="flex flex-col gap-2 rounded-lg border bg-card p-4 transition-colors hover:border-primary/30"
                >
                  <span class="text-sm font-semibold">{entry.name}</span>
                  <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                    >{entry.minVersion}</code
                  >
                  <p class="text-[11px] text-muted-foreground">{entry.engine}</p>
                </div>
              {/each}
            </div>
          {:else}
            <div class="rounded-lg border bg-card divide-y">
              {#each frameworkEntries as entry (entry.name)}
                <div class="flex items-center gap-3 px-4 py-2.5">
                  <span class="min-w-0 flex-1 text-sm font-medium">{entry.name}</span>
                  <code
                    class="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
                    >{entry.minVersion}</code
                  >
                </div>
              {/each}
            </div>
          {/if}
        </section>
      {/if}

      <!-- === Section 3: CSS Features Detected === -->
      {#if cssFeatureEntries.length > 0}
        <section>
          <h2 class="mb-1 flex items-center gap-2 text-lg font-semibold">
            <Tag class="size-5 text-primary" />
            CSS Features Detected
            <span
              class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground"
              >{cssFeatureEntries.length}</span
            >
          </h2>
          <p class="mb-4 text-xs text-muted-foreground">
            Automatically detected from the codebase. Browser minimums above are computed from
            these.
          </p>
          {#if viewMode === 'table'}
            <div class="rounded-lg border bg-card">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b text-left text-xs text-muted-foreground">
                    <th class="px-4 py-2.5">Feature</th>
                    <th class="w-24 px-4 py-2.5">Uses</th>
                    <th class="w-20 px-4 py-2.5">Files</th>
                    <th class="px-4 py-2.5">Description</th>
                    <th class="px-4 py-2.5">Browser Minimums</th>
                  </tr>
                </thead>
                <tbody>
                  {#each cssFeatureEntries as entry (entry.name)}
                    {@const feat = supportResult.features.find((f) => f.name === entry.name)}
                    <tr class="border-b transition-colors last:border-b-0 hover:bg-muted/50">
                      <td class="px-4 py-2.5">
                        <code class="font-medium">{entry.name}</code>
                      </td>
                      <td class="px-4 py-2.5 tabular-nums">
                        {#if feat}
                          <span class="text-xs">{feat.usageCount}</span>
                        {/if}
                      </td>
                      <td class="px-4 py-2.5 tabular-nums">
                        {#if feat}
                          <span class="text-xs">{feat.files.length}</span>
                        {/if}
                      </td>
                      <td class="px-4 py-2.5">
                        <span class="text-xs text-muted-foreground">{feat?.description ?? ''}</span>
                      </td>
                      <td class="px-4 py-2.5">
                        {#if feat}
                          <div class="flex flex-wrap gap-1">
                            <span
                              class="rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground"
                              >Chr {feat.support.chrome}+</span
                            >
                            <span
                              class="rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground"
                              >FF {feat.support.firefox}+</span
                            >
                            <span
                              class="rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground"
                              >Saf {feat.support.safari}+</span
                            >
                          </div>
                        {/if}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else if viewMode === 'cards'}
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {#each cssFeatureEntries as entry (entry.name)}
                {@const feat = supportResult.features.find((f) => f.name === entry.name)}
                <div
                  class="flex flex-col gap-1.5 rounded-lg border bg-card p-4 transition-colors hover:border-primary/30"
                >
                  <div class="flex items-center justify-between gap-2">
                    <code class="text-sm font-semibold">{entry.name}</code>
                    <span
                      class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600"
                    >
                      <CircleCheck class="size-2.5" />
                      Used
                    </span>
                  </div>
                  {#if feat}
                    <p class="text-[11px] text-muted-foreground">{feat.description}</p>
                    <div class="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span class="tabular-nums font-medium">{feat.usageCount} uses</span>
                      <span>\u00B7</span>
                      <span
                        >{feat.files.length} file{(feat.files.length as number) === 1
                          ? ''
                          : 's'}</span
                      >
                    </div>
                    <div class="mt-1.5 flex flex-wrap gap-1">
                      <span class="rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground"
                        >Chr {feat.support.chrome}+</span
                      >
                      <span class="rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground"
                        >FF {feat.support.firefox}+</span
                      >
                      <span class="rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground"
                        >Saf {feat.support.safari}+</span
                      >
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <div class="rounded-lg border bg-card divide-y">
              {#each cssFeatureEntries as entry (entry.name)}
                {@const feat = supportResult.features.find((f) => f.name === entry.name)}
                <div class="flex items-center gap-3 px-4 py-2.5">
                  <code class="min-w-0 flex-1 text-sm font-medium">{entry.name}</code>
                  {#if feat}
                    <span class="shrink-0 text-xs tabular-nums text-muted-foreground"
                      >{feat.usageCount} uses</span
                    >
                    <span class="shrink-0 text-xs tabular-nums text-muted-foreground"
                      >{feat.files.length} files</span
                    >
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </section>
      {/if}
    {/if}
  </div>
</div>
