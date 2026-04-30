<script module lang="ts">
  /**
   * LensDependencyTree — renders the import-graph dependency
   * tree for a Lens-documented component, distinguishing
   * internal vs external imports.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema, NumSchema } from '@/schemas/common';

  /** Schema for the import kind discriminator. */
  const DepKindSchema = v.picklist(['type', 'namespace', 'named', 'default']);

  /** Schema for a single dependency entry. */
  export const DepEntrySchema = v.strictObject({
    /** The import specifier path. @values ../button/index.js, @/ui/tooltip, bits-ui */
    path: StrSchema,
    /** Imported names. @values Button, cn, Tooltip */
    names: v.array(StrSchema),
    /** UI component directory name (only for internal deps). @values button, dialog, tooltip, badge */
    component: StrSchema,
    /** How this import was declared. @values type, namespace, named, default */
    kind: DepKindSchema,
  });

  /** Schema for a categorized dependency tree. */
  export const DepTreeSchema = v.strictObject({
    /** Sibling UI component imports. @values [{path: "../button/index.js", names: ["Button"], component: "button", kind: "named"}] */
    internal: v.array(DepEntrySchema),
    /** Workspace package imports. @values [{path: "@/ui/tooltip", names: ["Tooltip"], component: "", kind: "named"}] */
    workspace: v.array(DepEntrySchema),
    /** External npm package imports. @values [{path: "bits-ui", names: ["Dialog"], component: "", kind: "named"}] */
    external: v.array(DepEntrySchema),
  });

  /** Schema for a reverse dependency entry (a component that imports the current one). */
  export const ReverseDepSchema = v.strictObject({
    /** The component directory name that imports the current component. @values sidebar, dialog, dropdown-menu */
    component: StrSchema,
    /** Imported names from the current component. @values Button, buttonVariants */
    names: v.array(StrSchema),
    /** Import kind used by the consumer. @values type, namespace, named, default */
    kind: DepKindSchema,
  });

  /** Schema for a single component's size data. */
  export const ComponentSizeSchema = v.strictObject({
    /** Raw source file size in characters. @values 1024, 2048, 4096 */
    source: NumSchema,
    /** Minified client JS size in bytes (from Svelte compile + esbuild minify). @values 512, 1024, 2048 */
    compiled: v.optional(NumSchema),
    /** Gzip-compressed minified JS size in bytes — closest to actual download size. @values 256, 512, 1024 */
    gzip: v.optional(NumSchema),
  });

  /** Schema for the LensDependencyTree component props. */
  export const LensDependencyTreePropsSchema = v.strictObject({
    /** Categorized dependency tree to render. @values {internal: [], workspace: [], external: []} */
    deps: DepTreeSchema,
    /** Components that import the current component (reverse dependencies). @values [{component: "sidebar", names: ["Button"], kind: "named"}] */
    usedBy: v.optional(v.array(ReverseDepSchema)),
    /** Current component name — used to build links to sibling component pages. @values button, dialog, sidebar */
    currentComponent: v.optional(StrSchema),
    /** Per-component size data (source + compiled + gzip). Keyed by component directory name. @values {button: {source: 1024, compiled: 512, gzip: 256}} */
    sizes: v.optional(v.record(StrSchema, ComponentSizeSchema)),
    /** Known component directory names from glob discovery — used to distinguish UI components from utility imports. @values button, dialog, tooltip, badge */
    knownComponents: v.optional(v.array(StrSchema)),
    /** Raw source strings keyed by glob path — used for recursive dependency chain resolution. @values {"/ui/button/index.js": "import..."} */
    rawSources: v.optional(v.record(StrSchema, StrSchema)),
    /** Additional CSS classes for the root element. @values mt-4, space-y-2 */
    class: v.optional(StrSchema),
  });
  /** Props for the LensDependencyTree component. */
  export type LensDependencyTreeProps = v.InferOutput<typeof LensDependencyTreePropsSchema>;
</script>

<script lang="ts">
  /**
   * Dependency tree visualization for Lens documentation pages.
   *
   * Renders a categorized tree of component imports with collapsible
   * sections, icons by category, clickable links to sibling Lens
   * component pages, import kind badges, copy-to-clipboard import paths,
   * a summary bar, a "Used By" reverse dependency section, and a
   * recursive dependency chain tree.
   *
   * Six categories: Used By (reverse), UI Components (internal),
   * Internal Utilities, Workspace (shared packages), External (npm),
   * Dependency Chain (recursive tree).
   */
  import type { Bool, Num, Str, Void } from '@/schemas/common';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps, toTitle, extractDir, findPrimaryKey } from '../lens/lens-utils.js';
  import { formatBytes } from '../lens/extract-sizes.js';
  import { extractDeps, type DepEntry, type DepTree } from '../lens/extract-deps.js';
  import { fade, slide } from 'svelte/transition';
  import { cn } from '../utils.js';
  import Badge from '../badge/badge.svelte';
  import * as Tooltip from '../tooltip/index.js';
  import ComponentIcon from '@lucide/svelte/icons/component';
  import Package from '@lucide/svelte/icons/package';
  import FolderOpen from '@lucide/svelte/icons/folder-open';
  import UsersRound from '@lucide/svelte/icons/users-round';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Copy from '@lucide/svelte/icons/copy';
  import Check from '@lucide/svelte/icons/check';
  import Wrench from '@lucide/svelte/icons/wrench';
  import GitBranch from '@lucide/svelte/icons/git-branch';
  import ZoomIn from '@lucide/svelte/icons/zoom-in';
  import ZoomOut from '@lucide/svelte/icons/zoom-out';
  import Maximize from '@lucide/svelte/icons/maximize';
  import Maximize2 from '@lucide/svelte/icons/maximize-2';
  import Minimize2 from '@lucide/svelte/icons/minimize-2';
  import Download from '@lucide/svelte/icons/download';
  import FileImage from '@lucide/svelte/icons/file-image';
  import FileCode from '@lucide/svelte/icons/file-code';
  import FileText from '@lucide/svelte/icons/file-text';
  import Table from '@lucide/svelte/icons/table';
  import Clipboard from '@lucide/svelte/icons/clipboard';
  import Braces from '@lucide/svelte/icons/braces';
  import Search from '@lucide/svelte/icons/search';
  import SearchX from '@lucide/svelte/icons/search-x';
  import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
  import ChevronsDownUp from '@lucide/svelte/icons/chevrons-down-up';
  import Network from '@lucide/svelte/icons/network';
  import Orbit from '@lucide/svelte/icons/orbit';
  import Waypoints from '@lucide/svelte/icons/waypoints';
  import Accessibility from '@lucide/svelte/icons/accessibility';
  import TreePine from '@lucide/svelte/icons/tree-pine';
  import LocateFixed from '@lucide/svelte/icons/locate-fixed';
  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
  import ArrowDownAZ from '@lucide/svelte/icons/arrow-down-a-z';
  import ArrowDownZA from '@lucide/svelte/icons/arrow-down-z-a';
  import Weight from '@lucide/svelte/icons/weight';
  import Layers from '@lucide/svelte/icons/layers';
  import * as DropdownMenu from '../dropdown-menu/index.js';
  import Slider from '../slider/slider.svelte';
  import {
    exportPng,
    exportJpeg,
    exportSvg,
    exportWebp,
    copyImageToClipboard,
    copyChainJson,
    copyChainMermaid,
    copyChainDot,
    copyChainCsv,
    copyChainPlantUml,
    copyChainMarkdown,
    type ChainExportNode,
  } from '../lens/export-utils.js';

  const { ...restProps }: LensDependencyTreeProps = $props();
  const validated: LensDependencyTreeProps = $derived.by(() => {
    const rawProps: LensDependencyTreeProps = stripSvelteProps(restProps);
    const result = safeParse(LensDependencyTreePropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LensDependencyTreeProps;
  });

  const className: Str = $derived(validated.class ?? '');

  /** Set of known component directory names for categorization. */
  const knownSet: Set<Str> = $derived(new Set(validated.knownComponents ?? []));

  /** Raw sources record for recursive dep chain resolution. */
  const rawSources: Record<Str, Str> = $derived(validated.rawSources ?? {});

  /** Internal deps that are actual UI components (component exists in knownComponents). */
  const uiComponentDeps: DepEntry[] = $derived(
    validated.deps.internal.filter(
      (dep: DepEntry): boolean => dep.component !== '' && knownSet.has(dep.component),
    ),
  );

  /** Internal deps that are NOT UI components (utility imports like lens/, utils.js). */
  const utilityDeps: DepEntry[] = $derived(
    validated.deps.internal.filter(
      (dep: DepEntry): boolean => dep.component === '' || !knownSet.has(dep.component),
    ),
  );

  /** Which categories are expanded. All start open except chain. */
  let expanded: Record<Str, Bool> = $state({
    usedBy: true,
    internal: true,
    utilities: true,
    workspace: true,
    external: true,
    chain: false,
  });

  /**
   * Toggle a category section open/closed.
   *
   * @param category - Category key
   */
  function toggle(category: Str): void {
    expanded[category] = !(expanded[category] ?? true);
  }

  /**
   * Expand all category sections.
   */
  export function expandAll(): Void {
    for (const key of Object.keys(expanded)) {
      expanded[key] = true;
    }
  }

  /**
   * Collapse all category sections.
   */
  export function collapseAll(): Void {
    for (const key of Object.keys(expanded)) {
      expanded[key] = false;
    }
  }

  /** Total dependency count across all categories. */
  const totalDeps: Num = $derived(
    validated.deps.internal.length +
      validated.deps.workspace.length +
      validated.deps.external.length,
  );

  /** Reverse dependency count. */
  const usedByCount: Num = $derived((validated.usedBy ?? []).length);

  /** Track which import path was recently copied (for check icon feedback). */
  let copiedPath: Str | null = $state(null);

  /** Whether the dependency chain graph is in fullscreen mode. */
  let chainFullscreen: Bool = $state(false);

  /**
   * Toggle fullscreen mode for the dependency chain graph.
   * Auto-expands the chain section when entering fullscreen.
   */
  function toggleChainFullscreen(): Void {
    chainFullscreen = !chainFullscreen;
    if (chainFullscreen) {
      expanded.chain = true;
    }
  }

  /** Lock body scroll while chain is in fullscreen mode. */
  $effect(() => {
    if (chainFullscreen) {
      document.body.style.overflow = 'hidden';
    }
    return (): Void => {
      document.body.style.overflow = '';
    };
  });

  /** DOM reference to the graph canvas scroll container for drag panning. */
  let chainCanvasRef: HTMLDivElement | undefined = $state(undefined);

  /** Whether the user is currently drag-panning the graph canvas. */
  let isDragging: Bool = $state(false);

  /** Mouse X at drag start (client coords). */
  let dragStartX: Num = $state(0);

  /** Mouse Y at drag start (client coords). */
  let dragStartY: Num = $state(0);

  /** scrollLeft at drag start. */
  let scrollStartX: Num = $state(0);

  /** scrollTop at drag start. */
  let scrollStartY: Num = $state(0);

  /**
   * Begin drag-panning on mousedown. Skips interactive elements (links, buttons).
   *
   * @param e - Mouse event
   */
  function onCanvasPointerDown(e: MouseEvent): Void {
    if (e.button !== 0) {
      return;
    }

    const target: HTMLElement = e.target as HTMLElement;
    // Skip drag when clicking interactive elements so node links/buttons still work

    if (target.closest('a, button, [role="button"]')) {
      return;
    }
    if (!chainCanvasRef) {
      return;
    }
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    scrollStartX = chainCanvasRef.scrollLeft;
    scrollStartY = chainCanvasRef.scrollTop;
    e.preventDefault();
  }

  /**
   * Update scroll position during drag.
   *
   * @param e - Mouse event
   */
  function onCanvasPointerMove(e: MouseEvent): Void {
    if (!isDragging || !chainCanvasRef) {
      return;
    }

    const dx: Num = e.clientX - dragStartX;
    const dy: Num = e.clientY - dragStartY;
    chainCanvasRef.scrollLeft = scrollStartX - dx;
    chainCanvasRef.scrollTop = scrollStartY - dy;
  }

  /**
   * End drag-panning.
   */
  function onCanvasPointerUp(): Void {
    isDragging = false;
  }

  /**
   * Zoom the dependency chain graph towards the cursor with Ctrl/Meta + mouse wheel.
   *
   * Plain scroll is left alone so the overflow container scrolls normally.
   * Only Ctrl+wheel (Windows/Linux) or Meta+wheel (macOS pinch-to-zoom)
   * triggers zoom, matching the pattern browsers use for native page zoom.
   *
   * Uses proportional scaling (exponential) and adjusts scroll position
   * so the content point under the cursor stays fixed ("zoom to point").
   *
   * @param e - Wheel event from the canvas container
   */
  function onCanvasWheel(e: WheelEvent): Void {
    if (!e.ctrlKey && !e.metaKey) {
      return;
    }
    e.preventDefault();
    if (!chainCanvasRef) {
      return;
    }

    const oldZoom: Num = chainZoom;
    // Normalize deltaY across browsers (line vs pixel mode)
    const delta: Num = (e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY) as Num;
    // Exponential zoom factor — small delta = tiny change, large delta = bigger change
    const factor: Num = (1.002 ** -delta) as Num;
    const newZoom: Num = Math.min(Math.max(oldZoom * factor, ZOOM_MIN), ZOOM_MAX) as Num;

    if (newZoom === oldZoom) {
      return;
    }

    // Cursor position relative to the scroll viewport
    const rect: DOMRect = chainCanvasRef.getBoundingClientRect();
    const cursorX: Num = (e.clientX - rect.left) as Num;
    const cursorY: Num = (e.clientY - rect.top) as Num;

    // Content coordinate under cursor (unzoomed)
    const contentX: Num = ((chainCanvasRef.scrollLeft + cursorX) / oldZoom) as Num;
    const contentY: Num = ((chainCanvasRef.scrollTop + cursorY) / oldZoom) as Num;

    // Apply new zoom level
    chainZoom = newZoom;

    // After DOM updates, adjust scroll so content point stays under cursor
    requestAnimationFrame((): Void => {
      if (!chainCanvasRef) {
        return;
      }
      chainCanvasRef.scrollLeft = contentX * newZoom - cursorX;
      chainCanvasRef.scrollTop = contentY * newZoom - cursorY;
    });
  }

  /**
   * Attach the wheel-zoom listener with `passive: false` so that
   * `preventDefault()` works reliably across all browsers. Svelte's
   * `onwheel` attribute may be passive by default in some environments.
   */
  $effect(() => {
    const el: HTMLDivElement | undefined = chainCanvasRef;

    if (!el) {
      return;
    }
    el.addEventListener('wheel', onCanvasWheel, { passive: false });
    return (): Void => {
      el.removeEventListener('wheel', onCanvasWheel);
    };
  });

  /**
   * Copy an import path to the clipboard with visual feedback.
   *
   * @param path - The import path to copy
   */
  async function copyPath(path: Str): Promise<void> {
    await navigator.clipboard.writeText(path);
    copiedPath = path;
    setTimeout((): void => {
      copiedPath = null;
    }, 1500);
  }

  /**
   * Check if a workspace dep (`@/ui/...`) points to a sibling component.
   * Returns the component dir name if so, or empty string otherwise.
   *
   * @param path - The workspace import path
   * @returns Component directory name or empty string
   */
  function workspaceComponent(path: Str): Str {
    const match: RegExpMatchArray | null = path.match(/^@\/ui\/([^/]+)/);

    return match?.[1] ?? '';
  }

  /**
   * Get a human-readable label for an import kind.
   *
   * @param kind - The import kind
   * @returns Display label
   */
  function kindLabel(kind: Str): Str {
    if (kind === 'type') {
      return 'type-only';
    }
    if (kind === 'namespace') {
      return 'namespace';
    }
    if (kind === 'default') {
      return 'default export';
    }
    return '';
  }

  /**
   * Get the CSS class for an import kind badge.
   *
   * @param kind - The import kind
   * @returns Tailwind classes
   */
  function kindClass(kind: Str): Str {
    if (kind === 'type') {
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    }
    if (kind === 'namespace') {
      return 'bg-violet-500/10 text-violet-600 dark:text-violet-400';
    }
    if (kind === 'default') {
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
    }
    return '';
  }

  /** Resolved sizes map — empty record if not provided. */
  const sizes = $derived(validated.sizes ?? {});

  /**
   * Get the formatted source size chip text for a component.
   *
   * @param component - The component directory name
   * @returns Formatted source size like '2.1 kB source' or empty string
   */
  function sourceChip(component: Str): Str {
    const entry = sizes[component];

    if (!entry) {
      return '';
    }
    return `${formatBytes(entry.source as Num)} source` as Str;
  }

  /**
   * Get the formatted bundled gzip size chip text for a component.
   *
   * @param component - The component directory name
   * @returns Formatted gzip size like '0.9 kB gzip' or empty string
   */
  function bundledChip(component: Str): Str {
    const entry = sizes[component];

    if (!entry) {
      return '';
    }
    if (entry.gzip !== undefined) {
      return `${formatBytes(entry.gzip as Num)} production` as Str;
    }
    if (entry.compiled !== undefined) {
      return `${formatBytes(entry.compiled as Num)} minified` as Str;
    }
    return '';
  }

  /** Total source size of all UI component dependencies. */
  const totalInternalSource: Num = $derived(
    uiComponentDeps.reduce((sum: Num, dep: DepEntry): Num => {
      const entry = sizes[dep.component];

      return (sum + (entry?.source ?? 0)) as Num;
    }, 0 as Num),
  );

  /** Total gzip size of all UI component dependencies (0 if not loaded). */
  const totalInternalGzip: Num = $derived(
    uiComponentDeps.reduce((sum: Num, dep: DepEntry): Num => {
      const entry = sizes[dep.component];

      return (sum + (entry?.gzip ?? 0)) as Num;
    }, 0 as Num),
  );

  /* ------------------------------------------------------------------ */
  /*  Dependency Chain (recursive tree)                                  */
  /* ------------------------------------------------------------------ */

  /** A node in the recursive dependency chain tree. */
  type ChainNode = {
    /** Component directory name or import path. @values button, dialog, ../utils.js, @/schemas/common, valibot */
    component: Str;
    /** Import kind. @values type, namespace, named, default */
    kind: Str;
    /** Node category for color-coding. @values component, utility, workspace, external */
    category: Str;
    /** Child dependencies (transitive). */
    children: ChainNode[];
  };

  /** Default maximum recursion depth for the dependency chain tree. */
  const DEFAULT_MAX_DEPTH: Num = 6 as Num;

  /** Current maximum recursion depth for the dependency chain tree. */
  let chainMaxDepthLimit: Num = $state(6 as Num);

  /** Search query for depth limit dropdown filtering. */
  let chainDepthSearchQuery: Str = $state('' as Str);

  /** Available depth limit presets. */
  const DEPTH_PRESETS: Array<{
    /** Depth value (-1 = unlimited). */
    value: Num;
    /** Display label. */
    label: Str;
    /** Brief description. */
    description: Str;
  }> = [
    { value: 2, label: '2', description: 'Direct dependencies only' },
    { value: 3, label: '3', description: 'Two levels deep' },
    { value: 4, label: '4', description: 'Three levels deep' },
    { value: 6, label: '6', description: 'Default depth' },
    { value: 8, label: '8', description: 'Deep traversal' },
    { value: -1 as Num, label: '\u221E', description: 'No limit (unlimited)' },
  ];

  /** Depth presets filtered by search query. */
  const filteredDepthPresets = $derived(
    chainDepthSearchQuery.length === 0
      ? DEPTH_PRESETS
      : DEPTH_PRESETS.filter((p) => {
          const q: Str = chainDepthSearchQuery.toLowerCase() as Str;

          return p.label.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
        }),
  );

  /** Sort mode for dependency lists within categories. */
  let depSortMode: Str = $state('default' as Str);

  /** Hovered chain node ID for path highlighting. */
  let hoveredNodeId: Str = $state('' as Str);

  /**
   * Recursively build a dependency chain tree for a component.
   *
   * @param component - The component directory name to resolve
   * @param depth - Current recursion depth
   * @param visited - Set of already-visited components (circular dependency guard)
   * @returns Array of child chain nodes
   */
  function buildChain(component: Str, depth: Num, visited: Set<Str>): ChainNode[] {
    if ((chainMaxDepthLimit !== -1 && depth >= chainMaxDepthLimit) || !component) {
      return [];
    }

    const sourceKey: Str | undefined = findPrimaryKey(component, rawSources);

    if (!sourceKey) {
      return [];
    }

    const source: Str = rawSources[sourceKey] ?? '';

    if (!source) {
      return [];
    }

    const deps: DepTree = extractDeps(source);
    const nodes: ChainNode[] = [];

    // UI component deps — recursive
    for (const dep of deps.internal) {
      if (!dep.component || !knownSet.has(dep.component)) {
        continue;
      }

      const isCircular: boolean = visited.has(dep.component);
      const childVisited: Set<Str> = new Set([...visited, dep.component]);
      nodes.push({
        component: dep.component,
        kind: dep.kind,
        category: 'component',
        children: isCircular ? [] : buildChain(dep.component, (depth + 1) as Num, childVisited),
      });
    }

    // Internal utility deps — leaf nodes
    for (const dep of deps.internal) {
      if (dep.component !== '' && knownSet.has(dep.component)) {
        continue;
      }
      nodes.push({ component: dep.path, kind: dep.kind, category: 'utility', children: [] });
    }

    // Workspace deps — leaf nodes
    for (const dep of deps.workspace) {
      nodes.push({ component: dep.path, kind: dep.kind, category: 'workspace', children: [] });
    }

    // External deps — leaf nodes
    for (const dep of deps.external) {
      nodes.push({ component: dep.path, kind: dep.kind, category: 'external', children: [] });
    }

    return nodes;
  }

  /** The full dependency chain tree rooted at the current component. */
  const dependencyChain: ChainNode[] = $derived.by((): ChainNode[] => {
    const current: Str = validated.currentComponent ?? '';

    if (!current || Object.keys(rawSources).length === 0) {
      return [];
    }

    const visited: Set<Str> = new Set([current]);

    return buildChain(current, 0 as Num, visited);
  });

  /* ------------------------------------------------------------------ */
  /*  Node graph layout                                                  */
  /* ------------------------------------------------------------------ */

  /** Node width and height for layout calculation. */
  const NODE_W: Num = 300 as Num;
  const NODE_H: Num = 64 as Num;
  const GAP_X: Num = 32 as Num;
  const GAP_Y: Num = 48 as Num;

  /** A positioned node in the graph. */
  type LayoutNode = {
    /** Unique node ID. @values root, badge-0, tooltip-1, button-2 */
    id: Str;
    /** Component directory name or import path. @values button, dialog, ../utils.js, valibot */
    component: Str;
    /** Import kind. @values type, namespace, named, default */
    kind: Str;
    /** Node category. @values component, utility, workspace, external */
    category: Str;
    /** X position (px). @values 0, 80, 160, 240 */
    x: Num;
    /** Y position (px). @values 0, 96, 192, 288 */
    y: Num;
    /** Parent node ID for connector lines (empty for root). @values root, badge-0 */
    parentId: Str;
  };

  /** An SVG connector line between two nodes. */
  type Connector = {
    /** Start X (center-bottom of parent). @values 80, 160, 240, 320 */
    x1: Num;
    /** Start Y (bottom of parent). @values 40, 136, 232 */
    y1: Num;
    /** End X (center-top of child). @values 80, 160, 240, 320 */
    x2: Num;
    /** End Y (top of child). @values 96, 192, 288 */
    y2: Num;
    /** Source (parent) node ID. @values root, badge-0 */
    fromId: Str;
    /** Target (child) node ID. @values badge-0, tooltip-1 */
    toId: Str;
    /** Import kind for edge label. @values type, namespace, named, default */
    kind: Str;
  };

  /**
   * Measure the subtree width (how many leaf-level slots it occupies).
   *
   * @param node - The chain node to measure
   * @returns Number of leaf slots needed
   */
  function subtreeWidth(node: ChainNode): Num {
    if (node.children.length === 0) {
      return 1 as Num;
    }

    let total: Num = 0 as Num;

    for (const child of node.children) {
      total = (total + subtreeWidth(child)) as Num;
    }
    return total;
  }

  /**
   * Flatten chain tree into positioned layout nodes and connectors.
   *
   * @param rootComponent - The root component name (current page)
   * @param children - Direct dependency chain nodes
   * @returns Object with nodes array, connectors array, and total dimensions
   */
  function layoutGraph(
    rootComponent: Str,
    children: ChainNode[],
  ): { nodes: LayoutNode[]; connectors: Connector[]; width: Num; height: Num } {
    const nodes: LayoutNode[] = [];
    const connectors: Connector[] = [];
    let idCounter: Num = 0 as Num;

    // Total leaf slots needed for all children
    let totalSlots: Num = 0 as Num;

    for (const child of children) {
      totalSlots = (totalSlots + subtreeWidth(child)) as Num;
    }
    if (totalSlots === 0) {
      totalSlots = 1 as Num;
    }

    const fullWidth: Num = (totalSlots * (NODE_W + GAP_X) - GAP_X) as Num;

    // Root node centered at top
    const rootX: Num = (fullWidth / 2 - NODE_W / 2) as Num;
    const rootId: Str = 'root';
    nodes.push({
      id: rootId,
      component: rootComponent,
      kind: '',
      category: 'component',
      x: rootX,
      y: 0 as Num,
      parentId: '',
    });

    /**
     * Recursively place children.
     *
     * @param items - Child chain nodes
     * @param parentId - Parent node ID
     * @param depth - Current depth level (1-based for children)
     * @param startSlot - The leftmost slot index for this subtree
     */
    function placeChildren(items: ChainNode[], parentId: Str, depth: Num, startSlot: Num): void {
      let slotOffset: Num = startSlot;

      for (const item of items) {
        const w: Num = subtreeWidth(item);
        // Center this node within its allocated slots
        const centerSlot: Num = (slotOffset + w / 2) as Num;
        const x: Num = ((centerSlot - 0.5) * (NODE_W + GAP_X)) as Num;
        const y: Num = (depth * (NODE_H + GAP_Y)) as Num;
        const nodeId: Str = `${item.component}-${String(idCounter)}` as Str;
        idCounter = (idCounter + 1) as Num;
        nodes.push({
          id: nodeId,
          component: item.component,
          kind: item.kind,
          category: item.category,
          x,
          y,
          parentId,
        });

        // Find parent position for connector
        const parent: LayoutNode | undefined = nodes.find(
          (n: LayoutNode): boolean => n.id === parentId,
        );

        if (parent) {
          connectors.push({
            x1: (parent.x + NODE_W / 2) as Num,
            y1: (parent.y + NODE_H) as Num,
            x2: (x + NODE_W / 2) as Num,
            y2: y,
            fromId: parentId,
            toId: nodeId,
            kind: item.kind,
          });
        }

        if (item.children.length > 0) {
          placeChildren(item.children, nodeId, (depth + 1) as Num, slotOffset);
        }
        slotOffset = (slotOffset + w) as Num;
      }
    }

    placeChildren(children, rootId, 1 as Num, 0 as Num);

    // Compute max depth for height
    let maxY: Num = 0 as Num;

    for (const node of nodes) {
      if (node.y > maxY) {
        maxY = node.y;
      }
    }

    return {
      nodes,
      connectors,
      width: Math.max(fullWidth, NODE_W) as Num,
      height: (maxY + NODE_H) as Num,
    };
  }

  /**
   * Find the parametric t for the intersection of a ray with a rectangle edge.
   *
   * @param halfW - Half width of the rectangle
   * @param halfH - Half height of the rectangle
   * @param rdx - Ray direction X
   * @param rdy - Ray direction Y
   * @returns Parametric t for the intersection
   */
  function rectEdgeT(halfW: number, halfH: number, rdx: number, rdy: number): number {
    const tx: number = rdx === 0 ? Infinity : halfW / Math.abs(rdx);
    const ty: number = rdy === 0 ? Infinity : halfH / Math.abs(rdy);

    return Math.min(tx, ty);
  }

  /**
   * Clip a line from the center of a rectangle to the center of another rectangle,
   * so that each endpoint sits on the edge of its respective rectangle instead of
   * the center. Used by radial and force layouts to avoid lines passing through cards.
   *
   * @param fromX - Top-left X of the source rectangle
   * @param fromY - Top-left Y of the source rectangle
   * @param toX - Top-left X of the target rectangle
   * @param toY - Top-left Y of the target rectangle
   * @param w - Rectangle width
   * @param h - Rectangle height
   * @returns Clipped endpoints {x1, y1, x2, y2}
   */
  function clipLineToEdge(
    fromX: Num,
    fromY: Num,
    toX: Num,
    toY: Num,
    w: Num,
    h: Num,
  ): { x1: Num; y1: Num; x2: Num; y2: Num } {
    const cx1: number = (fromX as number) + (w as number) / 2;
    const cy1: number = (fromY as number) + (h as number) / 2;
    const cx2: number = (toX as number) + (w as number) / 2;
    const cy2: number = (toY as number) + (h as number) / 2;
    const dx: number = cx2 - cx1;
    const dy: number = cy2 - cy1;
    const dist: number = Math.hypot(dx, dy);

    if (dist < 1) {
      return { x1: cx1 as Num, y1: cy1 as Num, x2: cx2 as Num, y2: cy2 as Num };
    }

    const hw: number = (w as number) / 2;
    const hh: number = (h as number) / 2;
    const t1: number = rectEdgeT(hw, hh, dx, dy);
    const t2: number = rectEdgeT(hw, hh, -dx, -dy);

    return {
      x1: (cx1 + dx * t1) as Num,
      y1: (cy1 + dy * t1) as Num,
      x2: (cx2 - dx * t2) as Num,
      y2: (cy2 - dy * t2) as Num,
    };
  }

  /**
   * Lay out nodes in a radial / concentric-circle arrangement.
   * Root sits at center; each depth ring expands outward.
   *
   * @param rootComponent - The root component name
   * @param children - Direct dependency chain nodes
   * @returns Layout result identical in shape to layoutGraph
   */
  function layoutRadial(
    rootComponent: Str,
    children: ChainNode[],
  ): { nodes: LayoutNode[]; connectors: Connector[]; width: Num; height: Num } {
    const nodes: LayoutNode[] = [];
    const connectors: Connector[] = [];
    let idCounter: Num = 0 as Num;
    const RING_GAP: Num = 180 as Num;
    const BASE_RADIUS: Num = 250 as Num;
    /** Minimum arc spacing between adjacent cards on a ring. */
    const CARD_SPACING: Num = (NODE_W + GAP_X) as Num;

    // Single-pass BFS: assign stable IDs and collect depth info simultaneously
    type BfsEntry = {
      /** The chain node being placed. */
      chain: ChainNode;
      /** Unique node identifier assigned during BFS. @values Button-0, Tooltip-3 */
      id: Str;
      /** Parent node identifier. @values root, Button-0 */
      parentId: Str;
      /** BFS depth level (1 = direct child of root). @values 1, 2, 3 */
      depth: Num;
    };
    const allEntries: BfsEntry[] = [];
    const bfsQueue: BfsEntry[] = [];

    for (const child of children) {
      const entryId: Str = `${child.component}-${String(idCounter)}` as Str;
      idCounter = (idCounter + 1) as Num;
      bfsQueue.push({ chain: child, id: entryId, parentId: 'root', depth: 1 as Num });
    }
    while (bfsQueue.length > 0) {
      const entry: BfsEntry | undefined = bfsQueue.shift();

      if (!entry) {
        continue;
      }
      allEntries.push(entry);
      for (const child of entry.chain.children) {
        const childId: Str = `${child.component}-${String(idCounter)}` as Str;
        idCounter = (idCounter + 1) as Num;
        bfsQueue.push({
          chain: child,
          id: childId,
          parentId: entry.id,
          depth: (entry.depth + 1) as Num,
        });
      }
    }

    // Group entries by depth for ring placement
    const depthMap: Map<Num, BfsEntry[]> = new Map();

    for (const entry of allEntries) {
      const list: BfsEntry[] = depthMap.get(entry.depth) ?? [];
      list.push(entry);
      depthMap.set(entry.depth, list);
    }

    // Place root at center
    const centerX: Num = 0 as Num;
    const centerY: Num = 0 as Num;
    nodes.push({
      id: 'root',
      component: rootComponent,
      kind: '',
      category: 'component',
      x: centerX,
      y: centerY,
      parentId: '',
    });

    // Place each depth ring — radius expands to fit all cards without overlap
    for (const [depth, items] of depthMap) {
      const depthRadius: number =
        (BASE_RADIUS as number) + ((depth as number) - 1) * (RING_GAP as number);
      // Ensure circumference has room for all cards: radius >= count * spacing / (2π)
      const fitRadius: number =
        items.length > 1 ? (items.length * (CARD_SPACING as number)) / (2 * Math.PI) : 0;
      const radius: Num = Math.max(depthRadius, fitRadius) as Num;
      const count: Num = items.length as Num;

      for (
        let i: Num = 0 as Num;
        (i as number) < (count as number);
        i = ((i as number) + 1) as Num
      ) {
        const entry: BfsEntry | undefined = items[i as number];

        if (!entry) {
          continue;
        }

        const angle: Num = ((2 * Math.PI * (i as number)) / (count as number) - Math.PI / 2) as Num;
        const x: Num = (centerX + radius * Math.cos(angle) - NODE_W / 2) as Num;
        const y: Num = (centerY + radius * Math.sin(angle) - NODE_H / 2) as Num;
        nodes.push({
          id: entry.id,
          component: entry.chain.component,
          kind: entry.chain.kind,
          category: entry.chain.category,
          x,
          y,
          parentId: entry.parentId,
        });

        const parent: LayoutNode | undefined = nodes.find(
          (n: LayoutNode): boolean => n.id === entry.parentId,
        );

        if (parent) {
          const clipped = clipLineToEdge(parent.x, parent.y, x, y, NODE_W, NODE_H);
          connectors.push({
            ...clipped,
            fromId: entry.parentId,
            toId: entry.id,
            kind: entry.chain.kind,
          });
        }
      }
    }

    // Shift all coordinates so nothing is negative
    let minX: Num = 0 as Num;
    let minY: Num = 0 as Num;

    for (const n of nodes) {
      if (n.x < minX) {
        minX = n.x;
      }
      if (n.y < minY) {
        minY = n.y;
      }
    }

    const offsetX: Num = (-minX + GAP_X) as Num;
    const offsetY: Num = (-minY + GAP_Y) as Num;

    for (const n of nodes) {
      n.x = (n.x + offsetX) as Num;
      n.y = (n.y + offsetY) as Num;
    }
    for (const c of connectors) {
      c.x1 = (c.x1 + offsetX) as Num;
      c.y1 = (c.y1 + offsetY) as Num;
      c.x2 = (c.x2 + offsetX) as Num;
      c.y2 = (c.y2 + offsetY) as Num;
    }

    let maxX: Num = 0 as Num;
    let maxYVal: Num = 0 as Num;

    for (const n of nodes) {
      if (n.x + NODE_W > maxX) {
        maxX = (n.x + NODE_W) as Num;
      }
      if (n.y + NODE_H > maxYVal) {
        maxYVal = (n.y + NODE_H) as Num;
      }
    }

    return {
      nodes,
      connectors,
      width: (maxX + GAP_X) as Num,
      height: (maxYVal + GAP_Y) as Num,
    };
  }

  /**
   * Lay out nodes using a simple force-directed simulation.
   * Runs a fixed number of iterations with repulsion + attraction forces.
   *
   * @param rootComponent - The root component name
   * @param children - Direct dependency chain nodes
   * @returns Layout result identical in shape to layoutGraph
   */
  function layoutForce(
    rootComponent: Str,
    children: ChainNode[],
  ): { nodes: LayoutNode[]; connectors: Connector[]; width: Num; height: Num } {
    // First, flatten all nodes with a BFS to get IDs and parent links
    type FlatNode = {
      /** Unique node identifier. @values root, Button-0, Tooltip-3 */
      id: Str;
      /** Component name. @values Button, Tooltip, Dialog */
      component: Str;
      /** Import kind (type, named, default, namespace). @values type, named, default, namespace */
      kind: Str;
      /** Dependency category (component, workspace, external). @values component, workspace, external */
      category: Str;
      /** Parent node identifier. @values root, Button-0 */
      parentId: Str;
      /** X position (mutable during simulation). @values 0, 150, -300 */
      x: Num;
      /** Y position (mutable during simulation). @values 0, 100, -200 */
      y: Num;
    };
    const flatNodes: FlatNode[] = [];
    const edges: Array<{ from: Str; to: Str; kind: Str }> = [];
    let idCounter: Num = 0 as Num;

    // Root
    flatNodes.push({
      id: 'root',
      component: rootComponent,
      kind: '',
      category: 'component',
      parentId: '',
      x: 0 as Num,
      y: 0 as Num,
    });

    // BFS to flatten
    type QItem = {
      /** The chain node to process. */ chain: ChainNode;
      /** Parent node ID. @values root, Button-0 */ parentId: Str;
    };
    const bfsQueue: QItem[] = children.map(
      (c: ChainNode): QItem => ({ chain: c, parentId: 'root' }),
    );

    while (bfsQueue.length > 0) {
      const item: QItem | undefined = bfsQueue.shift();

      if (!item) {
        continue;
      }

      const nodeId: Str = `${item.chain.component}-${String(idCounter)}` as Str;
      idCounter = (idCounter + 1) as Num;
      // Random initial position to break symmetry
      flatNodes.push({
        id: nodeId,
        component: item.chain.component,
        kind: item.chain.kind,
        category: item.chain.category,
        parentId: item.parentId,
        x: ((Math.random() - 0.5) * 1200) as Num,
        y: ((Math.random() - 0.5) * 1200) as Num,
      });
      edges.push({ from: item.parentId, to: nodeId, kind: item.chain.kind });
      for (const child of item.chain.children) {
        bfsQueue.push({ chain: child, parentId: nodeId });
      }
    }

    // Force simulation
    const ITERATIONS: Num = 150 as Num;
    const REPULSION: Num = 200_000 as Num;
    const ATTRACTION: Num = 0.003 as Num;
    const IDEAL_LENGTH: Num = 350 as Num;
    const DAMPING: Num = 0.9 as Num;

    const vx: number[] = Array.from({ length: flatNodes.length }, (): number => 0);
    const vy: number[] = Array.from({ length: flatNodes.length }, (): number => 0);

    for (let iter: number = 0; iter < (ITERATIONS as number); iter++) {
      // Repulsion between all pairs
      for (let i: number = 0; i < flatNodes.length; i++) {
        const ni: FlatNode | undefined = flatNodes[i];

        if (!ni) {
          continue;
        }
        for (let j: number = i + 1; j < flatNodes.length; j++) {
          const nj: FlatNode | undefined = flatNodes[j];

          if (!nj) {
            continue;
          }

          const dx: number = (ni.x as number) - (nj.x as number);
          const dy: number = (ni.y as number) - (nj.y as number);
          const dist: number = Math.max(Math.hypot(dx, dy), 1);
          const force: number = (REPULSION as number) / (dist * dist);
          const fx: number = (dx / dist) * force;
          const fy: number = (dy / dist) * force;
          vx[i] = (vx[i] ?? 0) + fx;
          vy[i] = (vy[i] ?? 0) + fy;
          vx[j] = (vx[j] ?? 0) - fx;
          vy[j] = (vy[j] ?? 0) - fy;
        }
      }

      // Attraction along edges
      for (const edge of edges) {
        const fromIdx: number = flatNodes.findIndex((n: FlatNode): boolean => n.id === edge.from);
        const toIdx: number = flatNodes.findIndex((n: FlatNode): boolean => n.id === edge.to);

        if (fromIdx < 0 || toIdx < 0) {
          continue;
        }

        const fromNode: FlatNode | undefined = flatNodes[fromIdx];
        const toNode: FlatNode | undefined = flatNodes[toIdx];

        if (!fromNode || !toNode) {
          continue;
        }

        const dx: number = (toNode.x as number) - (fromNode.x as number);
        const dy: number = (toNode.y as number) - (fromNode.y as number);
        const dist: number = Math.max(Math.hypot(dx, dy), 1);
        const force: number = (ATTRACTION as number) * (dist - (IDEAL_LENGTH as number));
        const fx: number = (dx / dist) * force;
        const fy: number = (dy / dist) * force;
        vx[fromIdx] = (vx[fromIdx] ?? 0) + fx;
        vy[fromIdx] = (vy[fromIdx] ?? 0) + fy;
        vx[toIdx] = (vx[toIdx] ?? 0) - fx;
        vy[toIdx] = (vy[toIdx] ?? 0) - fy;
      }

      // Apply velocities with damping, pin root at 0,0
      for (let i: number = 0; i < flatNodes.length; i++) {
        const node: FlatNode | undefined = flatNodes[i];

        if (!node) {
          continue;
        }

        const curVx: number = vx[i] ?? 0;
        const curVy: number = vy[i] ?? 0;

        if (node.id === 'root') {
          vx[i] = 0;
          vy[i] = 0;
          continue;
        }
        vx[i] = curVx * (DAMPING as number);
        vy[i] = curVy * (DAMPING as number);
        node.x = ((node.x as number) + (vx[i] ?? 0)) as Num;
        node.y = ((node.y as number) + (vy[i] ?? 0)) as Num;
      }
    }

    // Post-process: resolve any remaining overlaps by pushing apart
    const PAD_W: number = NODE_W + GAP_X;
    const PAD_H: number = NODE_H + GAP_Y;

    for (let pass: number = 0; pass < 50; pass++) {
      let moved: boolean = false;

      for (let i: number = 0; i < flatNodes.length; i++) {
        const a: FlatNode | undefined = flatNodes[i];

        if (!a) {
          continue;
        }
        for (let j: number = i + 1; j < flatNodes.length; j++) {
          const b: FlatNode | undefined = flatNodes[j];

          if (!b) {
            continue;
          }

          const overlapX: number = PAD_W - Math.abs((a.x as number) - (b.x as number));
          const overlapY: number = PAD_H - Math.abs((a.y as number) - (b.y as number));

          if (overlapX > 0 && overlapY > 0) {
            // Push apart along the axis of smaller overlap
            if (overlapX < overlapY) {
              const pushX: number = overlapX / 2 + 1;
              const signX: number = (a.x as number) >= (b.x as number) ? 1 : -1;

              if (a.id !== 'root') {
                a.x = ((a.x as number) + signX * pushX) as Num;
              }
              if (b.id !== 'root') {
                b.x = ((b.x as number) - signX * pushX) as Num;
              }
            } else {
              const pushY: number = overlapY / 2 + 1;
              const signY: number = (a.y as number) >= (b.y as number) ? 1 : -1;

              if (a.id !== 'root') {
                a.y = ((a.y as number) + signY * pushY) as Num;
              }
              if (b.id !== 'root') {
                b.y = ((b.y as number) - signY * pushY) as Num;
              }
            }
            moved = true;
          }
        }
      }
      if (!moved) {
        break;
      }
    }

    // Convert to LayoutNode[] + Connector[]
    // Shift so all coords are positive
    let minX: number = Infinity;
    let minY: number = Infinity;

    for (const n of flatNodes) {
      if ((n.x as number) < minX) {
        minX = n.x as number;
      }
      if ((n.y as number) < minY) {
        minY = n.y as number;
      }
    }

    const offsetX: Num = (-minX + GAP_X) as Num;
    const offsetY: Num = (-minY + GAP_Y) as Num;

    const layoutNodes: LayoutNode[] = flatNodes.map(
      (n: FlatNode): LayoutNode => ({
        id: n.id,
        component: n.component,
        kind: n.kind,
        category: n.category,
        x: (n.x + (offsetX as number)) as Num,
        y: (n.y + (offsetY as number)) as Num,
        parentId: n.parentId,
      }),
    );

    const layoutConnectors: Connector[] = [];

    for (const edge of edges) {
      const from: LayoutNode | undefined = layoutNodes.find(
        (n: LayoutNode): boolean => n.id === edge.from,
      );
      const to: LayoutNode | undefined = layoutNodes.find(
        (n: LayoutNode): boolean => n.id === edge.to,
      );

      if (!from || !to) {
        continue;
      }

      const clipped = clipLineToEdge(from.x, from.y, to.x, to.y, NODE_W, NODE_H);
      layoutConnectors.push({
        ...clipped,
        fromId: edge.from as Str,
        toId: edge.to as Str,
        kind: edge.kind,
      });
    }

    let maxX: number = 0;
    let maxY: number = 0;

    for (const n of layoutNodes) {
      if ((n.x as number) + (NODE_W as number) > maxX) {
        maxX = (n.x as number) + (NODE_W as number);
      }
      if ((n.y as number) + (NODE_H as number) > maxY) {
        maxY = (n.y as number) + (NODE_H as number);
      }
    }

    return {
      nodes: layoutNodes,
      connectors: layoutConnectors,
      width: (maxX + (GAP_X as number)) as Num,
      height: (maxY + (GAP_Y as number)) as Num,
    };
  }

  /** Computed graph layout from the dependency chain, using current layout mode. */
  const graphLayout = $derived.by(() => {
    const current: Str = validated.currentComponent ?? '';

    if (!current || dependencyChain.length === 0) {
      return null;
    }
    if (chainLayout === 'radial') {
      return layoutRadial(current, dependencyChain);
    }
    if (chainLayout === 'force') {
      return layoutForce(current, dependencyChain);
    }
    return layoutGraph(current, dependencyChain);
  });

  /**
   * Compute the set of hidden node IDs based on collapsed parents.
   * A node is hidden if ANY of its ancestors is in the collapsed set.
   */
  const hiddenNodeIds: Set<Str> = $derived.by((): Set<Str> => {
    if (!graphLayout) {
      return new Set();
    }

    const layout = graphLayout;
    const hidden: Set<Str> = new Set<Str>();

    /**
     * Recursively mark all descendants of a node as hidden.
     *
     * @param parentId - The parent node ID whose children should be hidden
     */
    function hideDescendants(parentId: Str): void {
      for (const node of layout.nodes) {
        if (node.parentId === parentId && !hidden.has(node.id)) {
          hidden.add(node.id);
          hideDescendants(node.id);
        }
      }
    }

    // For each collapsed node, hide all its descendants
    for (const [nodeId, isCollapsed] of Object.entries(chainCollapsedNodes)) {
      if (isCollapsed) {
        hideDescendants(nodeId as Str);
      }
    }
    return hidden;
  });

  /** Visible nodes (filtered by collapsed state). */
  const visibleNodes: LayoutNode[] = $derived(
    graphLayout?.nodes.filter((n: LayoutNode): boolean => !hiddenNodeIds.has(n.id)) ?? [],
  );

  /** Visible connectors (both endpoints must be visible). */
  const visibleConnectors: Connector[] = $derived.by((): Connector[] => {
    if (!graphLayout) {
      return [];
    }

    const visIds: Set<Str> = new Set(visibleNodes.map((n: LayoutNode): Str => n.id));

    return graphLayout.connectors.filter(
      (conn: Connector): boolean => visIds.has(conn.fromId) && visIds.has(conn.toId),
    );
  });

  /* ------------------------------------------------------------------ */
  /*  lockHeight Svelte action                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Svelte action that locks an element's min-height to its current height
   * on mount, preventing layout shift when filtering reduces content.
   *
   * @param node - The DOM element to lock height on
   * @returns Svelte action lifecycle object with destroy method
   */
  function lockHeight(node: HTMLElement): { destroy: () => void } {
    const raf: Num = requestAnimationFrame((): void => {
      node.style.minHeight = `${node.offsetHeight}px`;
    });

    return {
      destroy(): void {
        cancelAnimationFrame(raf);
        node.style.minHeight = '';
      },
    };
  }

  /** Zoom level for the dependency chain graph. */
  let chainZoom: Num = $state(1 as Num);
  const ZOOM_STEP: Num = 0.25 as Num;
  const ZOOM_MIN: Num = 0.25 as Num;
  const ZOOM_MAX: Num = 5 as Num;

  /** Search query for zoom level menu filtering. */
  let chainZoomSearchQuery: Str = $state('' as Str);

  /** Zoom level presets with descriptions. */
  const ZOOM_PRESETS: Array<{
    /** Zoom multiplier (1 = 100%). */
    value: Num;
    /** Display label. */
    label: Str;
    /** Brief description. */
    description: Str;
  }> = [
    { value: 0.25, label: '25%', description: 'Quarter size' },
    { value: (1 / 3) as Num, label: '33%', description: 'Third size' },
    { value: 0.5, label: '50%', description: 'Half size' },
    { value: (2 / 3) as Num, label: '67%', description: 'Two-thirds size' },
    { value: 0.75, label: '75%', description: 'Three-quarters' },
    { value: 1, label: '100%', description: 'Default — actual size' },
    { value: 1.25, label: '125%', description: 'Slight magnification' },
    { value: 1.5, label: '150%', description: '1.5\u00D7 magnification' },
    { value: 1.75, label: '175%', description: 'Near double' },
    { value: 2, label: '200%', description: 'Retina 2\u00D7' },
    { value: 2.5, label: '250%', description: '2.5\u00D7 magnification' },
    { value: 3, label: '300%', description: 'Retina 3\u00D7' },
    { value: 4, label: '400%', description: 'Extreme zoom' },
    { value: 5, label: '500%', description: 'Maximum zoom' },
  ];

  /** Zoom presets filtered by search query. */
  const filteredZoomPresets = $derived(
    chainZoomSearchQuery.length === 0
      ? ZOOM_PRESETS
      : ZOOM_PRESETS.filter((p) => {
          const q: Str = chainZoomSearchQuery.toLowerCase() as Str;

          return p.label.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
        }),
  );

  /**
   * Get the zoom percentage label.
   *
   * @returns Formatted zoom string like "100%"
   */
  function chainZoomLabel(): Str {
    return `${Math.round(chainZoom * 100)}%` as Str;
  }

  /**
   * Zoom in on the dependency chain graph.
   */
  function chainZoomIn(): void {
    chainZoom = Math.min(chainZoom + ZOOM_STEP, ZOOM_MAX) as Num;
  }

  /**
   * Zoom out on the dependency chain graph.
   */
  function chainZoomOut(): void {
    chainZoom = Math.max(chainZoom - ZOOM_STEP, ZOOM_MIN) as Num;
  }

  /**
   * Reset zoom to 100%.
   */
  function chainZoomFit(): void {
    chainZoom = 1 as Num;
  }

  /**
   * Scroll the chain canvas so the root node is centered in view.
   * Uses requestAnimationFrame to ensure layout has updated after state changes.
   */
  function centerOnRoot(): void {
    requestAnimationFrame((): void => {
      if (!chainCanvasRef || !graphLayout) {
        return;
      }

      const root: LayoutNode | undefined = graphLayout.nodes.find(
        (n: LayoutNode): boolean => n.id === 'root',
      );

      if (!root) {
        return;
      }

      const rect: DOMRect = chainCanvasRef.getBoundingClientRect();
      const rootCenterX: number = ((root.x as number) + NODE_W / 2) * (chainZoom as number);
      const rootCenterY: number = ((root.y as number) + NODE_H / 2) * (chainZoom as number);
      chainCanvasRef.scrollLeft = rootCenterX - rect.width / 2;
      chainCanvasRef.scrollTop = rootCenterY - rect.height / 2;
    });
  }

  /** DOM reference to the chain graph container for image export. */
  let chainGraphRef: HTMLDivElement | undefined = $state(undefined);

  /* ------------------------------------------------------------------ */
  /*  Chain export items                                                 */
  /* ------------------------------------------------------------------ */

  /** Chain export format menu items with descriptions and file extension badges. */
  const CHAIN_EXPORT_ITEMS: Array<{
    id: Str;
    label: Str;
    icon: typeof FileImage;
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
      id: 'copy-image',
      label: 'Copy as Image',
      icon: Clipboard,
      category: 'Clipboard',
      description: 'Copies PNG to clipboard',
      ext: '',
    },
    {
      id: 'copy-json',
      label: 'Copy as JSON',
      icon: Braces,
      category: 'Data',
      description: 'Structured data format',
      ext: '',
    },
    {
      id: 'copy-mermaid',
      label: 'Copy as Mermaid',
      icon: GitBranch,
      category: 'Data',
      description: 'Mermaid diagram syntax',
      ext: '',
    },
    {
      id: 'copy-dot',
      label: 'Copy as DOT',
      icon: GitBranch,
      category: 'Data',
      description: 'Graphviz graph description',
      ext: '',
    },
    {
      id: 'copy-csv',
      label: 'Copy as CSV',
      icon: Table,
      category: 'Data',
      description: 'Spreadsheet-compatible format',
      ext: '',
    },
    {
      id: 'copy-plantuml',
      label: 'Copy as PlantUML',
      icon: FileCode,
      category: 'Data',
      description: 'PlantUML diagram syntax',
      ext: '',
    },
    {
      id: 'copy-markdown',
      label: 'Copy as Markdown',
      icon: FileText,
      category: 'Data',
      description: 'Formatted table for docs',
      ext: '',
    },
  ];

  /** Search query for chain export menu filtering. */
  let chainExportSearchQuery: Str = $state('');

  /** Chain export items filtered by search query (searches label, description, category). */
  const filteredChainExportItems = $derived(
    chainExportSearchQuery.length === 0
      ? CHAIN_EXPORT_ITEMS
      : CHAIN_EXPORT_ITEMS.filter((p) => {
          const q: Str = chainExportSearchQuery.toLowerCase() as Str;

          return (
            p.label.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
          );
        }),
  );

  /** Unique chain export categories present after filtering. */
  const filteredChainExportCategories: Str[] = $derived([
    ...new Set(filteredChainExportItems.map((p) => p.category)),
  ]);

  /** Feedback state for chain export actions. */
  let chainExportFeedback: Str = $state('');

  /**
   * Convert the graph layout nodes into flat ChainExportNode[] for data export.
   *
   * @returns Array of chain export nodes
   */
  function buildExportNodes(): ChainExportNode[] {
    if (!graphLayout) {
      return [];
    }
    return graphLayout.nodes.map(
      (node: LayoutNode): ChainExportNode => ({
        id: node.id,
        label: node.category === 'component' ? toTitle(node.component) : node.component,
        kind: node.kind || 'default',
        category: node.category,
        parentId: node.parentId,
      }),
    );
  }

  /**
   * Handle export action for the dependency chain graph.
   *
   * @param formatId - Export format identifier
   */
  async function handleChainExport(formatId: Str): Promise<void> {
    const name: Str = validated.currentComponent ?? 'component';
    const filename: Str = `${name}-dependency-chain` as Str;

    if (formatId === 'copy-json') {
      await copyChainJson(buildExportNodes(), name);
    } else if (formatId === 'copy-mermaid') {
      await copyChainMermaid(buildExportNodes());
    } else if (formatId === 'copy-dot') {
      await copyChainDot(buildExportNodes(), name);
    } else if (formatId === 'copy-csv') {
      await copyChainCsv(buildExportNodes());
    } else if (formatId === 'copy-plantuml') {
      await copyChainPlantUml(buildExportNodes(), name);
    } else if (formatId === 'copy-markdown') {
      await copyChainMarkdown(buildExportNodes(), name);
    } else {
      const el: HTMLDivElement | undefined = chainGraphRef;

      if (!el) {
        return;
      }
      if (formatId === 'png') {
        await exportPng(el, filename);
      } else if (formatId === 'jpeg') {
        await exportJpeg(el, filename);
      } else if (formatId === 'svg') {
        await exportSvg(el, filename);
      } else if (formatId === 'webp') {
        await exportWebp(el, filename);
      } else if (formatId === 'copy-image') {
        await copyImageToClipboard(el);
      }
    }
    chainExportFeedback = formatId;
    setTimeout((): Void => {
      chainExportFeedback = '';
    }, 2000);
  }

  /* ------------------------------------------------------------------ */
  /*  New toolbar state (must precede derived values)                    */
  /* ------------------------------------------------------------------ */

  /** Per-node collapsed state keyed by node ID (#4). */
  let chainCollapsedNodes: Record<Str, Bool> = $state({});

  /** Search query for filtering graph nodes by name (#5). */
  let chainNodeSearch: Str = $state('' as Str);

  /** Current graph layout mode (#6). */
  let chainLayout: Str = $state('tree' as Str);

  /** Search query for layout menu (#6). */
  let chainLayoutSearchQuery: Str = $state('' as Str);

  /** Whether color-blind safe palette is active (#7). */
  let chainColorBlindMode: Bool = $state(false);

  /* ------------------------------------------------------------------ */
  /*  #1 Reset — zoom to 100% + exit fullscreen                         */
  /* ------------------------------------------------------------------ */

  /** Whether any chain state has been modified from defaults. */
  const chainHasChanges: Bool = $derived(
    chainZoom !== 1 ||
      chainFullscreen ||
      chainNodeSearch !== '' ||
      chainLayout !== 'tree' ||
      chainColorBlindMode ||
      chainMaxDepthLimit !== DEFAULT_MAX_DEPTH ||
      depSortMode !== 'default',
  );

  /**
   * Reset the dependency chain to default state.
   */
  function chainReset(): Void {
    chainZoom = 1 as Num;
    chainFullscreen = false;
    chainNodeSearch = '' as Str;
    chainLayout = 'tree' as Str;
    chainColorBlindMode = false;
    chainCollapsedNodes = {};
    chainMaxDepthLimit = DEFAULT_MAX_DEPTH;
    depSortMode = 'default' as Str;
    hoveredNodeId = '' as Str;
  }

  /* ------------------------------------------------------------------ */
  /*  #2 Tree metrics — node count, edge count, max depth                */
  /* ------------------------------------------------------------------ */

  /**
   * Compute max depth of the chain tree recursively.
   *
   * @param nodes - Chain nodes at current level
   * @param depth - Current depth
   * @returns Maximum depth reached
   */
  function maxChainDepth(nodes: ChainNode[], depth: Num): Num {
    if (nodes.length === 0) {
      return depth;
    }

    let max: Num = depth;

    for (const node of nodes) {
      const d: Num = maxChainDepth(node.children, (depth + 1) as Num);

      if (d > max) {
        max = d;
      }
    }
    return max;
  }

  /** Total node count in the graph layout (including root). */
  const chainNodeCount: Num = $derived(graphLayout?.nodes.length ?? (0 as Num));

  /** Total edge/connector count in the graph layout. */
  const chainEdgeCount: Num = $derived(graphLayout?.connectors.length ?? (0 as Num));

  /** Maximum depth of the dependency chain tree. */
  const chainMaxDepth: Num = $derived(maxChainDepth(dependencyChain, 0 as Num));

  /* ------------------------------------------------------------------ */
  /*  #4 Collapse/Expand all nodes (derived)                             */
  /* ------------------------------------------------------------------ */

  /** Whether all expandable nodes are currently collapsed. */
  const chainAllCollapsed: Bool = $derived.by((): Bool => {
    if (!graphLayout) {
      return false;
    }

    const layout = graphLayout;
    const expandable: LayoutNode[] = layout.nodes.filter((n: LayoutNode): boolean => {
      return layout.nodes.some((c: LayoutNode): boolean => c.parentId === n.id);
    });

    if (expandable.length === 0) {
      return false;
    }
    return expandable.every((n: LayoutNode): boolean => chainCollapsedNodes[n.id] === true);
  });

  /**
   * Toggle all nodes between collapsed and expanded.
   */
  function toggleCollapseAll(): Void {
    if (!graphLayout) {
      return;
    }

    const shouldCollapse: Bool = !chainAllCollapsed;
    const next: Record<Str, Bool> = {};

    for (const node of graphLayout.nodes) {
      const hasChildren: Bool = graphLayout.nodes.some(
        (c: LayoutNode): boolean => c.parentId === node.id,
      );

      if (hasChildren) {
        next[node.id] = shouldCollapse;
      }
    }
    chainCollapsedNodes = next;
    centerOnRoot();
  }

  /* ------------------------------------------------------------------ */
  /*  #5 Search/filter nodes (derived)                                   */
  /* ------------------------------------------------------------------ */

  /** Set of node IDs that match the search query. */
  const chainMatchedNodeIds: Set<Str> = $derived.by((): Set<Str> => {
    if (!graphLayout || chainNodeSearch.length === 0) {
      return new Set();
    }

    const q: Str = chainNodeSearch.toLowerCase() as Str;
    const matched: Set<Str> = new Set<Str>();

    for (const node of graphLayout.nodes) {
      const label: Str = node.category === 'component' ? toTitle(node.component) : node.component;

      if (label.toLowerCase().includes(q) || node.component.toLowerCase().includes(q)) {
        matched.add(node.id);
      }
    }
    return matched;
  });

  /** Count of matched nodes. */
  const chainMatchCount: Num = $derived(chainMatchedNodeIds.size as Num);

  /* ------------------------------------------------------------------ */
  /*  #10 Search auto-scroll to first match                              */
  /* ------------------------------------------------------------------ */

  /**
   * When search matches change and there are results, auto-scroll
   * the canvas to center the first matched node.
   */
  $effect(() => {
    if (chainMatchedNodeIds.size === 0 || !chainCanvasRef || !graphLayout) {
      return;
    }

    const firstId: Str | undefined = chainMatchedNodeIds.values().next().value;

    if (!firstId) {
      return;
    }

    const matchedNode: LayoutNode | undefined = graphLayout.nodes.find(
      (n: LayoutNode): boolean => n.id === firstId,
    );

    if (!matchedNode) {
      return;
    }
    requestAnimationFrame((): void => {
      if (!chainCanvasRef) {
        return;
      }

      const rect: DOMRect = chainCanvasRef.getBoundingClientRect();
      const centerX: number = ((matchedNode.x as number) + NODE_W / 2) * (chainZoom as number);
      const centerY: number = ((matchedNode.y as number) + NODE_H / 2) * (chainZoom as number);
      chainCanvasRef.scrollLeft = centerX - rect.width / 2;
      chainCanvasRef.scrollTop = centerY - rect.height / 2;
    });
  });

  /* ------------------------------------------------------------------ */
  /*  #5 Highlighted path on hover                                       */
  /* ------------------------------------------------------------------ */

  /** Set of node IDs in the path from hovered node up to root. */
  const highlightedPathIds: Set<Str> = $derived.by((): Set<Str> => {
    if (!graphLayout || hoveredNodeId === '') {
      return new Set();
    }

    const pathIds: Set<Str> = new Set<Str>();
    let currentId: Str = hoveredNodeId;
    const nodeMap: Map<Str, LayoutNode> = new Map(
      graphLayout.nodes.map((n: LayoutNode): [Str, LayoutNode] => [n.id, n]),
    );

    while (currentId) {
      pathIds.add(currentId);
      const node: LayoutNode | undefined = nodeMap.get(currentId);

      if (!node || node.parentId === '') {
        if (node) {
          pathIds.add('root' as Str);
        }
        break;
      }
      currentId = node.parentId;
    }
    return pathIds;
  });

  /* ------------------------------------------------------------------ */
  /*  #7 Transitive dependency count per node                            */
  /* ------------------------------------------------------------------ */

  /** Map of node ID to transitive descendant count. */
  const transitiveCountMap: Map<Str, Num> = $derived.by((): Map<Str, Num> => {
    if (!graphLayout) {
      return new Map();
    }

    const layout = graphLayout;
    const countMap: Map<Str, Num> = new Map();

    /**
     * Count all descendants of a node recursively.
     *
     * @param nodeId - Node to count descendants for
     * @returns Total descendant count
     */
    function countDescendants(nodeId: Str): Num {
      if (countMap.has(nodeId)) {
        return countMap.get(nodeId) ?? (0 as Num);
      }

      const children: LayoutNode[] = layout.nodes.filter(
        (n: LayoutNode): boolean => n.parentId === nodeId,
      );
      let total: Num = children.length as Num;

      for (const child of children) {
        total = (total + countDescendants(child.id)) as Num;
      }
      countMap.set(nodeId, total);
      return total;
    }

    for (const node of layout.nodes) {
      countDescendants(node.id);
    }
    return countMap;
  });

  /* ------------------------------------------------------------------ */
  /*  #11 Sort controls within categories                                */
  /* ------------------------------------------------------------------ */

  /**
   * Sort a dependency list based on the current sort mode.
   *
   * @param depList - Array of DepEntry items to sort
   * @returns Sorted copy of the list
   */
  function sortDeps(depList: DepEntry[]): DepEntry[] {
    if (depSortMode === 'default') {
      return depList;
    }

    const sorted: DepEntry[] = [...depList];

    if (depSortMode === 'alpha') {
      sorted.sort((a: DepEntry, b: DepEntry): number => {
        const aName: Str = a.component || a.path;
        const bName: Str = b.component || b.path;

        return aName.localeCompare(bName);
      });
    } else if (depSortMode === 'alpha-desc') {
      sorted.sort((a: DepEntry, b: DepEntry): number => {
        const aName: Str = a.component || a.path;
        const bName: Str = b.component || b.path;

        return bName.localeCompare(aName);
      });
    } else if (depSortMode === 'size') {
      sorted.sort((a: DepEntry, b: DepEntry): number => {
        const aSize: Num = (sizes[a.component]?.source ?? 0) as Num;
        const bSize: Num = (sizes[b.component]?.source ?? 0) as Num;

        return (bSize as number) - (aSize as number);
      });
    }
    return sorted;
  }

  /** Sorted UI component deps. */
  const sortedUiComponentDeps: DepEntry[] = $derived(sortDeps(uiComponentDeps));

  /** Sorted utility deps. */
  const sortedUtilityDeps: DepEntry[] = $derived(sortDeps(utilityDeps));

  /** Sorted workspace deps. */
  const sortedWorkspaceDeps: DepEntry[] = $derived(sortDeps(validated.deps.workspace));

  /** Sorted external deps. */
  const sortedExternalDeps: DepEntry[] = $derived(sortDeps(validated.deps.external));

  /* ------------------------------------------------------------------ */
  /*  #6 Layout toggle options                                           */
  /* ------------------------------------------------------------------ */

  /** Available layout modes with icons and descriptions. */
  const CHAIN_LAYOUT_OPTIONS: Array<{
    /** Layout mode ID. */
    id: Str;
    /** Display label. */
    label: Str;
    /** Brief description. */
    description: Str;
    /** Layout icon component. */
    icon: typeof Network;
  }> = [
    { id: 'tree', label: 'Tree', description: 'Top-down hierarchical layout', icon: Network },
    { id: 'radial', label: 'Radial', description: 'Circular outward from center', icon: Orbit },
    { id: 'force', label: 'Force', description: 'Physics-based force-directed', icon: Waypoints },
  ];

  /** Layout options filtered by search. */
  const filteredLayoutOptions = $derived(
    chainLayoutSearchQuery.length === 0
      ? CHAIN_LAYOUT_OPTIONS
      : CHAIN_LAYOUT_OPTIONS.filter((o) => {
          const q: Str = chainLayoutSearchQuery.toLowerCase() as Str;

          return o.label.toLowerCase().includes(q) || o.description.toLowerCase().includes(q);
        }),
  );

  /**
   * Get the node category CSS classes, respecting color-blind mode.
   *
   * @param category - Node category
   * @returns Border + background CSS classes
   */
  function getCategoryColor(category: Str): Str {
    if (chainColorBlindMode) {
      if (category === 'utility') {
        return 'border-blue-600/40 bg-blue-600/5' as Str;
      }
      if (category === 'workspace') {
        return 'border-orange-500/40 bg-orange-500/5' as Str;
      }
      if (category === 'external') {
        return 'border-purple-600/40 bg-purple-600/5' as Str;
      }
      return '' as Str;
    }
    if (category === 'utility') {
      return 'border-slate-500/40 bg-slate-500/5' as Str;
    }
    if (category === 'workspace') {
      return 'border-amber-500/40 bg-amber-500/5' as Str;
    }
    if (category === 'external') {
      return 'border-emerald-500/40 bg-emerald-500/5' as Str;
    }
    return '' as Str;
  }

  /**
   * Get the node category dot color, respecting color-blind mode.
   *
   * @param category - Node category
   * @returns Dot CSS class
   */
  function getCategoryDotColor(category: Str): Str {
    if (chainColorBlindMode) {
      if (category === 'utility') {
        return 'bg-blue-600/40' as Str;
      }
      if (category === 'workspace') {
        return 'bg-orange-500/40' as Str;
      }
      if (category === 'external') {
        return 'bg-purple-600/40' as Str;
      }
      return 'bg-primary/40' as Str;
    }
    if (category === 'utility') {
      return 'bg-slate-500/40' as Str;
    }
    if (category === 'workspace') {
      return 'bg-amber-500/40' as Str;
    }
    if (category === 'external') {
      return 'bg-emerald-500/40' as Str;
    }
    return 'bg-primary/40' as Str;
  }
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape' && chainFullscreen) chainFullscreen = false;
  }}
/>

<!-- Summary bar -->
<div class="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
  {#if uiComponentDeps.length > 0}
    <span>
      {uiComponentDeps.length} UI Component{uiComponentDeps.length === 1 ? '' : 's'}
      {#if totalInternalSource > 0}
        <span class="text-muted-foreground/70"
          >({formatBytes(totalInternalSource)} source{#if totalInternalGzip > 0}{' · '}{formatBytes(
              totalInternalGzip,
            )} production{/if})</span
        >
      {/if}
    </span>
  {/if}
  {#if utilityDeps.length > 0}
    <span>{utilityDeps.length} Internal</span>
  {/if}
  {#if validated.deps.workspace.length > 0}
    <span>{validated.deps.workspace.length} Workspace</span>
  {/if}
  {#if validated.deps.external.length > 0}
    <span>{validated.deps.external.length} External</span>
  {/if}
  {#if usedByCount > 0}
    <span class="font-medium text-foreground"
      >Used by {usedByCount} component{usedByCount === 1 ? '' : 's'}</span
    >
  {/if}
  {#if totalDeps === 0 && usedByCount === 0}
    <span>No dependencies detected.</span>
  {/if}
</div>

<div class={cn('space-y-2', className)} {...restProps}>
  <!-- Used By (reverse dependencies) -->
  {#if usedByCount > 0}
    <div class="overflow-hidden rounded-md border bg-card">
      <button
        type="button"
        class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/50"
        onclick={() => toggle('usedBy')}
      >
        <ChevronRight
          class={cn('size-4 shrink-0 transition-transform', expanded.usedBy && 'rotate-90')}
        />
        <UsersRound class="size-4 shrink-0 text-sky-500" />
        <span>Used By</span>
        <Badge variant="secondary" class="ml-auto text-xs">{usedByCount}</Badge>
      </button>
      {#if expanded.usedBy}
        <div class="border-t px-3 py-2" transition:slide={{ duration: 200 }}>
          <ul class="space-y-1">
            {#each validated.usedBy ?? [] as rev, ri (ri)}
              {@const revPath = `@/ui/${rev.component}/index.js`}
              <li class="group/dep flex items-center gap-2 text-sm">
                <span class="size-1 shrink-0 rounded-full bg-sky-500/40"></span>
                <a
                  href="/components/{rev.component}"
                  class="font-medium text-primary underline-offset-2 hover:underline"
                >
                  {toTitle(rev.component)}
                </a>
                {#if kindLabel(rev.kind)}
                  <span
                    class={cn(
                      'rounded px-1 py-0.5 text-[10px] font-medium leading-none',
                      kindClass(rev.kind),
                    )}
                  >
                    {kindLabel(rev.kind)}
                  </span>
                {/if}
                <span class="ml-auto flex shrink-0 items-center gap-1.5">
                  <span class="truncate text-xs text-muted-foreground">{rev.names.join(', ')}</span>
                  <Tooltip.Root delayDuration={300}>
                    <Tooltip.Trigger>
                      {#snippet child({ props: tooltipProps })}
                        <button
                          {...tooltipProps}
                          type="button"
                          class="inline-flex size-5 items-center justify-center rounded text-muted-foreground/50 opacity-0 transition-opacity hover:text-foreground group-hover/dep:opacity-100"
                          onclick={() => copyPath(revPath)}
                        >
                          {#if copiedPath === revPath}
                            <span in:fade={{ duration: 150 }}
                              ><Check class="size-3 text-emerald-500" /></span
                            >
                          {:else}
                            <Copy class="size-3" />
                          {/if}
                        </button>
                      {/snippet}
                    </Tooltip.Trigger>
                    <Tooltip.Content side="left" sideOffset={4}>
                      {copiedPath === revPath ? 'Copied!' : 'Copy import path'}
                    </Tooltip.Content>
                  </Tooltip.Root>
                </span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Dependency Chain (node graph) -->
  {#if graphLayout}
    {#if chainFullscreen}
      <div class="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" role="presentation"></div>
    {/if}
    <div
      class={cn(
        'overflow-hidden rounded-md border bg-card',
        chainFullscreen && 'fixed inset-4 z-50 flex flex-col',
      )}
    >
      <button
        type="button"
        class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/50"
        onclick={() => toggle('chain')}
      >
        <ChevronRight
          class={cn('size-4 shrink-0 transition-transform', expanded.chain && 'rotate-90')}
        />
        <GitBranch class="size-4 shrink-0 text-rose-500" />
        <span>Dependency Chain</span>
        <Badge variant="secondary" class="ml-auto text-xs">{dependencyChain.length}</Badge>
      </button>
      {#if expanded.chain}
        <div
          class={cn(chainFullscreen && 'flex flex-1 flex-col')}
          transition:slide={{ duration: 200 }}
        >
          <!-- Zoom toolbar -->
          <div class="flex items-center gap-1 border-t px-3 py-1.5">
            <!-- #4 Collapse/Expand all -->
            <Tooltip.Root delayDuration={300}>
              <Tooltip.Trigger>
                {#snippet child({ props: tipProps })}
                  <button
                    {...tipProps}
                    type="button"
                    class="inline-flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onclick={toggleCollapseAll}
                  >
                    {#if chainAllCollapsed}
                      <ChevronsUpDown class="size-3.5" />
                    {:else}
                      <ChevronsDownUp class="size-3.5" />
                    {/if}
                  </button>
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content side="top" sideOffset={4}
                >{chainAllCollapsed ? 'Expand all nodes' : 'Collapse all nodes'}</Tooltip.Content
              >
            </Tooltip.Root>
            <!-- Focus root node -->
            <Tooltip.Root delayDuration={300}>
              <Tooltip.Trigger>
                {#snippet child({ props: tipProps })}
                  <button
                    {...tipProps}
                    type="button"
                    class="inline-flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onclick={centerOnRoot}
                  >
                    <LocateFixed class="size-3.5" />
                  </button>
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content side="top" sideOffset={4}>Focus root node</Tooltip.Content>
            </Tooltip.Root>
            <span class="mx-0.5 h-4 w-px bg-border" aria-hidden="true"></span>
            <!-- #6 Layout toggle -->
            <Tooltip.Provider>
              <Tooltip.Root delayDuration={300}>
                <DropdownMenu.Root
                  onOpenChange={(open) => {
                    if (open) chainLayoutSearchQuery = '' as Str;
                  }}
                >
                  <Tooltip.Trigger>
                    {#snippet child({ props: tipProps })}
                      <DropdownMenu.Trigger>
                        {#snippet child({ props })}
                          <button
                            type="button"
                            {...tipProps}
                            {...props}
                            class="inline-flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            {#if chainLayout === 'radial'}
                              <Orbit class="size-3.5" />
                            {:else if chainLayout === 'force'}
                              <Waypoints class="size-3.5" />
                            {:else}
                              <Network class="size-3.5" />
                            {/if}
                          </button>
                        {/snippet}
                      </DropdownMenu.Trigger>
                    {/snippet}
                  </Tooltip.Trigger>
                  <Tooltip.Content side="top" sideOffset={4}>Layout mode</Tooltip.Content>
                  <DropdownMenu.Content align="start" class="flex w-56 flex-col overflow-hidden">
                    <div class="shrink-0 px-2 pb-1.5 pt-1">
                      <div
                        class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                      >
                        <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <input
                          type="text"
                          placeholder="Search layouts..."
                          class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                          bind:value={chainLayoutSearchQuery}
                          onkeydown={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    {#each filteredLayoutOptions as option (option.id)}
                      <DropdownMenu.Item
                        closeOnSelect={false}
                        onclick={() => {
                          chainLayout = option.id;
                          centerOnRoot();
                        }}
                      >
                        {#if chainLayout === option.id}
                          <span in:fade={{ duration: 150 }}
                            ><Check class="size-4 text-green-500" /></span
                          >
                        {:else}
                          <option.icon class="size-4" />
                        {/if}
                        <div class="flex flex-col gap-0.5">
                          <span class="text-sm">{option.label}</span>
                          <span class="text-[11px] text-muted-foreground">{option.description}</span
                          >
                        </div>
                      </DropdownMenu.Item>
                    {:else}
                      <div
                        class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
                      >
                        <SearchX class="size-5" />
                        <div class="flex flex-col items-center gap-0.5">
                          <p class="text-xs font-medium">No layouts found</p>
                          <p class="text-[11px]">Try a different search term</p>
                        </div>
                      </div>
                    {/each}
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </Tooltip.Root>
            </Tooltip.Provider>
            <!-- #4b Depth limit dropdown -->
            <Tooltip.Provider>
              <Tooltip.Root delayDuration={300}>
                <DropdownMenu.Root
                  onOpenChange={(open) => {
                    if (open) chainDepthSearchQuery = '' as Str;
                  }}
                >
                  <Tooltip.Trigger>
                    {#snippet child({ props: tipProps })}
                      <DropdownMenu.Trigger>
                        {#snippet child({ props })}
                          <button
                            type="button"
                            {...tipProps}
                            {...props}
                            class="inline-flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Layers class="size-3.5" />
                          </button>
                        {/snippet}
                      </DropdownMenu.Trigger>
                    {/snippet}
                  </Tooltip.Trigger>
                  <Tooltip.Content side="top" sideOffset={4}
                    >Depth limit ({chainMaxDepthLimit === -1
                      ? '\u221E'
                      : chainMaxDepthLimit})</Tooltip.Content
                  >
                  <DropdownMenu.Content align="start" class="flex w-56 flex-col overflow-hidden">
                    <div class="shrink-0 px-2 pb-1.5 pt-1">
                      <div
                        class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                      >
                        <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <input
                          type="text"
                          placeholder="Search depths..."
                          class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                          bind:value={chainDepthSearchQuery}
                          onkeydown={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    {#each filteredDepthPresets as preset (preset.value)}
                      <DropdownMenu.Item
                        closeOnSelect={false}
                        onclick={() => {
                          chainMaxDepthLimit = preset.value;
                        }}
                      >
                        {#if chainMaxDepthLimit === preset.value}
                          <span in:fade={{ duration: 150 }}
                            ><Check class="size-4 text-green-500" /></span
                          >
                        {:else}
                          <Layers class="size-4" />
                        {/if}
                        <div class="flex flex-col gap-0.5">
                          <span class="text-sm">Depth {preset.label}</span>
                          <span class="text-[11px] text-muted-foreground">{preset.description}</span
                          >
                        </div>
                      </DropdownMenu.Item>
                    {:else}
                      <div
                        class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
                      >
                        <SearchX class="size-5" />
                        <div class="flex flex-col items-center gap-0.5">
                          <p class="text-xs font-medium">No depths found</p>
                          <p class="text-[11px]">Try a different search term</p>
                        </div>
                      </div>
                    {/each}
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </Tooltip.Root>
            </Tooltip.Provider>
            <!-- #7 Color-blind palette toggle -->
            <Tooltip.Root delayDuration={300}>
              <Tooltip.Trigger>
                {#snippet child({ props: tipProps })}
                  <button
                    {...tipProps}
                    type="button"
                    class={cn(
                      'inline-flex size-7 items-center justify-center rounded transition-colors',
                      chainColorBlindMode
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                    onclick={() => {
                      chainColorBlindMode = !chainColorBlindMode;
                    }}
                    aria-pressed={chainColorBlindMode}
                  >
                    <Accessibility class="size-3.5" />
                  </button>
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content side="top" sideOffset={4}>
                {chainColorBlindMode ? 'Disable color-blind palette' : 'Color-blind safe palette'}
              </Tooltip.Content>
            </Tooltip.Root>
            <span class="mx-0.5 h-4 w-px bg-border" aria-hidden="true"></span>
            <!-- Zoom controls -->
            <Tooltip.Root delayDuration={300}>
              <Tooltip.Trigger>
                {#snippet child({ props: tipProps })}
                  <button
                    {...tipProps}
                    type="button"
                    class={cn(
                      'inline-flex size-7 items-center justify-center rounded text-muted-foreground transition-colors',
                      chainZoom <= ZOOM_MIN
                        ? 'cursor-not-allowed opacity-30'
                        : 'hover:bg-muted hover:text-foreground',
                    )}
                    onclick={chainZoom <= ZOOM_MIN ? undefined : chainZoomOut}
                    aria-disabled={chainZoom <= ZOOM_MIN}
                  >
                    <ZoomOut class="size-3.5" />
                  </button>
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content side="top" sideOffset={4}>Zoom out</Tooltip.Content>
            </Tooltip.Root>
            <span class="min-w-[3rem] text-center text-[11px] font-medium text-muted-foreground"
              >{chainZoomLabel()}</span
            >
            <Tooltip.Root delayDuration={300}>
              <Tooltip.Trigger>
                {#snippet child({ props: tipProps })}
                  <button
                    {...tipProps}
                    type="button"
                    class={cn(
                      'inline-flex size-7 items-center justify-center rounded text-muted-foreground transition-colors',
                      chainZoom >= ZOOM_MAX
                        ? 'cursor-not-allowed opacity-30'
                        : 'hover:bg-muted hover:text-foreground',
                    )}
                    onclick={chainZoom >= ZOOM_MAX ? undefined : chainZoomIn}
                    aria-disabled={chainZoom >= ZOOM_MAX}
                  >
                    <ZoomIn class="size-3.5" />
                  </button>
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content side="top" sideOffset={4}>Zoom in</Tooltip.Content>
            </Tooltip.Root>
            <Tooltip.Root delayDuration={300}>
              <Tooltip.Trigger>
                {#snippet child({ props: tipProps })}
                  <button
                    {...tipProps}
                    type="button"
                    class={cn(
                      'inline-flex size-7 items-center justify-center rounded text-muted-foreground transition-colors',
                      chainZoom === 1
                        ? 'cursor-not-allowed opacity-30'
                        : 'hover:bg-muted hover:text-foreground',
                    )}
                    onclick={chainZoom === 1 ? undefined : chainZoomFit}
                    aria-disabled={chainZoom === 1}
                  >
                    <Maximize class="size-3.5" />
                  </button>
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content side="top" sideOffset={4}>Fit (100%)</Tooltip.Content>
            </Tooltip.Root>
            <Tooltip.Root delayDuration={300}>
              <Tooltip.Trigger>
                {#snippet child({ props: tipProps })}
                  <button
                    {...tipProps}
                    type="button"
                    class="inline-flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onclick={toggleChainFullscreen}
                  >
                    {#if chainFullscreen}
                      <Minimize2 class="size-3.5" />
                    {:else}
                      <Maximize2 class="size-3.5" />
                    {/if}
                  </button>
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content side="top" sideOffset={4}
                >{chainFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</Tooltip.Content
              >
            </Tooltip.Root>
            <span class="mx-0.5 h-4 w-px bg-border" aria-hidden="true"></span>
            <!-- #1 Reset button -->
            {#if chainHasChanges}
              <Tooltip.Root delayDuration={300}>
                <Tooltip.Trigger>
                  {#snippet child({ props: tipProps })}
                    <button
                      {...tipProps}
                      type="button"
                      class="inline-flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      onclick={chainReset}
                    >
                      <RotateCcw class="size-3.5" />
                    </button>
                  {/snippet}
                </Tooltip.Trigger>
                <Tooltip.Content side="top" sideOffset={4}>Reset to defaults</Tooltip.Content>
              </Tooltip.Root>
            {/if}
            <!-- #2 Tree metrics badge -->
            <Tooltip.Root delayDuration={300}>
              <Tooltip.Trigger>
                {#snippet child({ props: tipProps })}
                  <span
                    {...tipProps}
                    class="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                  >
                    <TreePine class="size-3" />
                    {chainNodeCount}N · {chainEdgeCount}E · D{chainMaxDepth}
                  </span>
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content side="top" sideOffset={4}>
                {chainNodeCount} nodes · {chainEdgeCount} edges · depth {chainMaxDepth}
              </Tooltip.Content>
            </Tooltip.Root>
            <!-- #5 Node search -->
            <div class="flex items-center gap-1 rounded-md border bg-transparent px-1.5 py-0.5">
              <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                type="text"
                placeholder="Filter nodes..."
                class="w-20 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground"
                bind:value={chainNodeSearch}
              />
              {#if chainNodeSearch.length > 0}
                <span class="text-[10px] font-medium text-muted-foreground">{chainMatchCount}</span>
              {/if}
            </div>
            <div class="ml-auto">
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  {#snippet child({ props })}
                    <button
                      {...props}
                      type="button"
                      class="inline-flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Options"
                    >
                      <EllipsisVertical class="size-3.5" />
                    </button>
                  {/snippet}
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end" class="w-52">
                  <DropdownMenu.Sub
                    onOpenChange={(open) => {
                      if (open) chainZoomSearchQuery = '' as Str;
                    }}
                  >
                    <DropdownMenu.SubTrigger>
                      <ZoomIn class="size-4" />
                      Zoom
                      <span
                        class="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]"
                        >{chainZoomLabel()}</span
                      >
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.SubContent class="flex max-h-96 w-72 flex-col overflow-hidden">
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
                            placeholder="Search zoom levels..."
                            class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            bind:value={chainZoomSearchQuery}
                            onkeydown={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
                        <!-- Zoom Actions -->
                        <DropdownMenu.Label class="text-xs">Actions</DropdownMenu.Label>
                        <DropdownMenu.Item
                          closeOnSelect={false}
                          onclick={chainZoomIn}
                          disabled={chainZoom >= ZOOM_MAX}
                        >
                          <ZoomIn class="size-4" />
                          <div class="flex flex-col gap-0.5">
                            <span class="text-sm">Zoom In</span>
                            <span class="text-[11px] text-muted-foreground">Increase by 25%</span>
                          </div>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          closeOnSelect={false}
                          onclick={chainZoomOut}
                          disabled={chainZoom <= ZOOM_MIN}
                        >
                          <ZoomOut class="size-4" />
                          <div class="flex flex-col gap-0.5">
                            <span class="text-sm">Zoom Out</span>
                            <span class="text-[11px] text-muted-foreground">Decrease by 25%</span>
                          </div>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          closeOnSelect={false}
                          onclick={chainZoomFit}
                          disabled={chainZoom === 1}
                        >
                          <Maximize class="size-4" />
                          <div class="flex flex-col gap-0.5">
                            <span class="text-sm">Reset (100%)</span>
                            <span class="text-[11px] text-muted-foreground"
                              >Restore to actual size</span
                            >
                          </div>
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator />
                        <!-- Zoom Level Presets -->
                        <DropdownMenu.Label class="text-xs">Zoom Level</DropdownMenu.Label>
                        {#each filteredZoomPresets as preset (preset.value)}
                          <DropdownMenu.Item
                            closeOnSelect={false}
                            onclick={() => {
                              chainZoom = preset.value;
                            }}
                          >
                            <Check
                              class={cn(
                                'size-4 shrink-0 transition-opacity duration-150',
                                chainZoom !== preset.value && 'opacity-0',
                              )}
                            />
                            <div class="flex flex-col gap-0.5">
                              <span class="text-sm">{preset.label}</span>
                              <span class="text-[11px] text-muted-foreground"
                                >{preset.description}</span
                              >
                            </div>
                          </DropdownMenu.Item>
                        {:else}
                          <div
                            class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground"
                          >
                            <SearchX class="size-5" />
                            <div class="flex flex-col items-center gap-0.5">
                              <p class="text-xs font-medium">No zoom levels found</p>
                              <p class="text-[11px]">Try a different search term</p>
                            </div>
                          </div>
                        {/each}
                      </div>
                      <!-- Sticky custom section -->
                      <DropdownMenu.Separator />
                      <div class="shrink-0 px-2 py-1.5">
                        <p class="mb-1.5 text-xs font-medium text-muted-foreground">
                          Custom ({chainZoomLabel()})
                        </p>
                        <Slider
                          type="single"
                          value={Math.round(chainZoom * 100)}
                          min={ZOOM_MIN * 100}
                          max={ZOOM_MAX * 100}
                          step={1}
                          onValueChange={(v) => {
                            chainZoom = (v / 100) as Num;
                          }}
                        />
                      </div>
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Sub>
                  <DropdownMenu.Sub
                    onOpenChange={(open) => {
                      if (open) chainExportSearchQuery = '';
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
                            bind:value={chainExportSearchQuery}
                            onkeydown={(e) => e.stopPropagation()}
                            onkeyup={(e) => e.stopPropagation()}
                            onkeypress={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div class="flex min-h-0 flex-1 flex-col overflow-y-auto">
                        {#each filteredChainExportCategories as category (category)}
                          {#if filteredChainExportCategories.indexOf(category) > 0}
                            <DropdownMenu.Separator />
                          {/if}
                          <DropdownMenu.Label
                            class="flex items-center gap-1.5 text-xs text-muted-foreground/60"
                          >
                            {#if category === 'Image'}
                              <FileImage class="size-3" />
                            {:else if category === 'Clipboard'}
                              <Clipboard class="size-3" />
                            {:else}
                              <Braces class="size-3" />
                            {/if}
                            {category}
                          </DropdownMenu.Label>
                          {#each filteredChainExportItems.filter((i) => i.category === category) as item (item.id)}
                            <DropdownMenu.Item
                              onSelect={(e) => {
                                e.preventDefault();
                                handleChainExport(item.id);
                              }}
                            >
                              {#if chainExportFeedback === item.id}
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
            </div>
          </div>
          <!-- Graph canvas (drag to pan) -->
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <div
            bind:this={chainCanvasRef}
            class={cn(
              'overflow-auto border-t bg-muted/20 p-4',
              chainFullscreen && 'flex-1',
              isDragging ? 'cursor-grabbing' : 'cursor-grab',
            )}
            style={chainFullscreen ? '' : 'max-height: 500px;'}
            onmousedown={onCanvasPointerDown}
            onmousemove={onCanvasPointerMove}
            onmouseup={onCanvasPointerUp}
            onmouseleave={onCanvasPointerUp}
            role="application"
            aria-label="Dependency chain graph — drag to pan, Ctrl+scroll to zoom"
          >
            <div
              class="relative origin-top-left transition-transform"
              style="width: {graphLayout.width}px; height: {graphLayout.height}px; min-width: 200px; zoom: {chainZoom};"
              bind:this={chainGraphRef}
            >
              <!-- SVG connector lines (behind cards) -->
              <svg
                class="pointer-events-none absolute inset-0"
                width={graphLayout.width}
                height={graphLayout.height}
              >
                {#each visibleConnectors as conn, ci (ci)}
                  {@const midY = conn.y1 + (conn.y2 - conn.y1) * 0.5}
                  {@const midX = (conn.x1 + conn.x2) / 2}
                  {@const connOnPath =
                    hoveredNodeId !== '' &&
                    highlightedPathIds.has(conn.fromId) &&
                    highlightedPathIds.has(conn.toId)}
                  {@const connDimmed = hoveredNodeId !== '' && !connOnPath}
                  <!-- Line shadow (wide, faint glow) -->
                  <path
                    d="M {conn.x1} {conn.y1} C {conn.x1} {midY}, {conn.x2} {midY}, {conn.x2} {conn.y2}"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="6"
                    stroke-linecap="round"
                    class="text-foreground/[0.05] transition-opacity {connDimmed
                      ? 'opacity-20'
                      : ''}"
                  />
                  <!-- Main line -->
                  <path
                    d="M {conn.x1} {conn.y1} C {conn.x1} {midY}, {conn.x2} {midY}, {conn.x2} {conn.y2}"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    class="transition-opacity {connOnPath
                      ? 'text-primary/60'
                      : 'text-muted-foreground/25'} {connDimmed ? 'opacity-20' : ''}"
                  />
                  <!-- Edge label (import kind) -->
                  {#if conn.kind && conn.kind !== 'named'}
                    <text
                      x={midX}
                      y={midY}
                      text-anchor="middle"
                      dominant-baseline="middle"
                      class="fill-muted-foreground/50 text-[9px] transition-opacity {connDimmed
                        ? 'opacity-20'
                        : ''}"
                    >
                      {conn.kind}
                    </text>
                  {/if}
                {/each}
              </svg>
              <!-- Node cards -->
              {#each visibleNodes as node, gi (gi)}
                {@const isRoot = node.parentId === ''}
                {@const isComponent = node.category === 'component'}
                {@const sc = isComponent ? sourceChip(node.component) : ''}
                {@const bc = isComponent ? bundledChip(node.component) : ''}
                {@const catColor = getCategoryColor(node.category)}
                {@const dotColor = getCategoryDotColor(node.category)}
                {@const isSearchMatch =
                  chainNodeSearch.length > 0 && chainMatchedNodeIds.has(node.id)}
                {@const isDimmedBySearch =
                  chainNodeSearch.length > 0 && !chainMatchedNodeIds.has(node.id) && !isRoot}
                {@const isDimmedByHover = hoveredNodeId !== '' && !highlightedPathIds.has(node.id)}
                {@const nodeHasChildren =
                  graphLayout?.nodes.some((c) => c.parentId === node.id) ?? false}
                {@const isNodeCollapsed = chainCollapsedNodes[node.id] === true}
                {@const transitiveCount = transitiveCountMap.get(node.id) ?? 0}
                <div
                  class={cn(
                    'absolute flex flex-col justify-center gap-1 rounded-md border px-3 py-1.5 text-xs shadow-sm transition-all',
                    isRoot
                      ? 'border-rose-500/40 bg-rose-500/5'
                      : !isComponent
                        ? catColor
                        : 'border-border bg-card hover:border-primary/30 hover:bg-muted/30',
                    isSearchMatch && 'ring-2 ring-primary/50',
                    (isDimmedBySearch || isDimmedByHover) && 'opacity-30',
                  )}
                  style="left: {node.x}px; top: {node.y}px; width: {NODE_W}px; height: {NODE_H}px;"
                  onmouseenter={() => {
                    hoveredNodeId = node.id;
                  }}
                  onmouseleave={() => {
                    hoveredNodeId = '' as Str;
                  }}
                  role="group"
                >
                  <!-- Row 1: name + kind badge -->
                  <div class="flex items-center gap-1.5">
                    {#if isRoot}
                      <span class="size-2 shrink-0 rounded-full bg-rose-500"></span>
                    {:else}
                      <span class="size-1.5 shrink-0 rounded-full {dotColor}"></span>
                    {/if}
                    {#if isComponent}
                      <a
                        href="/components/{node.component}"
                        class={cn(
                          'truncate font-medium text-primary underline-offset-2 hover:underline',
                          isRoot && 'font-semibold',
                        )}
                      >
                        {toTitle(node.component)}
                      </a>
                    {:else}
                      <code class="truncate text-[10px] text-foreground" title={node.component}
                        >{node.component}</code
                      >
                    {/if}
                    {#if !isRoot && kindLabel(node.kind)}
                      <span
                        class={cn(
                          'ml-auto shrink-0 rounded px-1 py-0.5 text-[9px] font-medium leading-none',
                          kindClass(node.kind),
                        )}
                      >
                        {kindLabel(node.kind)}
                      </span>
                    {/if}
                    {#if nodeHasChildren}
                      {#if transitiveCount > 0}
                        <span
                          class="shrink-0 rounded bg-muted px-1 py-0.5 text-[8px] font-medium leading-none text-muted-foreground"
                          >{'\u2192'} {transitiveCount} dep{transitiveCount === 1 ? '' : 's'}</span
                        >
                      {/if}
                      <button
                        type="button"
                        class={cn(
                          'inline-flex size-4 shrink-0 items-center justify-center rounded transition-colors',
                          'text-muted-foreground/60 hover:text-foreground',
                        )}
                        onclick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          chainCollapsedNodes = {
                            ...chainCollapsedNodes,
                            [node.id]: !isNodeCollapsed,
                          };
                        }}
                        aria-label={isNodeCollapsed ? 'Expand children' : 'Collapse children'}
                      >
                        <ChevronRight
                          class={cn('size-3 transition-transform', !isNodeCollapsed && 'rotate-90')}
                        />
                      </button>
                    {/if}
                  </div>
                  <!-- Row 2: size chips -->
                  {#if sc || bc}
                    <div class="flex items-center gap-1 pl-3.5">
                      {#if sc}
                        <span
                          class="rounded bg-muted px-1 py-0.5 text-[9px] font-medium leading-none text-muted-foreground"
                          >{sc}</span
                        >
                      {/if}
                      {#if bc}
                        <span
                          class="rounded bg-teal-500/10 px-1 py-0.5 text-[9px] font-medium leading-none text-teal-600 dark:text-teal-400"
                          >{bc}</span
                        >
                      {/if}
                    </div>
                  {/if}
                </div>
              {/each}
              <!-- SVG connector knobs (above cards) -->
              <svg
                class="pointer-events-none absolute inset-0 z-10"
                width={graphLayout.width}
                height={graphLayout.height}
              >
                {#each visibleConnectors as conn, ci (ci)}
                  <!-- Start knob shadow -->
                  <circle
                    cx={conn.x1}
                    cy={conn.y1}
                    r="8"
                    fill="currentColor"
                    class="text-foreground/[0.06]"
                  />
                  <!-- Start knob (toggle-style solid circle) -->
                  <circle
                    cx={conn.x1}
                    cy={conn.y1}
                    r="5"
                    fill="currentColor"
                    class="text-muted-foreground/40"
                  />
                  <!-- End knob shadow -->
                  <circle
                    cx={conn.x2}
                    cy={conn.y2}
                    r="8"
                    fill="currentColor"
                    class="text-foreground/[0.06]"
                  />
                  <!-- End knob (toggle-style solid circle) -->
                  <circle
                    cx={conn.x2}
                    cy={conn.y2}
                    r="5"
                    fill="currentColor"
                    class="text-muted-foreground/40"
                  />
                {/each}
              </svg>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- UI Components (genuine component deps only) -->
  {#if uiComponentDeps.length > 0}
    <div class="overflow-hidden rounded-md border bg-card">
      <div class="flex items-center">
        <button
          type="button"
          class="flex flex-1 items-center gap-2 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/50"
          onclick={() => toggle('internal')}
        >
          <ChevronRight
            class={cn('size-4 shrink-0 transition-transform', expanded.internal && 'rotate-90')}
          />
          <ComponentIcon class="size-4 shrink-0 text-primary" />
          <span>UI Components</span>
          <Badge variant="secondary" class="ml-auto text-xs">{uiComponentDeps.length}</Badge>
        </button>
        <Tooltip.Provider>
          <Tooltip.Root delayDuration={300}>
            <DropdownMenu.Root>
              <Tooltip.Trigger>
                {#snippet child({ props: tipProps })}
                  <DropdownMenu.Trigger>
                    {#snippet child({ props })}
                      <button
                        type="button"
                        {...tipProps}
                        {...props}
                        class="mr-2 inline-flex size-6 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {#if depSortMode === 'alpha'}
                          <ArrowDownAZ class="size-3" />
                        {:else if depSortMode === 'alpha-desc'}
                          <ArrowDownZA class="size-3" />
                        {:else if depSortMode === 'size'}
                          <Weight class="size-3" />
                        {:else}
                          <ArrowUpDown class="size-3" />
                        {/if}
                      </button>
                    {/snippet}
                  </DropdownMenu.Trigger>
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content side="left" sideOffset={4}>Sort order</Tooltip.Content>
              <DropdownMenu.Content align="end" class="w-48">
                <DropdownMenu.Item
                  closeOnSelect={false}
                  onclick={() => {
                    depSortMode = 'default' as Str;
                  }}
                >
                  {#if depSortMode === 'default'}
                    <span in:fade={{ duration: 150 }}><Check class="size-4 text-green-500" /></span>
                  {:else}
                    <ArrowUpDown class="size-4" />
                  {/if}
                  Insertion order
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  closeOnSelect={false}
                  onclick={() => {
                    depSortMode = 'alpha' as Str;
                  }}
                >
                  {#if depSortMode === 'alpha'}
                    <span in:fade={{ duration: 150 }}><Check class="size-4 text-green-500" /></span>
                  {:else}
                    <ArrowDownAZ class="size-4" />
                  {/if}
                  A–Z
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  closeOnSelect={false}
                  onclick={() => {
                    depSortMode = 'alpha-desc' as Str;
                  }}
                >
                  {#if depSortMode === 'alpha-desc'}
                    <span in:fade={{ duration: 150 }}><Check class="size-4 text-green-500" /></span>
                  {:else}
                    <ArrowDownZA class="size-4" />
                  {/if}
                  Z–A
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  closeOnSelect={false}
                  onclick={() => {
                    depSortMode = 'size' as Str;
                  }}
                >
                  {#if depSortMode === 'size'}
                    <span in:fade={{ duration: 150 }}><Check class="size-4 text-green-500" /></span>
                  {:else}
                    <Weight class="size-4" />
                  {/if}
                  Largest first
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
      {#if expanded.internal}
        <div class="border-t px-3 py-2" transition:slide={{ duration: 200 }}>
          <ul class="space-y-1">
            {#each sortedUiComponentDeps as dep, di (di)}
              <li class="group/dep flex items-center gap-2 text-sm">
                <span class="size-1 shrink-0 rounded-full bg-primary/40"></span>
                <a
                  href="/components/{dep.component}"
                  class="font-medium text-primary underline-offset-2 hover:underline"
                >
                  {toTitle(dep.component)}
                </a>
                {#if kindLabel(dep.kind)}
                  <span
                    class={cn(
                      'rounded px-1 py-0.5 text-[10px] font-medium leading-none',
                      kindClass(dep.kind),
                    )}
                  >
                    {kindLabel(dep.kind)}
                  </span>
                {/if}
                {#if sourceChip(dep.component)}
                  <span
                    class="rounded bg-muted px-1 py-0.5 text-[10px] font-medium leading-none text-muted-foreground"
                  >
                    {sourceChip(dep.component)}
                  </span>
                {/if}
                {#if bundledChip(dep.component)}
                  <span
                    class="rounded bg-teal-500/10 px-1 py-0.5 text-[10px] font-medium leading-none text-teal-600 dark:text-teal-400"
                  >
                    {bundledChip(dep.component)}
                  </span>
                {/if}
                <span class="ml-auto flex shrink-0 items-center gap-1.5">
                  <code class="truncate text-xs text-muted-foreground">{dep.path}</code>
                  <Tooltip.Root delayDuration={300}>
                    <Tooltip.Trigger>
                      {#snippet child({ props: tooltipProps })}
                        <button
                          {...tooltipProps}
                          type="button"
                          class="inline-flex size-5 items-center justify-center rounded text-muted-foreground/50 opacity-0 transition-opacity hover:text-foreground group-hover/dep:opacity-100"
                          onclick={() => copyPath(dep.path)}
                        >
                          {#if copiedPath === dep.path}
                            <span in:fade={{ duration: 150 }}
                              ><Check class="size-3 text-emerald-500" /></span
                            >
                          {:else}
                            <Copy class="size-3" />
                          {/if}
                        </button>
                      {/snippet}
                    </Tooltip.Trigger>
                    <Tooltip.Content side="left" sideOffset={4}>
                      {copiedPath === dep.path ? 'Copied!' : 'Copy import path'}
                    </Tooltip.Content>
                  </Tooltip.Root>
                </span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Internal Utilities (non-component relative imports) -->
  {#if utilityDeps.length > 0}
    <div class="overflow-hidden rounded-md border bg-card">
      <button
        type="button"
        class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/50"
        onclick={() => toggle('utilities')}
      >
        <ChevronRight
          class={cn('size-4 shrink-0 transition-transform', expanded.utilities && 'rotate-90')}
        />
        <Wrench class="size-4 shrink-0 text-slate-500" />
        <span>Internal Utilities</span>
        <Badge variant="secondary" class="ml-auto text-xs">{utilityDeps.length}</Badge>
      </button>
      {#if expanded.utilities}
        <div class="border-t px-3 py-2" transition:slide={{ duration: 200 }}>
          <ul class="space-y-1">
            {#each sortedUtilityDeps as dep, ui (ui)}
              <li class="group/dep flex items-center gap-2 text-sm">
                <span class="size-1 shrink-0 rounded-full bg-slate-500/40"></span>
                <code class="truncate text-xs text-foreground">{dep.path}</code>
                {#if kindLabel(dep.kind)}
                  <span
                    class={cn(
                      'rounded px-1 py-0.5 text-[10px] font-medium leading-none',
                      kindClass(dep.kind),
                    )}
                  >
                    {kindLabel(dep.kind)}
                  </span>
                {/if}
                <span class="ml-auto flex shrink-0 items-center gap-1.5">
                  <span class="truncate text-xs text-muted-foreground">{dep.names.join(', ')}</span>
                  <Tooltip.Root delayDuration={300}>
                    <Tooltip.Trigger>
                      {#snippet child({ props: tooltipProps })}
                        <button
                          {...tooltipProps}
                          type="button"
                          class="inline-flex size-5 items-center justify-center rounded text-muted-foreground/50 opacity-0 transition-opacity hover:text-foreground group-hover/dep:opacity-100"
                          onclick={() => copyPath(dep.path)}
                        >
                          {#if copiedPath === dep.path}
                            <span in:fade={{ duration: 150 }}
                              ><Check class="size-3 text-emerald-500" /></span
                            >
                          {:else}
                            <Copy class="size-3" />
                          {/if}
                        </button>
                      {/snippet}
                    </Tooltip.Trigger>
                    <Tooltip.Content side="left" sideOffset={4}>
                      {copiedPath === dep.path ? 'Copied!' : 'Copy import path'}
                    </Tooltip.Content>
                  </Tooltip.Root>
                </span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Workspace packages -->
  {#if validated.deps.workspace.length > 0}
    <div class="overflow-hidden rounded-md border bg-card">
      <button
        type="button"
        class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/50"
        onclick={() => toggle('workspace')}
      >
        <ChevronRight
          class={cn('size-4 shrink-0 transition-transform', expanded.workspace && 'rotate-90')}
        />
        <FolderOpen class="size-4 shrink-0 text-amber-500" />
        <span>Workspace</span>
        <Badge variant="secondary" class="ml-auto text-xs">{validated.deps.workspace.length}</Badge>
      </button>
      {#if expanded.workspace}
        <div class="border-t px-3 py-2" transition:slide={{ duration: 200 }}>
          <ul class="space-y-1">
            {#each sortedWorkspaceDeps as dep, wi (wi)}
              {@const wsComp = workspaceComponent(dep.path)}
              <li class="group/dep flex items-center gap-2 text-sm">
                <span class="size-1 shrink-0 rounded-full bg-amber-500/40"></span>
                {#if wsComp}
                  <a
                    href="/components/{wsComp}"
                    class="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {toTitle(wsComp)}
                  </a>
                {:else}
                  <code class="truncate text-xs text-foreground">{dep.path}</code>
                {/if}
                {#if kindLabel(dep.kind)}
                  <span
                    class={cn(
                      'rounded px-1 py-0.5 text-[10px] font-medium leading-none',
                      kindClass(dep.kind),
                    )}
                  >
                    {kindLabel(dep.kind)}
                  </span>
                {/if}
                <span class="ml-auto flex shrink-0 items-center gap-1.5">
                  <span class="truncate text-xs text-muted-foreground">{dep.names.join(', ')}</span>
                  <Tooltip.Root delayDuration={300}>
                    <Tooltip.Trigger>
                      {#snippet child({ props: tooltipProps })}
                        <button
                          {...tooltipProps}
                          type="button"
                          class="inline-flex size-5 items-center justify-center rounded text-muted-foreground/50 opacity-0 transition-opacity hover:text-foreground group-hover/dep:opacity-100"
                          onclick={() => copyPath(dep.path)}
                        >
                          {#if copiedPath === dep.path}
                            <span in:fade={{ duration: 150 }}
                              ><Check class="size-3 text-emerald-500" /></span
                            >
                          {:else}
                            <Copy class="size-3" />
                          {/if}
                        </button>
                      {/snippet}
                    </Tooltip.Trigger>
                    <Tooltip.Content side="left" sideOffset={4}>
                      {copiedPath === dep.path ? 'Copied!' : 'Copy import path'}
                    </Tooltip.Content>
                  </Tooltip.Root>
                </span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  {/if}

  <!-- External packages -->
  {#if validated.deps.external.length > 0}
    <div class="overflow-hidden rounded-md border bg-card">
      <button
        type="button"
        class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/50"
        onclick={() => toggle('external')}
      >
        <ChevronRight
          class={cn('size-4 shrink-0 transition-transform', expanded.external && 'rotate-90')}
        />
        <Package class="size-4 shrink-0 text-emerald-500" />
        <span>External</span>
        <Badge variant="secondary" class="ml-auto text-xs">{validated.deps.external.length}</Badge>
      </button>
      {#if expanded.external}
        <div class="border-t px-3 py-2" transition:slide={{ duration: 200 }}>
          <ul class="space-y-1">
            {#each sortedExternalDeps as dep, ei (ei)}
              <li class="group/dep flex items-center gap-2 text-sm">
                <span class="size-1 shrink-0 rounded-full bg-emerald-500/40"></span>
                <code class="truncate text-xs text-foreground">{dep.path}</code>
                {#if kindLabel(dep.kind)}
                  <span
                    class={cn(
                      'rounded px-1 py-0.5 text-[10px] font-medium leading-none',
                      kindClass(dep.kind),
                    )}
                  >
                    {kindLabel(dep.kind)}
                  </span>
                {/if}
                <span class="ml-auto flex shrink-0 items-center gap-1.5">
                  <span class="truncate text-xs text-muted-foreground">{dep.names.join(', ')}</span>
                  <Tooltip.Root delayDuration={300}>
                    <Tooltip.Trigger>
                      {#snippet child({ props: tooltipProps })}
                        <button
                          {...tooltipProps}
                          type="button"
                          class="inline-flex size-5 items-center justify-center rounded text-muted-foreground/50 opacity-0 transition-opacity hover:text-foreground group-hover/dep:opacity-100"
                          onclick={() => copyPath(dep.path)}
                        >
                          {#if copiedPath === dep.path}
                            <span in:fade={{ duration: 150 }}
                              ><Check class="size-3 text-emerald-500" /></span
                            >
                          {:else}
                            <Copy class="size-3" />
                          {/if}
                        </button>
                      {/snippet}
                    </Tooltip.Trigger>
                    <Tooltip.Content side="left" sideOffset={4}>
                      {copiedPath === dep.path ? 'Copied!' : 'Copy import path'}
                    </Tooltip.Content>
                  </Tooltip.Root>
                </span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  {/if}
</div>
