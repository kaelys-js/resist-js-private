<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema, BoolSchema, NumSchema } from '@/schemas/common';
  import { LensMetaSchema, type LensMeta } from '../lens/types.js';

  /** Schema for the LensHeader component props. */
  export const LensHeaderPropsSchema = v.strictObject({
    /** Component directory name (kebab-case). @values button, dialog, sidebar */
    name: StrSchema,
    /** Component description extracted from source JSDoc. @values A clickable button, An overlay dialog, A navigation sidebar */
    description: v.optional(StrSchema),
    /** Validated lens metadata for category/tag badges. @values {category: "display", tags: ["interactive"], description: "A clickable button"} */
    meta: v.optional(v.nullable(LensMetaSchema)),
    /** Import path shown in the copy-import chip. @values @/ui/button, @/ui/dialog, @/ui/sidebar */
    importPath: v.optional(StrSchema),
    /** Whether the component has renderable variants. @values true, false */
    hasVariants: v.optional(BoolSchema),
    /** Whether the component has hand-written examples. @values true, false */
    hasExamples: v.optional(BoolSchema),
    /** Whether the component has raw source available. @values true, false */
    hasSource: v.optional(BoolSchema),
    /** Whether the component has any import dependencies. @values true, false */
    hasDeps: v.optional(BoolSchema),
    /** Whether the component has custom docs.md documentation. @values true, false */
    hasDocs: v.optional(BoolSchema),
    /** Whether the component has changelog entries. @values true, false */
    hasChangelog: v.optional(BoolSchema),
    /** Number of props defined (shown as badge on "Go to Props"). @values 0, 5, 20 */
    propCount: v.optional(NumSchema),
    /** Number of variant cards rendered (shown as badge on "Go to Variants"). @values 0, 3, 12 */
    variantCount: v.optional(NumSchema),
    /** Number of example cards rendered (shown as badge on "Go to Examples"). @values 0, 2, 8 */
    exampleCount: v.optional(NumSchema),
    /** Number of import dependencies (shown as badge on "Go to Dependencies"). @values 0, 3, 12 */
    depCount: v.optional(NumSchema),
    /** Number of changelog entries (shown as badge on "Go to Changelog"). @values 0, 4, 15 */
    changelogCount: v.optional(NumSchema),
    /** Previous component name for sequential navigation (kebab-case). @values button, dialog, sidebar */
    prevComponent: v.optional(v.nullable(StrSchema)),
    /** Next component name for sequential navigation (kebab-case). @values button, dialog, sidebar */
    nextComponent: v.optional(v.nullable(StrSchema)),
    /** Whether this component is pinned in the sidebar. @values true, false */
    isPinned: v.optional(BoolSchema),
    /** Callback fired when the pin/unpin button is clicked. @values () => void */
    onTogglePin: v.optional(
      v.custom<() => void>((val: unknown): boolean => typeof val === 'function'),
    ),
    /** Whether this component is being watched for changes. @values true, false */
    isWatched: v.optional(BoolSchema),
    /** Callback fired when the watch/unwatch button is clicked. @values () => void */
    onToggleWatch: v.optional(
      v.custom<() => void>((val: unknown): boolean => typeof val === 'function'),
    ),
  });
  /** Props for the LensHeader component. */
  export type LensHeaderProps = v.InferOutput<typeof LensHeaderPropsSchema>;
</script>

<script lang="ts">
  /**
   * Component header for Lens documentation pages.
   *
   * Displays an icon, title, description, category/tag badges, a
   * copy-import shortcut, a section navigation dropdown menu, and
   * previous/next component navigation.
   */
  import type { Bool, Num, Str, Void } from '@/schemas/common';
  import type { Component } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { fade } from 'svelte/transition';
  import { toTitle, stripSvelteProps } from '../lens/lens-utils.js';
  import Badge from '../badge/badge.svelte';
  import CopyImport from '../copy-import/CopyImport.svelte';
  import * as DropdownMenu from '../dropdown-menu/index.js';
  import * as Tooltip from '../tooltip/index.js';
  import ComponentIcon from '@lucide/svelte/icons/component';
  import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
  import TableProperties from '@lucide/svelte/icons/table-properties';
  import Layers from '@lucide/svelte/icons/layers';
  import BookOpen from '@lucide/svelte/icons/book-open';
  import FileCode from '@lucide/svelte/icons/file-code';
  import ShieldAlert from '@lucide/svelte/icons/shield-alert';
  import GitFork from '@lucide/svelte/icons/git-fork';
  import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
  import ChevronsDownUp from '@lucide/svelte/icons/chevrons-down-up';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import History from '@lucide/svelte/icons/history';
  import FileText from '@lucide/svelte/icons/file-text';
  import Download from '@lucide/svelte/icons/download';
  import ClipboardCopy from '@lucide/svelte/icons/clipboard-copy';
  import Check from '@lucide/svelte/icons/check';
  import Search from '@lucide/svelte/icons/search';
  import SearchX from '@lucide/svelte/icons/search-x';
  import FileImage from '@lucide/svelte/icons/file-image';
  import FileType from '@lucide/svelte/icons/file-type';
  import Globe from '@lucide/svelte/icons/globe';
  import Clipboard from '@lucide/svelte/icons/clipboard';
  import Link from '@lucide/svelte/icons/link';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import TextCursorInput from '@lucide/svelte/icons/text-cursor-input';
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import Layers2 from '@lucide/svelte/icons/layers-2';
  import Compass from '@lucide/svelte/icons/compass';
  import Eye from '@lucide/svelte/icons/eye';
  import Wrench from '@lucide/svelte/icons/wrench';
  import Microscope from '@lucide/svelte/icons/microscope';
  import Star from '@lucide/svelte/icons/star';
  import Tag from '@lucide/svelte/icons/tag';
  import EyeOff from '@lucide/svelte/icons/eye-off';
  import { cn } from '../utils.js';

  /** Category-to-icon mapping for visual differentiation in the header. */
  const CATEGORY_ICONS: Record<Str, Component> = {
    form: TextCursorInput,
    layout: LayoutGrid,
    overlay: Layers2,
    navigation: Compass,
    display: Eye,
    utility: Wrench,
    lens: Microscope,
  };

  /** Category-to-color mapping for icon background differentiation. */
  const CATEGORY_COLORS: Record<Str, Str> = {
    form: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' as Str,
    layout: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' as Str,
    overlay: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' as Str,
    navigation: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' as Str,
    display: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' as Str,
    utility: 'bg-slate-500/10 text-slate-600 dark:text-slate-400' as Str,
    lens: 'bg-primary/10 text-primary' as Str,
  };

  const allProps: LensHeaderProps = $props();
  const validated: LensHeaderProps = $derived.by(() => {
    const rawProps: LensHeaderProps = stripSvelteProps(allProps);
    const result = safeParse(LensHeaderPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LensHeaderProps;
  });

  /** Whether the component has renderable variants. */
  const hasVariants: Bool = $derived(validated.hasVariants ?? false);

  /** Whether the component has hand-written examples. */
  const hasExamples: Bool = $derived(validated.hasExamples ?? false);

  /** Whether the component has raw source available. */
  const hasSource: Bool = $derived(validated.hasSource ?? false);

  /** Whether the component has any import dependencies. */
  const hasDeps: Bool = $derived(validated.hasDeps ?? false);

  /** Whether the component has custom docs.md documentation. */
  const hasDocs: Bool = $derived(validated.hasDocs ?? false);

  /** Whether the component has changelog entries from git log. */
  const hasChangelog: Bool = $derived(validated.hasChangelog ?? false);

  /** Number of props defined (0 if not provided). */
  const propCount: Num = $derived(validated.propCount ?? 0);

  /** Number of variant cards (0 if not provided). */
  const variantCount: Num = $derived(validated.variantCount ?? 0);

  /** Number of example cards (0 if not provided). */
  const exampleCount: Num = $derived(validated.exampleCount ?? 0);

  /** Number of import dependencies (0 if not provided). */
  const depCount: Num = $derived(validated.depCount ?? 0);

  /** Number of changelog entries (0 if not provided). */
  const changelogCount: Num = $derived(validated.changelogCount ?? 0);

  /** Resolved icon component for the current category. Falls back to generic ComponentIcon. */
  const categoryIcon: Component = $derived(
    CATEGORY_ICONS[validated.meta?.category ?? ''] ?? ComponentIcon,
  );

  /** Resolved CSS classes for the icon container background. Falls back to primary. */
  const categoryColorClass: Str = $derived(
    CATEGORY_COLORS[validated.meta?.category ?? ''] ?? ('bg-primary/10 text-primary' as Str),
  );

  /**
   * Render description text with inline code support.
   * Converts backtick-wrapped segments to styled `<code>` elements.
   *
   * @param text - Raw description string potentially containing backtick code
   * @returns HTML string with `<code>` tags for inline code spans
   */
  function renderDescriptionHtml(text: Str): Str {
    return text.replaceAll(/`([^`]+)`/g, (_: Str, code: Str): Str => {
      const escaped: Str = code
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;') as Str;
      return `<code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">${escaped}</code>`;
    }) as Str;
  }

  /** Whether the page is scrolled to the top. */
  let isAtTop: Bool = $state(true);

  $effect(() => {
    /** Update isAtTop on scroll. */
    function onScroll(): Void {
      isAtTop = (window.scrollY < 10) as Bool;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return (): void => {
      window.removeEventListener('scroll', onScroll);
    };
  });

  /* Keyboard navigation — ArrowLeft/ArrowRight for prev/next component */
  $effect(() => {
    /**
     * Navigate to prev/next component on arrow key press (when no input focused).
     *
     * @param e - The keyboard event
     */
    function onKeydown(e: KeyboardEvent): Void {
      const tag: Str = (document.activeElement?.tagName ?? '') as Str;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((document.activeElement as HTMLElement)?.isContentEditable) return;
      if (e.key === 'ArrowLeft' && validated.prevComponent) {
        e.preventDefault();
        window.location.href = `/components/${validated.prevComponent}`;
      } else if (e.key === 'ArrowRight' && validated.nextComponent) {
        e.preventDefault();
        window.location.href = `/components/${validated.nextComponent}`;
      }
    }
    window.addEventListener('keydown', onKeydown);
    return (): void => {
      window.removeEventListener('keydown', onKeydown);
    };
  });

  /** Scroll smoothly to the top of the page. */
  function scrollToTop(): Void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Open a collapsible section and smooth-scroll to it.
   *
   * Dispatches a custom event that the Lens page listens for —
   * the page opens the section (if collapsed), waits a tick for
   * the DOM to update, then scrolls to the element.
   *
   * @param id - The DOM element ID to scroll to
   */
  function scrollTo(id: Str): Void {
    document.dispatchEvent(new CustomEvent('lens:scroll-to', { detail: id }));
  }

  /** Expand all collapsible page sections. */
  function expandAll(): Void {
    document.dispatchEvent(new CustomEvent('lens:expand-all'));
  }

  /** Collapse all collapsible page sections. */
  function collapseAll(): Void {
    document.dispatchEvent(new CustomEvent('lens:collapse-all'));
  }

  /* ------------------------------------------------------------------ */
  /*  Component page export                                              */
  /* ------------------------------------------------------------------ */

  /** Component page export format menu items with descriptions and file extension badges. */
  const PAGE_EXPORT_ITEMS: Array<{
    id: Str;
    label: Str;
    icon: Component;
    category: Str;
    description: Str;
    ext: Str;
  }> = [
    {
      id: 'copy-json',
      label: 'Copy as JSON',
      icon: ClipboardCopy,
      category: 'Clipboard',
      description: 'Structured page data',
      ext: '',
    },
    {
      id: 'copy-markdown',
      label: 'Copy as Markdown',
      icon: FileText,
      category: 'Clipboard',
      description: 'Formatted documentation',
      ext: '',
    },
    {
      id: 'download-json',
      label: 'Download JSON',
      icon: Download,
      category: 'File',
      description: 'Structured page file',
      ext: '.json',
    },
    {
      id: 'download-markdown',
      label: 'Download Markdown',
      icon: Download,
      category: 'File',
      description: 'Formatted doc file',
      ext: '.md',
    },
  ];

  /** Search query for page export menu filtering. */
  let pageExportSearchQuery: Str = $state('');

  /** Page export items filtered by search query (searches label, description, category). */
  const filteredPageExportItems = $derived(
    pageExportSearchQuery.length === 0
      ? PAGE_EXPORT_ITEMS
      : PAGE_EXPORT_ITEMS.filter((p) => {
          const q: Str = pageExportSearchQuery.toLowerCase() as Str;
          return (
            p.label.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
          );
        }),
  );

  /** Unique page export categories present after filtering. */
  const filteredPageExportCategories: Str[] = $derived([
    ...new Set(filteredPageExportItems.map((p) => p.category)),
  ]);

  /** Feedback state for page export actions (stores format id briefly). */
  let pageExportFeedback: Str = $state('');

  /**
   * Dispatch a page export event to the parent page.
   *
   * @param formatId - Export format identifier
   */
  function handlePageExport(formatId: Str): Void {
    document.dispatchEvent(new CustomEvent('lens:export', { detail: formatId }));
    pageExportFeedback = formatId;
    setTimeout((): Void => {
      pageExportFeedback = '';
    }, 2000);
  }

  /* ------------------------------------------------------------------ */
  /*  Component export (same formats as LensComponentRenderer)            */
  /* ------------------------------------------------------------------ */

  /** Component export format menu items with descriptions and file extension badges. */
  const COMPONENT_EXPORT_ITEMS: Array<{
    id: Str;
    label: Str;
    icon: Component;
    category: Str;
    description: Str;
    ext: Str;
  }> = [
    {
      id: 'png',
      label: 'PNG',
      icon: FileImage,
      category: 'Image',
      description: 'Lossless raster, best quality',
      ext: '.png',
    },
    {
      id: 'jpeg',
      label: 'JPEG',
      icon: FileImage,
      category: 'Image',
      description: 'Lossy compressed, smaller files',
      ext: '.jpg',
    },
    {
      id: 'svg',
      label: 'SVG',
      icon: FileImage,
      category: 'Image',
      description: 'Vector format, infinitely scalable',
      ext: '.svg',
    },
    {
      id: 'webp',
      label: 'WebP',
      icon: FileImage,
      category: 'Image',
      description: 'Modern format, best compression',
      ext: '.webp',
    },
    {
      id: 'html',
      label: 'HTML',
      icon: FileType,
      category: 'Document',
      description: 'Markup with external dependencies',
      ext: '.html',
    },
    {
      id: 'standalone-html',
      label: 'Standalone HTML',
      icon: Globe,
      category: 'Document',
      description: 'Self-contained, no dependencies',
      ext: '.html',
    },
    {
      id: 'copy-image',
      label: 'Copy as Image',
      icon: Clipboard,
      category: 'Clipboard',
      description: 'Copies PNG to clipboard',
      ext: '',
    },
    {
      id: 'copy-html',
      label: 'Copy as HTML',
      icon: FileType,
      category: 'Clipboard',
      description: 'Copies rendered markup',
      ext: '',
    },
    {
      id: 'copy-svelte',
      label: 'Copy as Svelte',
      icon: FileCode,
      category: 'Clipboard',
      description: 'Copies component source',
      ext: '',
    },
    {
      id: 'copy-data-uri',
      label: 'Copy as Data URI',
      icon: Link,
      category: 'Clipboard',
      description: 'Base64-encoded inline image',
      ext: '',
    },
  ];

  /** Search query for component export menu filtering. */
  let componentExportSearchQuery: Str = $state('');

  /** Component export items filtered by search query (searches label, description, category). */
  const filteredComponentExportItems = $derived(
    componentExportSearchQuery.length === 0
      ? COMPONENT_EXPORT_ITEMS
      : COMPONENT_EXPORT_ITEMS.filter((p) => {
          const q: Str = componentExportSearchQuery.toLowerCase() as Str;
          return (
            p.label.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
          );
        }),
  );

  /** Unique component export categories present after filtering. */
  const filteredComponentExportCategories: Str[] = $derived([
    ...new Set(filteredComponentExportItems.map((p) => p.category)),
  ]);

  /** Feedback state for component export actions (stores format id briefly). */
  let componentExportFeedback: Str = $state('');

  /**
   * Dispatch a component export event to LensComponentRenderer.
   *
   * @param formatId - Export format identifier
   */
  function handleComponentExport(formatId: Str): Void {
    document.dispatchEvent(new CustomEvent('lens:export-component', { detail: formatId }));
    componentExportFeedback = formatId;
    setTimeout((): Void => {
      componentExportFeedback = '';
    }, 2000);
  }
</script>

<div class="flex items-start gap-4">
  <Tooltip.Root delayDuration={300}>
    <Tooltip.Trigger>
      {#snippet child({ props: iconTooltipProps })}
        <div
          class={cn(
            'flex size-12 shrink-0 items-center justify-center rounded-xl',
            categoryColorClass,
          )}
          {...iconTooltipProps}
        >
          <svelte:component this={categoryIcon} class="size-6" />
        </div>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content side="bottom" sideOffset={4}>
      {validated.meta?.category
        ? `${validated.meta.category.charAt(0).toUpperCase()}${validated.meta.category.slice(1)} component`
        : 'Component'}
    </Tooltip.Content>
  </Tooltip.Root>
  <div class="min-w-0 flex-1">
    <div class="flex items-center gap-4">
      <div class="flex items-baseline gap-4">
        <a
          href="#top"
          class="group decoration-primary/30 decoration-2 underline-offset-4 hover:underline"
        >
          <h1 class="text-3xl font-bold tracking-tight">{toTitle(validated.name)}</h1>
        </a>

        {#if validated.onTogglePin}
          <Tooltip.Root delayDuration={300}>
            <Tooltip.Trigger>
              {#snippet child({ props: pinTooltipProps })}
                <button
                  type="button"
                  class={cn(
                    'flex size-7 items-center justify-center rounded-md transition-colors',
                    validated.isPinned
                      ? 'text-amber-500 hover:text-amber-600'
                      : 'text-muted-foreground/40 hover:text-foreground',
                  )}
                  {...pinTooltipProps}
                  onclick={validated.onTogglePin}
                >
                  <Star class={cn('size-4', validated.isPinned && 'fill-current')} />
                </button>
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom" sideOffset={4}>
              {validated.isPinned ? 'Unpin from sidebar' : 'Pin to sidebar'}
            </Tooltip.Content>
          </Tooltip.Root>
        {/if}

        {#if validated.onToggleWatch}
          <Tooltip.Root delayDuration={300}>
            <Tooltip.Trigger>
              {#snippet child({ props: watchTooltipProps })}
                <button
                  type="button"
                  class={cn(
                    'flex size-7 items-center justify-center rounded-md transition-colors',
                    validated.isWatched
                      ? 'text-blue-500 hover:text-blue-600'
                      : 'text-muted-foreground/40 hover:text-foreground',
                  )}
                  {...watchTooltipProps}
                  onclick={validated.onToggleWatch}
                >
                  {#if validated.isWatched}
                    <Eye class="size-4" />
                  {:else}
                    <EyeOff class="size-4" />
                  {/if}
                </button>
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom" sideOffset={4}>
              {validated.isWatched
                ? 'Stop watching for file changes'
                : 'Watch for file changes — auto-refreshes on save'}
            </Tooltip.Content>
          </Tooltip.Root>
        {/if}

        <div class="flex items-center gap-1">
          <!-- Page menu dropdown -->
          <DropdownMenu.Root>
            <Tooltip.Root delayDuration={300}>
              <Tooltip.Trigger>
                {#snippet child({ props: tooltipProps })}
                  <DropdownMenu.Trigger>
                    {#snippet child({ props: triggerProps })}
                      <button
                        type="button"
                        class="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        {...tooltipProps}
                        {...triggerProps}
                      >
                        <EllipsisVertical class="size-4" />
                        <span class="sr-only">Page menu</span>
                      </button>
                    {/snippet}
                  </DropdownMenu.Trigger>
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content side="right" sideOffset={4}>Page menu</Tooltip.Content>
            </Tooltip.Root>
            <DropdownMenu.Content align="start" sideOffset={4}>
              <!-- Navigate section -->
              <DropdownMenu.Label class="text-xs">Navigate</DropdownMenu.Label>
              <DropdownMenu.Item
                onclick={scrollToTop}
                disabled={isAtTop}
                class={cn(isAtTop && 'opacity-40')}
              >
                <ArrowUp class="size-4" />
                Scroll to Top
              </DropdownMenu.Item>
              <DropdownMenu.Item onclick={() => scrollTo('props')}>
                <TableProperties class="size-4" />
                <span class="flex-1">Go to Props</span>
                {#if (propCount as number) > 0}
                  <span
                    class="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground/60"
                    >{propCount}</span
                  >
                {/if}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onclick={() => scrollTo('default')}
                disabled={!hasVariants}
                class={cn(!hasVariants && 'opacity-40')}
              >
                <ComponentIcon class="size-4" />
                Go to Default
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onclick={() => scrollTo('variants')}
                disabled={!hasVariants}
                class={cn(!hasVariants && 'opacity-40')}
              >
                <Layers class="size-4" />
                <span class="flex-1">Go to Variants</span>
                {#if (variantCount as number) > 0}
                  <span
                    class="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground/60"
                    >{variantCount}</span
                  >
                {/if}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onclick={() => scrollTo('examples')}
                disabled={!hasExamples}
                class={cn(!hasExamples && 'opacity-40')}
              >
                <BookOpen class="size-4" />
                <span class="flex-1">Go to Examples</span>
                {#if (exampleCount as number) > 0}
                  <span
                    class="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground/60"
                    >{exampleCount}</span
                  >
                {/if}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onclick={() => scrollTo('error-boundary')}
                disabled={!hasVariants}
                class={cn(!hasVariants && 'opacity-40')}
              >
                <ShieldAlert class="size-4" />
                Go to Error Boundary
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onclick={() => scrollTo('source')}
                disabled={!hasSource}
                class={cn(!hasSource && 'opacity-40')}
              >
                <FileCode class="size-4" />
                Go to Source
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onclick={() => scrollTo('docs')}
                disabled={!hasDocs}
                class={cn(!hasDocs && 'opacity-40')}
              >
                <FileText class="size-4" />
                Go to Documentation
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onclick={() => scrollTo('dependencies')}
                disabled={!hasDeps}
                class={cn(!hasDeps && 'opacity-40')}
              >
                <GitFork class="size-4" />
                <span class="flex-1">Go to Dependencies</span>
                {#if (depCount as number) > 0}
                  <span
                    class="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground/60"
                    >{depCount}</span
                  >
                {/if}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onclick={() => scrollTo('changelog')}
                disabled={!hasChangelog}
                class={cn(!hasChangelog && 'opacity-40')}
              >
                <History class="size-4" />
                <span class="flex-1">Go to Changelog</span>
                {#if (changelogCount as number) > 0}
                  <span
                    class="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground/60"
                    >{changelogCount}</span
                  >
                {/if}
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <!-- Actions section -->
              <DropdownMenu.Label class="text-xs">Actions</DropdownMenu.Label>
              <DropdownMenu.Sub
                onOpenChange={(open) => {
                  if (open) pageExportSearchQuery = '';
                }}
              >
                <DropdownMenu.SubTrigger>
                  <Download class="size-4" />
                  Export
                </DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent class="flex max-h-[28rem] w-64 flex-col overflow-hidden">
                  <div class="shrink-0 px-2 pb-1.5 pt-1">
                    <div
                      class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                    >
                      <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <input
                        type="text"
                        placeholder="Search formats..."
                        class="h-5 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                        bind:value={pageExportSearchQuery}
                        onclick={(e) => e.stopPropagation()}
                        onkeydown={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div class="flex-1 overflow-y-auto">
                    {#if filteredPageExportItems.length === 0}
                      <div class="flex flex-col items-center gap-1 px-2 py-4 text-center">
                        <SearchX class="size-4 text-muted-foreground/40" />
                        <span class="text-xs text-muted-foreground/60">No formats match</span>
                      </div>
                    {:else}
                      {#each filteredPageExportCategories as category (category)}
                        <DropdownMenu.Label
                          class="flex items-center gap-1.5 px-2 text-xs text-muted-foreground/60"
                        >
                          {#if category === 'Image'}
                            <FileImage class="size-3" />
                          {:else if category === 'Document'}
                            <FileType class="size-3" />
                          {:else if category === 'Clipboard'}
                            <Clipboard class="size-3" />
                          {:else}
                            <Download class="size-3" />
                          {/if}
                          {category}
                        </DropdownMenu.Label>
                        {#each filteredPageExportItems.filter((p) => p.category === category) as item (item.id)}
                          <DropdownMenu.Item
                            onSelect={(e) => {
                              e.preventDefault();
                              handlePageExport(item.id);
                            }}
                          >
                            {#if pageExportFeedback === item.id}
                              <span in:fade={{ duration: 150 }}
                                ><Check class="size-4 text-green-500" /></span
                              >
                            {:else}
                              <item.icon class="size-4" />
                            {/if}
                            <div class="flex min-w-0 flex-1 flex-col">
                              <span class="text-sm">{item.label}</span>
                              <span class="text-[11px] text-muted-foreground/60"
                                >{item.description}</span
                              >
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
                  </div>
                </DropdownMenu.SubContent>
              </DropdownMenu.Sub>
              <DropdownMenu.Sub
                onOpenChange={(open) => {
                  if (open) componentExportSearchQuery = '';
                }}
              >
                <DropdownMenu.SubTrigger>
                  <ComponentIcon class="size-4" />
                  Export Component
                </DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent class="flex max-h-[28rem] w-64 flex-col overflow-hidden">
                  <div class="shrink-0 px-2 pb-1.5 pt-1">
                    <div
                      class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                    >
                      <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <input
                        type="text"
                        placeholder="Search formats..."
                        class="h-5 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                        bind:value={componentExportSearchQuery}
                        onclick={(e) => e.stopPropagation()}
                        onkeydown={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div class="flex-1 overflow-y-auto">
                    {#if filteredComponentExportItems.length === 0}
                      <div class="flex flex-col items-center gap-1 px-2 py-4 text-center">
                        <SearchX class="size-4 text-muted-foreground/40" />
                        <span class="text-xs text-muted-foreground/60">No formats match</span>
                      </div>
                    {:else}
                      {#each filteredComponentExportCategories as category (category)}
                        <DropdownMenu.Label
                          class="flex items-center gap-1.5 px-2 text-xs text-muted-foreground/60"
                        >
                          {#if category === 'Image'}
                            <FileImage class="size-3" />
                          {:else if category === 'Document'}
                            <FileType class="size-3" />
                          {:else if category === 'Clipboard'}
                            <Clipboard class="size-3" />
                          {:else}
                            <Download class="size-3" />
                          {/if}
                          {category}
                        </DropdownMenu.Label>
                        {#each filteredComponentExportItems.filter((p) => p.category === category) as item (item.id)}
                          <DropdownMenu.Item
                            onSelect={(e) => {
                              e.preventDefault();
                              handleComponentExport(item.id);
                            }}
                          >
                            {#if componentExportFeedback === item.id}
                              <span in:fade={{ duration: 150 }}
                                ><Check class="size-4 text-green-500" /></span
                              >
                            {:else}
                              <item.icon class="size-4" />
                            {/if}
                            <div class="flex min-w-0 flex-1 flex-col">
                              <span class="text-sm">{item.label}</span>
                              <span class="text-[11px] text-muted-foreground/60"
                                >{item.description}</span
                              >
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
                  </div>
                </DropdownMenu.SubContent>
              </DropdownMenu.Sub>
              <DropdownMenu.Separator />
              <DropdownMenu.Item onclick={expandAll}>
                <ChevronsUpDown class="size-4" />
                Expand All
              </DropdownMenu.Item>
              <DropdownMenu.Item onclick={collapseAll}>
                <ChevronsDownUp class="size-4" />
                Collapse All
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      </div>

      <!-- Previous / Next component navigation -->
      <div class="ml-auto flex items-center gap-1">
        {#if validated.prevComponent}
          <Tooltip.Root delayDuration={300}>
            <Tooltip.Trigger>
              {#snippet child({ props: tooltipProps })}
                <a
                  href="/components/{validated.prevComponent}"
                  class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  {...tooltipProps}
                >
                  <ChevronLeft class="size-3.5" />
                  <span class="hidden sm:inline">{toTitle(validated.prevComponent ?? '')}</span>
                  <span class="sr-only sm:hidden"
                    >Previous: {toTitle(validated.prevComponent ?? '')}</span
                  >
                </a>
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom" sideOffset={4}>
              Previous: {toTitle(validated.prevComponent ?? '')}
              <kbd
                class="ml-1.5 rounded border border-current/20 bg-current/10 px-1 py-0.5 font-mono text-[10px]"
                >←</kbd
              >
            </Tooltip.Content>
          </Tooltip.Root>
        {:else}
          <span
            class="inline-flex size-8 items-center justify-center text-muted-foreground/30"
            aria-disabled="true"
            role="link"
          >
            <ChevronLeft class="size-4" />
          </span>
        {/if}
        {#if validated.nextComponent}
          <Tooltip.Root delayDuration={300}>
            <Tooltip.Trigger>
              {#snippet child({ props: tooltipProps })}
                <a
                  href="/components/{validated.nextComponent}"
                  class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  {...tooltipProps}
                >
                  <span class="hidden sm:inline">{toTitle(validated.nextComponent ?? '')}</span>
                  <span class="sr-only sm:hidden"
                    >Next: {toTitle(validated.nextComponent ?? '')}</span
                  >
                  <ChevronRight class="size-3.5" />
                </a>
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom" sideOffset={4}>
              Next: {toTitle(validated.nextComponent ?? '')}
              <kbd
                class="ml-1.5 rounded border border-current/20 bg-current/10 px-1 py-0.5 font-mono text-[10px]"
                >→</kbd
              >
            </Tooltip.Content>
          </Tooltip.Root>
        {:else}
          <span
            class="inline-flex size-8 items-center justify-center text-muted-foreground/30"
            aria-disabled="true"
            role="link"
          >
            <ChevronRight class="size-4" />
          </span>
        {/if}
      </div>
    </div>
    {#if validated.description}
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- Inline code in description is generated from trusted component metadata -->
      <p class="mt-1 text-sm text-muted-foreground">
        {@html renderDescriptionHtml(validated.description)}
      </p>
    {/if}
    {#if validated.meta}
      <div class="mt-2 flex flex-wrap items-center gap-1.5">
        <Tooltip.Root delayDuration={300}>
          <Tooltip.Trigger>
            {#snippet child({ props: catTooltipProps })}
              <span {...catTooltipProps}>
                <Badge
                  variant="secondary"
                  class="inline-flex items-center gap-1 text-xs capitalize"
                >
                  <svelte:component this={categoryIcon} class="size-3" />
                  {validated.meta?.category}
                </Badge>
              </span>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content side="bottom" sideOffset={4}>Component category</Tooltip.Content>
        </Tooltip.Root>
        {#each validated.meta.tags as tag, i (i)}
          <Tooltip.Root delayDuration={300}>
            <Tooltip.Trigger>
              {#snippet child({ props: tagTooltipProps })}
                <span {...tagTooltipProps}>
                  <Badge variant="outline" class="inline-flex items-center gap-1 text-xs">
                    <Tag class="size-3" />
                    {tag}
                  </Badge>
                </span>
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom" sideOffset={4}>Tag: {tag}</Tooltip.Content>
          </Tooltip.Root>
        {/each}
      </div>
    {/if}
    <div class="mt-1.5">
      <Tooltip.Root delayDuration={300}>
        <Tooltip.Trigger>
          {#snippet child({ props: importTooltipProps })}
            <span {...importTooltipProps}>
              <CopyImport
                text={validated.importPath ?? `@/ui/${validated.name}`}
                copyText="import ... from '@/ui/{validated.name}/...';"
              />
            </span>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content side="bottom" sideOffset={4}>
          <code class="font-mono text-xs"
            >import {'{ ... }'} from '{validated.importPath ?? `@/ui/${validated.name}`}/...';</code
          >
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
  </div>
</div>
