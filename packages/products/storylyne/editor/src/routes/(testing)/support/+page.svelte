<script lang="ts">
  /**
   * Support page for the Lens documentation system.
   *
   * Displays support resources, FAQ, contributing guides, and learning
   * resources grouped by category with search filtering, category chips,
   * view modes, sort options, and export functionality.
   *
   * Layout and UX patterns match the Tokens gallery page.
   */
  import type { Bool, Num, Str } from '@/schemas/common';
  import * as DropdownMenu from '@/ui/dropdown-menu/index.js';
  import * as Tooltip from '@/ui/tooltip/index.js';
  import { cn } from '@/ui/utils.js';
  import { clipboardCopy } from '@/ui/lens/clipboard.js';
  import Input from '@/ui/input/input.svelte';
  import Badge from '@/ui/badge/badge.svelte';
  import { slide, fade } from 'svelte/transition';
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
  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
  import ChevronsDownUp from '@lucide/svelte/icons/chevrons-down-up';
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import LifeBuoy from '@lucide/svelte/icons/life-buoy';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';

  /* ------------------------------------------------------------------ */
  /*  Data types                                                        */
  /* ------------------------------------------------------------------ */

  /** A single support item within a section. */
  type SupportItem = {
    /** Display label. */
    label: Str;
    /** Short description of the item. */
    description: Str;
    /** Optional external URL. */
    url?: Str;
    /** Optional icon identifier. */
    icon?: Str;
  };

  /** A support section containing related items. */
  type SupportSection = {
    /** Unique section identifier. */
    id: Str;
    /** Section heading. */
    title: Str;
    /** Category for filtering. */
    category: Str;
    /** Section description. */
    description: Str;
    /** List of support items. */
    items?: SupportItem[];
  };

  /* ------------------------------------------------------------------ */
  /*  Static data                                                       */
  /* ------------------------------------------------------------------ */

  /** All support sections with their items. */
  const SECTIONS: SupportSection[] = [
    {
      id: 'getting-help' as Str,
      title: 'Getting Help' as Str,
      category: 'Help' as Str,
      description: 'Find answers to common questions and get support from the community.' as Str,
      items: [
        {
          label: 'Documentation' as Str,
          description: 'Browse the full documentation for guides and API reference' as Str,
        },
        {
          label: 'Getting Started Guide' as Str,
          description: 'Step-by-step setup and first project tutorial' as Str,
        },
        {
          label: 'FAQ' as Str,
          description: 'Frequently asked questions about WebForge' as Str,
        },
      ],
    },
    {
      id: 'bug-reporting' as Str,
      title: 'Bug Reporting' as Str,
      category: 'Reporting' as Str,
      description: 'Found a bug? Help us fix it by submitting a detailed report.' as Str,
      items: [
        {
          label: 'Create a minimal reproduction' as Str,
          description: 'Isolate the issue to the smallest possible example' as Str,
        },
        {
          label: 'Check existing issues' as Str,
          description: 'Search GitHub Issues to avoid duplicates' as Str,
        },
        {
          label: 'Submit a bug report' as Str,
          description: 'Use the bug report template on GitHub' as Str,
        },
        {
          label: 'Include environment details' as Str,
          description: 'Browser, OS, Node.js version, and error messages' as Str,
        },
      ],
    },
    {
      id: 'feature-requests' as Str,
      title: 'Feature Requests' as Str,
      category: 'Reporting' as Str,
      description: "Have an idea for a new feature? We'd love to hear it." as Str,
      items: [
        {
          label: 'Open a discussion' as Str,
          description: 'Start a GitHub Discussion to propose your idea' as Str,
        },
        {
          label: 'Describe the use case' as Str,
          description: 'Explain what problem the feature would solve' as Str,
        },
        {
          label: 'Consider alternatives' as Str,
          description: "Note any workarounds you've tried" as Str,
        },
      ],
    },
    {
      id: 'faq' as Str,
      title: 'FAQ' as Str,
      category: 'Help' as Str,
      description: 'Common questions and answers.' as Str,
      items: [
        {
          label: 'What browsers are supported?' as Str,
          description: 'Chrome 109+, Firefox 115+, Edge 121+, Safari 15.4+' as Str,
        },
        {
          label: 'What rendering engine is used?' as Str,
          description: 'Babylon.js with WebGPU/WebGL2 backends' as Str,
        },
        {
          label: 'Can I use this with React/Vue?' as Str,
          description:
            'WebForge is built on Svelte 5. The runtime engine is framework-agnostic.' as Str,
        },
        {
          label: 'Is this production-ready?' as Str,
          description:
            'WebForge is in pre-release (0.0.1). Not recommended for production yet.' as Str,
        },
        {
          label: 'How do I report a bug?' as Str,
          description: 'Open an issue on GitHub with a minimal reproduction.' as Str,
        },
        {
          label: "What's the license?" as Str,
          description: 'MIT License \u2014 free for personal and commercial use.' as Str,
        },
      ],
    },
    {
      id: 'contributing' as Str,
      title: 'Contributing' as Str,
      category: 'Community' as Str,
      description: "Want to contribute? Here's how to get involved." as Str,
      items: [
        {
          label: 'Code contributions' as Str,
          description:
            'Fork the repo, create a branch, submit a PR following CLAUDE.md standards' as Str,
        },
        {
          label: 'Documentation' as Str,
          description: 'Help improve docs by editing pages or adding examples' as Str,
        },
        {
          label: 'Bug triage' as Str,
          description: 'Help reproduce and verify reported bugs' as Str,
        },
        {
          label: 'Testing' as Str,
          description: 'Write tests for uncovered functionality' as Str,
        },
      ],
    },
    {
      id: 'learning-resources' as Str,
      title: 'Learning Resources' as Str,
      category: 'Learning' as Str,
      description: 'Tutorials, guides, and resources to help you master WebForge.' as Str,
      items: [
        {
          label: 'Svelte 5 Runes' as Str,
          description: 'Learn the new reactivity system powering the editor' as Str,
        },
        {
          label: 'Babylon.js Docs' as Str,
          description: '3D engine documentation and tutorials' as Str,
        },
        {
          label: 'Valibot Guide' as Str,
          description: 'Schema validation library used throughout the codebase' as Str,
        },
        {
          label: 'HD-2D Rendering' as Str,
          description: 'Understanding the pixel art + 3D rendering technique' as Str,
        },
      ],
    },
  ];

  /** All unique category names. */
  const ALL_CATEGORIES: Str[] = [...new Set(SECTIONS.map((s: SupportSection): Str => s.category))];

  /** Total number of items across all sections. */
  const totalItemCount: Num = SECTIONS.reduce(
    (sum: Num, s: SupportSection): Num => ((sum as number) + (s.items?.length ?? 0)) as Num,
    0 as Num,
  );

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
      description: 'Formatted support content' as Str,
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
      description: 'Support documentation file' as Str,
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

  /** Section open states. */
  let sectionOpen: Record<Str, Bool> = $state(
    Object.fromEntries(SECTIONS.map((s: SupportSection): [Str, Bool] => [s.id, true as Bool])),
  );

  /** Export feedback (shows check icon briefly). */
  let exportFeedback: Str = $state('' as Str);

  /** View mode for section display. */
  let viewMode: 'sections' | 'cards' | 'compact' = $state('sections');

  /** Active sort field (empty string = default/no sort). */
  let sortField: Str = $state('' as Str);

  /** Sort direction: 'asc' | 'desc'. Only meaningful when sortField is set. */
  let sortDir: 'asc' | 'desc' = $state('asc');

  /** Search query inside the View Mode submenu. */
  let viewSearchQuery: Str = $state('' as Str);

  /** Search query inside the Sort By submenu. */
  let sortSearchQuery: Str = $state('' as Str);

  /** Two-step confirm gate for reset. */
  let confirmingReset: Bool = $state(false as Bool);

  /** Timer ID for reset confirm auto-dismiss. */
  let confirmResetTimer: ReturnType<typeof setTimeout> | undefined;

  /** Whether every section is currently expanded. */
  const allSectionsExpanded: Bool = $derived(
    Object.values(sectionOpen).every((v) => v === true) as Bool,
  );

  /** Whether every section is currently collapsed. */
  const allSectionsCollapsed: Bool = $derived(
    Object.values(sectionOpen).every((v) => v === false) as Bool,
  );

  /* ------------------------------------------------------------------ */
  /*  Derived                                                           */
  /* ------------------------------------------------------------------ */

  /** Sections filtered by search query and active categories, then sorted. */
  const filteredSections: SupportSection[] = $derived.by((): SupportSection[] => {
    const q: Str = searchQuery.toLowerCase() as Str;
    let result: SupportSection[] = SECTIONS;

    /* Category filter */
    if (activeCategories.length > 0) {
      result = result.filter((s: SupportSection): boolean => activeCategories.includes(s.category));
    }

    /* Search filter */
    if (q.length > 0) {
      result = result.filter((s: SupportSection): boolean => {
        const titleMatch: Bool = s.title.toLowerCase().includes(q as string) as Bool;
        const descMatch: Bool = s.description.toLowerCase().includes(q as string) as Bool;
        const itemMatch: Bool = (s.items?.some(
          (item: SupportItem): boolean =>
            item.label.toLowerCase().includes(q as string) ||
            item.description.toLowerCase().includes(q as string),
        ) ?? false) as Bool;
        return titleMatch || descMatch || itemMatch;
      });
    }

    /* Sort */
    if (sortField) {
      const mul: Num = (sortDir === 'desc' ? -1 : 1) as Num;
      result = [...result].toSorted(
        (a: SupportSection, b: SupportSection): Num =>
          ((mul as number) * a.title.localeCompare(b.title)) as Num,
      );
    }
    /* Empty sortField keeps original array order */

    return result;
  });

  /** Total filtered item count. */
  const filteredItemCount: Num = $derived(
    filteredSections.reduce(
      (sum: Num, s: SupportSection): Num => ((sum as number) + (s.items?.length ?? 0)) as Num,
      0 as Num,
    ),
  );

  /** Whether any customization is active (for the reset button). */
  const isCustomized: Bool = $derived(
    (activeCategories.length > 0 ||
      viewMode !== 'sections' ||
      sortField !== '' ||
      !allSectionsExpanded) as Bool,
  );

  /** Current view mode display label. */
  const viewModeLabel: Str = $derived.by((): Str => {
    if (viewMode === 'sections') return 'Sections' as Str;
    if (viewMode === 'cards') return 'Cards' as Str;
    return 'Compact' as Str;
  });

  /** Current sort display label (field + direction arrow, or empty if default). */
  const sortLabel: Str = $derived.by((): Str => {
    if (!sortField) return '' as Str;
    const arrow: Str = (sortDir === 'asc' ? '\u2191' : '\u2193') as Str;
    return `Name ${arrow}` as Str;
  });

  /** Dynamic subtitle text. */
  const headerSubtitle: Str = $derived.by((): Str => {
    if (searchQuery) {
      return `${filteredSections.length} result${filteredSections.length === 1 ? '' : 's'} for "${searchQuery}"` as Str;
    }
    if (activeCategories.length > 0) {
      return `${filteredSections.length} section${filteredSections.length === 1 ? '' : 's'} in ${activeCategories.length} categor${activeCategories.length === 1 ? 'y' : 'ies'}` as Str;
    }
    return `${SECTIONS.length} sections \u00B7 ${totalItemCount} items` as Str;
  });

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Toggle a section open/closed.
   *
   * @param id - Section identifier key
   */
  function toggleSection(id: Str): void {
    sectionOpen[id] = !sectionOpen[id];
  }

  /**
   * Toggle a category in the active filter list.
   *
   * @param cat - Category name to toggle
   */
  function toggleCategory(cat: Str): void {
    const idx: Num = activeCategories.indexOf(cat) as Num;
    if ((idx as number) >= 0) {
      activeCategories = activeCategories.filter((c: Str): boolean => c !== cat);
    } else {
      activeCategories = [...activeCategories, cat];
    }
  }

  /** Reset all controls to their default values. */
  function resetDefaults(): void {
    activeCategories = [];
    searchQuery = '' as Str;
    viewMode = 'sections';
    sortField = '' as Str;
    sortDir = 'asc';
    expandAllSections();
  }

  /** Expand all collapsible sections. */
  function expandAllSections(): void {
    for (const key of Object.keys(sectionOpen)) {
      sectionOpen[key as Str] = true as Bool;
    }
  }

  /** Collapse all collapsible sections. */
  function collapseAllSections(): void {
    for (const key of Object.keys(sectionOpen)) {
      sectionOpen[key as Str] = false as Bool;
    }
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
   * Generate Markdown export content from filtered sections.
   *
   * @returns Markdown string
   */
  function generateMarkdown(): Str {
    const lines: Str[] = [];
    for (const section of filteredSections) {
      lines.push(`## ${section.title}` as Str);
      lines.push('' as Str);
      lines.push(`*${section.category}* \u2014 ${section.description}` as Str);
      lines.push('' as Str);
      if (section.items && section.items.length > 0) {
        for (const item of section.items) {
          lines.push(`- **${item.label}** \u2014 ${item.description}` as Str);
        }
        lines.push('' as Str);
      }
    }
    return lines.join('\n') as Str;
  }

  /**
   * Generate JSON export content from filtered sections.
   *
   * @returns JSON string
   */
  function generateJson(): Str {
    return JSON.stringify(filteredSections, null, 2) as Str;
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
      content = generateMarkdown();
      await clipboardCopy(content);
    } else if (formatId === 'copy-json') {
      content = generateJson();
      await clipboardCopy(content);
    } else if (formatId === 'download-md') {
      content = `# Support\n\n${generateMarkdown()}` as Str;
      filename = 'support.md' as Str;
    } else if (formatId === 'download-json') {
      content = generateJson();
      filename = 'support.json' as Str;
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
        <LifeBuoy class="size-6 text-primary" />
      </div>
      <div class="flex-1">
        <h1 class="text-2xl font-bold tracking-tight">Support</h1>
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
                { v: 'sections', l: 'Sections', d: 'Collapsible cards with items' },
                { v: 'cards', l: 'Cards', d: 'Grid cards per section' },
                { v: 'compact', l: 'Compact', d: 'Dense list view' },
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
                      viewMode = opt.v as 'sections' | 'cards' | 'compact';
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
              {@const sortOpts = [{ v: 'name', l: 'Name', d: 'Alphabetical by title' }]}
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

          <!-- Expand / Collapse All -->
          <DropdownMenu.Item onclick={expandAllSections} disabled={allSectionsExpanded}>
            <ChevronsUpDown class="mr-2 size-4" />
            Expand All
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={collapseAllSections} disabled={allSectionsCollapsed}>
            <ChevronsDownUp class="mr-2 size-4" />
            Collapse All
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
          placeholder="Search {SECTIONS.length} sections..."
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
  <div class="flex flex-col gap-6 px-6 py-6 md:px-10 md:py-8">
    {#if filteredSections.length === 0}
      <!-- Empty state -->
      <div class="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
        <div class="flex size-16 items-center justify-center rounded-2xl bg-muted/50">
          <SearchX class="size-8 text-muted-foreground/40" />
        </div>
        <div class="space-y-1">
          <p class="text-sm font-medium text-muted-foreground">No sections match</p>
          <p class="text-xs text-muted-foreground/60">
            {#if searchQuery}
              No sections match "{searchQuery}"
            {:else}
              No sections in the selected categories
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
    {:else if viewMode === 'sections'}
      <!-- Sections view — Collapsible cards with ChevronRight, items as list -->
      <div class="space-y-10">
        {#each filteredSections as section (section.id)}
          <section id={section.id} class="scroll-mt-60">
            <button
              type="button"
              onclick={() => toggleSection(section.id)}
              class="mb-3 flex w-full items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80"
            >
              <ChevronRight
                class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen[
                  section.id
                ]
                  ? 'rotate-90'
                  : ''}"
              />
              <LifeBuoy class="size-5" />
              {section.title}
              <Badge variant="outline" class="ml-1 text-xs">{section.items?.length ?? 0}</Badge>
              <Badge variant="secondary" class="ml-1 text-[10px]">{section.category}</Badge>
            </button>

            {#if sectionOpen[section.id]}
              <div transition:slide={{ duration: 200 }}>
                <div class="rounded-lg border bg-card">
                  <div class="border-b px-4 py-3">
                    <p class="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                  {#if section.items && section.items.length > 0}
                    <ul class="divide-y">
                      {#each section.items as item (item.label)}
                        <li
                          class="flex flex-col gap-0.5 px-4 py-3 transition-colors hover:bg-muted/50"
                        >
                          <span class="text-sm font-medium">{item.label}</span>
                          <span class="text-xs text-muted-foreground">{item.description}</span>
                        </li>
                      {/each}
                    </ul>
                  {/if}
                </div>
              </div>
            {/if}
          </section>
        {/each}
      </div>
    {:else if viewMode === 'cards'}
      <!-- Cards view — Grid cards per section -->
      <div class="space-y-8">
        {#each filteredSections as section (section.id)}
          <div>
            <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
              <LifeBuoy class="size-4" />
              {section.title}
              <Badge variant="outline" class="text-xs">{section.items?.length ?? 0}</Badge>
              <Badge variant="secondary" class="text-[10px]">{section.category}</Badge>
            </h3>
            <p class="mb-3 text-xs text-muted-foreground">{section.description}</p>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {#each section.items ?? [] as item (item.label)}
                <div
                  class="flex flex-col gap-1.5 rounded-lg border bg-card p-3 transition-colors hover:border-primary/30"
                >
                  <span class="text-sm font-medium">{item.label}</span>
                  <span class="text-xs text-muted-foreground">{item.description}</span>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <!-- Compact view — Dense list -->
      <div class="rounded-lg border bg-card">
        {#each filteredSections as section, si (section.id)}
          {#if si > 0}
            <div class="border-t"></div>
          {/if}
          <div class="flex flex-col gap-0.5 px-4 py-2.5 transition-colors hover:bg-muted/50">
            <div class="flex items-center gap-2">
              <LifeBuoy class="size-4 shrink-0 text-muted-foreground" />
              <span class="text-sm font-medium">{section.title}</span>
              <Badge variant="secondary" class="ml-auto text-[10px]">{section.category}</Badge>
            </div>
            <span class="text-xs text-muted-foreground">{section.description}</span>
            {#if section.items && section.items.length > 0}
              <span class="text-[11px] text-muted-foreground/60">
                {section.items.length} item{section.items.length === 1 ? '' : 's'}
              </span>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
