<script lang="ts">
  /**
   * About page for the Lens documentation system.
   *
   * Displays project information organized into searchable, filterable
   * sections with category chips, view modes, sort options, and export
   * capabilities. Layout and UX patterns match the Tokens page.
   */
  import type { Bool, Num, Str } from '@/schemas/common';
  import Input from '@/ui/input/input.svelte';
  import * as DropdownMenu from '@/ui/dropdown-menu/index.js';
  import * as Tooltip from '@/ui/tooltip/index.js';
  import { cn } from '@/ui/utils.js';
  import { clipboardCopy } from '@/ui/lens/clipboard.js';
  import { slide, fade } from 'svelte/transition';
  import Check from '@lucide/svelte/icons/check';

  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
  import ChevronsDownUp from '@lucide/svelte/icons/chevrons-down-up';
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import SearchIcon from '@lucide/svelte/icons/search';
  import SearchX from '@lucide/svelte/icons/search-x';
  import X from '@lucide/svelte/icons/x';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
  import ClipboardCopy from '@lucide/svelte/icons/clipboard-copy';
  import DownloadIcon from '@lucide/svelte/icons/download';
  import Clipboard from '@lucide/svelte/icons/clipboard';
  import FileText from '@lucide/svelte/icons/file-text';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Info from '@lucide/svelte/icons/info';
  import Tag from '@lucide/svelte/icons/tag';
  import Briefcase from '@lucide/svelte/icons/briefcase';
  import Code2 from '@lucide/svelte/icons/code-2';
  import Users from '@lucide/svelte/icons/users';

  /* ------------------------------------------------------------------ */
  /*  Data types                                                        */
  /* ------------------------------------------------------------------ */

  /** Single key-value item within an about section. */
  type AboutItem = {
    /** Display label. */
    label: Str;
    /** Display value. */
    value: Str;
    /** Optional link URL. */
    url?: Str;
  };

  /** A section of about page content. */
  type AboutSection = {
    /** Unique section identifier. */
    id: Str;
    /** Section display title. */
    title: Str;
    /** Category for filtering. */
    category: Str;
    /** Descriptive text content. */
    content: Str;
    /** Optional list of key-value items. */
    items?: AboutItem[];
  };

  /* ------------------------------------------------------------------ */
  /*  Static content data                                               */
  /* ------------------------------------------------------------------ */

  /** All about page sections as static data for filtering and sorting. */
  const ABOUT_SECTIONS: AboutSection[] = [
    {
      id: 'mission' as Str,
      title: 'Mission' as Str,
      category: 'Project' as Str,
      content:
        'WebForge RPG is an open-source HD-2D game creation suite powered by Babylon.js, built with Svelte 5 and TypeScript. It provides a visual editor and runtime engine for creating RPG games with pixel art aesthetics and modern rendering techniques.' as Str,
    },
    {
      id: 'tech-stack' as Str,
      title: 'Tech Stack' as Str,
      category: 'Technical' as Str,
      content: 'Core technologies powering the WebForge platform.' as Str,
      items: [
        { label: 'Svelte 5' as Str, value: 'UI framework with runes reactivity' as Str },
        { label: 'SvelteKit' as Str, value: 'Full-stack application framework' as Str },
        { label: 'Babylon.js' as Str, value: '3D/2D rendering engine' as Str },
        { label: 'Valibot' as Str, value: 'Schema validation (Result pattern)' as Str },
        { label: 'Tailwind CSS 4' as Str, value: 'Utility-first styling' as Str },
        { label: 'shadcn-svelte' as Str, value: 'Accessible UI components' as Str },
        { label: 'Vitest' as Str, value: 'Unit and integration testing' as Str },
        { label: 'Turborepo' as Str, value: 'Monorepo build orchestration' as Str },
        { label: 'pnpm' as Str, value: 'Package management' as Str },
      ],
    },
    {
      id: 'architecture' as Str,
      title: 'Architecture' as Str,
      category: 'Technical' as Str,
      content: 'Architectural principles and patterns used throughout the codebase.' as Str,
      items: [
        { label: 'Monorepo' as Str, value: 'pnpm workspaces with Turborepo' as Str },
        {
          label: 'Result Pattern' as Str,
          value: 'No exceptions, all functions return Result<T>' as Str,
        },
        { label: 'Valibot Types' as Str, value: 'Schema-validated data types everywhere' as Str },
        {
          label: 'HD-2D Rendering' as Str,
          value: 'Pixel art sprites on 3D terrain' as Str,
        },
      ],
    },
    {
      id: 'version' as Str,
      title: 'Version' as Str,
      category: 'Project' as Str,
      content: 'Current project version and environment details.' as Str,
      items: [
        { label: 'Version' as Str, value: '0.0.1 (pre-release)' as Str },
        { label: 'License' as Str, value: 'MIT' as Str },
        { label: 'Node.js' as Str, value: '>=25' as Str },
        { label: 'TypeScript' as Str, value: '5.7+' as Str },
      ],
    },
    {
      id: 'release-cadence' as Str,
      title: 'Release Cadence' as Str,
      category: 'Project' as Str,
      content:
        'Patch releases weekly for bug fixes. Minor releases monthly with new features. Major releases as needed for breaking changes.' as Str,
    },
    {
      id: 'contributing' as Str,
      title: 'Contributing' as Str,
      category: 'Community' as Str,
      content:
        'Contributions welcome via GitHub pull requests. Follow the coding standards in CLAUDE.md. All code must use the Result pattern and Valibot types.' as Str,
    },
    {
      id: 'brand-assets' as Str,
      title: 'Brand Assets' as Str,
      category: 'Community' as Str,
      content:
        'WebForge logo and brand assets are available for use in documentation and community projects.' as Str,
    },
  ];

  /** Map of category names to their Lucide icon components. */
  const SECTION_ICONS: Record<Str, typeof Briefcase> = {
    Project: Briefcase,
    Technical: Code2,
    Community: Users,
  } as Record<Str, typeof Briefcase>;

  /** All unique category names. */
  const ALL_CATEGORIES: Str[] = [
    ...new Set(ABOUT_SECTIONS.map((s: AboutSection): Str => s.category)),
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
      icon: ClipboardCopy,
      category: 'Clipboard' as Str,
      description: 'Formatted markdown document' as Str,
      ext: '' as Str,
    },
    {
      id: 'copy-json' as Str,
      label: 'Copy as JSON' as Str,
      icon: ClipboardCopy,
      category: 'Clipboard' as Str,
      description: 'Structured data object' as Str,
      ext: '' as Str,
    },
    {
      id: 'download-markdown' as Str,
      label: 'Download Markdown' as Str,
      icon: DownloadIcon,
      category: 'File' as Str,
      description: 'Markdown document file' as Str,
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

  /** Search query for section filtering. */
  let searchQuery: Str = $state('' as Str);

  /** Active category filters. */
  let activeCategories: Str[] = $state([]);

  /** Section open states (keyed by section id). */
  let sectionOpen: Record<Str, Bool> = $state(
    Object.fromEntries(ABOUT_SECTIONS.map((s: AboutSection): [Str, Bool] => [s.id, true as Bool])),
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
  const filteredSections: AboutSection[] = $derived.by((): AboutSection[] => {
    const q: Str = searchQuery.toLowerCase() as Str;
    let result: AboutSection[] = ABOUT_SECTIONS;

    /* Category filter */
    if (activeCategories.length > 0) {
      result = result.filter((s: AboutSection): boolean => activeCategories.includes(s.category));
    }

    /* Search filter */
    if (q.length > 0) {
      result = result.filter((s: AboutSection): boolean => {
        const titleMatch: Bool = s.title.toLowerCase().includes(q as string) as Bool;
        const contentMatch: Bool = s.content.toLowerCase().includes(q as string) as Bool;
        const itemMatch: Bool = (s.items?.some(
          (item: AboutItem): boolean =>
            item.label.toLowerCase().includes(q as string) ||
            item.value.toLowerCase().includes(q as string),
        ) ?? false) as Bool;
        return (titleMatch || contentMatch || itemMatch) as boolean;
      });
    }

    /* Sort */
    if (sortField) {
      const mul: Num = (sortDir === 'desc' ? -1 : 1) as Num;
      result = [...result].toSorted(
        (a: AboutSection, b: AboutSection): Num =>
          ((mul as number) * a.title.localeCompare(b.title)) as Num,
      );
    }
    /* Empty sortField keeps original array order */

    return result;
  });

  /** Total section count. */
  const sectionCount: Num = ABOUT_SECTIONS.length as Num;

  /** Whether any customization is active (for the reset button). */
  const isCustomized: Bool = $derived(
    (viewMode !== 'sections' ||
      sortField !== '' ||
      activeCategories.length > 0 ||
      !allSectionsExpanded) as Bool,
  );

  /** Current view mode display label. */
  const viewModeLabel: Str = $derived.by((): Str => {
    if (viewMode === 'sections') {
      return 'Sections' as Str;
    }
    if (viewMode === 'cards') {
      return 'Cards' as Str;
    }
    return 'Compact' as Str;
  });

  /** Current sort display label (field + direction arrow, or empty if default). */
  const sortLabel: Str = $derived.by((): Str => {
    if (!sortField) {
      return '' as Str;
    }
    const arrow: Str = (sortDir === 'asc' ? '\u2191' : '\u2193') as Str;
    return `Name ${arrow}` as Str;
  });

  /** Dynamic subtitle text. */
  const headerSubtitle: Str = $derived.by((): Str => {
    if (searchQuery) {
      return `${filteredSections.length} result${(filteredSections.length as number) === 1 ? '' : 's'} for "${searchQuery}"` as Str;
    }
    if (activeCategories.length > 0) {
      return `${filteredSections.length} sections in ${activeCategories.length} categor${activeCategories.length === 1 ? 'y' : 'ies'}` as Str;
    }
    return `${sectionCount} sections across ${ALL_CATEGORIES.length} categories` as Str;
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
      activeCategories = activeCategories.filter((c) => c !== cat);
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
   * Generate markdown representation of all visible sections.
   *
   * @returns Markdown string of the about page content
   */
  function generateMarkdown(): Str {
    const lines: Str[] = ['# About WebForge RPG' as Str, '' as Str];
    for (const section of filteredSections) {
      lines.push(`## ${section.title}` as Str);
      lines.push('' as Str);
      lines.push(section.content as Str);
      lines.push('' as Str);
      if (section.items) {
        for (const item of section.items) {
          lines.push(`- **${item.label}**: ${item.value}` as Str);
        }
        lines.push('' as Str);
      }
    }
    return lines.join('\n') as Str;
  }

  /**
   * Generate JSON representation of all visible sections.
   *
   * @returns JSON string of the about page content
   */
  function generateJson(): Str {
    const data: AboutSection[] = filteredSections.map((s: AboutSection) => ({
      id: s.id,
      title: s.title,
      category: s.category,
      content: s.content,
      ...(s.items ? { items: s.items } : {}),
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
      content = generateMarkdown();
      await clipboardCopy(content);
    } else if (formatId === 'copy-json') {
      content = generateJson();
      await clipboardCopy(content);
    } else if (formatId === 'download-markdown') {
      content = generateMarkdown();
      filename = 'about-webforge.md' as Str;
    } else if (formatId === 'download-json') {
      content = generateJson();
      filename = 'about-webforge.json' as Str;
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
        <Info class="size-6 text-primary" />
      </div>
      <div class="flex-1">
        <h1 class="text-2xl font-bold tracking-tight">About</h1>
        <p class="text-sm text-muted-foreground">{headerSubtitle}</p>
      </div>

      <!-- Page-level three-dot menu -->
      <DropdownMenu.Root>
        <Tooltip.Provider>
          <Tooltip.Root delayDuration={300}>
            <Tooltip.Trigger>
              {#snippet child({ props: tooltipProps }: { props: Record<string, unknown> })}
                <DropdownMenu.Trigger>
                  {#snippet child({ props: triggerProps }: { props: Record<string, unknown> })}
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
                      onSelect={(e: Event) => {
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
            onOpenChange={(open: boolean) => {
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
                { v: 'sections', l: 'Sections', d: 'Full page sections with collapsible content' },
                { v: 'cards', l: 'Cards', d: 'Info displayed in a card grid' },
                { v: 'compact', l: 'Compact', d: 'Dense list with item counts' },
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
            onOpenChange={(open: boolean) => {
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
            onSelect={(e: Event) => {
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
          placeholder="Search {sectionCount} sections..."
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
  <div class="flex flex-col gap-6 px-6 py-6 md:px-10 md:py-8">
    <!-- Empty state -->
    {#if filteredSections.length === 0}
      <div class="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
        <div class="flex size-16 items-center justify-center rounded-2xl bg-muted/50">
          <SearchX class="size-8 text-muted-foreground/40" />
        </div>
        <div class="space-y-1">
          <p class="text-sm font-medium text-muted-foreground">No sections match your search</p>
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

      <!-- Sections view (default) -->
    {:else if viewMode === 'sections'}
      <div class="space-y-6">
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
              {#if SECTION_ICONS[section.category]}
                {@const SectionIcon = SECTION_ICONS[section.category]}
                <SectionIcon class="size-5 shrink-0" />
              {/if}
              {section.title}
              <span
                class="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground"
              >
                {section.category}
              </span>
            </button>

            {#if sectionOpen[section.id]}
              <div transition:slide={{ duration: 200 }}>
                <div class="rounded-lg border bg-card p-4">
                  <p class="text-sm text-muted-foreground">{section.content}</p>
                  {#if section.items}
                    <div class="mt-4 space-y-2">
                      {#each section.items as item (item.label)}
                        <div class="flex items-baseline gap-2 text-sm">
                          <span class="font-medium">{item.label}</span>
                          <span class="flex-1 border-b border-dotted border-muted-foreground/20"
                          ></span>
                          {#if item.url}
                            <a
                              href={item.url}
                              class="text-primary hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {item.value}
                            </a>
                          {:else}
                            <span class="text-muted-foreground">{item.value}</span>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          </section>
        {/each}
      </div>

      <!-- Cards view -->
    {:else if viewMode === 'cards'}
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each filteredSections as section (section.id)}
          <div class="flex flex-col rounded-lg border bg-card p-4">
            <div class="mb-2 flex items-center gap-2">
              {#if SECTION_ICONS[section.category]}
                {@const CardIcon = SECTION_ICONS[section.category]}
                <CardIcon class="size-4 shrink-0" />
              {/if}
              <h3 class="text-sm font-semibold">{section.title}</h3>
              <span
                class="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {section.category}
              </span>
            </div>
            <p class="line-clamp-3 text-xs text-muted-foreground">{section.content}</p>
            {#if section.items}
              <div class="mt-3 border-t pt-2">
                {#each section.items.slice(0, 4) as item (item.label)}
                  <div class="flex items-center justify-between py-0.5 text-xs">
                    <span class="font-medium">{item.label}</span>
                    <span class="text-muted-foreground">{item.value}</span>
                  </div>
                {/each}
                {#if (section.items.length as number) > 4}
                  <p class="mt-1 text-[10px] text-muted-foreground/60">
                    +{(section.items.length as number) - 4} more items
                  </p>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <!-- Compact view -->
    {:else if viewMode === 'compact'}
      <div class="rounded-lg border bg-card">
        {#each filteredSections as section, i (section.id)}
          <div
            class={cn(
              'flex items-center gap-3 px-4 py-2.5 text-sm',
              i < (filteredSections.length as number) - 1 && 'border-b',
            )}
          >
            <span class="font-medium">{section.title}</span>
            <span
              class="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {section.category}
            </span>
            {#if section.items}
              <span class="ml-auto text-xs text-muted-foreground">
                {section.items.length} items
              </span>
            {:else}
              <span class="ml-auto text-xs text-muted-foreground/40">text</span>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
