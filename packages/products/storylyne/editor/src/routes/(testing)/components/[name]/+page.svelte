<script lang="ts">
  /**
   * Lens: auto-generated component documentation page.
   *
   * Extracts props, TV variants, and examples from raw component source
   * at runtime — no hand-written Demo.svelte files needed.
   */
  import type { Bool, Num, Str, Void } from '@/schemas/common';
  import { tick, type Component } from 'svelte';
  import { slide } from 'svelte/transition';
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
  import CopyButton from '@/ui/copy-button/CopyButton.svelte';
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
  type ChangelogEntry = { hash: Str; message: Str; date: Str; author: Str };

  /** Changelog entries for the current component. */
  let changelog: ChangelogEntry[] = $state([]);

  /** GitHub repo base URL for commit links (empty if unavailable). */
  let changelogRepoUrl: Str = $state('');

  /** Component path relative to repo root for GitHub tree URLs. */
  let changelogComponentPath: Str = $state('');

  /** SHA256 diff anchor for scrolling to the primary file in GitHub commit views. */
  let changelogDiffAnchor: Str = $state('');

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

  /** Whether the component has changelog entries. */
  const hasChangelog: Bool = $derived(changelog.length > 0);

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
    changelogRepoUrl = '';
    changelogComponentPath = '';
    changelogDiffAnchor = '';
    (async (): Promise<void> => {
      try {
        const response: Response = await fetch(`/api/lens/changelog/${currentName}`);
        if (cancelled) return;
        if (response.ok) {
          const data: unknown = await response.json();
          if (cancelled) return;
          // Server returns { entries, repoUrl, componentPath, diffAnchor }
          const body: {
            entries: ChangelogEntry[];
            repoUrl: Str;
            componentPath: Str;
            diffAnchor: Str;
          } = data as {
            entries: ChangelogEntry[];
            repoUrl: Str;
            componentPath: Str;
            diffAnchor: Str;
          };
          changelog = body.entries;
          changelogRepoUrl = body.repoUrl;
          changelogComponentPath = body.componentPath;
          changelogDiffAnchor = body.diffAnchor;
        }
      } catch {
        /* Changelog fetch failed — entries remain empty */
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
    docs: true,
    props: true,
    default: true,
    'error-boundary': true,
    variants: true,
    examples: true,
    source: true,
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

  /** Props export format menu items with id, label, icon, and category. */
  const PROPS_EXPORT_ITEMS: Array<{
    id: Str;
    label: Str;
    icon: typeof ClipboardCopy;
    category: Str;
  }> = [
    { id: 'copy-json', label: 'Copy as JSON', icon: ClipboardCopy, category: 'Clipboard' },
    { id: 'copy-markdown', label: 'Copy as Markdown', icon: FileText, category: 'Clipboard' },
    { id: 'copy-csv', label: 'Copy as CSV', icon: ClipboardCopy, category: 'Clipboard' },
    { id: 'copy-typescript', label: 'Copy as TypeScript', icon: FileCode, category: 'Clipboard' },
    { id: 'download-json', label: 'Download JSON', icon: Download, category: 'File' },
    { id: 'download-markdown', label: 'Download Markdown', icon: Download, category: 'File' },
  ];

  /** Search query for props export menu filtering. */
  let propsExportSearchQuery: Str = $state('');

  /** Props export items filtered by search query. */
  const filteredPropsExportItems: Array<{
    id: Str;
    label: Str;
    icon: typeof ClipboardCopy;
    category: Str;
  }> = $derived(
    propsExportSearchQuery.length === 0
      ? PROPS_EXPORT_ITEMS
      : PROPS_EXPORT_ITEMS.filter((p) =>
          p.label.toLowerCase().includes(propsExportSearchQuery.toLowerCase()),
        ),
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

  /** Changelog export format menu items with id, label, icon, and category. */
  const CHANGELOG_EXPORT_ITEMS: Array<{
    id: Str;
    label: Str;
    icon: typeof ClipboardCopy;
    category: Str;
  }> = [
    { id: 'copy-json', label: 'Copy as JSON', icon: ClipboardCopy, category: 'Clipboard' },
    { id: 'copy-markdown', label: 'Copy as Markdown', icon: FileText, category: 'Clipboard' },
    { id: 'copy-csv', label: 'Copy as CSV', icon: ClipboardCopy, category: 'Clipboard' },
    { id: 'download-json', label: 'Download JSON', icon: Download, category: 'File' },
    { id: 'download-markdown', label: 'Download Markdown', icon: Download, category: 'File' },
  ];

  /** Search query for changelog export menu filtering. */
  let changelogExportSearchQuery: Str = $state('');

  /** Changelog export items filtered by search query. */
  const filteredChangelogExportItems: Array<{
    id: Str;
    label: Str;
    icon: typeof ClipboardCopy;
    category: Str;
  }> = $derived(
    changelogExportSearchQuery.length === 0
      ? CHANGELOG_EXPORT_ITEMS
      : CHANGELOG_EXPORT_ITEMS.filter((p) =>
          p.label.toLowerCase().includes(changelogExportSearchQuery.toLowerCase()),
        ),
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
    const lines: Str[] = [
      `# Changelog — ${name}`,
      '',
      '| Hash | Message | Date | Author |',
      '|------|---------|------|--------|',
      ...entries.map(
        (e: ChangelogEntry): Str =>
          `| ${e.hash} | ${e.message} | ${new Date(e.date).toLocaleString()} | ${e.author} |`,
      ),
    ];
    return lines.join('\n');
  }

  /**
   * Format changelog entries as CSV.
   *
   * @param entries - Changelog entries to format
   * @returns CSV-formatted string
   */
  function changelogToCsv(entries: ChangelogEntry[]): Str {
    const header: Str = 'Hash,Message,Date,Author';
    const rows: Str[] = entries.map((e: ChangelogEntry): Str => {
      const msg: Str = e.message.replaceAll('"', '""');
      const author: Str = e.author.replaceAll('"', '""');
      return `${e.hash},"${msg}",${new Date(e.date).toLocaleString()},"${author}"`;
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
          <!-- ═══ Documentation ═══ -->
          <section id="docs" class="scroll-mt-60">
            <button
              type="button"
              onclick={() => toggleSection('docs')}
              class="mb-3 flex w-full items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80"
            >
              <ChevronRight
                class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen.docs
                  ? 'rotate-90'
                  : ''}"
              />
              <FileText class="size-5" /> Documentation
            </button>
            {#if sectionOpen.docs}
              <div transition:slide={{ duration: 200 }}>
                {#if hasDocs}
                  <div
                    class="prose prose-sm dark:prose-invert max-w-none rounded-lg border bg-card p-6"
                  >
                    {@html docsContent}
                  </div>
                {:else}
                  <div class="rounded-lg border border-dashed bg-muted/20 px-6 py-8 text-center">
                    <p class="text-sm text-muted-foreground">
                      No documentation available for this component.
                    </p>
                    <p class="mt-1 text-xs text-muted-foreground/60">
                      Add a <code class="rounded bg-muted px-1 py-0.5 font-mono text-[11px]"
                        >docs.md</code
                      > file to the component directory to add documentation.
                    </p>
                  </div>
                {/if}
              </div>
            {/if}
          </section>

          <!-- ═══ Props ═══ -->
          <section id="props" class="scroll-mt-60">
            <div class="mb-3 flex items-center justify-between">
              <button
                type="button"
                onclick={() => toggleSection('props')}
                class="flex items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80"
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
                      <DropdownMenu.SubContent class="flex max-h-80 w-52 flex-col overflow-hidden">
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
                            <DropdownMenu.Label class="text-xs">{category}</DropdownMenu.Label>
                            {#each filteredPropsExportItems.filter((i) => i.category === category) as item (item.id)}
                              <DropdownMenu.Item
                                onSelect={(e) => {
                                  e.preventDefault();
                                  handlePropsExport(item.id);
                                }}
                              >
                                {#if propsExportFeedback === item.id}
                                  <Check class="size-4 text-green-500" />
                                {:else}
                                  <item.icon class="size-4" />
                                {/if}
                                {item.label}
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

          <!-- ═══ Error Boundary ═══ -->
          {#if PrimaryComponent}
            <section id="error-boundary" class="scroll-mt-60">
              <button
                type="button"
                onclick={() => toggleSection('error-boundary')}
                class="mb-3 flex w-full items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80"
              >
                <ChevronRight
                  class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen[
                    'error-boundary'
                  ]
                    ? 'rotate-90'
                    : ''}"
                />
                <ShieldAlert class="size-5" /> Error Boundary
              </button>
              {#if sectionOpen['error-boundary']}
                <div transition:slide={{ duration: 200 }}>
                  <div class="space-y-4">
                    <LensSection
                      title="Missing Required Props"
                      description="Component rendered with no props — triggers safeParse validation and shows the error boundary fallback."
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
                    </LensSection>
                    <LensSection
                      title="Invalid Props"
                      description="Component rendered with an unknown prop key — triggers strictObject validation and shows the error boundary fallback."
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
                    </LensSection>
                    <LensSection
                      title="Only Required Props"
                      description="Component rendered with only required props at minimum values — shows the baseline functional state."
                    >
                      <LensComponentRenderer
                        component={PrimaryComponent}
                        props={props.filter((p) => !p.optional && p.default === '')}
                        tagName={toTag(name)}
                        componentName={name}
                        label=""
                        silent={isCompound}
                        contextWrapper={lensContextWrapper ?? undefined}
                        codeText={`<!-- Only required props (minimum values) -->\n<${toTag(name)} ... />`}
                      />
                    </LensSection>
                  </div>
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
                class="flex items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80"
              >
                <ChevronRight
                  class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen.variants
                    ? 'rotate-90'
                    : ''}"
                />
                <Layers class="size-5" /> Variants
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
                  <DropdownMenu.Content align="end" class="w-56">
                    <LensCardSettingsMenu
                      onSetting={(settingName, value) => {
                        document.dispatchEvent(
                          new CustomEvent('lens:section-settings', {
                            detail: { sectionId: 'variants', setting: settingName, value },
                          }),
                        );
                      }}
                      onReset={() => {
                        document.dispatchEvent(
                          new CustomEvent('lens:section-settings', {
                            detail: { sectionId: 'variants', setting: 'reset', value: null },
                          }),
                        );
                      }}
                      showExport={false}
                    />
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
                class="flex items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80"
              >
                <ChevronRight
                  class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen.examples
                    ? 'rotate-90'
                    : ''}"
                />
                <BookOpen class="size-5" /> Examples
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
                  <DropdownMenu.Content align="end" class="w-56">
                    <LensCardSettingsMenu
                      onSetting={(settingName, value) => {
                        document.dispatchEvent(
                          new CustomEvent('lens:section-settings', {
                            detail: { sectionId: 'examples', setting: settingName, value },
                          }),
                        );
                      }}
                      onReset={() => {
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

          <!-- ═══ Source ═══ -->
          {#if rawSource}
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
                <FileCode class="size-5" /> Source
              </button>
              {#if sectionOpen.source}
                <div transition:slide={{ duration: 200 }}>
                  <LensSection
                    title={toTitle(name)}
                    description="Component source code."
                    codeText={rawSource}
                  >
                    {#snippet code()}
                      <CodeBlock code={rawSource} lang="svelte" />
                    {/snippet}
                  </LensSection>
                </div>
              {/if}
            </section>
          {/if}

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
                  class="flex items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80"
                >
                  <ChevronRight
                    class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen.changelog
                      ? 'rotate-90'
                      : ''}"
                  />
                  <History class="size-5" /> Changelog
                  <span
                    class="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground"
                    >{changelog.length}</span
                  >
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
                  <DropdownMenu.Content align="end" class="w-48">
                    <DropdownMenu.Sub
                      onOpenChange={(open) => {
                        if (open) changelogExportSearchQuery = '';
                      }}
                    >
                      <DropdownMenu.SubTrigger>
                        <Download class="size-4" />
                        Export
                      </DropdownMenu.SubTrigger>
                      <DropdownMenu.SubContent class="flex max-h-80 w-52 flex-col overflow-hidden">
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
                            <DropdownMenu.Label class="text-xs">{category}</DropdownMenu.Label>
                            {#each filteredChangelogExportItems.filter((i) => i.category === category) as item (item.id)}
                              <DropdownMenu.Item
                                onSelect={(e) => {
                                  e.preventDefault();
                                  handleChangelogExport(item.id);
                                }}
                              >
                                {#if changelogExportFeedback === item.id}
                                  <Check class="size-4 text-green-500" />
                                {:else}
                                  <item.icon class="size-4" />
                                {/if}
                                {item.label}
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
              </div>
              {#if sectionOpen.changelog}
                <div transition:slide={{ duration: 200 }}>
                  <div class="rounded-lg border bg-card">
                    <table class="w-full table-fixed text-sm">
                      <thead>
                        <tr class="border-b text-left text-xs text-muted-foreground">
                          <th class="w-20 px-4 py-2">Hash</th>
                          <th class="px-4 py-2">Message</th>
                          <th class="w-44 px-4 py-2">Date</th>
                          <th class="w-32 px-4 py-2">Author</th>
                          <th class="w-16 px-2 py-2"><span class="sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {#each changelog as entry (entry.hash)}
                          <tr class="border-b last:border-b-0 transition-colors hover:bg-muted/50">
                            <td class="px-4 py-2">
                              <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                                >{entry.hash}</code
                              >
                            </td>
                            <td class="truncate px-4 py-2 text-sm">{entry.message}</td>
                            <td class="whitespace-nowrap px-4 py-2 text-xs text-muted-foreground"
                              >{new Date(entry.date).toLocaleString()}</td
                            >
                            <td class="truncate px-4 py-2 text-xs text-muted-foreground"
                              >{entry.author}</td
                            >
                            <td class="px-2 py-2">
                              <div class="flex items-center gap-0.5">
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
                  </div>
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
