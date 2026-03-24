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
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import SearchIcon from '@lucide/svelte/icons/search';
  import SearchX from '@lucide/svelte/icons/search-x';
  import X from '@lucide/svelte/icons/x';
  import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
  import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
  import ChevronsDownUp from '@lucide/svelte/icons/chevrons-down-up';
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
  import Tag from '@lucide/svelte/icons/tag';
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

  /** Active sort field (empty string = default/status sort). */
  let sortField: Str = $state('' as Str);

  /** Sort direction: 'asc' | 'desc'. Only meaningful when sortField is set. */
  let sortDir: 'asc' | 'desc' = $state('asc');

  /** Search query inside the View Mode submenu. */
  let viewSearchQuery: Str = $state('' as Str);

  /** Search query inside the Sort By submenu. */
  let sortSearchQuery: Str = $state('' as Str);

  /** Section open state (Coverage Overview + All Rules). */
  let sectionOpen: Record<Str, Bool> = $state({
    coverage: true as Bool,
    rules: true as Bool,
  });

  /** Whether all sections are expanded. */
  const allSectionsExpanded: Bool = $derived(
    Object.values(sectionOpen).every((v) => v === true) as Bool,
  );

  /** Whether all sections are collapsed. */
  const allSectionsCollapsed: Bool = $derived(
    Object.values(sectionOpen).every((v) => v === false) as Bool,
  );

  /** Set of expanded rule IDs (for showing failing files). */
  let expandedRules: Set<Str> = $state(new Set());

  /** IDs of all rules that have expandable findings. */
  const expandableRuleIds: Str[] = $derived(
    auditResult.rules
      .filter((r: A11yRuleResult) => r.failingFiles.length > 0 || r.fileFindings.length > 0)
      .map((r: A11yRuleResult): Str => r.id),
  );

  /** Whether all expandable rules are currently expanded. */
  const a11yAllExpanded: Bool = $derived(
    (expandableRuleIds.length > 0 &&
      expandableRuleIds.every((id: Str) => expandedRules.has(id))) as Bool,
  );

  /** Whether no rules are currently expanded. */
  const a11yAllCollapsed: Bool = $derived((expandedRules.size === 0) as Bool);

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
          r.evidence.toLowerCase().includes(q as string) ||
          r.fileFindings.some(
            (f) =>
              f.problem.toLowerCase().includes(q as string) ||
              f.solution.toLowerCase().includes(q as string),
          ),
      );
    }

    /* Sort — default is status (fail first), otherwise field + direction */
    if (sortField) {
      const mul: Num = (sortDir === 'desc' ? -1 : 1) as Num;
      result = [...result].toSorted(
        (a: A11yRuleResult, b: A11yRuleResult): number =>
          (mul as number) * compareSortField(a, b, sortField),
      );
    } else {
      /* Default: status order (fail → warning → n/a → pass), secondary by pass rate desc */
      const statusOrder: Record<Str, Num> = {
        fail: 0 as Num,
        warning: 1 as Num,
        'not-applicable': 2 as Num,
        pass: 3 as Num,
      };
      result = [...result].toSorted((a: A11yRuleResult, b: A11yRuleResult): number => {
        const statusDiff: number =
          ((statusOrder[a.status] ?? (4 as Num)) as number) -
          ((statusOrder[b.status] ?? (4 as Num)) as number);
        if (statusDiff !== 0) {
          return statusDiff;
        }
        /* Secondary sort: highest pass rate first within same status group */
        return (b.passRate as number) - (a.passRate as number);
      });
    }

    return result;
  });

  /** Count of filtered rules. */
  const filteredRuleCount: Num = $derived(filteredRules.length as Num);

  /** Whether any customization is active (for the reset button). */
  const isCustomized: Bool = $derived(
    (activeCategories.length > 0 ||
      viewMode !== 'table' ||
      sortField !== '' ||
      !a11yAllCollapsed ||
      !allSectionsExpanded) as Bool,
  );

  /** Total failing component-checks across all applicable rules. */
  const criticalFailures: Num = $derived(
    auditResult.rules.reduce(
      (sum: number, r: A11yRuleResult): number => sum + (r.failCount as number),
      0,
    ) as Num,
  );

  /** Total failing component-checks across rules in warning range (≥80% but not 100%). */
  const warningCount: Num = $derived(
    auditResult.rules
      .filter((r: A11yRuleResult) => r.status === 'warning')
      .reduce((sum: number, r: A11yRuleResult): number => sum + (r.failCount as number), 0) as Num,
  );

  /** Per-category pass stats for Coverage Overview cards. */
  const categoryStats: Array<{ label: Str; passing: Num; total: Num }> = $derived.by(() => {
    const categories: Map<Str, { pass: Num; total: Num }> = new Map();
    for (const r of auditResult.rules) {
      if (r.status === 'not-applicable') {
        continue;
      }
      const std: Str = r.category;
      const existing = categories.get(std) ?? { pass: 0 as Num, total: 0 as Num };
      categories.set(std, {
        /* Aggregate component-level counts so cards show "287/350 checks pass"
           rather than "3/8 rules pass" — a rule with 99% coverage was wrongly
           counted the same as 0% when only rule-level status was used */
        pass: ((existing.pass as number) + (r.passCount as number)) as Num,
        total: ((existing.total as number) + (r.totalChecked as number)) as Num,
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

  /** Current view mode display label. */
  const viewModeLabel: Str = $derived.by((): Str => {
    if (viewMode === 'table') {
      return 'Table' as Str;
    }
    if (viewMode === 'cards') {
      return 'Cards' as Str;
    }
    return 'List' as Str;
  });

  /** Current sort display label (field + direction arrow, or empty if default). */
  const sortLabel: Str = $derived.by((): Str => {
    if (!sortField) {
      return '' as Str;
    }
    const names: Record<string, string> = {
      name: 'Name',
      standard: 'Standard',
      status: 'Status',
      coverage: 'Coverage',
      wcag: 'WCAG',
      category: 'Category',
      evidence: 'Evidence',
      'failing-files': 'Failures',
    };
    const arrow: Str = (sortDir === 'asc' ? '\u2191' : '\u2193') as Str;
    return `${names[sortField] ?? sortField} ${arrow}` as Str;
  });

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Compare two rules by a given sort field for use with toSorted.
   * Extracted to avoid nested ternaries in the sort callback.
   *
   * @param a - First rule
   * @param b - Second rule
   * @param field - Sort field key
   * @returns Comparison number (-1, 0, 1 style)
   */
  function compareSortField(a: A11yRuleResult, b: A11yRuleResult, field: Str): number {
    if (field === 'name') {
      return a.label.localeCompare(b.label);
    }
    if (field === 'status') {
      const order: Record<Str, Num> = {
        fail: 0 as Num,
        warning: 1 as Num,
        'not-applicable': 2 as Num,
        pass: 3 as Num,
      };
      return (
        ((order[a.status] ?? (4 as Num)) as number) - ((order[b.status] ?? (4 as Num)) as number)
      );
    }
    if (field === 'coverage') {
      return (a.passRate as number) - (b.passRate as number);
    }
    if (field === 'wcag') {
      return a.wcag.localeCompare(b.wcag, undefined, { numeric: true });
    }
    if (field === 'category') {
      return a.category.localeCompare(b.category);
    }
    if (field === 'standard') {
      return a.standard.localeCompare(b.standard);
    }
    if (field === 'evidence') {
      return a.evidence.localeCompare(b.evidence);
    }
    if (field === 'failing-files') {
      return (a.failCount as number) - (b.failCount as number);
    }
    return 0;
  }

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
  /** Expand all page sections. */
  function expandAllSections(): void {
    for (const key of Object.keys(sectionOpen)) {
      sectionOpen[key as Str] = true as Bool;
    }
  }

  /** Collapse all page sections. */
  function collapseAllSections(): void {
    for (const key of Object.keys(sectionOpen)) {
      sectionOpen[key as Str] = false as Bool;
    }
  }

  /** Expand all fail/warn rules that have findings. */
  function expandAll(): void {
    expandedRules = new Set(
      auditResult.rules
        .filter((r: A11yRuleResult) => r.failingFiles.length > 0 || r.fileFindings.length > 0)
        .map((r: A11yRuleResult): Str => r.id),
    );
  }

  /** Collapse all expanded rules. */
  function collapseAll(): void {
    expandedRules = new Set();
  }

  /**
   * Format a number with locale-appropriate thousands separators.
   *
   * @param n - Number to format
   * @returns Locale-formatted string, e.g. 1234 → "1,234"
   */
  function fmt(n: Num): string {
    return (n as number).toLocaleString();
  }

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
    sortField = '' as Str;
    sortDir = 'asc';
    collapseAll();
    expandAllSections();
  }

  /**
   * Handle "Reset to defaults" with 2-step confirmation.
   * First click arms, second click executes. Resets after 3s.
   */
  function handleReset(): void {
    if (confirmingReset) {
      resetDefaults();
      confirmingReset = false as Bool;
      if (confirmResetTimer) {
        clearTimeout(confirmResetTimer);
      }
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
    if (status === 'pass') {
      return 'bg-green-500/10 text-green-600 dark:text-green-400' as Str;
    }
    if (status === 'fail') {
      return 'bg-red-500/10 text-red-600 dark:text-red-400' as Str;
    }
    if (status === 'warning') {
      return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' as Str;
    }
    return 'bg-gray-500/10 text-muted-foreground' as Str;
  }

  /**
   * Get display label for a rule status.
   *
   * @param status - Rule status
   * @returns Human-readable label
   */
  function statusLabel(status: Str): Str {
    if (status === 'pass') {
      return 'Pass' as Str;
    }
    if (status === 'fail') {
      return 'Fail' as Str;
    }
    if (status === 'warning') {
      return 'Warning' as Str;
    }
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
              <span class="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px]"
                >{viewModeLabel}</span
              >
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
                { v: 'name', l: 'Name', d: 'Alphabetical by rule name' },
                { v: 'status', l: 'Status', d: 'Failing first' },
                { v: 'coverage', l: 'Coverage', d: 'By pass rate' },
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
                      <ArrowUp class="mr-1 size-4 shrink-0 text-primary" />
                    {:else if sortField === opt.v && sortDir === 'desc'}
                      <ArrowDown class="mr-1 size-4 shrink-0 text-primary" />
                    {:else}
                      <ArrowUpDown class="mr-1 size-4 shrink-0 opacity-30" />
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

          <DropdownMenu.Item onclick={expandAllSections} disabled={allSectionsExpanded}>
            <ChevronsUpDown class="mr-2 size-4" />
            Expand All Sections
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={collapseAllSections} disabled={allSectionsCollapsed}>
            <ChevronsDownUp class="mr-2 size-4" />
            Collapse All Sections
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={expandAll} disabled={a11yAllExpanded}>
            <ChevronsUpDown class="mr-2 size-4" />
            Expand All Failures
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={collapseAll} disabled={a11yAllCollapsed}>
            <ChevronsDownUp class="mr-2 size-4" />
            Collapse All Failures
          </DropdownMenu.Item>

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
        <button
          type="button"
          class="mb-4 flex w-full items-center gap-2 text-left text-lg font-semibold"
          onclick={() => {
            sectionOpen.coverage = !sectionOpen.coverage as Bool;
          }}
        >
          <ChevronRight
            class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen.coverage
              ? 'rotate-90'
              : ''}"
          />
          <BarChart3 class="size-5 text-primary" />
          Coverage Overview
        </button>
        {#if sectionOpen.coverage}
          <div
            transition:slide={{ duration: 200 }}
            class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          >
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
                {fmt(criticalFailures)}
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
                <CircleAlert
                  class="size-4 {(warningCount as number) > 0 ? 'text-amber-500' : ''}"
                />
                <span class="text-xs font-medium uppercase tracking-wider">Warnings</span>
              </div>
              <p
                class="mt-2 text-2xl font-bold tabular-nums {(warningCount as number) > 0
                  ? 'text-amber-500'
                  : ''}"
              >
                {fmt(warningCount)}
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
                {fmt(auditResult.rules.filter((r) => r.status === 'not-applicable').length as Num)}
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
                <p class="mt-2 text-2xl font-bold tabular-nums">
                  {fmt(cat.passing)}/{fmt(cat.total)}
                </p>
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
        {/if}
      </section>

      <!-- === All Rules === -->
      <section>
        <button
          type="button"
          class="mb-1 flex w-full items-center gap-2 text-left text-lg font-semibold"
          onclick={() => {
            sectionOpen.rules = !sectionOpen.rules as Bool;
          }}
        >
          <ChevronRight
            class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen.rules
              ? 'rotate-90'
              : ''}"
          />
          <ShieldCheck class="size-5 text-primary" />
          All Rules
          <span
            class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground"
            >{filteredRules.length}</span
          >
        </button>
        {#if sectionOpen.rules}
          <div transition:slide={{ duration: 200 }}>
            <p class="mb-4 text-xs text-muted-foreground">
              {auditResult.passingRules} of {auditResult.totalRules} rules passing · {auditResult.overallScore}%
              overall
            </p>
            {#if viewMode === 'table'}
              <div class="rounded-lg border bg-card">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b bg-muted/50">
                      <th class="p-0 text-left font-medium text-muted-foreground">
                        <button
                          type="button"
                          class="group/th flex w-full items-center gap-1 px-4 py-2 transition-colors hover:text-foreground"
                          onclick={() => {
                            if (sortField === 'name' && sortDir === 'asc') {
                              sortDir = 'desc';
                            } else if (sortField === 'name' && sortDir === 'desc') {
                              sortField = '' as Str;
                              sortDir = 'asc';
                            } else {
                              sortField = 'name' as Str;
                              sortDir = 'asc';
                            }
                          }}
                        >
                          Rule
                          {#if sortField === 'name' && sortDir === 'asc'}
                            <ArrowUp class="size-3 text-primary" />
                          {:else if sortField === 'name' && sortDir === 'desc'}
                            <ArrowDown class="size-3 text-primary" />
                          {:else}
                            <ArrowUp class="size-3 opacity-0 group-hover/th:opacity-40" />
                          {/if}
                        </button>
                      </th>
                      <th class="p-0 text-left font-medium text-muted-foreground">
                        <button
                          type="button"
                          class="group/th flex w-full items-center gap-1 px-4 py-2 transition-colors hover:text-foreground"
                          onclick={() => {
                            if (sortField === 'standard' && sortDir === 'asc') {
                              sortDir = 'desc';
                            } else if (sortField === 'standard' && sortDir === 'desc') {
                              sortField = '' as Str;
                              sortDir = 'asc';
                            } else {
                              sortField = 'standard' as Str;
                              sortDir = 'asc';
                            }
                          }}
                        >
                          Standard
                          {#if sortField === 'standard' && sortDir === 'asc'}
                            <ArrowUp class="size-3 text-primary" />
                          {:else if sortField === 'standard' && sortDir === 'desc'}
                            <ArrowDown class="size-3 text-primary" />
                          {:else}
                            <ArrowUp class="size-3 opacity-0 group-hover/th:opacity-40" />
                          {/if}
                        </button>
                      </th>
                      <th class="p-0 text-left font-medium text-muted-foreground">
                        <button
                          type="button"
                          class="group/th flex w-full items-center gap-1 px-4 py-2 transition-colors hover:text-foreground"
                          onclick={() => {
                            if (sortField === 'category' && sortDir === 'asc') {
                              sortDir = 'desc';
                            } else if (sortField === 'category' && sortDir === 'desc') {
                              sortField = '' as Str;
                              sortDir = 'asc';
                            } else {
                              sortField = 'category' as Str;
                              sortDir = 'asc';
                            }
                          }}
                        >
                          Category
                          {#if sortField === 'category' && sortDir === 'asc'}
                            <ArrowUp class="size-3 text-primary" />
                          {:else if sortField === 'category' && sortDir === 'desc'}
                            <ArrowDown class="size-3 text-primary" />
                          {:else}
                            <ArrowUp class="size-3 opacity-0 group-hover/th:opacity-40" />
                          {/if}
                        </button>
                      </th>
                      <th class="p-0 text-left font-medium text-muted-foreground">
                        <button
                          type="button"
                          class="group/th flex w-full items-center gap-1 px-4 py-2 transition-colors hover:text-foreground"
                          onclick={() => {
                            if (sortField === 'status' && sortDir === 'asc') {
                              sortDir = 'desc';
                            } else if (sortField === 'status' && sortDir === 'desc') {
                              sortField = '' as Str;
                              sortDir = 'asc';
                            } else {
                              sortField = 'status' as Str;
                              sortDir = 'asc';
                            }
                          }}
                        >
                          Status
                          {#if sortField === 'status' && sortDir === 'asc'}
                            <ArrowUp class="size-3 text-primary" />
                          {:else if sortField === 'status' && sortDir === 'desc'}
                            <ArrowDown class="size-3 text-primary" />
                          {:else}
                            <ArrowUp class="size-3 opacity-0 group-hover/th:opacity-40" />
                          {/if}
                        </button>
                      </th>
                      <th class="p-0 text-left font-medium text-muted-foreground">
                        <button
                          type="button"
                          class="group/th flex w-full items-center gap-1 px-4 py-2 transition-colors hover:text-foreground"
                          onclick={() => {
                            if (sortField === 'coverage' && sortDir === 'asc') {
                              sortDir = 'desc';
                            } else if (sortField === 'coverage' && sortDir === 'desc') {
                              sortField = '' as Str;
                              sortDir = 'asc';
                            } else {
                              sortField = 'coverage' as Str;
                              sortDir = 'asc';
                            }
                          }}
                        >
                          Pass Rate
                          {#if sortField === 'coverage' && sortDir === 'asc'}
                            <ArrowUp class="size-3 text-primary" />
                          {:else if sortField === 'coverage' && sortDir === 'desc'}
                            <ArrowDown class="size-3 text-primary" />
                          {:else}
                            <ArrowUp class="size-3 opacity-0 group-hover/th:opacity-40" />
                          {/if}
                        </button>
                      </th>
                      <th class="p-0 text-left font-medium text-muted-foreground">
                        <button
                          type="button"
                          class="group/th flex w-full items-center gap-1 px-4 py-2 transition-colors hover:text-foreground"
                          onclick={() => {
                            if (sortField === 'evidence' && sortDir === 'asc') {
                              sortDir = 'desc';
                            } else if (sortField === 'evidence' && sortDir === 'desc') {
                              sortField = '' as Str;
                              sortDir = 'asc';
                            } else {
                              sortField = 'evidence' as Str;
                              sortDir = 'asc';
                            }
                          }}
                        >
                          Evidence
                          {#if sortField === 'evidence' && sortDir === 'asc'}
                            <ArrowUp class="size-3 text-primary" />
                          {:else if sortField === 'evidence' && sortDir === 'desc'}
                            <ArrowDown class="size-3 text-primary" />
                          {:else}
                            <ArrowUp class="size-3 opacity-0 group-hover/th:opacity-40" />
                          {/if}
                        </button>
                      </th>
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
                          expandedRules.has(rule.id) ? 'bg-muted/30' : 'hover:bg-muted/40',
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
                                >{fmt(rule.passCount)}/{fmt(rule.totalChecked)}</span
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
                          <td colspan="6" class="px-0">
                            <div
                              class="ml-10 flex flex-col gap-2 px-4 py-3"
                              transition:slide={{ duration: 200 }}
                            >
                              <div class="flex max-h-72 flex-col gap-3 overflow-y-auto">
                                {#each displayFindings as finding (finding.file + (finding.found || finding.problem))}
                                  <div class="shrink-0 overflow-hidden rounded-lg border">
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
                                            <span class="text-muted-foreground"
                                              >{finding.problem}</span
                                            >
                                          </div>
                                        {/if}
                                        {#if finding.solution}
                                          <div class="mt-1 flex gap-1.5">
                                            <span class="shrink-0 font-medium text-foreground"
                                              >Solution:</span
                                            >
                                            <span class="text-muted-foreground"
                                              >{finding.solution}</span
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
                      <span class="tabular-nums font-medium"
                        >{rule.passCount}/{rule.totalChecked}</span
                      >
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
          </div>
        {/if}
      </section>
    {/if}
  </div>
</div>
