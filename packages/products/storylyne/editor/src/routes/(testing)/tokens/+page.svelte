<script lang="ts">
  /**
   * Design Token Viewer page for the Lens documentation system.
   *
   * Displays all CSS custom properties extracted from app.css,
   * grouped by category with live color swatches, search filtering,
   * category chip filters, theme selection, and export options.
   *
   * Layout and UX patterns match the Icons gallery page.
   */
  import type { Bool, Num, Str } from '@/schemas/common';
  import {
    extractTokens,
    groupTokens,
    getThemeNames,
    type ThemeTokenSet,
    type TokenGroup,
  } from '@/ui/lens/extract-tokens.js';
  import Badge from '@/ui/badge/badge.svelte';
  import CodeBlock from '@/ui/code-block/CodeBlock.svelte';
  import CopyButton from '@/ui/copy-button/CopyButton.svelte';
  import Input from '@/ui/input/input.svelte';
  import * as DropdownMenu from '@/ui/dropdown-menu/index.js';
  import * as Tooltip from '@/ui/tooltip/index.js';
  import { cn } from '@/ui/utils.js';
  import { clipboardCopy } from '@/ui/lens/clipboard.js';
  import { slide, fade } from 'svelte/transition';
  import Palette from '@lucide/svelte/icons/palette';
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
  import Tag from '@lucide/svelte/icons/tag';
  import Paintbrush from '@lucide/svelte/icons/paintbrush';

  /* ------------------------------------------------------------------ */
  /*  Load app.css raw source and extract tokens                        */
  /* ------------------------------------------------------------------ */

  const cssRaw: Str = import.meta.glob('/src/app.css', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as unknown as Str;

  /**
   * Get the raw CSS string from the glob result.
   * Glob returns Record<path, content> — extract the first (only) value.
   *
   * @returns Raw CSS source string
   */
  function getCssSource(): Str {
    if (typeof cssRaw === 'string') return cssRaw;
    const entries: Array<[Str, unknown]> = Object.entries(cssRaw as Record<Str, unknown>);
    const [first]: Array<[Str, unknown]> = entries;
    return (first ? String(first[1]) : '') as Str;
  }

  const cssSource: Str = getCssSource();
  const allSets: ThemeTokenSet[] = extractTokens(cssSource);
  const themeNames: Str[] = getThemeNames(allSets);

  /* ------------------------------------------------------------------ */
  /*  Theme preset data                                                  */
  /* ------------------------------------------------------------------ */

  /** Theme preset option with a color dot for visual identification. */
  type ThemePreset = { value: Str; label: Str; dot: Str; group: Str };

  /** All theme presets grouped by section. */
  const THEME_PRESETS: ThemePreset[] = $derived.by((): ThemePreset[] => {
    const presets: ThemePreset[] = [
      { value: ':root', label: 'Light', dot: 'oklch(0.97 0 0)', group: 'Defaults' },
      { value: '.dark', label: 'Dark', dot: 'oklch(0.15 0 0)', group: 'Defaults' },
    ];
    for (const name of themeNames) {
      const displayName: Str = `${name.charAt(0).toUpperCase()}${name.slice(1)}` as Str;
      // Find the primary color from the theme's token set to use as the dot
      const themeSet: ThemeTokenSet | undefined = allSets.find(
        (s: ThemeTokenSet): boolean => s.selector === name,
      );
      const primaryToken = themeSet?.tokens.find((t) => t.name === 'primary');
      const dot: Str = primaryToken?.value ?? 'oklch(0.5 0.15 260)';
      presets.push(
        { value: name, label: `${displayName} (Light)`, dot, group: displayName },
        { value: `${name}.dark`, label: `${displayName} (Dark)`, dot, group: displayName },
      );
    }
    return presets;
  });

  /** Unique group names for section headers. */
  const themeGroups: Str[] = $derived([
    ...new Set(THEME_PRESETS.map((p: ThemePreset): Str => p.group)),
  ]);

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
      id: 'copy-css' as Str,
      label: 'Copy as CSS' as Str,
      icon: ClipboardCopy,
      category: 'Clipboard' as Str,
      description: 'CSS custom properties' as Str,
      ext: '' as Str,
    },
    {
      id: 'copy-json' as Str,
      label: 'Copy as JSON' as Str,
      icon: ClipboardCopy,
      category: 'Clipboard' as Str,
      description: 'Token name/value pairs' as Str,
      ext: '' as Str,
    },
    {
      id: 'copy-markdown' as Str,
      label: 'Copy as Markdown' as Str,
      icon: FileText,
      category: 'Clipboard' as Str,
      description: 'Formatted table for docs' as Str,
      ext: '' as Str,
    },
    {
      id: 'download-css' as Str,
      label: 'Download CSS' as Str,
      icon: DownloadIcon,
      category: 'File' as Str,
      description: 'Custom properties file' as Str,
      ext: '.css' as Str,
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

  /* ------------------------------------------------------------------ */
  /*  State                                                             */
  /* ------------------------------------------------------------------ */

  /** Currently selected theme context for viewing. */
  let selectedTheme: Str = $state(':root');

  /** Theme search query inside the submenu. */
  let themeSearchQuery: Str = $state('');

  /** Token search query. */
  let searchQuery: Str = $state('' as Str);

  /** Active category filters. */
  let activeCategories: Str[] = $state([]);

  /** Section open states. */
  let sectionOpen: Record<Str, Bool> = $state({
    color: true,
    'sidebar-color': true,
    radius: true,
    typography: true,
    animation: true,
  });

  /** Export feedback (shows check icon briefly). */
  let exportFeedback: Str = $state('' as Str);

  /** Two-step confirm gate for reset. */
  let confirmingReset: Bool = $state(false as Bool);

  /** Timer ID for reset confirm auto-dismiss. */
  let confirmResetTimer: ReturnType<typeof setTimeout> | undefined;

  /* ------------------------------------------------------------------ */
  /*  Derived                                                           */
  /* ------------------------------------------------------------------ */

  /** Token set for the currently selected theme. */
  const currentSet: ThemeTokenSet | undefined = $derived(
    allSets.find((s: ThemeTokenSet): boolean => s.selector === selectedTheme),
  );

  /** Grouped tokens for the current theme. */
  const groups: TokenGroup[] = $derived(currentSet ? groupTokens(currentSet.tokens) : []);

  /** Total token count. */
  const tokenCount: Num = $derived(currentSet?.tokens.length ?? 0);

  /** All available category names from token groups. */
  const allCategoryNames: Str[] = $derived(groups.map((g) => g.category));

  /** Label for the currently selected theme. */
  const selectedLabel: Str = $derived(
    THEME_PRESETS.find((p: ThemePreset): boolean => p.value === selectedTheme)?.label ?? 'Light',
  );

  /** Theme presets filtered by search query. */
  const filteredPresets: ThemePreset[] = $derived(
    themeSearchQuery.length === 0
      ? THEME_PRESETS
      : THEME_PRESETS.filter((p: ThemePreset): boolean =>
          p.label.toLowerCase().includes(themeSearchQuery.toLowerCase()),
        ),
  );

  /** Filtered group names (only groups that have matching presets). */
  const filteredThemeGroups: Str[] = $derived(
    themeGroups.filter((g: Str): boolean =>
      filteredPresets.some((p: ThemePreset): boolean => p.group === g),
    ),
  );

  /** Token groups filtered by search query and active categories. */
  const filteredGroups: TokenGroup[] = $derived.by((): TokenGroup[] => {
    const q: Str = searchQuery.toLowerCase() as Str;
    let result: TokenGroup[] = groups;

    /* Category filter */
    if (activeCategories.length > 0) {
      result = result.filter((g) => activeCategories.includes(g.category));
    }

    /* Search filter */
    if (q.length > 0) {
      result = result
        .map((g) => ({
          ...g,
          tokens: g.tokens.filter(
            (t) =>
              t.name.toLowerCase().includes(q) ||
              t.variable.toLowerCase().includes(q) ||
              t.value.toLowerCase().includes(q) ||
              (t.tailwindClass && t.tailwindClass.toLowerCase().includes(q)),
          ),
        }))
        .filter((g) => g.tokens.length > 0);
    }

    return result;
  });

  /** Total filtered token count. */
  const filteredTokenCount: Num = $derived(
    filteredGroups.reduce((sum, g) => sum + g.tokens.length, 0) as Num,
  );

  /** Whether any customization is active (for the reset button). */
  const isCustomized: Bool = $derived(
    (selectedTheme !== ':root' || activeCategories.length > 0) as Bool,
  );

  /** Dynamic subtitle text. */
  const headerSubtitle: Str = $derived.by((): Str => {
    if (searchQuery) {
      return `${filteredTokenCount} result${(filteredTokenCount as number) === 1 ? '' : 's'} for "${searchQuery}"` as Str;
    }
    if (activeCategories.length > 0) {
      return `${filteredTokenCount} tokens in ${activeCategories.length} categor${activeCategories.length === 1 ? 'y' : 'ies'}` as Str;
    }
    return `${tokenCount} tokens across ${groups.length} categories · ${selectedLabel} theme` as Str;
  });

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Check if a token value is a color (oklch or other color format).
   *
   * @param value - The CSS value string
   * @returns Whether the value represents a color
   */
  function isColorValue(value: Str): boolean {
    return (
      value.startsWith('oklch(') ||
      value.startsWith('rgb') ||
      value.startsWith('hsl') ||
      value.startsWith('#')
    );
  }

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
    selectedTheme = ':root';
    activeCategories = [];
    searchQuery = '' as Str;
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
   * Handle page-level export action.
   *
   * @param formatId - Export format identifier
   */
  async function handleExport(formatId: Str): Promise<void> {
    const tokens = filteredGroups.flatMap((g) => g.tokens);
    let content: Str = '' as Str;
    let filename: Str = '' as Str;

    if (formatId === 'copy-css') {
      const lines: Str[] = tokens.map((t) => `  ${t.variable}: ${t.value};` as Str);
      content = `:root {\n${lines.join('\n')}\n}` as Str;
      await clipboardCopy(content);
    } else if (formatId === 'copy-json') {
      const obj: Record<Str, Str> = Object.fromEntries(tokens.map((t) => [t.name, t.value]));
      content = JSON.stringify(obj, null, 2) as Str;
      await clipboardCopy(content);
    } else if (formatId === 'copy-markdown') {
      const rows: Str[] = tokens.map(
        (t) =>
          `| \`${t.variable}\` | \`${t.value}\` | ${t.tailwindClass ? `\`${t.tailwindClass}\`` : '—'} |` as Str,
      );
      content =
        `| Variable | Value | Tailwind |\n|----------|-------|----------|\n${rows.join('\n')}` as Str;
      await clipboardCopy(content);
    } else if (formatId === 'download-css') {
      const lines: Str[] = tokens.map((t) => `  ${t.variable}: ${t.value};` as Str);
      content = `/* Design Tokens — ${selectedLabel} */\n:root {\n${lines.join('\n')}\n}\n` as Str;
      filename = 'design-tokens.css' as Str;
    } else if (formatId === 'download-json') {
      const obj: Record<Str, Str> = Object.fromEntries(tokens.map((t) => [t.name, t.value]));
      content = JSON.stringify(obj, null, 2) as Str;
      filename = 'design-tokens.json' as Str;
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
        <Palette class="size-6 text-primary" />
      </div>
      <div class="flex-1">
        <h1 class="text-2xl font-bold tracking-tight">Design Tokens</h1>
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
              {#each PAGE_EXPORT_CATEGORIES as category (category)}
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
                {#each PAGE_EXPORT_ITEMS.filter((p) => p.category === category) as item (item.id)}
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
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          <DropdownMenu.Separator />

          <!-- Theme submenu -->
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>
              <Paintbrush class="mr-2 size-4" />
              Theme
              {#if selectedTheme !== ':root'}
                <Badge
                  variant="secondary"
                  class="ml-auto h-5 rounded px-1.5 text-[10px] leading-none"
                >
                  {selectedLabel}
                </Badge>
              {/if}
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent class="w-56 p-0">
              <!-- Theme search -->
              <div class="border-b px-2 py-1.5">
                <div class="flex items-center gap-2 rounded-md bg-muted/50 px-2">
                  <SearchIcon class="size-3 shrink-0 text-muted-foreground/60" />
                  <input
                    type="text"
                    placeholder="Search themes..."
                    class="h-7 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
                    bind:value={themeSearchQuery}
                  />
                  {#if themeSearchQuery.length > 0}
                    <button
                      type="button"
                      class="shrink-0 text-muted-foreground/60 hover:text-foreground"
                      onclick={() => {
                        themeSearchQuery = '' as Str;
                      }}
                    >
                      <X class="size-3" />
                    </button>
                  {/if}
                </div>
              </div>
              <!-- Theme list -->
              <div class="max-h-64 overflow-y-auto px-1 py-1" use:lockHeight>
                {#if filteredThemeGroups.length === 0}
                  <div
                    class="flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
                  >
                    <SearchX class="size-5" />
                    <div class="flex flex-col items-center gap-0.5">
                      <p class="text-xs font-medium">No themes found</p>
                      <p class="text-[11px]">Try a different search term</p>
                    </div>
                  </div>
                {:else}
                  {#each filteredThemeGroups as group (group)}
                    <div class="px-2 py-1.5 text-xs font-medium text-muted-foreground">{group}</div>
                    {#each filteredPresets.filter((p) => p.group === group) as preset (preset.value)}
                      <DropdownMenu.Item
                        onSelect={(e) => {
                          e.preventDefault();
                          selectedTheme = preset.value;
                        }}
                      >
                        <Check
                          class={cn(
                            'mr-1 size-4 shrink-0',
                            selectedTheme !== preset.value && 'opacity-0',
                          )}
                        />
                        {#if preset.dot}
                          <span
                            class="inline-block size-3.5 shrink-0 rounded-full shadow-sm ring-1 ring-black/10"
                            style="background-color: {preset.dot}"
                          ></span>
                        {/if}
                        <span class="flex-1">{preset.label}</span>
                      </DropdownMenu.Item>
                    {/each}
                  {/each}
                {/if}
              </div>
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
          placeholder="Search {tokenCount} tokens..."
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
      {#each allCategoryNames as cat (cat)}
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
    <!-- Token groups -->
    {#if filteredGroups.length === 0}
      <div class="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
        <div class="flex size-16 items-center justify-center rounded-2xl bg-muted/50">
          <SearchX class="size-8 text-muted-foreground/40" />
        </div>
        <div class="space-y-1">
          <p class="text-sm font-medium text-muted-foreground">No tokens found</p>
          <p class="text-xs text-muted-foreground/60">
            {#if searchQuery}
              No tokens match "{searchQuery}"
            {:else}
              No tokens in the selected categories
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
      <div class="space-y-10">
        {#each filteredGroups as group (group.category)}
          <section id={group.category} class="scroll-mt-60">
            <button
              type="button"
              onclick={() => toggleSection(group.category)}
              class="mb-3 flex w-full items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80"
            >
              <ChevronRight
                class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen[
                  group.category
                ]
                  ? 'rotate-90'
                  : ''}"
              />
              <Palette class="size-5" />
              {group.label}
              <Badge variant="outline" class="ml-1 text-xs">{group.tokens.length}</Badge>
            </button>

            {#if sectionOpen[group.category]}
              <div transition:slide={{ duration: 200 }}>
                <div class="rounded-lg border bg-card">
                  <table class="w-full table-fixed text-sm">
                    <thead>
                      <tr class="border-b text-left text-xs text-muted-foreground">
                        {#if group.category === 'color' || group.category === 'sidebar-color'}
                          <th class="w-12 px-4 py-2"></th>
                        {/if}
                        <th class="px-4 py-2">Variable</th>
                        <th class="px-4 py-2">Value</th>
                        <th class="px-4 py-2">Tailwind</th>
                        <th class="w-12 px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each group.tokens as token (token.name)}
                        <tr class="border-b last:border-b-0 transition-colors hover:bg-muted/50">
                          {#if group.category === 'color' || group.category === 'sidebar-color'}
                            <td class="px-4 py-2.5">
                              {#if isColorValue(token.value)}
                                <Tooltip.Root delayDuration={200}>
                                  <Tooltip.Trigger>
                                    {#snippet child({ props })}
                                      <div
                                        class="size-6 rounded-md border shadow-sm"
                                        style="background-color: {token.value};"
                                        {...props}
                                      ></div>
                                    {/snippet}
                                  </Tooltip.Trigger>
                                  <Tooltip.Content>
                                    <span class="font-mono text-xs">{token.value}</span>
                                  </Tooltip.Content>
                                </Tooltip.Root>
                              {/if}
                            </td>
                          {/if}
                          <td class="px-4 py-2.5">
                            <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                              >{token.variable}</code
                            >
                          </td>
                          <td class="px-4 py-2.5">
                            <span class="font-mono text-xs text-muted-foreground"
                              >{token.value}</span
                            >
                          </td>
                          <td class="px-4 py-2.5">
                            {#if token.tailwindClass}
                              <code
                                class="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary"
                                >{token.tailwindClass}</code
                              >
                            {:else}
                              <span class="text-xs text-muted-foreground/40">—</span>
                            {/if}
                          </td>
                          <td class="px-4 py-2.5">
                            <CopyButton
                              text={`var(${token.variable})`}
                              label={`Copy var(${token.variable})`}
                            />
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </div>
            {/if}
          </section>
        {/each}

        <!-- Raw CSS source -->
        <section id="source" class="scroll-mt-60">
          <button
            type="button"
            onclick={() => toggleSection('source')}
            class="mb-3 flex w-full items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80"
          >
            <ChevronRight
              class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen.source
                ? 'rotate-90'
                : ''}"
            />
            Source (app.css)
          </button>
          {#if sectionOpen.source}
            <div transition:slide={{ duration: 200 }}>
              <div class="rounded-lg border bg-card p-4">
                <CodeBlock code={cssSource} lang="css" />
              </div>
            </div>
          {/if}
        </section>
      </div>
    {/if}
  </div>
</div>
