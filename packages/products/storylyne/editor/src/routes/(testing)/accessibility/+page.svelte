<script lang="ts">
  /**
   * Accessibility page for the Lens documentation system.
   *
   * Uses the dynamic `auditAccessibility` scanner to check 105 WCAG/ARIA/508 rules
   * against actual source files. Displays Coverage Overview cards at top, then a
   * unified rules table with expandable failing files. Supports search, category
   * chips, view modes, sorting, and export.
   *
   * Layout and UX patterns match the Browser Support page.
   */
  import type { Bool, Num, Str } from '@/schemas/common';
  import Badge from '@/ui/badge/badge.svelte';
  import Input from '@/ui/input/input.svelte';
  import * as DropdownMenu from '@/ui/dropdown-menu/index.js';
  import * as Tooltip from '@/ui/tooltip/index.js';
  import { cn } from '@/ui/utils.js';
  import { clipboardCopy } from '@/ui/lens/clipboard.js';
  import { fade, slide } from 'svelte/transition';
  import Accessibility from '@lucide/svelte/icons/accessibility';
  import Check from '@lucide/svelte/icons/check';
  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import SearchIcon from '@lucide/svelte/icons/search';
  import SearchX from '@lucide/svelte/icons/search-x';
  import X from '@lucide/svelte/icons/x';
  import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
  import ClipboardCopy from '@lucide/svelte/icons/clipboard-copy';
  import DownloadIcon from '@lucide/svelte/icons/download';
  import Clipboard from '@lucide/svelte/icons/clipboard';
  import FileText from '@lucide/svelte/icons/file-text';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import CircleAlert from '@lucide/svelte/icons/circle-alert';
  import CircleX from '@lucide/svelte/icons/circle-x';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import BarChart3 from '@lucide/svelte/icons/bar-chart-3';

  import Eye from '@lucide/svelte/icons/eye';
  import {
    auditAccessibility,
    type A11yRuleResult,
    type A11yAuditResult,
  } from '@/ui/lens/detect-accessibility.js';

  /* ------------------------------------------------------------------ */
  /*  Dynamic accessibility scanning                                     */
  /* ------------------------------------------------------------------ */

  /**
   * Load all Svelte and CSS source files for accessibility scanning.
   * Glob imports editor and shared UI sources as raw text.
   */
  const sourceModules: Record<Str, Str> = import.meta.glob(
    ['/src/**/*.{svelte,css}', '/../../../shared/ui/src/**/*.{svelte,css,ts}'],
    { query: '?raw', import: 'default', eager: true },
  ) as unknown as Record<Str, Str>; /* glob returns unknown module shape — cast to string map */

  /**
   * Convert a glob path to a workspace-relative path.
   * `/src/foo/Bar.svelte` → `editor/src/foo/Bar.svelte`
   * `/../../shared/ui/src/foo/Bar.svelte` → `shared/ui/src/foo/Bar.svelte`
   *
   * @param globPath - The path from import.meta.glob
   * @returns Workspace-relative path
   */
  function toWorkspacePath(globPath: Str): Str {
    const s: string = globPath as string;
    /* Strip leading /../../.. prefix and normalize to workspace-relative */
    const sharedIdx: number = s.indexOf('/shared/');
    if (sharedIdx >= 0) {
      return s.slice(sharedIdx + 1) as Str; /* removes everything before "shared/" */
    }
    /* Editor-local path: /src/foo → editor/src/foo */
    return `editor${s}` as Str;
  }

  /** Build a workspace-relative-path-to-content map for the scanner. */
  const scanSources: Record<Str, Str> = Object.fromEntries(
    Object.entries(sourceModules).map(([path, content]: [Str, unknown]): [Str, Str] => {
      const wsPath: Str = toWorkspacePath(path as Str);
      return [wsPath, String(content) as Str];
    }),
  );

  /** Dynamic accessibility audit result. */
  const auditResult: A11yAuditResult = auditAccessibility(scanSources);

  /* ------------------------------------------------------------------ */
  /*  Derived data from audit                                            */
  /* ------------------------------------------------------------------ */

  /** All unique categories from audit rules. */
  const ALL_CATEGORIES: Str[] = [
    ...new Set(auditResult.rules.map((r: A11yRuleResult): Str => r.category)),
  ].toSorted() as Str[];

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
      icon: FileText,
      category: 'Clipboard' as Str,
      description: 'Formatted table for docs' as Str,
      ext: '' as Str,
    },
    {
      id: 'copy-json' as Str,
      label: 'Copy as JSON' as Str,
      icon: ClipboardCopy,
      category: 'Clipboard' as Str,
      description: 'Structured data' as Str,
      ext: '' as Str,
    },
    {
      id: 'download-md' as Str,
      label: 'Download Markdown' as Str,
      icon: DownloadIcon,
      category: 'File' as Str,
      description: 'Accessibility report' as Str,
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

  /** Search query. */
  let searchQuery: Str = $state('' as Str);

  /** Active category filters. */
  let activeCategories: Str[] = $state([]);

  /** Export feedback (shows check icon briefly). */
  let exportFeedback: Str = $state('' as Str);

  /** View mode for display. */
  let viewMode: 'table' | 'cards' | 'list' = $state('table');

  /** Sort mode for rules. */
  let sortMode: Str = $state('status' as Str);

  /** Search query inside the View Mode submenu. */
  let viewSearchQuery: Str = $state('' as Str);

  /** Search query inside the Sort By submenu. */
  let sortSearchQuery: Str = $state('' as Str);

  /** Set of expanded rule IDs (for showing failing files). */
  let expandedRules: Set<Str> = $state(new Set());

  /** Two-step confirm gate for reset. */
  let confirmingReset: Bool = $state(false as Bool);

  /** Timer ID for reset confirm auto-dismiss. */
  let confirmResetTimer: ReturnType<typeof setTimeout> | undefined;

  /* ------------------------------------------------------------------ */
  /*  Derived                                                           */
  /* ------------------------------------------------------------------ */

  /** Rules filtered by search query, active categories, and sort mode. */
  const filteredRules: A11yRuleResult[] = $derived.by((): A11yRuleResult[] => {
    const q: Str = searchQuery.toLowerCase() as Str;
    let result: A11yRuleResult[] = auditResult.rules;

    /* Category filter */
    if (activeCategories.length > 0) {
      result = result.filter((r: A11yRuleResult) => activeCategories.includes(r.category));
    }

    /* Search filter */
    if (q.length > 0) {
      result = result.filter(
        (r: A11yRuleResult): boolean =>
          r.label.toLowerCase().includes(q as string) ||
          r.description.toLowerCase().includes(q as string) ||
          r.wcag.toLowerCase().includes(q as string) ||
          r.category.toLowerCase().includes(q as string) ||
          r.evidence.toLowerCase().includes(q as string),
      );
    }

    /* Sort */
    if (sortMode === 'name-asc') {
      result = [...result].toSorted((a, b) => a.label.localeCompare(b.label) as Num);
    } else if (sortMode === 'name-desc') {
      result = [...result].toSorted((a, b) => b.label.localeCompare(a.label) as Num);
    } else if (sortMode === 'status') {
      const statusOrder: Record<Str, Num> = {
        fail: 0 as Num,
        warning: 1 as Num,
        'not-applicable': 2 as Num,
        pass: 3 as Num,
      };
      result = [...result].toSorted((a, b) => {
        const statusDiff: number =
          ((statusOrder[a.status] ?? (4 as Num)) as number) -
          ((statusOrder[b.status] ?? (4 as Num)) as number);
        if (statusDiff !== 0) return statusDiff;
        /* Secondary sort: highest pass rate first within same status group */
        return (b.passRate as number) - (a.passRate as number);
      });
    } else if (sortMode === 'coverage') {
      result = [...result].toSorted((a, b) => (a.passRate as number) - (b.passRate as number));
    } else if (sortMode === 'coverage-desc') {
      result = [...result].toSorted((a, b) => (b.passRate as number) - (a.passRate as number));
    } else if (sortMode === 'wcag') {
      result = [...result].toSorted(
        (a, b) => a.wcag.localeCompare(b.wcag, undefined, { numeric: true }) as Num,
      );
    } else if (sortMode === 'category') {
      result = [...result].toSorted((a, b) => a.category.localeCompare(b.category) as Num);
    } else if (sortMode === 'failing-files') {
      result = [...result].toSorted((a, b) => (b.failCount as number) - (a.failCount as number));
    }

    return result;
  });

  /** Count of filtered rules. */
  const filteredRuleCount: Num = $derived(filteredRules.length as Num);

  /** Whether any customization is active (for the reset button). */
  const isCustomized: Bool = $derived(
    (activeCategories.length > 0 || viewMode !== 'table' || sortMode !== 'status') as Bool,
  );

  /** Count of rules with fail status. */
  const criticalFailures: Num = $derived(
    auditResult.rules.filter((r: A11yRuleResult) => r.status === 'fail').length as Num,
  );

  /** Count of rules with warning status. */
  const warningCount: Num = $derived(
    auditResult.rules.filter((r: A11yRuleResult) => r.status === 'warning').length as Num,
  );

  /** Per-category pass stats for Coverage Overview cards. */
  const categoryStats: Array<{ label: Str; passing: Num; total: Num }> = $derived.by(() => {
    const categories: Map<Str, { pass: Num; total: Num }> = new Map();
    for (const r of auditResult.rules) {
      if (r.status === 'not-applicable') continue;
      const std: Str = r.category;
      const existing = categories.get(std) ?? { pass: 0 as Num, total: 0 as Num };
      categories.set(std, {
        pass: ((existing.pass as number) + (r.status === 'pass' ? 1 : 0)) as Num,
        total: ((existing.total as number) + 1) as Num,
      });
    }
    return [...categories.entries()].map(([label, { pass, total }]) => ({
      label,
      passing: pass,
      total,
    }));
  });

  /** Dynamic subtitle text. */
  const headerSubtitle: Str = $derived.by((): Str => {
    if (searchQuery) {
      return `${filteredRuleCount} result${(filteredRuleCount as number) === 1 ? '' : 's'} for "${searchQuery}"` as Str;
    }
    return `${auditResult.passingRules} of ${auditResult.totalRules} rules passing · ${auditResult.overallScore}% overall score` as Str;
  });

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

  /**
   * Toggle a rule's expanded state for showing failing files.
   *
   * @param ruleId - The rule ID to toggle
   */
  function toggleExpanded(ruleId: Str): void {
    const next: Set<Str> = new Set(expandedRules);
    if (next.has(ruleId)) {
      next.delete(ruleId);
    } else {
      next.add(ruleId);
    }
    expandedRules = next;
  }

  /** Reset all controls to their default values. */
  function resetDefaults(): void {
    activeCategories = [];
    searchQuery = '' as Str;
    viewMode = 'table';
    sortMode = 'status' as Str;
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
   * Get CSS classes for a rule status badge.
   *
   * @param status - Rule status
   * @returns Tailwind class string
   */
  function statusClasses(status: Str): Str {
    if (status === 'pass') return 'bg-green-500/10 text-green-600 dark:text-green-400' as Str;
    if (status === 'fail') return 'bg-red-500/10 text-red-600 dark:text-red-400' as Str;
    if (status === 'warning') return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' as Str;
    return 'bg-gray-500/10 text-muted-foreground' as Str;
  }

  /**
   * Get display label for a rule status.
   *
   * @param status - Rule status
   * @returns Human-readable label
   */
  function statusLabel(status: Str): Str {
    if (status === 'pass') return 'Pass' as Str;
    if (status === 'fail') return 'Fail' as Str;
    if (status === 'warning') return 'Warning' as Str;
    return 'Manual' as Str;
  }

  /**
   * Build Markdown export content from filtered rules.
   *
   * @returns Markdown-formatted accessibility report
   */
  function buildMarkdown(): Str {
    const lines: Str[] = [
      '# Accessibility Report' as Str,
      '' as Str,
      `Overall Score: ${auditResult.overallScore}% | WCAG Coverage: ${auditResult.wcagCoverage}%` as Str,
      '' as Str,
      '| Rule | WCAG | Category | Status | Pass Rate | Evidence |' as Str,
      '|------|------|----------|--------|-----------|----------|' as Str,
    ];
    for (const rule of filteredRules) {
      lines.push(
        `| ${rule.label} | ${rule.wcag} | ${rule.category} | ${rule.status} | ${rule.passCount}/${rule.totalChecked} | ${rule.evidence} |` as Str,
      );
    }
    return lines.join('\n') as Str;
  }

  /**
   * Build JSON export content from filtered rules.
   *
   * @returns JSON-formatted accessibility data
   */
  function buildJson(): Str {
    const data = {
      overallScore: auditResult.overallScore,
      wcagCoverage: auditResult.wcagCoverage,
      passingRules: auditResult.passingRules,
      totalRules: auditResult.totalRules,
      rules: filteredRules.map((r: A11yRuleResult) => ({
        id: r.id,
        label: r.label,
        description: r.description,
        category: r.category,
        wcag: r.wcag,
        status: r.status,
        passCount: r.passCount,
        failCount: r.failCount,
        totalChecked: r.totalChecked,
        passRate: r.passRate,
        evidence: r.evidence,
        failingFiles: r.failingFiles,
      })),
    };
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
      content = buildMarkdown();
      await clipboardCopy(content);
    } else if (formatId === 'copy-json') {
      content = buildJson();
      await clipboardCopy(content);
    } else if (formatId === 'download-md') {
      content = buildMarkdown();
      filename = 'accessibility-report.md' as Str;
    } else if (formatId === 'download-json') {
      content = buildJson();
      filename = 'accessibility-report.json' as Str;
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
        <Accessibility class="size-6 text-primary" />
      </div>
      <div class="flex-1">
        <h1 class="text-2xl font-bold tracking-tight">Accessibility</h1>
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
                { v: 'cards', l: 'Cards', d: 'Card grid with status badges' },
                { v: 'list', l: 'Compact List', d: 'Rule name with status dot' },
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
                { v: 'default', l: 'Default', d: 'Grouped by category' },
                { v: 'name-asc', l: 'Name (A\u2013Z)', d: 'Alphabetical' },
                { v: 'name-desc', l: 'Name (Z\u2013A)', d: 'Reverse alphabetical' },
                { v: 'status', l: 'Status', d: 'Failing first' },
                { v: 'coverage', l: 'Coverage', d: 'Lowest pass rate first' },
                { v: 'coverage-desc', l: 'Coverage (High)', d: 'Highest pass rate first' },
                { v: 'wcag', l: 'WCAG Criterion', d: 'By WCAG number (1.1.1, 1.2.1...)' },
                { v: 'category', l: 'Category', d: 'Group by category alphabetically' },
                { v: 'failing-files', l: 'Most Failures', d: 'Most failing files first' },
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
          placeholder="Search {auditResult.totalRules} accessibility rules..."
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
    {#if filteredRules.length === 0}
      <!-- Empty state -->
      <div class="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
        <div class="flex size-16 items-center justify-center rounded-2xl bg-muted/50">
          <SearchX class="size-8 text-muted-foreground/40" />
        </div>
        <div class="space-y-1">
          <p class="text-sm font-medium text-muted-foreground">No rules match your search</p>
          <p class="text-xs text-muted-foreground/60">
            {#if searchQuery}
              No accessibility rules match "{searchQuery}"
            {:else}
              No rules in the selected categories
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
      <!-- === Coverage Overview (top) === -->
      <section>
        <h2 class="mb-4 flex items-center gap-2 text-lg font-semibold">
          <BarChart3 class="size-5 text-primary" />
          Coverage Overview
        </h2>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <!-- Overall Score -->
          <div
            class="group flex flex-col rounded-lg border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm"
          >
            <div class="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck class="size-4" />
              <span class="text-xs font-medium uppercase tracking-wider">Overall</span>
            </div>
            <p class="mt-2 text-2xl font-bold tabular-nums">{auditResult.overallScore}%</p>
            <div class="mt-2 h-1.5 w-full rounded-full bg-muted">
              <div
                class="h-1.5 rounded-full {(auditResult.overallScore as number) >= 80
                  ? 'bg-emerald-500'
                  : (auditResult.overallScore as number) >= 50
                    ? 'bg-amber-500'
                    : 'bg-red-500'}"
                style="width: {auditResult.overallScore}%"
              ></div>
            </div>
          </div>
          <!-- Critical Failures -->
          <div
            class="group flex flex-col rounded-lg border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm {(criticalFailures as number) >
            0
              ? 'border-red-500/30'
              : ''}"
          >
            <div class="flex items-center gap-2 text-muted-foreground">
              <CircleX class="size-4 {(criticalFailures as number) > 0 ? 'text-red-500' : ''}" />
              <span class="text-xs font-medium uppercase tracking-wider">Failures</span>
            </div>
            <p
              class="mt-2 text-2xl font-bold tabular-nums {(criticalFailures as number) > 0
                ? 'text-red-500'
                : ''}"
            >
              {criticalFailures}
            </p>
          </div>
          <!-- Warnings -->
          <div
            class="group flex flex-col rounded-lg border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm {(warningCount as number) >
            0
              ? 'border-amber-500/30'
              : ''}"
          >
            <div class="flex items-center gap-2 text-muted-foreground">
              <CircleAlert class="size-4 {(warningCount as number) > 0 ? 'text-amber-500' : ''}" />
              <span class="text-xs font-medium uppercase tracking-wider">Warnings</span>
            </div>
            <p
              class="mt-2 text-2xl font-bold tabular-nums {(warningCount as number) > 0
                ? 'text-amber-500'
                : ''}"
            >
              {warningCount}
            </p>
          </div>
          <!-- Manual -->
          <div
            class="group flex flex-col rounded-lg border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm"
          >
            <div class="flex items-center gap-2 text-muted-foreground">
              <Eye class="size-4" />
              <span class="text-xs font-medium uppercase tracking-wider">Manual</span>
            </div>
            <p class="mt-2 text-2xl font-bold tabular-nums">
              {auditResult.rules.filter((r) => r.status === 'not-applicable').length}
            </p>
          </div>
          <!-- Per-category cards -->
          {#each categoryStats as cat (cat.label)}
            {@const pct =
              (cat.total as number) > 0
                ? Math.round(((cat.passing as number) / (cat.total as number)) * 100)
                : 0}
            <div
              class="group flex flex-col rounded-lg border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm"
            >
              <div class="flex items-center gap-2 text-muted-foreground">
                <span class="text-xs font-medium uppercase tracking-wider">{cat.label}</span>
              </div>
              <p class="mt-2 text-2xl font-bold tabular-nums">{cat.passing}/{cat.total}</p>
              <div class="mt-2 h-1.5 w-full rounded-full bg-muted">
                <div
                  class="h-1.5 rounded-full {pct >= 80
                    ? 'bg-emerald-500'
                    : pct >= 50
                      ? 'bg-amber-500'
                      : 'bg-red-500'}"
                  style="width: {pct}%"
                ></div>
              </div>
            </div>
          {/each}
        </div>
      </section>

      <!-- === All Rules === -->
      <section>
        <h2 class="mb-1 flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck class="size-5 text-primary" />
          All Rules
          <span
            class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground"
            >{filteredRules.length}</span
          >
        </h2>
        <p class="mb-4 text-xs text-muted-foreground">
          {auditResult.passingRules} of {auditResult.totalRules} rules passing · {auditResult.overallScore}%
          overall
        </p>
        {#if viewMode === 'table'}
          <div class="rounded-lg border bg-card">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b text-left text-xs text-muted-foreground">
                  <th class="px-4 py-2.5">Rule</th>
                  <th class="w-32 px-4 py-2.5">Standard</th>
                  <th class="w-28 px-4 py-2.5">Category</th>
                  <th class="w-24 px-4 py-2.5">Status</th>
                  <th class="w-24 px-4 py-2.5">Pass Rate</th>
                  <th class="px-4 py-2.5">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {#each filteredRules as rule (rule.id)}
                  <tr
                    class={cn(
                      'border-b transition-colors last:border-b-0',
                      rule.failingFiles.length > 0 || rule.fileFindings.length > 0
                        ? 'cursor-pointer'
                        : '',
                      expandedRules.has(rule.id) ? 'bg-muted/30' : 'hover:bg-muted/50',
                    )}
                    onclick={() => {
                      if (rule.failingFiles.length > 0 || rule.fileFindings.length > 0)
                        toggleExpanded(rule.id);
                    }}
                  >
                    <td class="px-4 py-2.5">
                      <div class="flex min-w-0 items-center gap-2">
                        {#if rule.failingFiles.length > 0 || rule.fileFindings.length > 0}
                          <ChevronRight
                            class="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 {expandedRules.has(
                              rule.id,
                            )
                              ? 'rotate-90'
                              : ''}"
                          />
                        {/if}
                        <div>
                          <span class="font-medium">{rule.label}</span>
                          <p class="text-[11px] text-muted-foreground">{rule.description}</p>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-2.5">
                      <span class="text-xs text-muted-foreground">
                        {rule.standard}
                        {rule.wcag}
                      </span>
                    </td>
                    <td class="px-4 py-2.5">
                      <Badge variant="outline" class="text-[10px]">{rule.category}</Badge>
                    </td>
                    <td class="px-4 py-2.5">
                      {#if rule.status === 'not-applicable'}
                        <Tooltip.Provider>
                          <Tooltip.Root delayDuration={300}>
                            <Tooltip.Trigger>
                              {#snippet child({ props })}
                                <span
                                  {...props}
                                  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium {statusClasses(
                                    rule.status,
                                  )}"
                                >
                                  <Eye class="size-3" />
                                  {statusLabel(rule.status)}
                                </span>
                              {/snippet}
                            </Tooltip.Trigger>
                            <Tooltip.Content
                              >Requires manual testing — cannot be verified by static analysis</Tooltip.Content
                            >
                          </Tooltip.Root>
                        </Tooltip.Provider>
                      {:else}
                        <span
                          class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium {statusClasses(
                            rule.status,
                          )}"
                        >
                          {#if rule.status === 'pass'}
                            <CircleCheck class="size-3" />
                          {:else if rule.status === 'fail'}
                            <CircleX class="size-3" />
                          {:else}
                            <CircleAlert class="size-3" />
                          {/if}
                          {statusLabel(rule.status)}
                        </span>
                      {/if}
                    </td>
                    <td class="px-4 py-2.5">
                      {#if rule.status === 'not-applicable'}
                        <span class="text-xs text-muted-foreground/40">—</span>
                      {:else}
                        <div class="flex items-center gap-2">
                          <div class="h-1.5 w-16 rounded-full bg-muted">
                            <div
                              class="h-1.5 rounded-full {(rule.passRate as number) >= 80
                                ? 'bg-emerald-500'
                                : (rule.passRate as number) >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'}"
                              style="width: {rule.passRate}%"
                            ></div>
                          </div>
                          <span class="text-xs tabular-nums text-muted-foreground"
                            >{rule.passCount}/{rule.totalChecked}</span
                          >
                        </div>
                      {/if}
                    </td>
                    <td class="max-w-xs px-4 py-2.5">
                      <span class="text-xs text-muted-foreground">{rule.evidence}</span>
                    </td>
                  </tr>
                  {#if expandedRules.has(rule.id) && (rule.failingFiles.length > 0 || rule.fileFindings.length > 0)}
                    {@const displayFindings =
                      rule.fileFindings.length > 0
                        ? rule.fileFindings
                        : rule.failingFiles.map((f) => ({
                            file: f,
                            problem: rule.description,
                            solution: rule.evidence,
                            found: '' as import('@/schemas/common').Str,
                            fix: '' as import('@/schemas/common').Str,
                          }))}
                    <tr class="border-b bg-muted/20 last:border-b-0">
                      <td colspan="6" class="overflow-hidden px-0">
                        <div
                          class="ml-10 flex flex-col gap-2 px-4 py-3"
                          transition:slide={{ duration: 200 }}
                        >
                          <div class="flex max-h-72 flex-col gap-3 overflow-y-auto">
                            {#each displayFindings as finding (finding.file + (finding.found || finding.problem))}
                              <div class="overflow-hidden rounded-lg border">
                                <!-- File header (GitHub style) -->
                                <div
                                  class="flex items-center gap-2 border-b bg-muted/50 px-3 py-1.5"
                                >
                                  <span
                                    class="font-mono text-[10px] font-medium text-muted-foreground"
                                    >{finding.file}</span
                                  >
                                </div>
                                <!-- Problem / Solution descriptions -->
                                {#if finding.problem || finding.solution}
                                  <div class="border-b px-3 py-2 text-xs">
                                    {#if finding.problem}
                                      <div class="flex gap-1.5">
                                        <span class="shrink-0 font-medium text-foreground"
                                          >Problem:</span
                                        >
                                        <span class="text-muted-foreground">{finding.problem}</span>
                                      </div>
                                    {/if}
                                    {#if finding.solution}
                                      <div class="mt-1 flex gap-1.5">
                                        <span class="shrink-0 font-medium text-foreground"
                                          >Solution:</span
                                        >
                                        <span class="text-muted-foreground">{finding.solution}</span
                                        >
                                      </div>
                                    {/if}
                                  </div>
                                {/if}
                                <!-- Code diff lines -->
                                {#if finding.found || finding.fix}
                                  <div class="font-mono text-[11px] leading-relaxed">
                                    {#if finding.found}
                                      <div class="flex border-b border-red-500/10 bg-red-500/5">
                                        <span
                                          class="flex w-8 shrink-0 select-none items-center justify-center border-r border-red-500/10 text-[9px] text-red-400/60"
                                          >−</span
                                        >
                                        <code
                                          class="flex-1 whitespace-pre-wrap break-all px-3 py-1 text-red-600 dark:text-red-400"
                                          >{finding.found}</code
                                        >
                                      </div>
                                    {/if}
                                    {#if finding.fix}
                                      <div class="flex bg-emerald-500/5">
                                        <span
                                          class="flex w-8 shrink-0 select-none items-center justify-center border-r border-emerald-500/10 text-[9px] text-emerald-400/60"
                                          >+</span
                                        >
                                        <code
                                          class="flex-1 whitespace-pre-wrap break-all px-3 py-1 text-emerald-600 dark:text-emerald-400"
                                          >{finding.fix}</code
                                        >
                                      </div>
                                    {/if}
                                  </div>
                                {/if}
                              </div>
                            {/each}
                          </div>
                        </div>
                      </td>
                    </tr>
                  {/if}
                {/each}
              </tbody>
            </table>
          </div>
        {:else if viewMode === 'cards'}
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {#each filteredRules as rule (rule.id)}
              <div
                class={cn(
                  'flex flex-col gap-1.5 rounded-lg border p-4 transition-colors',
                  rule.status === 'pass' &&
                    'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40',
                  rule.status === 'fail' &&
                    'border-red-500/20 bg-red-500/5 hover:border-red-500/40',
                  rule.status === 'warning' &&
                    'border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40',
                  rule.status === 'not-applicable' && 'bg-card hover:border-primary/30',
                )}
              >
                <div class="flex items-start justify-between gap-2">
                  <span class="text-sm font-semibold">{rule.label}</span>
                  <span
                    class="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium {statusClasses(
                      rule.status,
                    )}"
                  >
                    {#if rule.status === 'pass'}
                      <CircleCheck class="size-2.5" />
                    {:else if rule.status === 'fail'}
                      <CircleX class="size-2.5" />
                    {:else if rule.status === 'warning'}
                      <CircleAlert class="size-2.5" />
                    {:else}
                      <Eye class="size-2.5" />
                    {/if}
                    {statusLabel(rule.status)}
                  </span>
                </div>
                <p class="text-[11px] text-muted-foreground">{rule.description}</p>
                <div class="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                  <code class="rounded bg-muted px-1 py-0.5 text-[9px]">{rule.wcag}</code>
                  <span>{rule.category}</span>
                  <span>·</span>
                  <span class="tabular-nums font-medium">{rule.passCount}/{rule.totalChecked}</span>
                </div>
                <p class="mt-1 text-[10px] text-muted-foreground">{rule.evidence}</p>
              </div>
            {/each}
          </div>
        {:else}
          <div class="divide-y rounded-lg border bg-card">
            {#each filteredRules as rule (rule.id)}
              <div class="flex items-center gap-3 px-4 py-2.5">
                <span
                  class="inline-flex size-2 shrink-0 rounded-full {rule.status === 'pass'
                    ? 'bg-emerald-500'
                    : rule.status === 'fail'
                      ? 'bg-red-500'
                      : rule.status === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-gray-400'}"
                ></span>
                <span class="min-w-0 flex-1 text-sm font-medium">{rule.label}</span>
                <span class="shrink-0 text-xs tabular-nums text-muted-foreground"
                  >{rule.passCount}/{rule.totalChecked}</span
                >
                <code
                  class="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
                  >{rule.wcag}</code
                >
              </div>
            {/each}
          </div>
        {/if}
      </section>
    {/if}
  </div>
</div>
