<script lang="ts">
  /**
   * Lens: auto-generated component documentation page.
   *
   * Extracts props, TV variants, and examples from raw component source
   * at runtime — no hand-written Demo.svelte files needed.
   */
  import type { Bool, Num, Str, Void } from '@/schemas/common';
  import { tick, type Component } from 'svelte';
  import { fade, slide } from 'svelte/transition';
  import type {
    PropMeta,
    VariantMeta,
    VariantKeyMeta,
    LensExample,
    LensMeta,
  } from '@/ui/lens/types.js';
  import {
    extractProps,
    extractDescription,
    extractPropsVariants,
  } from '@/ui/lens/extract-props.js';
  import { extractVariants } from '@/ui/lens/extract-variants.js';
  import {
    extractDeps,
    extractReverseDeps,
    type DepTree,
    type ReverseDep,
  } from '@/ui/lens/extract-deps.js';
  import { extractSourceSizes } from '@/ui/lens/extract-sizes.js';
  import type { Result } from '@/schemas/result/result';
  import {
    extractDir,
    extractStem,
    toTitle,
    isInternalFile,
    findPrimaryKey,
    parseLensMeta,
  } from '@/ui/lens/lens-utils.js';
  import { page } from '$app/state';
  import LensEmpty from '@/ui/lens-empty/LensEmpty.svelte';
  import LensError from '@/ui/lens-error/LensError.svelte';
  import LensHeader from '@/ui/lens-header/LensHeader.svelte';
  import LensSection from '@/ui/lens-section/LensSection.svelte';
  import LensSource from '@/ui/lens-source/LensSource.svelte';
  import LensDependencyTree from '@/ui/lens-dependency-tree/LensDependencyTree.svelte';
  import PropsTable from '@/ui/lens-props-table/PropsTable.svelte';
  import LensComponentRenderer from '@/ui/lens-component-renderer/LensComponentRenderer.svelte';
  import { LensCardSettingsMenu } from '@/ui/lens-card-settings-menu/index.js';
  import CodeBlock from '@/ui/code-block/CodeBlock.svelte';
  import TableProperties from '@lucide/svelte/icons/table-properties';
  import ComponentIcon from '@lucide/svelte/icons/component';
  import ShieldAlert from '@lucide/svelte/icons/shield-alert';
  import Layers from '@lucide/svelte/icons/layers';
  import BookOpen from '@lucide/svelte/icons/book-open';
  import GitFork from '@lucide/svelte/icons/git-fork';
  import FileCode from '@lucide/svelte/icons/file-code';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Search from '@lucide/svelte/icons/search';
  import SearchX from '@lucide/svelte/icons/search-x';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import History from '@lucide/svelte/icons/history';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import FileText from '@lucide/svelte/icons/file-text';
  import Download from '@lucide/svelte/icons/download';
  import ClipboardCopy from '@lucide/svelte/icons/clipboard-copy';
  import Check from '@lucide/svelte/icons/check';
  import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
  import Clipboard from '@lucide/svelte/icons/clipboard';
  import LoaderCircle from '@lucide/svelte/icons/loader-circle';
  import GitCommitHorizontal from '@lucide/svelte/icons/git-commit-horizontal';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import AlertCircle from '@lucide/svelte/icons/alert-circle';
  import Copy from '@lucide/svelte/icons/copy';
  import FolderOpen from '@lucide/svelte/icons/folder-open';
  import Hash from '@lucide/svelte/icons/hash';
  import RefreshCw from '@lucide/svelte/icons/refresh-cw';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import CircleX from '@lucide/svelte/icons/circle-x';
  import Play from '@lucide/svelte/icons/play';
  import Plus from '@lucide/svelte/icons/plus';
  import Clock from '@lucide/svelte/icons/clock';
  import Pencil from '@lucide/svelte/icons/pencil';
  import ListTree from '@lucide/svelte/icons/list-tree';
  import Braces from '@lucide/svelte/icons/braces';
  import CopyButton from '@/ui/copy-button/CopyButton.svelte';
  import { cn } from '@/ui/utils.js';
  import * as DropdownMenu from '@/ui/dropdown-menu/index.js';
  import * as Tooltip from '@/ui/tooltip/index.js';

  /* ------------------------------------------------------------------ */
  /*  Globs                                                             */
  /* ------------------------------------------------------------------ */

  /**
   * Raw .svelte sources for prop/variant extraction.
   *
   * Must be `eager` because Vite 7 + the Svelte plugin serves `.svelte?raw`
   * with an empty Content-Type header, causing MIME type errors for lazy
   * `import()` calls. Eager resolution inlines raw strings at compile time.
   */
  const rawSources: Record<Str, Str> = import.meta.glob('@/ui/*/*.svelte', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<Str, Str>;

  /** Live component modules for LensComponentRenderer rendering. */
  const componentModules: Record<Str, () => Promise<unknown>> = import.meta.glob('@/ui/*/*.svelte');

  /** Lens metadata (compound components only). */
  const lensModules: Record<Str, () => Promise<unknown>> = import.meta.glob('@/ui/*/lens.ts');

  /** Live example components (compound components only). */
  const exampleLiveModules: Record<Str, () => Promise<unknown>> = import.meta.glob(
    '@/ui/*/examples/*.svelte',
  );

  /**
   * Raw .ts sources for cross-file type resolution (e.g. imported types).
   * Eager for the same Vite 7 MIME type reason as `rawSources`.
   */
  const rawTsSources: Record<Str, Str> = import.meta.glob('@/ui/*/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<Str, Str>;

  /**
   * Raw example sources for code display.
   *
   * Eager for the same Vite 7 + Svelte MIME type reason as `rawSources`.
   */
  const exampleRawModules: Record<Str, Str> = import.meta.glob('@/ui/*/examples/*.svelte', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<Str, Str>;

  /**
   * Raw docs.md files for custom component documentation.
   * Each component can optionally include a `docs.md` in its directory.
   */
  const docsModules: Record<Str, Str> = import.meta.glob('@/ui/*/docs.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<Str, Str>;

  /* ------------------------------------------------------------------ */
  /*  Reactive state                                                    */
  /* ------------------------------------------------------------------ */

  const name: Str = $derived(page.params.name ?? '');

  /**
   * Sorted list of all component directory names derived from the raw source glob.
   * Used for Previous/Next navigation in the LensHeader.
   */
  const componentNames: Str[] = [...new Set(Object.keys(rawSources).map(extractDir))]
    .filter((n: Str): boolean => n.length > 0)
    .toSorted();

  /** Previous component in the sorted list (null if first). */
  const prevComponent: Str | null = $derived.by((): Str | null => {
    const idx: number = componentNames.indexOf(name);
    return idx > 0 ? (componentNames[idx - 1] ?? null) : null;
  });

  /** Next component in the sorted list (null if last). */
  const nextComponent: Str | null = $derived.by((): Str | null => {
    const idx: number = componentNames.indexOf(name);
    return idx >= 0 && idx < componentNames.length - 1 ? (componentNames[idx + 1] ?? null) : null;
  });

  let rawSource: Str = $state('');
  let props: PropMeta[] = $state([]);
  let variantMeta: VariantMeta | null = $state(null);
  let PrimaryComponent: Component | null = $state(null);
  let lensExamples: LensExample[] = $state([]);
  let exampleComponents: Map<Str, Component> = $state(new Map());
  let exampleSources: Map<Str, Str> = $state(new Map());
  let componentDescription: Str = $state('');
  let lensMeta: LensMeta | null = $state(null);
  let lensContextWrapper: Component | null = $state(null);
  let loading: Bool = $state(true);
  let loadError: Str | null = $state(null);

  /** Changelog entry from git log API. */
  type ChangelogEntry = { hash: Str; message: Str; body: Str; date: Str; author: Str };

  /** Changelog entries for the current component. */
  let changelog: ChangelogEntry[] = $state([]);

  /** Total number of commits for this component (may exceed entries returned). */
  let changelogTotal: Num = $state(0 as Num);

  /** Whether changelog is currently being fetched from the API. */
  let changelogLoading: Bool = $state(true);

  /** Error message from failed changelog fetch (null if no error). */
  let changelogError: Str | null = $state(null);

  /** Search query for filtering changelog entries by hash, message, or author. */
  let changelogSearchQuery: Str = $state('');

  /** Selected changelog row hashes for batch copy. */
  let selectedChangelogRows: Set<Str> = $state(new Set());

  /** Number of changelog entries visible (for "Show More" pagination). */
  let changelogVisibleCount: Num = $state(30 as Num);

  /** Set of expanded changelog row hashes (showing full commit body). */
  let expandedChangelogRows: Set<Str> = $state(new Set());

  /** GitHub repo base URL for commit links (empty if unavailable). */
  let changelogRepoUrl: Str = $state('');

  /** Section-level settings state for Variants section checkmarks. */
  let variantSectionActive: Record<Str, unknown> = $state({});

  /** Feedback state for Variants section export (shows green check). */
  let variantExportFeedback: Str = $state('' as Str);

  /** Section-level settings state for Examples section checkmarks. */
  let exampleSectionActive: Record<Str, unknown> = $state({});

  /** Component path relative to repo root for GitHub tree URLs. */
  let changelogComponentPath: Str = $state('');

  /** SHA256 diff anchor for scrolling to the primary file in GitHub commit views. */
  let changelogDiffAnchor: Str = $state('');

  /** Changelog entries filtered by search query (searches hash, message, body, author). */
  const filteredChangelog: ChangelogEntry[] = $derived(
    changelogSearchQuery.length === 0
      ? changelog
      : changelog.filter((e: ChangelogEntry): boolean => {
          const q: Str = changelogSearchQuery.toLowerCase() as Str;
          return (
            e.hash.toLowerCase().includes(q) ||
            e.message.toLowerCase().includes(q) ||
            e.body.toLowerCase().includes(q) ||
            e.author.toLowerCase().includes(q)
          );
        }),
  );

  /** Paginated slice of filtered changelog (for "Show More" button). */
  const paginatedChangelog: ChangelogEntry[] = $derived(
    filteredChangelog.slice(0, changelogVisibleCount as number),
  );

  /**
   * Format a date string as relative time (e.g. "3 days ago").
   *
   * @param dateStr - ISO date string
   * @returns Human-readable relative time
   */
  function relativeDate(dateStr: Str): Str {
    const delta: Num = (Date.now() - new Date(dateStr as string).getTime()) as Num;
    if (delta < 60_000) return 'just now' as Str;
    if (delta < 3_600_000) return `${Math.floor((delta as number) / 60_000)}m ago` as Str;
    if (delta < 86_400_000) return `${Math.floor((delta as number) / 3_600_000)}h ago` as Str;
    if (delta < 604_800_000) return `${Math.floor((delta as number) / 86_400_000)}d ago` as Str;
    if (delta < 2_592_000_000) return `${Math.floor((delta as number) / 604_800_000)}w ago` as Str;
    return `${Math.floor((delta as number) / 2_592_000_000)}mo ago` as Str;
  }

  /**
   * Toggle a changelog row's selection state.
   *
   * @param hash - Commit hash to toggle
   */
  function toggleChangelogRow(hash: Str): Void {
    const next: Set<Str> = new Set(selectedChangelogRows);
    if (next.has(hash)) {
      next.delete(hash);
    } else {
      next.add(hash);
    }
    selectedChangelogRows = next;
  }

  /**
   * Toggle a changelog row's expanded state (show/hide full commit body).
   *
   * @param hash - Commit hash to toggle
   */
  function toggleChangelogExpand(hash: Str): Void {
    const next: Set<Str> = new Set(expandedChangelogRows);
    if (next.has(hash)) {
      next.delete(hash);
    } else {
      next.add(hash);
    }
    expandedChangelogRows = next;
  }

  /**
   * Re-fetch changelog data for the current component.
   * Used as a retry mechanism when the initial fetch fails.
   */
  function retryChangelog(): Void {
    changelogError = null;
    changelogLoading = true;
    changelog = [];
    changelogTotal = 0 as Num;
    changelogSearchQuery = '' as Str;
    selectedChangelogRows = new Set();
    expandedChangelogRows = new Set();
    changelogVisibleCount = 30 as Num;
    (async (): Promise<void> => {
      try {
        const response: Response = await fetch(`/api/lens/changelog/${name}`);
        if (response.ok) {
          const data: unknown = await response.json();
          const body: {
            entries: ChangelogEntry[];
            total: Num;
            repoUrl: Str;
            componentPath: Str;
            diffAnchor: Str;
          } = data as {
            entries: ChangelogEntry[];
            total: Num;
            repoUrl: Str;
            componentPath: Str;
            diffAnchor: Str;
          };
          changelog = body.entries;
          changelogTotal = body.total;
          changelogRepoUrl = body.repoUrl;
          changelogComponentPath = body.componentPath;
          changelogDiffAnchor = body.diffAnchor;
        } else {
          changelogError = `Failed to load changelog (HTTP ${response.status})` as Str;
        }
      } catch {
        changelogError = 'Failed to load changelog — network error' as Str;
      } finally {
        changelogLoading = false;
      }
    })();
  }

  /**
   * Copy selected changelog rows (or all if none selected) to clipboard as text.
   */
  async function copySelectedChangelog(): Promise<void> {
    const entries: ChangelogEntry[] =
      selectedChangelogRows.size > 0
        ? changelog.filter((e: ChangelogEntry): boolean => selectedChangelogRows.has(e.hash))
        : changelog;
    const lines: Str[] = entries.map((e: ChangelogEntry): Str => {
      const base: Str =
        `${e.hash} ${e.message} (${e.author}, ${new Date(e.date).toLocaleString()})` as Str;
      return e.body ? (`${base}\n${e.body}` as Str) : base;
    });
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
    } catch {
      /* Clipboard write failed — browser may not support it in this context */
    }
  }

  $effect(() => {
    const currentName: Str = name;
    let cancelled: Bool = false;

    rawSource = '';
    props = [];
    variantMeta = null;
    PrimaryComponent = null;
    lensExamples = [];
    exampleComponents = new Map();
    exampleSources = new Map();
    componentDescription = '';
    lensMeta = null;
    lensContextWrapper = null;
    loading = true;
    loadError = null;

    if (!currentName) {
      loading = false;
      loadError = 'No component name specified.';
      return;
    }

    (async (): Promise<void> => {
      try {
        // 1. Load raw source for prop/variant extraction
        const sourceKey: Str | undefined = findPrimaryKey(currentName, rawSources);
        if (!sourceKey) {
          if (!cancelled) loadError = `No source found for "${currentName}"`;
          return;
        }

        const srcStr: Str = rawSources[sourceKey] ?? '';
        rawSource = srcStr;

        // Pass all .ts sources for cross-file type resolution (e.g. imported types)
        const tsSources: Str[] = Object.values(rawTsSources);
        props = extractProps(srcStr, tsSources.length > 0 ? tsSources : undefined);
        variantMeta = extractVariants(srcStr);
        componentDescription = extractDescription(srcStr);

        // 2. Load live component for LensComponentRenderer
        const compKey: Str | undefined =
          Object.keys(componentModules).find(
            (k: Str): boolean =>
              extractDir(k) === currentName && extractStem(k) === currentName && !isInternalFile(k),
          ) ??
          Object.keys(componentModules).find(
            (k: Str): boolean => extractDir(k) === currentName && !isInternalFile(k),
          );

        if (compKey) {
          const mod: unknown = await componentModules[compKey]?.();
          if (cancelled) return;
          // Glob modules export { default: Component } — cast from unknown
          const m = mod as Record<Str, unknown>;
          PrimaryComponent = m.default as Component;
        }

        // 3. Load lens.ts metadata if present
        const lensKey: Str | undefined = Object.keys(lensModules).find(
          (k: Str): boolean => extractDir(k) === currentName,
        );
        if (lensKey) {
          const lensMod: unknown = await lensModules[lensKey]?.();
          if (cancelled) return;
          const lm = lensMod as Record<Str, unknown>;
          const examples: unknown = lm.default ?? lm.examples ?? [];
          if (Array.isArray(examples)) {
            lensExamples = examples as LensExample[];
          }
          // Validate component meta against LensMetaSchema
          if (lm.meta) {
            const metaResult: Result<LensMeta> = parseLensMeta(lm.meta);
            if (metaResult.ok) {
              // Spread to unfreeze — Result.data is deep-frozen but $state needs mutable shape
              lensMeta = { ...metaResult.data, tags: [...metaResult.data.tags] };
            } else {
              // Error propagates to loadError — renders visible error state
              if (!cancelled) loadError = `Invalid lens metadata: ${metaResult.error.message}`;
              return;
            }
          }
          // Load optional context wrapper component (e.g. DropdownMenu.Root for Sub-menu components)
          if (typeof lm.contextWrapper === 'function') {
            lensContextWrapper = lm.contextWrapper as Component;
          }
        }

        // 4. Load example components + raw sources
        const exKeys: Str[] = Object.keys(exampleLiveModules).filter((k: Str): boolean =>
          k.includes(`/${currentName}/examples/`),
        );

        const newComponents: Map<Str, Component> = new Map();
        const newSources: Map<Str, Str> = new Map();

        await Promise.all(
          exKeys.map(async (k: Str): Promise<void> => {
            const stem: Str = extractStem(k);

            const mod: unknown = await exampleLiveModules[k]?.();
            if (cancelled) return;
            const m = mod as Record<Str, unknown>;
            newComponents.set(stem, m.default as Component);

            // Find matching raw source key
            const rawKey: Str | undefined = Object.keys(exampleRawModules).find(
              (rk: Str): boolean => rk.includes(`/${currentName}/examples/${stem}.svelte`),
            );
            if (rawKey) {
              const rawStr: Str = exampleRawModules[rawKey] ?? '';
              if (rawStr) {
                newSources.set(stem, rawStr);
              }
            }
          }),
        );

        if (!cancelled) {
          exampleComponents = newComponents;
          exampleSources = newSources;
        }
      } catch {
        /* Load failed — show error state instead of blank page */
        if (!cancelled) loadError = `Failed to load component "${currentName}"`;
      } finally {
        if (!cancelled) loading = false;
      }
    })();

    return (): void => {
      cancelled = true;
    };
  });

  /**
   * Merge TV variants and props-based variants, deduplicating by key name.
   * TV variants take priority since they have exact values from source.
   */
  const allVariants: VariantKeyMeta[] = $derived.by((): VariantKeyMeta[] => {
    const tvKeys: VariantKeyMeta[] = variantMeta?.variants ?? [];
    const propsKeys: VariantKeyMeta[] = extractPropsVariants(props);

    // TV keys take priority — collect their key names
    const tvKeyNames: Set<Str> = new Set(tvKeys.map((k: VariantKeyMeta): Str => k.key));

    // Add props-based variants that don't overlap with TV variants
    const merged: VariantKeyMeta[] = [...tvKeys];
    for (const pk of propsKeys) {
      if (!tvKeyNames.has(pk.key)) {
        merged.push(pk);
      }
    }
    // Filter out entries with falsy keys to prevent each_key_duplicate errors
    return merged.filter((v: VariantKeyMeta): boolean => Boolean(v.key));
  });

  const hasVariants: Bool = $derived(allVariants.length > 0);
  const hasExamples: Bool = $derived(lensExamples.length > 0);
  /** Compound components require parent context — silence auto-preview console warnings. */
  const isCompound: Bool = $derived.by((): Bool => {
    if (!lensMeta) return false;
    return lensMeta.tags.includes('compound');
  });

  /** Categorized dependency tree extracted from raw component source. */
  const deps: DepTree = $derived(
    rawSource ? extractDeps(rawSource) : { internal: [], workspace: [], external: [] },
  );

  /** Reverse dependencies — components that import the current one. */
  const usedBy: ReverseDep[] = $derived(
    name ? extractReverseDeps(name, rawSources, extractDir) : [],
  );

  /** Whether the component has any dependencies or reverse dependencies. */
  const hasDeps: Bool = $derived(
    deps.internal.length + deps.workspace.length + deps.external.length > 0 || usedBy.length > 0,
  );

  /** Raw docs.md content for the current component (if exists). */
  const docsContent: Str | null = $derived.by((): Str | null => {
    if (!name) return null;
    const key: Str | undefined = Object.keys(docsModules).find(
      (k: Str): boolean => extractDir(k) === name,
    );
    return key ? (docsModules[key] ?? null) : null;
  });

  /** Whether the component has custom documentation. */
  const hasDocs: Bool = $derived(docsContent !== null && docsContent.length > 0);

  /** Whether the changelog section should be shown (has entries, is loading, or has error). */
  const hasChangelog: Bool = $derived(
    changelog.length > 0 || changelogLoading || changelogError !== null,
  );

  /** Source sizes per component directory (computed from raw sources). */
  const sourceSizes: Record<Str, Num> = extractSourceSizes(rawSources, extractDir);

  /** Compiled bundle sizes fetched from the server API (svelte compile + esbuild minify + gzip). */
  let bundleSizes: Record<Str, { compiled: Num; gzip: Num }> = $state({});

  /** Combined sizes map passed to LensDependencyTree. */
  const componentSizes: Record<Str, { source: Num; compiled?: Num; gzip?: Num }> = $derived.by(
    () => {
      const result: Record<Str, { source: Num; compiled?: Num; gzip?: Num }> = {};
      for (const [dir, source] of Object.entries(sourceSizes)) {
        const bundle = bundleSizes[dir];
        result[dir] = {
          source: source as Num,
          compiled: bundle?.compiled,
          gzip: bundle?.gzip,
        };
      }
      return result;
    },
  );

  // Fetch compiled sizes from server API (non-blocking, populates async)
  $effect(() => {
    let cancelled: Bool = false;
    (async (): Promise<void> => {
      try {
        const response: Response = await fetch('/api/lens/bundle-sizes');
        if (cancelled) return;
        if (response.ok) {
          const data: unknown = await response.json();
          if (cancelled) return;
          // Server returns Record<string, { compiled, gzip }> — safe to assign
          bundleSizes = data as Record<Str, { compiled: Num; gzip: Num }>;
        }
      } catch {
        /* Bundle size fetch failed — sizes remain empty, source sizes still shown */
      }
    })();
    return (): void => {
      cancelled = true;
    };
  });

  // Fetch changelog from server API (non-blocking, populates async)
  $effect(() => {
    const currentName: Str = name;
    if (!currentName) return;
    let cancelled: Bool = false;
    changelog = [];
    changelogTotal = 0 as Num;
    changelogLoading = true;
    changelogError = null;
    changelogRepoUrl = '';
    changelogComponentPath = '';
    changelogDiffAnchor = '';
    changelogSearchQuery = '' as Str;
    selectedChangelogRows = new Set();
    expandedChangelogRows = new Set();
    changelogVisibleCount = 30 as Num;
    (async (): Promise<void> => {
      try {
        const response: Response = await fetch(`/api/lens/changelog/${currentName}`);
        if (cancelled) return;
        if (response.ok) {
          const data: unknown = await response.json();
          if (cancelled) return;
          // Server returns { entries, total, repoUrl, componentPath, diffAnchor }
          const body: {
            entries: ChangelogEntry[];
            total: Num;
            repoUrl: Str;
            componentPath: Str;
            diffAnchor: Str;
          } = data as {
            entries: ChangelogEntry[];
            total: Num;
            repoUrl: Str;
            componentPath: Str;
            diffAnchor: Str;
          };
          changelog = body.entries;
          changelogTotal = body.total;
          changelogRepoUrl = body.repoUrl;
          changelogComponentPath = body.componentPath;
          changelogDiffAnchor = body.diffAnchor;
        } else {
          changelogError = `Failed to load changelog (HTTP ${response.status})` as Str;
        }
      } catch {
        changelogError = 'Failed to load changelog — network error' as Str;
      } finally {
        if (!cancelled) changelogLoading = false;
      }
    })();
    return (): void => {
      cancelled = true;
    };
  });

  /**
   * Build a PascalCase tag name from a kebab-case component directory name.
   *
   * @param componentName - The component directory name (kebab-case)
   * @returns PascalCase tag string
   */
  function toTag(componentName: Str): Str {
    return toTitle(componentName).replaceAll(' ', '');
  }

  /* ------------------------------------------------------------------ */
  /*  Section collapsibility                                            */
  /* ------------------------------------------------------------------ */

  /** All page sections are expanded by default. */
  let sectionOpen: Record<Str, Bool> = $state({
    props: true,
    default: true,
    variants: true,
    examples: true,
    'error-boundary': true,
    source: true,
    docs: true,
    dependencies: true,
    changelog: true,
  });

  /**
   * Toggle a section open/closed.
   *
   * @param id - Section identifier key
   */
  function toggleSection(id: Str): Void {
    sectionOpen[id] = !sectionOpen[id];
  }

  /* ------------------------------------------------------------------ */
  /*  Props export                                                       */
  /* ------------------------------------------------------------------ */

  /** Feedback state for props export actions. */
  let propsExportFeedback: Str = $state('');

  /** Props export format menu items with descriptions and file extension badges. */
  const PROPS_EXPORT_ITEMS: Array<{
    id: Str;
    label: Str;
    icon: typeof ClipboardCopy;
    category: Str;
    description: Str;
    ext: Str;
  }> = [
    {
      id: 'copy-json',
      label: 'Copy as JSON',
      icon: ClipboardCopy,
      category: 'Clipboard',
      description: 'Structured data format',
      ext: '',
    },
    {
      id: 'copy-markdown',
      label: 'Copy as Markdown',
      icon: FileText,
      category: 'Clipboard',
      description: 'Formatted table for docs',
      ext: '',
    },
    {
      id: 'copy-csv',
      label: 'Copy as CSV',
      icon: ClipboardCopy,
      category: 'Clipboard',
      description: 'Spreadsheet-compatible format',
      ext: '',
    },
    {
      id: 'copy-typescript',
      label: 'Copy as TypeScript',
      icon: FileCode,
      category: 'Clipboard',
      description: 'Type definitions for code',
      ext: '',
    },
    {
      id: 'download-json',
      label: 'Download JSON',
      icon: Download,
      category: 'File',
      description: 'Structured data file',
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

  /** Search query for props export menu filtering. */
  let propsExportSearchQuery: Str = $state('');

  /** Props export items filtered by search query (searches label, description, category). */
  const filteredPropsExportItems = $derived(
    propsExportSearchQuery.length === 0
      ? PROPS_EXPORT_ITEMS
      : PROPS_EXPORT_ITEMS.filter((p) => {
          const q: Str = propsExportSearchQuery.toLowerCase() as Str;
          return (
            p.label.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
          );
        }),
  );

  /** Unique props export categories present after filtering. */
  const filteredPropsExportCategories: Str[] = $derived([
    ...new Set(filteredPropsExportItems.map((p) => p.category)),
  ]);

  /**
   * Format props as a markdown table.
   *
   * @param propsData - Array of prop metadata
   * @returns Formatted markdown string
   */
  function propsToMarkdown(propsData: typeof props): Str {
    const lines: Str[] = [
      `# Props — ${name}`,
      '',
      '| Name | Required | Type | Default | Description |',
      '|------|----------|------|---------|-------------|',
      ...propsData.map((p): Str => {
        let required: Str = 'Yes';
        if (p.optional) required = 'No';
        else if (p.default) required = 'No';
        return `| ${p.name} | ${required} | ${p.type || '—'} | ${p.default || '—'} | ${p.description || '—'} |`;
      }),
    ];
    return lines.join('\n');
  }

  /**
   * Format props as CSV.
   *
   * @param propsData - Array of prop metadata
   * @returns CSV-formatted string
   */
  function propsToCsv(propsData: typeof props): Str {
    const header: Str = 'Name,Required,Type,Default,Description';
    const rows: Str[] = propsData.map((p): Str => {
      let required: Str = 'Yes';
      if (p.optional) required = 'No';
      else if (p.default) required = 'No';
      const desc: Str = (p.description || '').replaceAll('"', '""');
      const type: Str = (p.type || '').replaceAll('"', '""');
      const def: Str = (p.default || '').replaceAll('"', '""');
      return `${p.name},${required},"${type}","${def}","${desc}"`;
    });
    return [header, ...rows].join('\n');
  }

  /**
   * Format props as a TypeScript interface.
   *
   * @param propsData - Array of prop metadata
   * @returns TypeScript interface string
   */
  function propsToTypeScript(propsData: typeof props): Str {
    const lines: Str[] = [
      `interface ${name.replaceAll(/[^a-zA-Z0-9]/g, '')}Props {`,
      ...propsData.map((p): Str => {
        const opt: Str = p.optional ? '?' : '';
        const type: Str = p.type || 'unknown';
        const comment: Str = p.description ? ` /** ${p.description} */` : '';
        return `${comment}\n  ${p.name}${opt}: ${type};`;
      }),
      '}',
    ];
    return lines.join('\n');
  }

  /**
   * Handle props export by format id.
   *
   * @param formatId - Export format identifier
   */
  async function handlePropsExport(formatId: Str): Promise<void> {
    const slug: Str = name.toLowerCase().replaceAll(/\s+/g, '-');
    if (formatId === 'copy-json') {
      await navigator.clipboard.writeText(JSON.stringify(props, null, 2));
    } else if (formatId === 'copy-markdown') {
      await navigator.clipboard.writeText(propsToMarkdown(props));
    } else if (formatId === 'copy-csv') {
      await navigator.clipboard.writeText(propsToCsv(props));
    } else if (formatId === 'copy-typescript') {
      await navigator.clipboard.writeText(propsToTypeScript(props));
    } else if (formatId === 'download-json') {
      const blob: Blob = new Blob([JSON.stringify(props, null, 2)], { type: 'application/json' });
      const url: Str = URL.createObjectURL(blob);
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = url;
      a.download = `${slug}-props.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (formatId === 'download-markdown') {
      const blob: Blob = new Blob([propsToMarkdown(props)], { type: 'text/markdown' });
      const url: Str = URL.createObjectURL(blob);
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = url;
      a.download = `${slug}-props.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
    propsExportFeedback = formatId;
    setTimeout((): Void => {
      propsExportFeedback = '';
    }, 2000);
  }

  /* ------------------------------------------------------------------ */
  /*  Changelog export                                                   */
  /* ------------------------------------------------------------------ */

  /** Feedback state for changelog export actions. */
  let changelogExportFeedback: Str = $state('');

  /** Changelog export format menu items with descriptions and file extension badges. */
  const CHANGELOG_EXPORT_ITEMS: Array<{
    id: Str;
    label: Str;
    icon: typeof ClipboardCopy;
    category: Str;
    description: Str;
    ext: Str;
  }> = [
    {
      id: 'copy-json',
      label: 'Copy as JSON',
      icon: ClipboardCopy,
      category: 'Clipboard',
      description: 'Structured data format',
      ext: '',
    },
    {
      id: 'copy-markdown',
      label: 'Copy as Markdown',
      icon: FileText,
      category: 'Clipboard',
      description: 'Formatted table for docs',
      ext: '',
    },
    {
      id: 'copy-csv',
      label: 'Copy as CSV',
      icon: ClipboardCopy,
      category: 'Clipboard',
      description: 'Spreadsheet-compatible format',
      ext: '',
    },
    {
      id: 'download-json',
      label: 'Download JSON',
      icon: Download,
      category: 'File',
      description: 'Structured data file',
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

  /** Search query for changelog export menu filtering. */
  let changelogExportSearchQuery: Str = $state('');

  /** Changelog export items filtered by search query (searches label, description, category). */
  const filteredChangelogExportItems = $derived(
    changelogExportSearchQuery.length === 0
      ? CHANGELOG_EXPORT_ITEMS
      : CHANGELOG_EXPORT_ITEMS.filter((p) => {
          const q: Str = changelogExportSearchQuery.toLowerCase() as Str;
          return (
            p.label.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
          );
        }),
  );

  /** Unique changelog export categories present after filtering. */
  const filteredChangelogExportCategories: Str[] = $derived([
    ...new Set(filteredChangelogExportItems.map((p) => p.category)),
  ]);

  /**
   * Format changelog entries as a markdown table.
   *
   * @param entries - Changelog entries to format
   * @returns Formatted markdown string
   */
  function changelogToMarkdown(entries: ChangelogEntry[]): Str {
    const lines: Str[] = [`# Changelog — ${name}`, ''];
    for (const e of entries) {
      lines.push(
        `- **\`${e.hash}\`** ${e.message} — *${e.author}* (${new Date(e.date).toLocaleString()})`,
      );
      if (e.body) {
        lines.push('');
        /* Indent body lines under the bullet */
        for (const bodyLine of e.body.split('\n')) {
          lines.push(`  ${bodyLine}`);
        }
        lines.push('');
      }
    }
    return lines.join('\n');
  }

  /**
   * Format changelog entries as CSV.
   *
   * @param entries - Changelog entries to format
   * @returns CSV-formatted string
   */
  function changelogToCsv(entries: ChangelogEntry[]): Str {
    const header: Str = 'Hash,Message,Body,Date,Author';
    const rows: Str[] = entries.map((e: ChangelogEntry): Str => {
      const msg: Str = e.message.replaceAll('"', '""');
      const body: Str = e.body.replaceAll('"', '""');
      const author: Str = e.author.replaceAll('"', '""');
      return `${e.hash},"${msg}","${body}",${new Date(e.date).toLocaleString()},"${author}"`;
    });
    return [header, ...rows].join('\n');
  }

  /**
   * Handle changelog export by format id.
   *
   * @param formatId - Export format identifier
   */
  async function handleChangelogExport(formatId: Str): Promise<void> {
    const slug: Str = name.toLowerCase().replaceAll(/\s+/g, '-');
    if (formatId === 'copy-json') {
      await navigator.clipboard.writeText(JSON.stringify(changelog, null, 2));
    } else if (formatId === 'copy-markdown') {
      await navigator.clipboard.writeText(changelogToMarkdown(changelog));
    } else if (formatId === 'copy-csv') {
      await navigator.clipboard.writeText(changelogToCsv(changelog));
    } else if (formatId === 'download-json') {
      const blob: Blob = new Blob([JSON.stringify(changelog, null, 2)], {
        type: 'application/json',
      });
      const url: Str = URL.createObjectURL(blob);
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = url;
      a.download = `${slug}-changelog.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (formatId === 'download-markdown') {
      const blob: Blob = new Blob([changelogToMarkdown(changelog)], { type: 'text/markdown' });
      const url: Str = URL.createObjectURL(blob);
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = url;
      a.download = `${slug}-changelog.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
    changelogExportFeedback = formatId;
    setTimeout((): Void => {
      changelogExportFeedback = '';
    }, 2000);
  }

  /* ------------------------------------------------------------------ */
  /*  Source section                                                      */
  /* ------------------------------------------------------------------ */

  /** Feedback state for source export actions (shows check icon briefly). */
  let sourceExportFeedback: Str = $state('');

  /** Currently active source file tab (key from rawTsSources / rawSources). */
  let activeSourceFile: Str = $state('');

  /**
   * Related files for the current component directory.
   *
   * Includes co-located .ts files (index.ts, lens.ts, etc.) and additional .svelte files
   * beyond the primary component file.
   */
  type RelatedFile = { key: Str; label: Str; lang: Str; source: Str };
  const relatedFiles: RelatedFile[] = $derived.by((): RelatedFile[] => {
    if (!name) return [];
    const files: RelatedFile[] = [];
    /* Co-located .ts files */
    for (const [key, src] of Object.entries(rawTsSources)) {
      if (extractDir(key) === name && src) {
        files.push({
          key: key as Str,
          label: `${extractStem(key)}.ts` as Str,
          lang: 'typescript' as Str,
          source: src as Str,
        });
      }
    }
    /* Additional .svelte files beyond the primary */
    for (const [key, src] of Object.entries(rawSources)) {
      if (extractDir(key) === name && src && src !== rawSource) {
        files.push({
          key: key as Str,
          label: `${extractStem(key)}.svelte` as Str,
          lang: 'svelte' as Str,
          source: src as Str,
        });
      }
    }
    return files.toSorted((a, b) => a.label.localeCompare(b.label));
  });

  /** Source code of the currently active file tab (primary or related). */
  const activeFileSource: Str = $derived.by((): Str => {
    if (!activeSourceFile) return rawSource;
    const found: RelatedFile | undefined = relatedFiles.find(
      (f: RelatedFile): boolean => f.key === activeSourceFile,
    );
    return found?.source ?? rawSource;
  });

  /** Language of the currently active file tab. */
  const activeFileLang: Str = $derived.by((): Str => {
    if (!activeSourceFile) return 'svelte' as Str;
    const found: RelatedFile | undefined = relatedFiles.find(
      (f: RelatedFile): boolean => f.key === activeSourceFile,
    );
    return found?.lang ?? 'svelte';
  });

  /** Label of the currently active file tab. */
  const activeFileLabel: Str = $derived.by((): Str => {
    if (!activeSourceFile) return `${toTitle(name)}.svelte` as Str;
    const found: RelatedFile | undefined = relatedFiles.find(
      (f: RelatedFile): boolean => f.key === activeSourceFile,
    );
    return found?.label ?? `${toTitle(name)}.svelte`;
  });

  /** Line count of the current source file. */
  const sourceLineCount: Num = $derived((rawSource ? rawSource.split('\n').length : 0) as Num);

  /**
   * Handle source section export/copy actions.
   *
   * @param action - The export action to perform
   */
  async function handleSourceExport(action: Str): Promise<void> {
    const src: Str = activeFileSource;
    const label: Str = activeFileLabel;
    try {
      if (action === 'copy-source') {
        await navigator.clipboard.writeText(src);
      } else if (action === 'copy-path') {
        const path: Str = `packages/shared/ui/src/${name}/${label}` as Str;
        await navigator.clipboard.writeText(path);
      } else if (action === 'copy-markdown') {
        const md: Str = `## ${label}\n\n\`\`\`${activeFileLang}\n${src}\n\`\`\`` as Str;
        await navigator.clipboard.writeText(md);
      } else if (action === 'download') {
        const blob: Blob = new Blob([src], { type: 'text/plain' });
        const url: Str = URL.createObjectURL(blob) as Str;
        const a: HTMLAnchorElement = document.createElement('a');
        a.href = url;
        a.download = label;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      /* Clipboard/download action failed — browser restrictions */
    }
    sourceExportFeedback = action;
    setTimeout((): void => {
      sourceExportFeedback = '';
    }, 2000);
  }

  /* ------------------------------------------------------------------ */
  /*  Error Boundary section                                             */
  /* ------------------------------------------------------------------ */

  /** Error boundary test case definition. */
  type ErrorBoundaryTest = {
    id: Str;
    title: Str;
    description: Str;
    /** Whether the test has been run (rendered). */
    rendered: Bool;
    /** Whether the error boundary successfully caught the error. */
    passed: Bool | null;
    /** The error message captured from the boundary. */
    errorMessage: Str;
    /** Whether this individual test card is expanded. */
    expanded: Bool;
  };

  /** Reactive array of error boundary tests with pass/fail tracking. */
  let errorBoundaryTests: ErrorBoundaryTest[] = $state([
    {
      id: 'missing-props' as Str,
      title: 'Missing Required Props' as Str,
      description:
        'Component rendered with no props — triggers safeParse validation and shows the error boundary fallback.' as Str,
      rendered: true as Bool,
      passed: null,
      errorMessage: '' as Str,
      expanded: true as Bool,
    },
    {
      id: 'invalid-props' as Str,
      title: 'Invalid Props' as Str,
      description:
        'Component rendered with an unknown prop key — triggers strictObject validation and shows the error boundary fallback.' as Str,
      rendered: true as Bool,
      passed: null,
      errorMessage: '' as Str,
      expanded: true as Bool,
    },
  ]);

  /** Custom error scenario JSON input. */
  let customErrorPropsJson: Str = $state('');

  /** Whether the custom error scenario is being shown. */
  let showCustomErrorTest: Bool = $state(false);

  /** Error message from parsing custom JSON. */
  let customJsonError: Str = $state('');

  /** Parsed custom props for the custom error scenario. */
  let customParsedProps: PropMeta[] = $state([]);

  /** Counter to force re-rendering of error boundary tests (incremented by Reset). */
  let errorBoundaryRenderKey: Num = $state(0 as Num);

  /** Total number of error boundary tests. */
  const errorBoundaryTestCount: Num = $derived(
    (errorBoundaryTests.length + (showCustomErrorTest ? 1 : 0)) as Num,
  );

  /** Number of tests that passed. */
  const errorBoundaryPassCount: Num = $derived(
    errorBoundaryTests.filter((t: ErrorBoundaryTest): boolean => t.passed === true).length as Num,
  );

  /** Number of tests that failed. */
  const errorBoundaryFailCount: Num = $derived(
    errorBoundaryTests.filter((t: ErrorBoundaryTest): boolean => t.passed === false).length as Num,
  );

  /** Feedback state for error boundary export actions. */
  let errorBoundaryExportFeedback: Str = $state('');

  /**
   * Record an error boundary catch event for a test case.
   * Deferred via queueMicrotask to avoid mutating $state during template evaluation.
   *
   * @param testId - The test case identifier
   * @param error - The caught error
   */
  function recordErrorBoundaryCatch(testId: Str, error: unknown): Void {
    queueMicrotask((): void => {
      const test: ErrorBoundaryTest | undefined = errorBoundaryTests.find(
        (t: ErrorBoundaryTest): boolean => t.id === testId,
      );
      if (test) {
        test.passed = true;
        test.errorMessage = (error instanceof Error ? error.message : String(error)) as Str;
      }
    });
  }

  /**
   * After each render cycle, mark tests with passed=null as successful (no error caught).
   * Uses a double microtask to run AFTER the onerror catch records complete.
   */
  $effect(() => {
    /* Read renderKey to re-trigger on reset */
    const _key: Num = errorBoundaryRenderKey;
    /* Schedule after the recordErrorBoundaryCatch queueMicrotask calls complete */
    queueMicrotask((): void => {
      queueMicrotask((): void => {
        for (const test of errorBoundaryTests) {
          if (test.passed === null) {
            /* For "missing props" and "invalid props", a successful render means the boundary
               DIDN'T catch — which is actually a failure (the component should have thrown). */
            test.passed = false;
            test.errorMessage = '' as Str;
          }
        }
      });
    });
  });

  /**
   * Reset all error boundary tests to re-render.
   */
  function resetErrorBoundaryTests(): Void {
    errorBoundaryRenderKey = ((errorBoundaryRenderKey as number) + 1) as Num;
    for (const test of errorBoundaryTests) {
      test.passed = null;
      test.errorMessage = '' as Str;
    }
    errorBoundaryExportFeedback = 'reset' as Str;
    setTimeout((): void => {
      errorBoundaryExportFeedback = '';
    }, 2000);
  }

  /**
   * Toggle expansion of an individual error boundary test card.
   *
   * @param testId - The test case identifier
   */
  function toggleErrorBoundaryCard(testId: Str): Void {
    const test: ErrorBoundaryTest | undefined = errorBoundaryTests.find(
      (t: ErrorBoundaryTest): boolean => t.id === testId,
    );
    if (test) {
      test.expanded = !test.expanded;
    }
  }

  /**
   * Try parsing custom JSON into props for the custom error test scenario.
   */
  function parseCustomErrorProps(): Void {
    if (!customErrorPropsJson.trim()) {
      customJsonError = '' as Str;
      customParsedProps = [];
      return;
    }
    try {
      const parsed: unknown = JSON.parse(customErrorPropsJson);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        customJsonError = 'Must be a JSON object (e.g., { "label": "test" })' as Str;
        customParsedProps = [];
        return;
      }
      /* Convert JSON object entries to PropMeta array for LensComponentRenderer */
      const entries: Array<[Str, unknown]> = Object.entries(parsed) as Array<[Str, unknown]>;
      customParsedProps = entries.map(
        ([key, val]: [Str, unknown]): PropMeta => ({
          name: key,
          type: typeof val as Str,
          default: JSON.stringify(val) as Str,
          optional: false as Bool,
          bindable: false as Bool,
          description: '' as Str,
        }),
      );
      customJsonError = '' as Str;
    } catch {
      /* JSON parse failed — show error to user */
      customJsonError = 'Invalid JSON syntax' as Str;
      customParsedProps = [];
    }
  }

  /**
   * Handle error boundary section export/copy actions.
   *
   * @param action - The export action to perform
   */
  /**
   * Get a text status icon for a test result.
   *
   * @param passed - Test result (true=pass, false=fail, null=pending)
   * @returns Status character
   */
  function testStatusIcon(passed: Bool | null): Str {
    if (passed === true) return '\u2713' as Str;
    if (passed === false) return '\u2717' as Str;
    return '?' as Str;
  }

  /**
   * Get an emoji status icon for a test result.
   *
   * @param passed - Test result (true=pass, false=fail, null=pending)
   * @returns Status emoji
   */
  function testStatusEmoji(passed: Bool | null): Str {
    if (passed === true) return '\u2705' as Str;
    if (passed === false) return '\u274C' as Str;
    return '\u23F3' as Str;
  }

  async function handleErrorBoundaryExport(action: Str): Promise<void> {
    try {
      if (action === 'copy-results') {
        const lines: Str[] = errorBoundaryTests.map(
          (t: ErrorBoundaryTest): Str =>
            `${testStatusIcon(t.passed)} ${t.title}: ${t.errorMessage || 'No error'}` as Str,
        );
        const text: Str =
          `Error Boundary Tests — ${toTitle(name)}\n${'─'.repeat(40)}\n${lines.join('\n')}` as Str;
        await navigator.clipboard.writeText(text);
      } else if (action === 'copy-markdown') {
        const rows: Str[] = errorBoundaryTests.map(
          (t: ErrorBoundaryTest): Str =>
            `| ${testStatusEmoji(t.passed)} | ${t.title} | ${t.errorMessage || '—'} |` as Str,
        );
        const md: Str =
          `## Error Boundary Tests — ${toTitle(name)}\n\n| Status | Test | Error |\n|--------|------|-------|\n${rows.join('\n')}` as Str;
        await navigator.clipboard.writeText(md);
      }
    } catch {
      /* Clipboard action failed — browser restrictions */
    }
    errorBoundaryExportFeedback = action;
    setTimeout((): void => {
      errorBoundaryExportFeedback = '';
    }, 2000);
  }

  /* ------------------------------------------------------------------ */
  /*  Documentation section                                              */
  /* ------------------------------------------------------------------ */

  /** Feedback state for documentation export actions. */
  let docsExportFeedback: Str = $state('');

  /**
   * Parsed documentation headings for the table of contents.
   * Extracts ## and ### headings from the raw markdown.
   */
  type DocHeading = { level: Num; text: Str; slug: Str };
  const docHeadings: DocHeading[] = $derived.by((): DocHeading[] => {
    if (!docsContent) return [];
    const headings: DocHeading[] = [];
    const lines: Str[] = docsContent.split('\n') as Str[];
    for (const line of lines) {
      const match: RegExpMatchArray | null = line.match(/^(#{2,3})\s+(.+)$/);
      if (match) {
        const level: Num = (match[1]?.length ?? 2) as Num;
        const text: Str = (match[2] ?? '') as Str;
        const slug: Str = text
          .toLowerCase()
          .replaceAll(/[^\w\s-]/g, '')
          .replaceAll(/\s+/g, '-') as Str;
        headings.push({ level, text, slug });
      }
    }
    return headings;
  });

  /** Estimated reading time in minutes. */
  const docsReadingTime: Num = $derived.by((): Num => {
    if (!docsContent) return 0 as Num;
    const wordCount: Num = docsContent.split(/\s+/).length as Num;
    /* Average reading speed: ~200 words per minute */
    return Math.max(1, Math.ceil((wordCount as number) / 200)) as Num;
  });

  /** Word count of the documentation. */
  const docsWordCount: Num = $derived.by((): Num => {
    if (!docsContent) return 0 as Num;
    return docsContent.split(/\s+/).filter((w: Str): boolean => w.length > 0).length as Num;
  });

  /**
   * Render a markdown text segment to HTML.
   * Handles headings, inline code, bold, italic, links, tables, lists, and paragraphs.
   *
   * @param md - Raw markdown text (no code fences)
   * @returns HTML string
   */
  function renderMarkdown(md: Str): Str {
    let html: Str = md;
    /* Headings — process longest prefix first to avoid ### matching ## */
    html = html.replaceAll(/^### (.+)$/gm, (_, text: Str): Str => {
      const slug: Str = text
        .toLowerCase()
        .replaceAll(/[^\w\s-]/g, '')
        .replaceAll(/\s+/g, '-') as Str;
      return `<h3 id="${slug}" class="mt-6 mb-2 scroll-mt-60 text-base font-semibold">${text}</h3>`;
    }) as Str;
    html = html.replaceAll(/^## (.+)$/gm, (_, text: Str): Str => {
      const slug: Str = text
        .toLowerCase()
        .replaceAll(/[^\w\s-]/g, '')
        .replaceAll(/\s+/g, '-') as Str;
      return `<h2 id="${slug}" class="mt-8 mb-3 scroll-mt-60 text-lg font-semibold">${text}</h2>`;
    }) as Str;
    html = html.replaceAll(/^# (.+)$/gm, (_, text: Str): Str => {
      const slug: Str = text
        .toLowerCase()
        .replaceAll(/[^\w\s-]/g, '')
        .replaceAll(/\s+/g, '-') as Str;
      return `<h1 id="${slug}" class="mt-0 mb-4 scroll-mt-60 text-2xl font-bold">${text}</h1>`;
    }) as Str;
    /* Tables — must come before inline formatting to avoid mangling pipe chars */
    html = html.replaceAll(
      /^\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)*)/gm,
      (_match: Str, headerRow: Str, bodyRows: Str): Str => {
        const headers: Str[] = headerRow.split('|').map((h: Str): Str => h.trim()) as Str[];
        const headerCells: Str = headers
          .filter((h: Str): boolean => h.length > 0)
          .map(
            (h: Str): Str =>
              `<th class="border border-border px-3 py-2 text-left text-xs font-medium">${h}</th>`,
          )
          .join('') as Str;
        const rows: Str[] = bodyRows
          .trim()
          .split('\n')
          .filter((r: Str): boolean => r.length > 0) as Str[];
        const bodyHtml: Str = rows
          .map((row: Str): Str => {
            const cells: Str[] = row.split('|').map((c: Str): Str => c.trim()) as Str[];
            const cellHtml: Str = cells
              .filter((c: Str): boolean => c.length > 0)
              .map((c: Str): Str => `<td class="border border-border px-3 py-2 text-xs">${c}</td>`)
              .join('') as Str;
            return `<tr class="even:bg-muted/30">${cellHtml}</tr>`;
          })
          .join('') as Str;
        return `<div class="my-4 overflow-x-auto rounded-lg border border-border"><table class="w-full border-collapse text-sm"><thead class="bg-muted/50"><tr>${headerCells}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
      },
    ) as Str;
    /* Inline code — HTML-escape content so tags like <pre> render as text */
    html = html.replaceAll(/`([^`]+)`/g, (_: Str, code: Str): Str => {
      const escaped: Str = code
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;') as Str;
      return `<code class="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px] break-words">${escaped}</code>`;
    }) as Str;
    /* Bold */
    html = html.replaceAll(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') as Str;
    /* Italic */
    html = html.replaceAll(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>') as Str;
    /* Links */
    html = html.replaceAll(
      /\[([^\]]+)]\(([^)]+)\)/g,
      '<a href="$2" class="text-primary underline underline-offset-4 hover:text-primary/80" target="_blank" rel="noopener">$1</a>',
    ) as Str;
    /* Horizontal rules */
    html = html.replaceAll(/^---$/gm, '<hr class="my-6 border-border" />') as Str;
    /* Ordered lists: consecutive `1. ` lines become an <ol> */
    html = html.replaceAll(/(?:^\d+\. .+\n?)+/gm, (block: Str): Str => {
      const items: Str = block
        .trim()
        .split('\n')
        .map(
          (line: Str): Str =>
            `<li class="ml-4 list-decimal text-sm leading-relaxed">${line.replace(/^\d+\. /, '')}</li>`,
        )
        .join('') as Str;
      return `<ol class="my-3 space-y-1">${items}</ol>`;
    }) as Str;
    /* Unordered lists: consecutive `- ` lines become a <ul> */
    html = html.replaceAll(/(?:^- .+\n?)+/gm, (block: Str): Str => {
      const items: Str = block
        .trim()
        .split('\n')
        .map(
          (line: Str): Str =>
            `<li class="ml-4 list-disc text-sm leading-relaxed">${line.replace(/^- /, '')}</li>`,
        )
        .join('') as Str;
      return `<ul class="my-3 space-y-1">${items}</ul>`;
    }) as Str;
    /* Paragraphs — wrap non-HTML, non-empty lines */
    html = html.replaceAll(
      /^(?!<[a-z/]|$)(.+)$/gm,
      '<p class="my-2 text-sm leading-relaxed">$1</p>',
    ) as Str;
    return html;
  }

  /**
   * Documentation content split into alternating segments of text and code.
   * Text segments are rendered via {@html}, code segments via CodeBlock components.
   */
  type DocSegment = { type: 'text'; html: Str } | { type: 'code'; lang: Str; code: Str };
  const docSegments: DocSegment[] = $derived.by((): DocSegment[] => {
    if (!docsContent) return [];
    const segments: DocSegment[] = [];
    const fenceRegex: RegExp = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex: Num = 0 as Num;
    let match: RegExpExecArray | null = fenceRegex.exec(docsContent);
    while (match !== null) {
      /* Text before this code fence */
      const textBefore: Str = docsContent.slice(lastIndex as number, match.index) as Str;
      if (textBefore.trim()) {
        segments.push({ type: 'text' as const, html: renderMarkdown(textBefore) });
      }
      /* Code block */
      segments.push({
        type: 'code' as const,
        lang: (match[1] ?? 'text') as Str,
        code: (match[2] ?? '').trim() as Str,
      });
      lastIndex = ((match.index ?? 0) + match[0].length) as Num;
      match = fenceRegex.exec(docsContent);
    }
    /* Remaining text after last code fence */
    const remaining: Str = docsContent.slice(lastIndex as number) as Str;
    if (remaining.trim()) {
      segments.push({ type: 'text' as const, html: renderMarkdown(remaining) });
    }
    return segments;
  });

  /**
   * Handle documentation section export/copy actions.
   *
   * @param action - The export action to perform
   */
  async function handleDocsExport(action: Str): Promise<void> {
    if (!docsContent) return;
    try {
      if (action === 'copy-markdown') {
        await navigator.clipboard.writeText(docsContent);
      } else if (action === 'copy-html') {
        const html: Str = docSegments
          .filter((s): s is { type: 'text'; html: Str } => s.type === 'text')
          .map((s) => s.html)
          .join('\n') as Str;
        await navigator.clipboard.writeText(html);
      } else if (action === 'copy-path') {
        const path: Str = `packages/shared/ui/src/${name}/docs.md` as Str;
        await navigator.clipboard.writeText(path);
      } else if (action === 'download') {
        const blob: Blob = new Blob([docsContent], { type: 'text/markdown' });
        const url: Str = URL.createObjectURL(blob) as Str;
        const a: HTMLAnchorElement = document.createElement('a');
        a.href = url;
        a.download = `${name}-docs.md`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      /* Clipboard/download action failed — browser restrictions */
    }
    docsExportFeedback = action;
    setTimeout((): void => {
      docsExportFeedback = '';
    }, 2000);
  }

  /**
   * Generate a starter docs.md template for a component.
   * Copies the template to clipboard so the user can create the file.
   */
  async function generateDocsTemplate(): Promise<void> {
    const title: Str = toTitle(name);
    const tag: Str = toTag(name);
    /* Build template lines to avoid Svelte parser choking on <script> and <Tag /> in template literals */
    const lines: Str[] = [
      `# ${title}`,
      '',
      `A brief description of what the ${title} component does and when to use it.`,
      '',
      '## Features',
      '',
      '- **Feature 1** — Description of the first key feature',
      '- **Feature 2** — Description of the second key feature',
      '- **Feature 3** — Description of the third key feature',
      '',
      '## Quick Start',
      '',
      '```svelte',
      `<${tag} />`,
      '```',
      '',
      '## Usage',
      '',
      '### Basic',
      '',
      'Description of the most basic usage pattern.',
      '',
      '```svelte',
      `<${tag} />`,
      '```',
      '',
      '### With Options',
      '',
      'Description of a more advanced usage pattern.',
      '',
      '```svelte',
      `<${tag} option="value" />`,
      '```',
      '',
      '## Props',
      '',
      '| Prop | Type | Default | Description |',
      '|------|------|---------|-------------|',
      '| `prop1` | `Str` | — | Description of prop1 |',
      '| `prop2` | `Bool` | `false` | Description of prop2 |',
      '',
      '## Accessibility',
      '',
      '- Keyboard navigation details',
      '- Screen reader considerations',
      '- ARIA attributes used',
      '',
      '## Notes',
      '',
      'Any additional notes, caveats, or migration guides.',
      '',
    ] as Str[];
    const template: Str = lines.join('\n') as Str;
    try {
      await navigator.clipboard.writeText(template);
    } catch {
      /* Clipboard failed — browser restrictions */
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Component page export (from LensHeader dropdown)                   */
  /* ------------------------------------------------------------------ */

  /**
   * Build a comprehensive page data object for export.
   *
   * @returns Page data record with component info, props, variants, deps, and changelog
   */
  function buildPageData(): Record<string, unknown> {
    return {
      name,
      description: componentDescription,
      importPath: `@/ui/${name}`,
      meta: lensMeta ? { category: lensMeta.category, tags: [...lensMeta.tags] } : null,
      props: props.map((p) => ({
        name: p.name,
        type: p.type,
        required: !p.optional && !p.default,
        default: p.default || null,
        description: p.description || null,
      })),
      variants: allVariants.map((v) => ({
        key: v.key,
        options: v.options,
        default: v.default,
      })),
      dependencies: {
        internal: deps.internal,
        workspace: deps.workspace,
        external: deps.external,
        usedBy: usedBy.map((r) => ({ component: r.component, names: r.names })),
      },
      changelog: changelog.map((e) => ({
        hash: e.hash,
        message: e.message,
        date: e.date,
        author: e.author,
      })),
    };
  }

  /**
   * Format full page data as a markdown document.
   *
   * @returns Formatted markdown string
   */
  function pageToMarkdown(): Str {
    const sections: Str[] = [
      `# ${toTitle(name)}`,
      ...(componentDescription ? ['', componentDescription] : []),
      ...(lensMeta
        ? ['', `**Category:** ${lensMeta.category}`, `**Tags:** ${lensMeta.tags.join(', ')}`]
        : []),
      '',
      `**Import:** \`@/ui/${name}\``,
    ];

    // Props
    if (props.length > 0) {
      const propsRows: Str[] = props.map((p): Str => {
        let required: Str = 'Yes';
        if (p.optional) required = 'No';
        else if (p.default) required = 'No';
        return `| ${p.name} | ${required} | ${p.type || '—'} | ${p.default || '—'} | ${p.description || '—'} |`;
      });
      sections.push(
        '',
        '## Props',
        '',
        '| Name | Required | Type | Default | Description |',
        '|------|----------|------|---------|-------------|',
        ...propsRows,
      );
    }

    // Variants
    if (allVariants.length > 0) {
      const variantRows: Str[] = allVariants.map(
        (v): Str => `- **${v.key}**: ${v.options.join(', ')} (default: ${v.default})`,
      );
      sections.push('', '## Variants', '', ...variantRows);
    }

    // Dependencies
    if (hasDeps) {
      sections.push('', '## Dependencies', '');
      if (deps.internal.length > 0) sections.push(`**Internal:** ${deps.internal.join(', ')}`);
      if (deps.workspace.length > 0) sections.push(`**Workspace:** ${deps.workspace.join(', ')}`);
      if (deps.external.length > 0) sections.push(`**External:** ${deps.external.join(', ')}`);
      if (usedBy.length > 0)
        sections.push(`**Used by:** ${usedBy.map((r) => r.component).join(', ')}`);
    }

    // Changelog
    if (changelog.length > 0) {
      const changelogRows: Str[] = changelog.map(
        (e): Str =>
          `| ${e.hash} | ${e.message} | ${new Date(e.date).toLocaleString()} | ${e.author} |`,
      );
      sections.push(
        '',
        '## Changelog',
        '',
        '| Hash | Message | Date | Author |',
        '|------|---------|------|--------|',
        ...changelogRows,
      );
    }

    // Cast is safe — array join always returns string, branded Str needed for return type
    return sections.join('\n') as Str;
  }

  /**
   * Handle component page export by format id.
   * Dispatched from LensHeader via `lens:export` CustomEvent.
   *
   * @param formatId - Export format identifier
   */
  async function handlePageExport(formatId: Str): Promise<void> {
    const slug: Str = name.toLowerCase().replaceAll(/\s+/g, '-');
    const data: Record<string, unknown> = buildPageData();

    if (formatId === 'copy-json') {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    } else if (formatId === 'copy-markdown') {
      await navigator.clipboard.writeText(pageToMarkdown());
    } else if (formatId === 'download-json') {
      const blob: Blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url: Str = URL.createObjectURL(blob);
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = url;
      a.download = `${slug}-page.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (formatId === 'download-markdown') {
      const blob: Blob = new Blob([pageToMarkdown()], { type: 'text/markdown' });
      const url: Str = URL.createObjectURL(blob);
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = url;
      a.download = `${slug}-page.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Listen for `lens:scroll-to`, `lens:expand-all`, `lens:collapse-all`,
   * and `lens:export` events from LensHeader.
   */
  $effect(() => {
    async function handleScrollTo(e: Event): Promise<void> {
      const id: Str = (e as CustomEvent).detail;
      // Open the section if collapsed
      if (sectionOpen[id] === false) {
        sectionOpen[id] = true;
      }
      await tick();
      document.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function handleExpandAll(): Void {
      for (const key of Object.keys(sectionOpen)) {
        sectionOpen[key] = true;
      }
    }
    function handleCollapseAll(): Void {
      for (const key of Object.keys(sectionOpen)) {
        sectionOpen[key] = false;
      }
    }
    function handleExport(e: Event): Void {
      const formatId: Str = (e as CustomEvent).detail;
      // CustomEvent detail is string — safe to cast to Str
      handlePageExport(formatId as Str);
    }
    document.addEventListener('lens:scroll-to', handleScrollTo);
    document.addEventListener('lens:expand-all', handleExpandAll);
    document.addEventListener('lens:collapse-all', handleCollapseAll);
    document.addEventListener('lens:export', handleExport);
    return (): void => {
      document.removeEventListener('lens:scroll-to', handleScrollTo);
      document.removeEventListener('lens:expand-all', handleExpandAll);
      document.removeEventListener('lens:collapse-all', handleCollapseAll);
      document.removeEventListener('lens:export', handleExport);
    };
  });
</script>

<div class="w-full">
  {#if !loadError}
    <div class="sticky top-(--header-height) z-10 border-b bg-background px-8 pb-4 pt-10">
      <LensHeader
        {name}
        description={componentDescription}
        meta={lensMeta}
        {hasVariants}
        {hasExamples}
        hasSource={!!rawSource}
        {hasDeps}
        {hasDocs}
        {hasChangelog}
        propCount={props.length}
        variantCount={allVariants.length}
        exampleCount={lensExamples.length}
        changelogCount={changelog.length}
        {prevComponent}
        {nextComponent}
      />
    </div>
  {/if}

  <div class="px-8 py-8">
    <svelte:boundary>
      {#if loading}
        <div class="flex items-center justify-center rounded-xl border py-20">
          <div
            class="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
          ></div>
        </div>
      {:else if loadError}
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <SearchX class="mb-4 size-12 text-muted-foreground/30" strokeWidth={1.5} />
          <h2 class="text-lg font-semibold text-muted-foreground">Component not found</h2>
          <p class="mt-1 max-w-sm text-sm text-muted-foreground/70">
            There is no component named "{name}". Check the URL or use search to find what you're
            looking for.
          </p>
          <a
            href="/components"
            class="mt-6 inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft class="size-4" />
            Back to gallery
          </a>
        </div>
      {:else}
        <div class="space-y-10">
          <!-- ═══ Props ═══ -->
          <section id="props" class="scroll-mt-60">
            <div class="mb-3 flex items-center justify-between">
              <button
                type="button"
                onclick={() => toggleSection('props')}
                class="flex flex-1 items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80"
              >
                <ChevronRight
                  class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen.props
                    ? 'rotate-90'
                    : ''}"
                />
                <TableProperties class="size-5" /> Props
                <span
                  class="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground"
                  >{props.length}</span
                >
              </button>
              {#if props.length > 0}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    {#snippet child({ props: menuProps })}
                      <button
                        {...menuProps}
                        class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Props options"
                      >
                        <EllipsisVertical class="size-4" />
                      </button>
                    {/snippet}
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end" class="w-48">
                    <DropdownMenu.Sub
                      onOpenChange={(open) => {
                        if (open) propsExportSearchQuery = '';
                      }}
                    >
                      <DropdownMenu.SubTrigger>
                        <Download class="size-4" />
                        Export
                      </DropdownMenu.SubTrigger>
                      <DropdownMenu.SubContent
                        class="flex max-h-[28rem] w-64 flex-col overflow-hidden"
                      >
                        <div class="shrink-0 px-2 pb-1.5 pt-1">
                          <div
                            class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                          >
                            <Search
                              class="size-3 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <input
                              type="text"
                              placeholder="Search formats..."
                              class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                              bind:value={propsExportSearchQuery}
                              onkeydown={(e) => e.stopPropagation()}
                              onkeyup={(e) => e.stopPropagation()}
                              onkeypress={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div class="flex min-h-0 flex-1 flex-col overflow-y-auto">
                          {#each filteredPropsExportCategories as category (category)}
                            {#if filteredPropsExportCategories.indexOf(category) > 0}
                              <DropdownMenu.Separator />
                            {/if}
                            <DropdownMenu.Label
                              class="flex items-center gap-1.5 text-xs text-muted-foreground/60"
                            >
                              {#if category === 'Clipboard'}
                                <Clipboard class="size-3" />
                              {:else}
                                <Download class="size-3" />
                              {/if}
                              {category}
                            </DropdownMenu.Label>
                            {#each filteredPropsExportItems.filter((i) => i.category === category) as item (item.id)}
                              <DropdownMenu.Item
                                onSelect={(e) => {
                                  e.preventDefault();
                                  handlePropsExport(item.id);
                                }}
                              >
                                {#if propsExportFeedback === item.id}
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
                          {:else}
                            <div
                              class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
                            >
                              <SearchX class="size-5" />
                              <div class="flex flex-col items-center gap-0.5">
                                <p class="text-xs font-medium">No formats found</p>
                                <p class="text-[11px]">Try a different search term</p>
                              </div>
                            </div>
                          {/each}
                        </div>
                      </DropdownMenu.SubContent>
                    </DropdownMenu.Sub>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              {/if}
            </div>
            {#if sectionOpen.props}
              <div transition:slide={{ duration: 200 }}>
                <PropsTable {props} variantKeys={allVariants.map((v) => v.key)} />
              </div>
            {/if}
          </section>

          <!-- ═══ Default ═══ -->
          {#if PrimaryComponent}
            <section id="default" class="scroll-mt-60">
              <button
                type="button"
                onclick={() => toggleSection('default')}
                class="mb-3 flex w-full items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80"
              >
                <ChevronRight
                  class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen.default
                    ? 'rotate-90'
                    : ''}"
                />
                <ComponentIcon class="size-5" /> Default
              </button>
              {#if sectionOpen.default}
                <div transition:slide={{ duration: 200 }}>
                  <LensSection title="Default" description="Component rendered with default props.">
                    <LensComponentRenderer
                      component={PrimaryComponent}
                      {props}
                      tagName={toTag(name)}
                      componentName={name}
                      silent={isCompound}
                      contextWrapper={lensContextWrapper ?? undefined}
                    />
                  </LensSection>
                </div>
              {/if}
            </section>
          {/if}

          <!-- ═══ Variants ═══ -->
          <section id="variants" class="scroll-mt-60">
            <div class="mb-3 flex items-center justify-between">
              <button
                type="button"
                onclick={() => toggleSection('variants')}
                class="flex flex-1 items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80"
              >
                <ChevronRight
                  class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen.variants
                    ? 'rotate-90'
                    : ''}"
                />
                <Layers class="size-5" /> Variants
                <span
                  class="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground"
                  >{allVariants.length}</span
                >
              </button>
              {#if hasVariants}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    {#snippet child({ props: menuProps })}
                      <button
                        {...menuProps}
                        class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Variants options"
                      >
                        <EllipsisVertical class="size-4" />
                      </button>
                    {/snippet}
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end" class="min-w-56">
                    <LensCardSettingsMenu
                      active={variantSectionActive}
                      onSetting={(settingName, value) => {
                        if (settingName === 'mediaPref') {
                          const mp = value as { pref: Str; value: Str };
                          const prev: Record<Str, Str> =
                            (variantSectionActive.mediaPrefs as Record<Str, Str>) ?? {};
                          variantSectionActive = {
                            ...variantSectionActive,
                            mediaPrefs: { ...prev, [mp.pref]: mp.value },
                          };
                        } else {
                          variantSectionActive = {
                            ...variantSectionActive,
                            [settingName]: value,
                          };
                        }
                        document.dispatchEvent(
                          new CustomEvent('lens:section-settings', {
                            detail: { sectionId: 'variants', setting: settingName, value },
                          }),
                        );
                      }}
                      onReset={() => {
                        variantSectionActive = {};
                        document.dispatchEvent(
                          new CustomEvent('lens:section-settings', {
                            detail: { sectionId: 'variants', setting: 'reset', value: null },
                          }),
                        );
                      }}
                      showExport={false}
                    />
                    <DropdownMenu.Separator />
                    <DropdownMenu.Sub>
                      <DropdownMenu.SubTrigger>
                        <Download class="size-4" />
                        Export
                      </DropdownMenu.SubTrigger>
                      <DropdownMenu.SubContent class="min-w-48">
                        <DropdownMenu.Item
                          onSelect={(e) => {
                            e.preventDefault();
                            document.dispatchEvent(
                              new CustomEvent('lens:section-export', {
                                detail: { sectionId: 'variants', exportId: 'stats' },
                              }),
                            );
                            variantExportFeedback = 'stats' as Str;
                            setTimeout((): Void => {
                              variantExportFeedback = '' as Str;
                            }, 2000);
                          }}
                        >
                          {#if variantExportFeedback === 'stats'}
                            <span in:fade={{ duration: 150 }}>
                              <Check class="size-4 text-green-500" />
                            </span>
                          {:else}
                            <Braces class="size-4" />
                          {/if}
                          Export Performance Statistics
                        </DropdownMenu.Item>
                      </DropdownMenu.SubContent>
                    </DropdownMenu.Sub>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              {/if}
            </div>
            {#if sectionOpen.variants}
              <div transition:slide={{ duration: 200 }}>
                {#if hasVariants && PrimaryComponent}
                  <div class="space-y-4">
                    {#each allVariants as variantKey (variantKey.key)}
                      {@const singleMeta: VariantMeta = { variants: [variantKey] }}
                      <div id="variant-{variantKey.key}" class="scroll-mt-60">
                        <LensSection
                          title={toTitle(variantKey.key)}
                          description="Options for the {variantKey.key} prop."
                          propName={variantKey.key}
                        >
                          <LensComponentRenderer
                            component={PrimaryComponent}
                            meta={singleMeta}
                            {props}
                            tagName={toTag(name)}
                            componentName={name}
                            silent={isCompound}
                            contextWrapper={lensContextWrapper ?? undefined}
                            sectionId="variants"
                          />
                        </LensSection>
                      </div>
                    {/each}
                  </div>
                {:else}
                  <LensEmpty
                    title="No variants detected"
                    description="Add a tv() call in the component's <script module> to auto-generate variant cards."
                  />
                {/if}
              </div>
            {/if}
          </section>

          <!-- ═══ Examples ═══ -->
          <section id="examples" class="scroll-mt-60">
            <div class="mb-3 flex items-center justify-between">
              <button
                type="button"
                onclick={() => toggleSection('examples')}
                class="flex flex-1 items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80"
              >
                <ChevronRight
                  class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen.examples
                    ? 'rotate-90'
                    : ''}"
                />
                <BookOpen class="size-5" /> Examples
                <span
                  class="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground"
                  >{lensExamples.length}</span
                >
              </button>
              {#if hasExamples}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    {#snippet child({ props: menuProps })}
                      <button
                        {...menuProps}
                        class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Examples options"
                      >
                        <EllipsisVertical class="size-4" />
                      </button>
                    {/snippet}
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end" class="min-w-56">
                    <LensCardSettingsMenu
                      active={exampleSectionActive}
                      onSetting={(settingName, value) => {
                        if (settingName === 'mediaPref') {
                          const mp = value as { pref: Str; value: Str };
                          const prev: Record<Str, Str> =
                            (exampleSectionActive.mediaPrefs as Record<Str, Str>) ?? {};
                          exampleSectionActive = {
                            ...exampleSectionActive,
                            mediaPrefs: { ...prev, [mp.pref]: mp.value },
                          };
                        } else {
                          exampleSectionActive = {
                            ...exampleSectionActive,
                            [settingName]: value,
                          };
                        }
                        document.dispatchEvent(
                          new CustomEvent('lens:section-settings', {
                            detail: { sectionId: 'examples', setting: settingName, value },
                          }),
                        );
                      }}
                      onReset={() => {
                        exampleSectionActive = {};
                        document.dispatchEvent(
                          new CustomEvent('lens:section-settings', {
                            detail: { sectionId: 'examples', setting: 'reset', value: null },
                          }),
                        );
                      }}
                      showExport={false}
                    />
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              {/if}
            </div>
            {#if sectionOpen.examples}
              <div transition:slide={{ duration: 200 }}>
                {#if hasExamples}
                  <div class="space-y-4">
                    {#each lensExamples as example (example.name)}
                      {@const ExComponent: Component | undefined = exampleComponents.get(example.name)}
                      {@const exSource: Str = exampleSources.get(example.name) ?? ''}
                      {#if ExComponent}
                        <div id="example-{example.name}" class="scroll-mt-60">
                          <LensSection title={example.title} description={example.description}>
                            <LensComponentRenderer
                              component={ExComponent}
                              componentName={name}
                              codeText={exSource}
                              sectionId="examples"
                            >
                              {#snippet children()}
                                <ExComponent />
                              {/snippet}
                            </LensComponentRenderer>
                          </LensSection>
                        </div>
                      {/if}
                    {/each}
                  </div>
                {:else}
                  <LensEmpty
                    title="No examples"
                    description="Create a lens.ts and examples/ directory in this component's folder to add live examples."
                  />
                {/if}
              </div>
            {/if}
          </section>

          <!-- ═══ Error Boundary ═══ -->
          {#if PrimaryComponent}
            <section id="error-boundary" class="scroll-mt-60">
              <div class="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onclick={() => toggleSection('error-boundary')}
                  class="flex flex-1 items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80"
                >
                  <ChevronRight
                    class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen[
                      'error-boundary'
                    ]
                      ? 'rotate-90'
                      : ''}"
                  />
                  <ShieldAlert class="size-5" /> Error Boundary
                  <Tooltip.Provider>
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        {#snippet child({ props: badgeProps })}
                          <span
                            {...badgeProps}
                            class="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground"
                            >{errorBoundaryTestCount} tests</span
                          >
                        {/snippet}
                      </Tooltip.Trigger>
                      <Tooltip.Content>Error boundary validation test cases</Tooltip.Content>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                  {#if errorBoundaryPassCount > 0 || errorBoundaryFailCount > 0}
                    <span class="flex items-center gap-1.5 text-xs font-normal">
                      {#if errorBoundaryPassCount > 0}
                        <Tooltip.Provider>
                          <Tooltip.Root>
                            <Tooltip.Trigger>
                              {#snippet child({ props: passProps })}
                                <span {...passProps} class="flex items-center gap-1 text-green-500">
                                  <CircleCheck class="size-3" />{errorBoundaryPassCount}
                                </span>
                              {/snippet}
                            </Tooltip.Trigger>
                            <Tooltip.Content
                              >Tests passed — error boundary caught the error</Tooltip.Content
                            >
                          </Tooltip.Root>
                        </Tooltip.Provider>
                      {/if}
                      {#if errorBoundaryFailCount > 0}
                        <Tooltip.Provider>
                          <Tooltip.Root>
                            <Tooltip.Trigger>
                              {#snippet child({ props: failProps })}
                                <span {...failProps} class="flex items-center gap-1 text-red-500">
                                  <CircleX class="size-3" />{errorBoundaryFailCount}
                                </span>
                              {/snippet}
                            </Tooltip.Trigger>
                            <Tooltip.Content
                              >Tests failed — error was not caught as expected</Tooltip.Content
                            >
                          </Tooltip.Root>
                        </Tooltip.Provider>
                      {/if}
                    </span>
                  {/if}
                </button>
                <div class="flex items-center gap-1">
                  <Tooltip.Provider>
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        {#snippet child({ props: tipProps })}
                          <button
                            {...tipProps}
                            type="button"
                            class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label="Re-run all error boundary tests"
                            onclick={resetErrorBoundaryTests}
                          >
                            {#if errorBoundaryExportFeedback === 'reset'}
                              <span in:fade={{ duration: 150 }}
                                ><Check class="size-3.5 text-green-500" /></span
                              >
                            {:else}
                              <RefreshCw class="size-3.5" />
                            {/if}
                          </button>
                        {/snippet}
                      </Tooltip.Trigger>
                      <Tooltip.Content>Re-run all tests</Tooltip.Content>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                      {#snippet child({ props: menuProps })}
                        <button
                          {...menuProps}
                          class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label="Error boundary options"
                        >
                          <EllipsisVertical class="size-4" />
                        </button>
                      {/snippet}
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end" class="w-52">
                      <DropdownMenu.Item
                        onSelect={(e) => {
                          e.preventDefault();
                          handleErrorBoundaryExport('copy-results');
                        }}
                      >
                        {#if errorBoundaryExportFeedback === 'copy-results'}
                          <span in:fade={{ duration: 150 }}
                            ><Check class="size-4 text-green-500" /></span
                          >
                        {:else}
                          <ClipboardCopy class="size-4" />
                        {/if}
                        Copy Results
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onSelect={(e) => {
                          e.preventDefault();
                          handleErrorBoundaryExport('copy-markdown');
                        }}
                      >
                        {#if errorBoundaryExportFeedback === 'copy-markdown'}
                          <span in:fade={{ duration: 150 }}
                            ><Check class="size-4 text-green-500" /></span
                          >
                        {:else}
                          <FileText class="size-4" />
                        {/if}
                        Copy as Markdown
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item
                        onSelect={(e) => {
                          e.preventDefault();
                          resetErrorBoundaryTests();
                        }}
                      >
                        {#if errorBoundaryExportFeedback === 'reset'}
                          <span in:fade={{ duration: 150 }}
                            ><Check class="size-4 text-green-500" /></span
                          >
                        {:else}
                          <RefreshCw class="size-4" />
                        {/if}
                        Re-run All Tests
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onSelect={(e) => {
                          e.preventDefault();
                          showCustomErrorTest = !showCustomErrorTest;
                        }}
                      >
                        <Plus class="size-4" />
                        {showCustomErrorTest ? 'Hide' : 'Show'} Custom Scenario
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </div>
              </div>
              {#if sectionOpen['error-boundary']}
                <div transition:slide={{ duration: 200 }}>
                  <div class="space-y-3">
                    <!-- Custom error scenario (first card) -->
                    {#if showCustomErrorTest}
                      <div
                        class="rounded-lg border border-dashed"
                        transition:slide={{ duration: 200 }}
                      >
                        <div class="flex items-center gap-2 px-4 py-2.5">
                          <Braces class="size-4 shrink-0 text-muted-foreground" />
                          <span class="flex-1 text-sm font-medium">Custom Error Scenario</span>
                        </div>
                        <div class="border-t px-4 py-3">
                          <p class="mb-2 text-xs text-muted-foreground">
                            Enter a JSON object of props to test (e.g., <code
                              class="rounded bg-muted px-1 py-0.5 font-mono text-[11px]"
                              >{'{"label": 42}'}</code
                            >)
                          </p>
                          <div class="flex gap-2">
                            <input
                              type="text"
                              class={cn(
                                'flex-1 rounded-md border bg-transparent px-3 py-1.5 font-mono text-xs outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring',
                                customJsonError ? 'border-destructive/50' : '',
                              )}
                              placeholder={'{"unknownProp": "value"}'}
                              bind:value={customErrorPropsJson}
                              oninput={parseCustomErrorProps}
                              onkeydown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  parseCustomErrorProps();
                                }
                              }}
                            />
                            <button
                              type="button"
                              class="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                              onclick={parseCustomErrorProps}
                              disabled={!customErrorPropsJson.trim()}
                            >
                              <Play class="size-3" /> Run
                            </button>
                          </div>
                          {#if customJsonError}
                            <div
                              class="mt-2 flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-1.5"
                            >
                              <AlertCircle class="size-3.5 shrink-0 text-destructive/70" />
                              <p class="text-xs text-destructive/80">{customJsonError}</p>
                            </div>
                          {/if}
                          {#if customParsedProps.length > 0}
                            <div class="mt-3">
                              <svelte:boundary>
                                <LensComponentRenderer
                                  component={PrimaryComponent}
                                  props={customParsedProps}
                                  tagName={toTag(name)}
                                  componentName={name}
                                  label=""
                                  silent={true}
                                  contextWrapper={lensContextWrapper ?? undefined}
                                  codeText={`<!-- Custom props test -->\n<${toTag(name)} ${customErrorPropsJson} />`}
                                />
                                {#snippet failed(error)}
                                  <LensError
                                    title="Validation Error"
                                    description={error instanceof Error
                                      ? error.message
                                      : String(error)}
                                  />
                                {/snippet}
                              </svelte:boundary>
                            </div>
                          {/if}
                        </div>
                      </div>
                    {/if}
                    {#each errorBoundaryTests as test (test.id + '-' + errorBoundaryRenderKey)}
                      <div class="rounded-lg border">
                        <!-- Test card header -->
                        <button
                          type="button"
                          onclick={() => toggleErrorBoundaryCard(test.id)}
                          class="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-muted/50"
                        >
                          {#if test.passed === true}
                            <span in:fade={{ duration: 150 }}>
                              <CircleCheck class="size-4 shrink-0 text-green-500" />
                            </span>
                          {:else if test.passed === false}
                            <span in:fade={{ duration: 150 }}>
                              <CircleX class="size-4 shrink-0 text-red-500" />
                            </span>
                          {:else}
                            <div
                              class="size-4 shrink-0 rounded-full border-2 border-muted-foreground/30"
                            ></div>
                          {/if}
                          <span class="flex-1">{test.title}</span>
                          <ChevronRight
                            class="size-3.5 text-muted-foreground transition-transform duration-200 {test.expanded
                              ? 'rotate-90'
                              : ''}"
                          />
                        </button>
                        {#if test.expanded}
                          <div class="border-t" transition:slide={{ duration: 200 }}>
                            <p class="px-4 pt-2 text-xs text-muted-foreground">
                              {test.description}
                            </p>
                            <!-- Error message display -->
                            {#if test.errorMessage}
                              <div
                                class="mx-4 mt-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2"
                              >
                                <p
                                  class="font-mono text-[11px] leading-relaxed text-destructive/80"
                                >
                                  {test.errorMessage}
                                </p>
                              </div>
                            {/if}
                            <div class="p-4 pt-2">
                              {#if test.id === 'missing-props'}
                                <svelte:boundary
                                  onerror={(error) =>
                                    recordErrorBoundaryCatch('missing-props' as Str, error)}
                                >
                                  <LensComponentRenderer
                                    component={PrimaryComponent}
                                    tagName={toTag(name)}
                                    componentName={name}
                                    label=""
                                    silent={true}
                                    contextWrapper={lensContextWrapper ?? undefined}
                                    codeText={`<!-- Missing required props — validation error -->\n<${toTag(name)} />`}
                                  />
                                  {#snippet failed(error)}
                                    <LensError
                                      title="Validation Error"
                                      description={error instanceof Error
                                        ? error.message
                                        : String(error)}
                                    />
                                  {/snippet}
                                </svelte:boundary>
                              {:else if test.id === 'invalid-props'}
                                <svelte:boundary
                                  onerror={(error) =>
                                    recordErrorBoundaryCatch('invalid-props' as Str, error)}
                                >
                                  <LensComponentRenderer
                                    component={PrimaryComponent}
                                    props={[
                                      {
                                        name: '__invalid__',
                                        type: 'unknown',
                                        default: "'test'",
                                        optional: false,
                                        bindable: false,
                                        description: '',
                                      },
                                    ]}
                                    tagName={toTag(name)}
                                    componentName={name}
                                    label=""
                                    silent={true}
                                    contextWrapper={lensContextWrapper ?? undefined}
                                    codeText={`<!-- Unknown prop key — strictObject rejection -->\n<${toTag(name)} __invalid__="test" />`}
                                  />
                                  {#snippet failed(error)}
                                    <LensError
                                      title="Validation Error"
                                      description={error instanceof Error
                                        ? error.message
                                        : String(error)}
                                    />
                                  {/snippet}
                                </svelte:boundary>
                              {/if}
                            </div>
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </section>
          {/if}

          <!-- ═══ Source ═══ -->
          {#if rawSource}
            <section id="source" class="scroll-mt-60">
              <div class="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onclick={() => toggleSection('source')}
                  class="flex flex-1 items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80"
                >
                  <ChevronRight
                    class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen.source
                      ? 'rotate-90'
                      : ''}"
                  />
                  <FileCode class="size-5" /> Source
                  <span
                    class="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground"
                    >{sourceLineCount} lines</span
                  >
                  {#if relatedFiles.length > 0}
                    <span
                      class="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground"
                    >
                      <FolderOpen class="mr-0.5 inline size-3" />{relatedFiles.length + 1} files
                    </span>
                  {/if}
                </button>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    {#snippet child({ props })}
                      <button
                        {...props}
                        class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Source options"
                      >
                        <EllipsisVertical class="size-4" />
                      </button>
                    {/snippet}
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end" class="w-52">
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        handleSourceExport('copy-source');
                      }}
                    >
                      {#if sourceExportFeedback === 'copy-source'}
                        <span in:fade={{ duration: 150 }}
                          ><Check class="size-4 text-green-500" /></span
                        >
                      {:else}
                        <ClipboardCopy class="size-4" />
                      {/if}
                      Copy Source
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        handleSourceExport('copy-markdown');
                      }}
                    >
                      {#if sourceExportFeedback === 'copy-markdown'}
                        <span in:fade={{ duration: 150 }}
                          ><Check class="size-4 text-green-500" /></span
                        >
                      {:else}
                        <FileText class="size-4" />
                      {/if}
                      Copy as Markdown
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        handleSourceExport('copy-path');
                      }}
                    >
                      {#if sourceExportFeedback === 'copy-path'}
                        <span in:fade={{ duration: 150 }}
                          ><Check class="size-4 text-green-500" /></span
                        >
                      {:else}
                        <Clipboard class="size-4" />
                      {/if}
                      Copy File Path
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        handleSourceExport('download');
                      }}
                    >
                      <Download class="size-4" />
                      Download {activeFileLabel}
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </div>
              {#if sectionOpen.source}
                <div transition:slide={{ duration: 200 }}>
                  <!-- File tabs (shown when related files exist) -->
                  {#if relatedFiles.length > 0}
                    <div class="mb-2 flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1">
                      <button
                        type="button"
                        class={cn(
                          'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                          !activeSourceFile
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                        onclick={() => {
                          activeSourceFile = '';
                        }}
                      >
                        {toTitle(name)}.svelte
                      </button>
                      {#each relatedFiles as file (file.key)}
                        <button
                          type="button"
                          class={cn(
                            'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                            activeSourceFile === file.key
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                          onclick={() => {
                            activeSourceFile = file.key;
                          }}
                        >
                          {file.label}
                        </button>
                      {/each}
                    </div>
                  {/if}
                  <LensSource
                    {name}
                    source={activeFileSource}
                    lang={activeFileLang}
                    title={activeFileLabel}
                    showLineNumbers
                    showSearch
                  />
                </div>
              {/if}
            </section>
          {/if}

          <!-- ═══ Documentation ═══ -->
          <section id="docs" class="scroll-mt-60">
            <div class="mb-3 flex items-center justify-between">
              <button
                type="button"
                onclick={() => toggleSection('docs')}
                class="flex flex-1 items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80"
              >
                <ChevronRight
                  class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen.docs
                    ? 'rotate-90'
                    : ''}"
                />
                <FileText class="size-5" /> Documentation
                {#if hasDocs}
                  <span
                    class="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground"
                  >
                    <Clock class="size-3" />{docsReadingTime} min read
                  </span>
                {/if}
              </button>
              {#if hasDocs}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    {#snippet child({ props: menuProps })}
                      <button
                        {...menuProps}
                        class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Documentation options"
                      >
                        <EllipsisVertical class="size-4" />
                      </button>
                    {/snippet}
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end" class="w-52">
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        handleDocsExport('copy-markdown');
                      }}
                    >
                      {#if docsExportFeedback === 'copy-markdown'}
                        <span in:fade={{ duration: 150 }}
                          ><Check class="size-4 text-green-500" /></span
                        >
                      {:else}
                        <ClipboardCopy class="size-4" />
                      {/if}
                      Copy as Markdown
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        handleDocsExport('copy-html');
                      }}
                    >
                      {#if docsExportFeedback === 'copy-html'}
                        <span in:fade={{ duration: 150 }}
                          ><Check class="size-4 text-green-500" /></span
                        >
                      {:else}
                        <Copy class="size-4" />
                      {/if}
                      Copy as HTML
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        handleDocsExport('copy-path');
                      }}
                    >
                      {#if docsExportFeedback === 'copy-path'}
                        <span in:fade={{ duration: 150 }}
                          ><Check class="size-4 text-green-500" /></span
                        >
                      {:else}
                        <Clipboard class="size-4" />
                      {/if}
                      Copy File Path
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        handleDocsExport('download');
                      }}
                    >
                      <Download class="size-4" />
                      Download docs.md
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              {/if}
            </div>
            {#if sectionOpen.docs}
              <div transition:slide={{ duration: 200 }}>
                {#if hasDocs}
                  <div class="flex gap-6">
                    <!-- Table of contents sidebar -->
                    {#if docHeadings.length > 2}
                      <nav class="hidden w-48 shrink-0 lg:block" aria-label="Table of contents">
                        <div class="sticky top-60">
                          <p
                            class="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                          >
                            <ListTree class="size-3" /> On this page
                          </p>
                          <ul class="space-y-1 border-l">
                            {#each docHeadings as heading (heading.slug)}
                              <li>
                                <a
                                  href="#{heading.slug}"
                                  class={cn(
                                    'block border-l-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground',
                                    (heading.level as number) === 2 ? '-ml-px pl-3' : '-ml-px pl-6',
                                  )}
                                >
                                  {heading.text}
                                </a>
                              </li>
                            {/each}
                          </ul>
                          <p class="mt-3 text-[10px] text-muted-foreground/50">
                            {docsWordCount} words
                          </p>
                        </div>
                      </nav>
                    {/if}
                    <!-- Documentation content -->
                    <div
                      class="prose prose-sm dark:prose-invert min-w-0 max-w-none flex-1 overflow-hidden rounded-lg border bg-card p-6 [overflow-wrap:break-word]"
                    >
                      {#each docSegments as segment, i (i)}
                        {#if segment.type === 'text'}
                          <!-- eslint-disable-next-line svelte/no-at-html-tags -- Markdown HTML is generated from trusted docs.md content -->
                          {@html segment.html}
                        {:else}
                          <CodeBlock
                            code={segment.code}
                            lang={segment.lang}
                            showLineNumbers
                            class="my-4"
                          />
                        {/if}
                      {/each}
                    </div>
                  </div>
                {:else}
                  <div class="rounded-lg border border-dashed bg-muted/20 px-6 py-8 text-center">
                    <FileText
                      class="mx-auto mb-3 size-10 text-muted-foreground/30"
                      strokeWidth={1.5}
                    />
                    <p class="text-sm font-medium text-muted-foreground">
                      No documentation available
                    </p>
                    <p class="mt-1 text-xs text-muted-foreground/60">
                      Add a <code class="rounded bg-muted px-1 py-0.5 font-mono text-[11px]"
                        >docs.md</code
                      > file to the component directory to add documentation.
                    </p>
                    <div class="mt-4 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        class="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        onclick={async () => {
                          await generateDocsTemplate();
                          docsExportFeedback = 'template';
                          setTimeout(() => {
                            docsExportFeedback = '';
                          }, 3000);
                        }}
                      >
                        {#if docsExportFeedback === 'template'}
                          <span in:fade={{ duration: 150 }}
                            ><Check class="size-3 text-green-500" /></span
                          >
                          Template copied!
                        {:else}
                          <Pencil class="size-3" />
                          Copy docs.md template
                        {/if}
                      </button>
                      <button
                        type="button"
                        class="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        onclick={async () => {
                          const path = `packages/shared/ui/src/${name}/docs.md`;
                          try {
                            await navigator.clipboard.writeText(path);
                          } catch {
                            /* Clipboard failed — browser restrictions */
                          }
                          docsExportFeedback = 'path';
                          setTimeout(() => {
                            docsExportFeedback = '';
                          }, 2000);
                        }}
                      >
                        {#if docsExportFeedback === 'path'}
                          <span in:fade={{ duration: 150 }}
                            ><Check class="size-3 text-green-500" /></span
                          >
                          Path copied!
                        {:else}
                          <Clipboard class="size-3" />
                          Copy file path
                        {/if}
                      </button>
                    </div>
                  </div>
                {/if}
              </div>
            {/if}
          </section>

          <!-- ═══ Dependencies ═══ -->
          {#if hasDeps}
            <section id="dependencies" class="scroll-mt-60">
              <button
                type="button"
                onclick={() => toggleSection('dependencies')}
                class="mb-3 flex w-full items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80"
              >
                <ChevronRight
                  class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen.dependencies
                    ? 'rotate-90'
                    : ''}"
                />
                <GitFork class="size-5" /> Dependencies
              </button>
              {#if sectionOpen.dependencies}
                <div transition:slide={{ duration: 200 }}>
                  <LensDependencyTree
                    {deps}
                    {usedBy}
                    currentComponent={name}
                    sizes={componentSizes}
                    knownComponents={componentNames}
                    {rawSources}
                  />
                </div>
              {/if}
            </section>
          {/if}

          <!-- ═══ Changelog ═══ -->
          {#if hasChangelog}
            <section id="changelog" class="scroll-mt-60">
              <div class="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onclick={() => toggleSection('changelog')}
                  class="flex flex-1 items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80"
                >
                  <ChevronRight
                    class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen.changelog
                      ? 'rotate-90'
                      : ''}"
                  />
                  <History class="size-5" /> Changelog
                  {#if changelogLoading}
                    <LoaderCircle class="size-4 animate-spin text-muted-foreground" />
                  {:else}
                    <span
                      class="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground"
                      >{changelog.length}</span
                    >
                  {/if}
                </button>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    {#snippet child({ props })}
                      <button
                        {...props}
                        class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Changelog options"
                      >
                        <EllipsisVertical class="size-4" />
                      </button>
                    {/snippet}
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end" class="w-56">
                    <!-- Quick copy actions -->
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        handleChangelogExport('copy-markdown');
                      }}
                    >
                      {#if changelogExportFeedback === 'copy-markdown'}
                        <span in:fade={{ duration: 150 }}
                          ><Check class="size-4 text-green-500" /></span
                        >
                      {:else}
                        <ClipboardCopy class="size-4" />
                      {/if}
                      Copy as Markdown
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        handleChangelogExport('copy-json');
                      }}
                    >
                      {#if changelogExportFeedback === 'copy-json'}
                        <span in:fade={{ duration: 150 }}
                          ><Check class="size-4 text-green-500" /></span
                        >
                      {:else}
                        <ClipboardCopy class="size-4" />
                      {/if}
                      Copy as JSON
                    </DropdownMenu.Item>
                    {#if selectedChangelogRows.size > 0}
                      <DropdownMenu.Item
                        onSelect={(e) => {
                          e.preventDefault();
                          copySelectedChangelog();
                        }}
                      >
                        <Clipboard class="size-4" />
                        Copy {selectedChangelogRows.size} Selected
                      </DropdownMenu.Item>
                    {/if}
                    <DropdownMenu.Separator />
                    <DropdownMenu.Sub
                      onOpenChange={(open) => {
                        if (open) changelogExportSearchQuery = '';
                      }}
                    >
                      <DropdownMenu.SubTrigger>
                        <Download class="size-4" />
                        Export
                      </DropdownMenu.SubTrigger>
                      <DropdownMenu.SubContent
                        class="flex max-h-[28rem] w-64 flex-col overflow-hidden"
                      >
                        <div class="shrink-0 px-2 pb-1.5 pt-1">
                          <div
                            class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                          >
                            <Search
                              class="size-3 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <input
                              type="text"
                              placeholder="Search formats..."
                              class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                              bind:value={changelogExportSearchQuery}
                              onkeydown={(e) => e.stopPropagation()}
                              onkeyup={(e) => e.stopPropagation()}
                              onkeypress={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div class="flex min-h-0 flex-1 flex-col overflow-y-auto">
                          {#each filteredChangelogExportCategories as category (category)}
                            {#if filteredChangelogExportCategories.indexOf(category) > 0}
                              <DropdownMenu.Separator />
                            {/if}
                            <DropdownMenu.Label
                              class="flex items-center gap-1.5 text-xs text-muted-foreground/60"
                            >
                              {#if category === 'Clipboard'}
                                <Clipboard class="size-3" />
                              {:else}
                                <Download class="size-3" />
                              {/if}
                              {category}
                            </DropdownMenu.Label>
                            {#each filteredChangelogExportItems.filter((i) => i.category === category) as item (item.id)}
                              <DropdownMenu.Item
                                onSelect={(e) => {
                                  e.preventDefault();
                                  handleChangelogExport(item.id);
                                }}
                              >
                                {#if changelogExportFeedback === item.id}
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
                          {:else}
                            <div
                              class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
                            >
                              <SearchX class="size-5" />
                              <div class="flex flex-col items-center gap-0.5">
                                <p class="text-xs font-medium">No formats found</p>
                                <p class="text-[11px]">Try a different search term</p>
                              </div>
                            </div>
                          {/each}
                        </div>
                      </DropdownMenu.SubContent>
                    </DropdownMenu.Sub>
                    {#if changelogRepoUrl && changelogComponentPath}
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item
                        onclick={() => {
                          window.open(
                            `${changelogRepoUrl}/commits/main/${changelogComponentPath}`,
                            '_blank',
                          );
                        }}
                      >
                        <GitCommitHorizontal class="size-4" />
                        View Full History
                      </DropdownMenu.Item>
                    {/if}
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </div>
              {#if sectionOpen.changelog}
                <div transition:slide={{ duration: 200 }}>
                  {#if changelogLoading}
                    <!-- Loading skeleton -->
                    <div class="flex items-center justify-center rounded-lg border py-12">
                      <div class="flex flex-col items-center gap-2 text-muted-foreground">
                        <LoaderCircle class="size-5 animate-spin" />
                        <span class="text-xs">Loading changelog...</span>
                      </div>
                    </div>
                  {:else if changelogError}
                    <!-- Error state with retry -->
                    <div
                      class="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 py-12"
                    >
                      <AlertCircle class="size-6 text-destructive" />
                      <div class="flex flex-col items-center gap-1">
                        <p class="text-sm font-medium text-destructive">
                          {changelogError}
                        </p>
                        <button
                          type="button"
                          class="mt-1 rounded-md bg-muted px-3 py-1 text-xs font-medium transition-colors hover:bg-muted/80"
                          onclick={retryChangelog}
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  {:else if changelog.length === 0}
                    <!-- Empty state -->
                    <div
                      class="flex flex-col items-center justify-center gap-2 rounded-lg border py-12 text-muted-foreground"
                    >
                      <History class="size-6" />
                      <div class="flex flex-col items-center gap-0.5">
                        <p class="text-sm font-medium">No changelog entries</p>
                        <p class="text-xs">No git commits found for this component</p>
                      </div>
                    </div>
                  {:else}
                    <!-- Search bar -->
                    {#if changelog.length > 5}
                      <div class="mb-2">
                        <div
                          class="flex items-center gap-2 rounded-md border bg-transparent px-3 py-1.5 text-sm"
                        >
                          <Search
                            class="size-3.5 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <input
                            type="text"
                            placeholder="Filter by hash, message, or author..."
                            class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            bind:value={changelogSearchQuery}
                          />
                          {#if changelogSearchQuery}
                            <span class="shrink-0 text-[10px] text-muted-foreground/60">
                              {filteredChangelog.length}/{changelog.length}
                            </span>
                          {/if}
                        </div>
                      </div>
                    {/if}
                    {#if filteredChangelog.length === 0}
                      <div
                        class="flex flex-col items-center justify-center gap-2 rounded-lg border py-8 text-muted-foreground"
                      >
                        <SearchX class="size-5" />
                        <div class="flex flex-col items-center gap-0.5">
                          <p class="text-xs font-medium">No matching entries</p>
                          <p class="text-[11px]">Try a different search term</p>
                        </div>
                      </div>
                    {:else}
                      <!-- Showing X of Y count -->
                      {#if changelogTotal > changelog.length}
                        <p class="mb-1.5 text-[11px] text-muted-foreground/60">
                          Showing {changelog.length} of {changelogTotal} commits
                        </p>
                      {/if}
                      <div class="rounded-lg border bg-card">
                        <!-- Selection bar or hint -->
                        {#if selectedChangelogRows.size > 0}
                          <div
                            class="flex items-center gap-2 border-b bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground"
                          >
                            <span class="font-medium">{selectedChangelogRows.size} selected</span>
                            <button
                              type="button"
                              class="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
                              onclick={copySelectedChangelog}
                            >
                              <Copy class="mr-1 inline size-3" />
                              Copy Selected
                            </button>
                            <button
                              type="button"
                              class="text-muted-foreground/60 hover:text-foreground"
                              onclick={() => {
                                selectedChangelogRows = new Set();
                              }}>Clear</button
                            >
                          </div>
                        {:else}
                          <div class="border-b px-4 py-1 text-[11px] text-muted-foreground/40">
                            Click rows to select for batch copy
                          </div>
                        {/if}
                        <table class="w-full table-fixed text-sm">
                          <thead>
                            <tr class="border-b text-left text-xs text-muted-foreground">
                              <th class="w-20 px-4 py-2">Hash</th>
                              <th class="px-4 py-2">Message</th>
                              <th class="w-32 px-4 py-2">Date</th>
                              <th class="w-32 px-4 py-2">Author</th>
                              <th class="w-16 px-2 py-2"><span class="sr-only">Actions</span></th>
                            </tr>
                          </thead>
                          <tbody>
                            {#each paginatedChangelog as entry (entry.hash)}
                              <tr
                                class={cn(
                                  'border-b last:border-b-0 cursor-pointer transition-colors',
                                  selectedChangelogRows.has(entry.hash)
                                    ? 'bg-primary/5 hover:bg-primary/10'
                                    : 'hover:bg-muted/50',
                                )}
                                role="button"
                                tabindex="0"
                                onclick={() => toggleChangelogRow(entry.hash)}
                                onkeydown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleChangelogRow(entry.hash);
                                  }
                                }}
                              >
                                <td class="px-4 py-2">
                                  {#if changelogRepoUrl}
                                    <a
                                      href="{changelogRepoUrl}/commit/{entry.hash}{changelogDiffAnchor
                                        ? `#diff-${changelogDiffAnchor}`
                                        : ''}"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-primary hover:underline"
                                      onclick={(e: MouseEvent): void => e.stopPropagation()}
                                      >{entry.hash}</a
                                    >
                                  {:else}
                                    <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                                      >{entry.hash}</code
                                    >
                                  {/if}
                                </td>
                                <td class="px-4 py-2 text-sm">
                                  <div class="min-w-0">
                                    <div class="flex items-center gap-1">
                                      {#if entry.body}
                                        <button
                                          type="button"
                                          class="shrink-0 rounded p-0.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                                          onclick={(e: MouseEvent): void => {
                                            e.stopPropagation();
                                            toggleChangelogExpand(entry.hash);
                                          }}
                                          aria-label={expandedChangelogRows.has(entry.hash)
                                            ? 'Collapse commit details'
                                            : 'Expand commit details'}
                                        >
                                          <ChevronDown
                                            class={cn(
                                              'size-3.5 transition-transform duration-200',
                                              expandedChangelogRows.has(entry.hash) && 'rotate-180',
                                            )}
                                          />
                                        </button>
                                      {/if}
                                      <Tooltip.Root delayDuration={500}>
                                        <Tooltip.Trigger>
                                          {#snippet child({ props: msgTipProps })}
                                            <span {...msgTipProps} class="block truncate"
                                              >{entry.message}</span
                                            >
                                          {/snippet}
                                        </Tooltip.Trigger>
                                        <Tooltip.Content side="top" sideOffset={4} class="max-w-sm">
                                          {entry.message}
                                        </Tooltip.Content>
                                      </Tooltip.Root>
                                    </div>
                                    {#if expandedChangelogRows.has(entry.hash) && entry.body}
                                      <div
                                        class="mt-1.5 whitespace-pre-wrap rounded-md bg-muted/50 px-2.5 py-2 text-xs leading-relaxed text-muted-foreground"
                                        transition:slide={{ duration: 150 }}
                                      >
                                        {entry.body}
                                      </div>
                                    {/if}
                                  </div>
                                </td>
                                <td
                                  class="whitespace-nowrap px-4 py-2 text-xs text-muted-foreground"
                                >
                                  <Tooltip.Root delayDuration={300}>
                                    <Tooltip.Trigger>
                                      {#snippet child({ props: dateTipProps })}
                                        <span {...dateTipProps}>{relativeDate(entry.date)}</span>
                                      {/snippet}
                                    </Tooltip.Trigger>
                                    <Tooltip.Content side="top" sideOffset={4}>
                                      {new Date(entry.date).toLocaleString()}
                                    </Tooltip.Content>
                                  </Tooltip.Root>
                                </td>
                                <td class="truncate px-4 py-2 text-xs text-muted-foreground"
                                  >{entry.author}</td
                                >
                                <td class="px-2 py-2">
                                  <div
                                    class="flex items-center gap-0.5"
                                    role="toolbar"
                                    tabindex="-1"
                                    onclick={(e) => e.stopPropagation()}
                                    onkeydown={(e) => e.stopPropagation()}
                                  >
                                    <CopyButton
                                      text={`${entry.hash} ${entry.message} (${entry.author}, ${new Date(entry.date).toLocaleString()})`}
                                      label="Copy row"
                                    />
                                    {#if changelogRepoUrl}
                                      <Tooltip.Root delayDuration={300}>
                                        <Tooltip.Trigger>
                                          {#snippet child({ props: tipProps })}
                                            <a
                                              {...tipProps}
                                              href="{changelogRepoUrl}/commit/{entry.hash}{changelogDiffAnchor
                                                ? `#diff-${changelogDiffAnchor}`
                                                : ''}"
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                            >
                                              <ExternalLink class="size-3.5" />
                                            </a>
                                          {/snippet}
                                        </Tooltip.Trigger>
                                        <Tooltip.Content side="top" sideOffset={4}>
                                          Open in GitHub
                                        </Tooltip.Content>
                                      </Tooltip.Root>
                                    {/if}
                                  </div>
                                </td>
                              </tr>
                            {/each}
                          </tbody>
                        </table>
                        <!-- Show More button for pagination -->
                        {#if paginatedChangelog.length < filteredChangelog.length}
                          <div class="border-t px-4 py-2 text-center">
                            <button
                              type="button"
                              class="text-xs font-medium text-primary hover:underline"
                              onclick={() => {
                                changelogVisibleCount = ((changelogVisibleCount as number) +
                                  30) as Num;
                              }}
                            >
                              Show More ({filteredChangelog.length - paginatedChangelog.length} remaining)
                            </button>
                          </div>
                        {/if}
                      </div>
                    {/if}
                  {/if}
                </div>
              {/if}
            </section>
          {/if}
        </div>
      {/if}
      {#snippet failed(error)}
        <div class="overflow-hidden rounded-lg border border-dashed">
          <LensError
            title="Page render error"
            description={error instanceof Error ? error.message : String(error)}
            class="rounded-none border-0 py-4"
          />
          <div class="max-h-64 overflow-auto border-t bg-muted/20 text-xs">
            <CodeBlock
              code={error instanceof Error
                ? JSON.stringify(
                    { name: error.name, message: error.message, stack: error.stack },
                    null,
                    2,
                  )
                : JSON.stringify(error, null, 2)}
              lang="json"
            />
          </div>
        </div>
      {/snippet}
    </svelte:boundary>
  </div>
</div>
