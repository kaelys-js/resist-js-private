<script lang="ts">
  /**
   * Styling Reference page for the Lens documentation system.
   *
   * Displays theming, color, typography, layout, and customization
   * guidelines with search filtering, category chip filters,
   * view modes, sort options, and export actions.
   *
   * Layout and UX patterns match the Tokens gallery page.
   *
   * @module
   */
  import type { Bool, Num, Str } from '@/schemas/common';
  import Input from '@/ui/input/input.svelte';
  import * as DropdownMenu from '@/ui/dropdown-menu/index.js';
  import * as Tooltip from '@/ui/tooltip/index.js';
  import { cn } from '@/ui/utils.js';
  import { clipboardCopy } from '@/ui/lens/clipboard.js';
  import { slide, fade } from 'svelte/transition';
  import Badge from '@/ui/badge/badge.svelte';
  import Paintbrush from '@lucide/svelte/icons/paintbrush';
  import Check from '@lucide/svelte/icons/check';
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
  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
  import ChevronsDownUp from '@lucide/svelte/icons/chevrons-down-up';
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import Tag from '@lucide/svelte/icons/tag';

  /* ------------------------------------------------------------------ */
  /*  Data types                                                         */
  /* ------------------------------------------------------------------ */

  /** A single item within a styling section. */
  type StylingItem = {
    /** Display label. */
    label: Str;
    /** Item description. */
    description: Str;
    /** Optional usage example. */
    example?: Str;
  };

  /** A styling documentation section. */
  type StylingSection = {
    /** Unique section identifier. */
    id: Str;
    /** Section heading. */
    title: Str;
    /** Category for filtering. */
    category: Str;
    /** Section description text. */
    description: Str;
    /** Optional list of items within the section. */
    items?: StylingItem[];
    /** Optional code example block. */
    codeExample?: Str;
  };

  /* ------------------------------------------------------------------ */
  /*  Static data                                                        */
  /* ------------------------------------------------------------------ */

  /** All styling documentation sections. */
  const SECTIONS: StylingSection[] = [
    {
      id: 'theme-system' as Str,
      title: 'Theme System' as Str,
      category: 'Theming' as Str,
      description:
        'WebForge uses CSS custom properties with data-theme attributes for theming. Themes are defined in app.css and applied via the data-theme attribute on any container element.' as Str,
      items: [
        {
          label: 'data-theme attribute' as Str,
          description: 'Set data-theme on any element to scope a theme' as Str,
        },
        {
          label: 'CSS Custom Properties' as Str,
          description:
            'All design tokens are CSS variables (--background, --foreground, etc.)' as Str,
        },
        {
          label: 'Theme Inheritance' as Str,
          description: "Child elements inherit the closest ancestor's theme" as Str,
        },
      ],
      codeExample: '<div data-theme="midnight">...</div>' as Str,
    },
    {
      id: 'available-themes' as Str,
      title: 'Available Themes' as Str,
      category: 'Theming' as Str,
      description: '12 built-in theme presets covering cool, warm, and nature palettes.' as Str,
      items: [
        { label: 'Default' as Str, description: 'System default with neutral colors' as Str },
        { label: 'Midnight' as Str, description: 'Deep navy with blue accents' as Str },
        { label: 'Ocean' as Str, description: 'Cool blue-green palette' as Str },
        { label: 'Slate' as Str, description: 'Neutral gray tones' as Str },
        { label: 'Warm' as Str, description: 'Warm amber undertones' as Str },
        { label: 'Sunset' as Str, description: 'Orange and coral accents' as Str },
        { label: 'Copper' as Str, description: 'Rich metallic warmth' as Str },
        { label: 'Rose' as Str, description: 'Soft pink and rose tones' as Str },
        { label: 'Lavender' as Str, description: 'Light purple palette' as Str },
        { label: 'Amethyst' as Str, description: 'Deep purple accents' as Str },
        { label: 'Forest' as Str, description: 'Natural green tones' as Str },
        { label: 'Aurora' as Str, description: 'Northern lights inspired' as Str },
      ],
    },
    {
      id: 'dark-mode' as Str,
      title: 'Dark Mode' as Str,
      category: 'Colors' as Str,
      description: 'Toggle between light and dark color schemes using the .dark CSS class.' as Str,
      items: [
        {
          label: '.dark class' as Str,
          description: 'Add to any element to activate dark mode within that scope' as Str,
        },
        {
          label: 'lens-force-light' as Str,
          description: 'Force light mode regardless of system preference' as Str,
        },
        {
          label: 'System preference' as Str,
          description: 'Automatically follows prefers-color-scheme media query' as Str,
        },
        {
          label: 'Per-section theming' as Str,
          description: 'Combine data-theme with .dark for scoped dark themes' as Str,
        },
      ],
      codeExample: '<div class="dark">Dark mode content</div>' as Str,
    },
    {
      id: 'color-system' as Str,
      title: 'Color System' as Str,
      category: 'Colors' as Str,
      description:
        'Colors use the oklch() color space for perceptually uniform gradients and wide-gamut support.' as Str,
      items: [
        {
          label: 'oklch() function' as Str,
          description: 'Lightness, chroma, and hue for perceptually uniform colors' as Str,
        },
        {
          label: 'Semantic tokens' as Str,
          description:
            'background, foreground, primary, secondary, muted, accent, destructive' as Str,
        },
        {
          label: 'Opacity modifiers' as Str,
          description: 'Use /50, /30 etc. for transparent variants' as Str,
        },
        {
          label: 'Foreground convention' as Str,
          description: 'Each color has a paired -foreground for text on that background' as Str,
        },
      ],
    },
    {
      id: 'typography' as Str,
      title: 'Typography' as Str,
      category: 'Typography' as Str,
      description: 'Font stack and typographic scale for consistent text rendering.' as Str,
      items: [
        {
          label: 'Font family' as Str,
          description: 'System font stack with Geist Sans as primary' as Str,
        },
        {
          label: 'Heading scale' as Str,
          description: 'text-xs through text-4xl with tracking adjustments' as Str,
        },
        {
          label: 'Font weights' as Str,
          description: 'normal (400), medium (500), semibold (600), bold (700)' as Str,
        },
        {
          label: 'Line heights' as Str,
          description: 'Tight (1.25), normal (1.5), relaxed (1.75)' as Str,
        },
      ],
    },
    {
      id: 'spacing-layout' as Str,
      title: 'Spacing & Layout' as Str,
      category: 'Layout' as Str,
      description: 'Consistent spacing scale based on 4px increments.' as Str,
      items: [
        {
          label: 'Spacing scale' as Str,
          description:
            '0.5 (2px), 1 (4px), 2 (8px), 3 (12px), 4 (16px), 6 (24px), 8 (32px), 10 (40px)' as Str,
        },
        {
          label: 'Border radius' as Str,
          description:
            'sm (calc(var(--radius) - 4px)), md (calc(var(--radius) - 2px)), lg (var(--radius))' as Str,
        },
        {
          label: 'Container widths' as Str,
          description: 'max-w-sm, max-w-md, max-w-lg, max-w-xl, max-w-2xl' as Str,
        },
      ],
    },
    {
      id: 'component-customization' as Str,
      title: 'Component Customization' as Str,
      category: 'Customization' as Str,
      description:
        'Override component styles using Tailwind utility classes and CSS custom properties.' as Str,
      items: [
        {
          label: 'cn() utility' as Str,
          description: 'Merge Tailwind classes with conflict resolution' as Str,
        },
        {
          label: 'CSS variable overrides' as Str,
          description: 'Set --primary, --radius etc. on parent elements' as Str,
        },
        {
          label: 'Slot-based styling' as Str,
          description: 'Components expose class props for internal element styling' as Str,
        },
        {
          label: 'Tailwind @apply' as Str,
          description: 'Use @apply in app.css for global component overrides' as Str,
        },
      ],
    },
    {
      id: 'animation-transitions' as Str,
      title: 'Animation & Transitions' as Str,
      category: 'Customization' as Str,
      description: 'Built-in animation utilities and transition patterns.' as Str,
      items: [
        {
          label: 'Svelte transitions' as Str,
          description: 'slide, fade, fly for component mount/unmount' as Str,
        },
        {
          label: 'CSS transitions' as Str,
          description: 'transition-colors, transition-opacity for hover/focus states' as Str,
        },
        {
          label: 'prefers-reduced-motion' as Str,
          description: 'Animations respect user motion preferences' as Str,
        },
        {
          label: 'Custom keyframes' as Str,
          description: 'Define in app.css, use via Tailwind animate-* classes' as Str,
        },
      ],
    },
  ];

  /** All category names derived from sections. */
  const ALL_CATEGORIES: Str[] = [
    ...new Set(SECTIONS.map((s: StylingSection): Str => s.category)),
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
      label: 'Copy Markdown' as Str,
      icon: ClipboardCopy,
      category: 'Clipboard' as Str,
      description: 'Formatted sections for docs' as Str,
      ext: '' as Str,
    },
    {
      id: 'copy-json' as Str,
      label: 'Copy JSON' as Str,
      icon: ClipboardCopy,
      category: 'Clipboard' as Str,
      description: 'Structured styling data' as Str,
      ext: '' as Str,
    },
    {
      id: 'download-md' as Str,
      label: 'Download .md' as Str,
      icon: DownloadIcon,
      category: 'File' as Str,
      description: 'Markdown reference file' as Str,
      ext: '.md' as Str,
    },
    {
      id: 'download-json' as Str,
      label: 'Download .json' as Str,
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

  /** Section open states (for sections view). */
  let sectionOpen: Record<Str, Bool> = $state(
    Object.fromEntries(SECTIONS.map((s: StylingSection) => [s.id, true as Bool])),
  );

  /** Export feedback (shows check icon briefly). */
  let exportFeedback: Str = $state('' as Str);

  /** View mode for display. */
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

  /** Total section count. */
  const sectionCount: Num = $derived(SECTIONS.length as Num);

  /** Sections filtered by search query, category, and sort. */
  const filteredSections: StylingSection[] = $derived.by((): StylingSection[] => {
    const q: Str = searchQuery.toLowerCase() as Str;
    let result: StylingSection[] = SECTIONS;

    /* Category filter */
    if (activeCategories.length > 0) {
      result = result.filter((s: StylingSection): boolean => activeCategories.includes(s.category));
    }

    /* Search filter */
    if (q.length > 0) {
      result = result.filter((s: StylingSection): boolean => {
        const titleMatch: Bool = s.title.toLowerCase().includes(q as string) as Bool;
        const descMatch: Bool = s.description.toLowerCase().includes(q as string) as Bool;
        const itemMatch: Bool = (s.items?.some(
          (item: StylingItem): boolean =>
            item.label.toLowerCase().includes(q as string) ||
            item.description.toLowerCase().includes(q as string),
        ) ?? false) as Bool;

        return (titleMatch || descMatch || itemMatch) as boolean;
      });
    }

    /* Sort */
    if (sortField) {
      const mul: Num = (sortDir === 'desc' ? -1 : 1) as Num;
      result = [...result].toSorted(
        (a: StylingSection, b: StylingSection): Num =>
          ((mul as number) * a.title.localeCompare(b.title)) as Num,
      );
    }
    /* Empty sortField keeps original array order */

    return result;
  });

  /** Total filtered section count. */
  const filteredSectionCount: Num = $derived(filteredSections.length as Num);

  /** Whether any customization is active (for the reset button). */
  const isCustomized: Bool = $derived(
    (activeCategories.length > 0 ||
      viewMode !== 'sections' ||
      sortField !== '' ||
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
      return `${filteredSectionCount} result${(filteredSectionCount as number) === 1 ? '' : 's'} for "${searchQuery}"` as Str;
    }
    if (activeCategories.length > 0) {
      return `${filteredSectionCount} section${(filteredSectionCount as number) === 1 ? '' : 's'} in ${activeCategories.length} categor${activeCategories.length === 1 ? 'y' : 'ies'}` as Str;
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
   * Generate markdown content from filtered sections.
   *
   * @returns Markdown string representation of sections
   */
  function generateMarkdown(): Str {
    const lines: Str[] = [];

    for (const section of filteredSections) {
      lines.push(`## ${section.title}` as Str);
      lines.push('' as Str);
      lines.push(section.description as Str);
      lines.push('' as Str);
      if (section.items) {
        for (const item of section.items) {
          lines.push(`- **${item.label}** — ${item.description}` as Str);
        }
        lines.push('' as Str);
      }
      if (section.codeExample) {
        lines.push('```html' as Str);
        lines.push(section.codeExample as Str);
        lines.push('```' as Str);
        lines.push('' as Str);
      }
    }
    return lines.join('\n') as Str;
  }

  /**
   * Generate JSON content from filtered sections.
   *
   * @returns JSON string representation of sections
   */
  function generateJson(): Str {
    const data = filteredSections.map((s: StylingSection) => ({
      id: s.id,
      title: s.title,
      category: s.category,
      description: s.description,
      items: s.items ?? [],
      codeExample: s.codeExample ?? null,
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
    } else if (formatId === 'download-md') {
      content = generateMarkdown();
      filename = 'styling-reference.md' as Str;
    } else if (formatId === 'download-json') {
      content = generateJson();
      filename = 'styling-reference.json' as Str;
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
        <Paintbrush class="size-6 text-primary" />
      </div>
      <div class="flex-1">
        <h1 class="text-2xl font-bold tracking-tight">Styling</h1>
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
                { v: 'sections', l: 'Sections', d: 'Collapsible cards with items' },
                { v: 'cards', l: 'Cards', d: 'Grid cards per section' },
                { v: 'compact', l: 'Compact', d: 'Dense list of section titles' },
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
      <!-- Sections view — collapsible cards with items as description lists -->
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
              <Paintbrush class="size-5" />
              {section.title}
              <Badge variant="outline" class="ml-1 text-xs">{section.category}</Badge>
              {#if section.items}
                <Badge variant="secondary" class="text-xs"
                  >{section.items.length} item{section.items.length === 1 ? '' : 's'}</Badge
                >
              {/if}
            </button>

            {#if sectionOpen[section.id]}
              <div transition:slide={{ duration: 200 }}>
                <div class="rounded-lg border bg-card p-5">
                  <p class="mb-4 text-sm text-muted-foreground">{section.description}</p>

                  {#if section.items && section.items.length > 0}
                    <dl class="space-y-3">
                      {#each section.items as item (item.label)}
                        <div class="flex flex-col gap-0.5">
                          <dt class="text-sm font-medium">{item.label}</dt>
                          <dd class="text-sm text-muted-foreground">{item.description}</dd>
                          {#if item.example}
                            <dd>
                              <code
                                class="mt-0.5 inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                                >{item.example}</code
                              >
                            </dd>
                          {/if}
                        </div>
                      {/each}
                    </dl>
                  {/if}

                  {#if section.codeExample}
                    <div class="mt-4 rounded-md border bg-muted/50 p-3">
                      <code class="font-mono text-xs text-foreground">{section.codeExample}</code>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          </section>
        {/each}
      </div>
    {:else if viewMode === 'cards'}
      <!-- Cards view — grid cards per section with truncated content -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each filteredSections as section (section.id)}
          <div
            class="flex flex-col rounded-lg border bg-card p-4 transition-colors hover:border-primary/30"
          >
            <div class="mb-2 flex items-center gap-2">
              <Paintbrush class="size-4 text-primary" />
              <h3 class="text-sm font-semibold">{section.title}</h3>
            </div>
            <Badge variant="outline" class="mb-2 w-fit text-[10px]">{section.category}</Badge>
            <p class="line-clamp-2 flex-1 text-xs text-muted-foreground">{section.description}</p>
            {#if section.items}
              <div class="mt-3 flex flex-wrap gap-1">
                {#each section.items.slice(0, 3) as item (item.label)}
                  <span class="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                    >{item.label}</span
                  >
                {/each}
                {#if section.items.length > 3}
                  <span class="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                    >+{section.items.length - 3} more</span
                  >
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <!-- Compact view — dense list of section titles -->
      <div class="rounded-lg border bg-card">
        {#each filteredSections as section, si (section.id)}
          {#if si > 0}
            <div class="border-t"></div>
          {/if}
          <div class="flex items-center gap-3 px-4 py-2.5">
            <Paintbrush class="size-4 shrink-0 text-muted-foreground" />
            <span class="min-w-0 flex-1 truncate text-sm font-medium">{section.title}</span>
            <Badge variant="outline" class="shrink-0 text-[10px]">{section.category}</Badge>
            {#if section.items}
              <span class="shrink-0 text-xs text-muted-foreground"
                >{section.items.length} item{section.items.length === 1 ? '' : 's'}</span
              >
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
