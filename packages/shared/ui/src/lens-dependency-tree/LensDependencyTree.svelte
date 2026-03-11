<script module lang="ts">
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
	sizes: v.optional(v.record(v.string(), ComponentSizeSchema)),
	/** Known component directory names from glob discovery — used to distinguish UI components from utility imports. @values button, dialog, tooltip, badge */
	knownComponents: v.optional(v.array(StrSchema)),
	/** Raw source strings keyed by glob path — used for recursive dependency chain resolution. @values {"/ui/button/index.js": "import..."} */
	rawSources: v.optional(v.record(v.string(), StrSchema)),
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
import { slide } from 'svelte/transition';
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
import * as DropdownMenu from '../dropdown-menu/index.js';
import {
	exportPng, exportJpeg, exportSvg, exportWebp,
	copyImageToClipboard, copyChainJson, copyChainMermaid, copyChainDot,
	copyChainCsv, copyChainPlantUml, copyChainMarkdown,
	type ChainExportNode,
} from '../lens/export-utils.js';

const allProps: LensDependencyTreeProps = $props();
const validated: LensDependencyTreeProps = $derived.by(() => {
	const rawProps: LensDependencyTreeProps = stripSvelteProps(allProps);
	const result = safeParse(LensDependencyTreePropsSchema, rawProps);
	if (!result.ok) throw result.error;
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
	validated.deps.internal.filter((dep: DepEntry): boolean => dep.component !== '' && knownSet.has(dep.component)),
);

/** Internal deps that are NOT UI components (utility imports like lens/, utils.js). */
const utilityDeps: DepEntry[] = $derived(
	validated.deps.internal.filter((dep: DepEntry): boolean => dep.component === '' || !knownSet.has(dep.component)),
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

/** Total dependency count across all categories. */
const totalDeps: Num = $derived(
	validated.deps.internal.length + validated.deps.workspace.length + validated.deps.external.length,
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
	if (kind === 'type') return 'type-only';
	if (kind === 'namespace') return 'namespace';
	if (kind === 'default') return 'default export';
	return '';
}

/**
 * Get the CSS class for an import kind badge.
 *
 * @param kind - The import kind
 * @returns Tailwind classes
 */
function kindClass(kind: Str): Str {
	if (kind === 'type') return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
	if (kind === 'namespace') return 'bg-violet-500/10 text-violet-600 dark:text-violet-400';
	if (kind === 'default') return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
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
	if (!entry) return '';
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
	if (!entry) return '';
	if (entry.gzip !== undefined) return `${formatBytes(entry.gzip as Num)} production` as Str;
	if (entry.compiled !== undefined) return `${formatBytes(entry.compiled as Num)} minified` as Str;
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

/** Maximum recursion depth for the dependency chain tree. */
const MAX_CHAIN_DEPTH: Num = 4 as Num;

/**
 * Recursively build a dependency chain tree for a component.
 *
 * @param component - The component directory name to resolve
 * @param depth - Current recursion depth
 * @param visited - Set of already-visited components (circular dependency guard)
 * @returns Array of child chain nodes
 */
function buildChain(component: Str, depth: Num, visited: Set<Str>): ChainNode[] {
	if (depth >= MAX_CHAIN_DEPTH || !component) return [];

	const sourceKey: Str | undefined = findPrimaryKey(component, rawSources);
	if (!sourceKey) return [];

	const source: Str = rawSources[sourceKey] ?? '';
	if (!source) return [];

	const deps: DepTree = extractDeps(source);
	const nodes: ChainNode[] = [];

	// UI component deps — recursive
	for (const dep of deps.internal) {
		if (!dep.component || !knownSet.has(dep.component)) continue;
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
		if (dep.component !== '' && knownSet.has(dep.component)) continue;
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
	if (!current || Object.keys(rawSources).length === 0) return [];
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
};

/**
 * Measure the subtree width (how many leaf-level slots it occupies).
 *
 * @param node - The chain node to measure
 * @returns Number of leaf slots needed
 */
function subtreeWidth(node: ChainNode): Num {
	if (node.children.length === 0) return 1 as Num;
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
function layoutGraph(rootComponent: Str, children: ChainNode[]): { nodes: LayoutNode[]; connectors: Connector[]; width: Num; height: Num } {
	const nodes: LayoutNode[] = [];
	const connectors: Connector[] = [];
	let idCounter: Num = 0 as Num;

	// Total leaf slots needed for all children
	let totalSlots: Num = 0 as Num;
	for (const child of children) {
		totalSlots = (totalSlots + subtreeWidth(child)) as Num;
	}
	if (totalSlots === 0) totalSlots = 1 as Num;

	const fullWidth: Num = (totalSlots * (NODE_W + GAP_X) - GAP_X) as Num;

	// Root node centered at top
	const rootX: Num = (fullWidth / 2 - NODE_W / 2) as Num;
	const rootId: Str = 'root';
	nodes.push({ id: rootId, component: rootComponent, kind: '', category: 'component', x: rootX, y: 0 as Num, parentId: '' });

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
			nodes.push({ id: nodeId, component: item.component, kind: item.kind, category: item.category, x, y, parentId });

			// Find parent position for connector
			const parent: LayoutNode | undefined = nodes.find((n: LayoutNode): boolean => n.id === parentId);
			if (parent) {
				connectors.push({
					x1: (parent.x + NODE_W / 2) as Num,
					y1: (parent.y + NODE_H) as Num,
					x2: (x + NODE_W / 2) as Num,
					y2: y,
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
		if (node.y > maxY) maxY = node.y;
	}

	return {
		nodes,
		connectors,
		width: Math.max(fullWidth, NODE_W) as Num,
		height: (maxY + NODE_H) as Num,
	};
}

/** Computed graph layout from the dependency chain. */
const graphLayout = $derived.by(() => {
	const current: Str = validated.currentComponent ?? '';
	if (!current || dependencyChain.length === 0) return null;
	return layoutGraph(current, dependencyChain);
});

/** Zoom level for the dependency chain graph. */
let chainZoom: Num = $state(1 as Num);
const ZOOM_STEP: Num = 0.15 as Num;
const ZOOM_MIN: Num = 0.3 as Num;
const ZOOM_MAX: Num = 2 as Num;

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

/** DOM reference to the chain graph container for image export. */
let chainGraphRef: HTMLDivElement | undefined = $state(undefined);

/**
 * Convert the graph layout nodes into flat ChainExportNode[] for data export.
 *
 * @returns Array of chain export nodes
 */
function buildExportNodes(): ChainExportNode[] {
	if (!graphLayout) return [];
	return graphLayout.nodes.map((node: LayoutNode): ChainExportNode => ({
		id: node.id,
		label: node.category === 'component' ? toTitle(node.component) : node.component,
		kind: node.kind || 'default',
		category: node.category,
		parentId: node.parentId,
	}));
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
		return;
	}
	if (formatId === 'copy-mermaid') {
		await copyChainMermaid(buildExportNodes());
		return;
	}
	if (formatId === 'copy-dot') {
		await copyChainDot(buildExportNodes(), name);
		return;
	}
	if (formatId === 'copy-csv') {
		await copyChainCsv(buildExportNodes());
		return;
	}
	if (formatId === 'copy-plantuml') {
		await copyChainPlantUml(buildExportNodes(), name);
		return;
	}
	if (formatId === 'copy-markdown') {
		await copyChainMarkdown(buildExportNodes(), name);
		return;
	}

	const el: HTMLDivElement | undefined = chainGraphRef;
	if (!el) return;
	if (formatId === 'png') await exportPng(el, filename);
	else if (formatId === 'jpeg') await exportJpeg(el, filename);
	else if (formatId === 'svg') await exportSvg(el, filename);
	else if (formatId === 'webp') await exportWebp(el, filename);
	else if (formatId === 'copy-image') await copyImageToClipboard(el);
}
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape' && chainFullscreen) chainFullscreen = false; }} />

<!-- Summary bar -->
<div class="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
	{#if uiComponentDeps.length > 0}
		<span>
			{uiComponentDeps.length} UI Component{uiComponentDeps.length === 1 ? '' : 's'}
			{#if totalInternalSource > 0}
				<span class="text-muted-foreground/70">({formatBytes(totalInternalSource)} source{#if totalInternalGzip > 0}{' · '}{formatBytes(totalInternalGzip)} production{/if})</span>
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
		<span class="font-medium text-foreground">Used by {usedByCount} component{usedByCount === 1 ? '' : 's'}</span>
	{/if}
	{#if totalDeps === 0 && usedByCount === 0}
		<span>No dependencies detected.</span>
	{/if}
</div>

<div class={cn('space-y-2', className)}>
	<!-- Used By (reverse dependencies) -->
	{#if usedByCount > 0}
		<div class="overflow-hidden rounded-md border bg-card">
			<button
				type="button"
				class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/50"
				onclick={() => toggle('usedBy')}
			>
				<ChevronRight class={cn('size-4 shrink-0 transition-transform', expanded.usedBy && 'rotate-90')} />
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
									<span class={cn('rounded px-1 py-0.5 text-[10px] font-medium leading-none', kindClass(rev.kind))}>
										{kindLabel(rev.kind)}
									</span>
								{/if}
								<span class="ml-auto flex shrink-0 items-center gap-1.5">
									<span class="truncate text-xs text-muted-foreground">{rev.names.join(', ')}</span>
									<Tooltip.Root delayDuration={200}>
										<Tooltip.Trigger>
											{#snippet child({ props: tooltipProps })}
												<button
													{...tooltipProps}
													type="button"
													class="inline-flex size-5 items-center justify-center rounded text-muted-foreground/50 opacity-0 transition-opacity hover:text-foreground group-hover/dep:opacity-100"
													onclick={() => copyPath(revPath)}
												>
													{#if copiedPath === revPath}
														<Check class="size-3 text-emerald-500" />
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
		<div class={cn('overflow-hidden rounded-md border bg-card', chainFullscreen && 'fixed inset-4 z-50 flex flex-col')}>
			<button
				type="button"
				class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/50"
				onclick={() => toggle('chain')}
			>
				<ChevronRight class={cn('size-4 shrink-0 transition-transform', expanded.chain && 'rotate-90')} />
				<GitBranch class="size-4 shrink-0 text-rose-500" />
				<span>Dependency Chain</span>
				<Badge variant="secondary" class="ml-auto text-xs">{dependencyChain.length}</Badge>
			</button>
			{#if expanded.chain}
				<div class={cn(chainFullscreen && 'flex flex-1 flex-col')} transition:slide={{ duration: 200 }}>
				<!-- Zoom toolbar -->
				<div class="flex items-center gap-1 border-t px-3 py-1.5">
					<button
						type="button"
						class="inline-flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
						onclick={chainZoomOut}
						disabled={chainZoom <= ZOOM_MIN}
						aria-label="Zoom out"
					>
						<ZoomOut class="size-3.5" />
					</button>
					<span class="min-w-[3rem] text-center text-[11px] font-medium text-muted-foreground">{chainZoomLabel()}</span>
					<button
						type="button"
						class="inline-flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
						onclick={chainZoomIn}
						disabled={chainZoom >= ZOOM_MAX}
						aria-label="Zoom in"
					>
						<ZoomIn class="size-3.5" />
					</button>
					<button
						type="button"
						class="inline-flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
						onclick={chainZoomFit}
						disabled={chainZoom === 1}
						aria-label="Fit (100%)"
					>
						<Maximize class="size-3.5" />
					</button>
					<button
						type="button"
						class="inline-flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						onclick={toggleChainFullscreen}
						aria-label={chainFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
					>
						{#if chainFullscreen}
							<Minimize2 class="size-3.5" />
						{:else}
							<Maximize2 class="size-3.5" />
						{/if}
					</button>
					<div class="ml-auto">
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<button
										{...props}
										type="button"
										class="inline-flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
										aria-label="Export"
									>
										<Download class="size-3.5" />
									</button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end" class="w-48">
								<DropdownMenu.Label class="text-xs">Image</DropdownMenu.Label>
								<DropdownMenu.Item onclick={() => handleChainExport('png')} class="gap-2">
									<FileImage class="size-3.5" /> PNG
								</DropdownMenu.Item>
								<DropdownMenu.Item onclick={() => handleChainExport('jpeg')} class="gap-2">
									<FileImage class="size-3.5" /> JPEG
								</DropdownMenu.Item>
								<DropdownMenu.Item onclick={() => handleChainExport('svg')} class="gap-2">
									<FileImage class="size-3.5" /> SVG
								</DropdownMenu.Item>
								<DropdownMenu.Item onclick={() => handleChainExport('webp')} class="gap-2">
									<FileImage class="size-3.5" /> WebP
								</DropdownMenu.Item>
								<DropdownMenu.Separator />
								<DropdownMenu.Label class="text-xs">Clipboard</DropdownMenu.Label>
								<DropdownMenu.Item onclick={() => handleChainExport('copy-image')} class="gap-2">
									<Clipboard class="size-3.5" /> Copy as Image
								</DropdownMenu.Item>
								<DropdownMenu.Separator />
								<DropdownMenu.Label class="text-xs">Data</DropdownMenu.Label>
								<DropdownMenu.Item onclick={() => handleChainExport('copy-json')} class="gap-2">
									<Braces class="size-3.5" /> Copy as JSON
								</DropdownMenu.Item>
								<DropdownMenu.Item onclick={() => handleChainExport('copy-mermaid')} class="gap-2">
									<GitBranch class="size-3.5" /> Copy as Mermaid
								</DropdownMenu.Item>
								<DropdownMenu.Item onclick={() => handleChainExport('copy-dot')} class="gap-2">
									<GitBranch class="size-3.5" /> Copy as DOT
								</DropdownMenu.Item>
								<DropdownMenu.Item onclick={() => handleChainExport('copy-csv')} class="gap-2">
									<Table class="size-3.5" /> Copy as CSV
								</DropdownMenu.Item>
								<DropdownMenu.Item onclick={() => handleChainExport('copy-plantuml')} class="gap-2">
									<FileCode class="size-3.5" /> Copy as PlantUML
								</DropdownMenu.Item>
								<DropdownMenu.Item onclick={() => handleChainExport('copy-markdown')} class="gap-2">
									<FileText class="size-3.5" /> Copy as Markdown
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>
				</div>
				<!-- Graph canvas -->
				<div class={cn('overflow-auto border-t bg-muted/20 p-4', chainFullscreen && 'flex-1')} style={chainFullscreen ? '' : 'max-height: 500px;'}>
					<div
						class="relative origin-top-left transition-transform"
						style="width: {graphLayout.width}px; height: {graphLayout.height}px; min-width: 200px; zoom: {chainZoom};"
						bind:this={chainGraphRef}
					>
						<!-- SVG connector lines -->
						<svg class="pointer-events-none absolute inset-0" width={graphLayout.width} height={graphLayout.height}>
							{#each graphLayout.connectors as conn, ci (ci)}
								{@const midY = (conn.y1 + (conn.y2 - conn.y1) * 0.5)}
								<path
									d="M {conn.x1} {conn.y1} C {conn.x1} {midY}, {conn.x2} {midY}, {conn.x2} {conn.y2}"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									class="text-muted-foreground/30"
								/>
								<circle cx={conn.x2} cy={conn.y2} r="3" fill="currentColor" class="text-rose-500/50" />
							{/each}
						</svg>
						<!-- Node cards -->
						{#each graphLayout.nodes as node, gi (gi)}
							{@const isRoot = node.parentId === ''}
							{@const isComponent = node.category === 'component'}
							{@const sc = isComponent ? sourceChip(node.component) : ''}
							{@const bc = isComponent ? bundledChip(node.component) : ''}
							{@const catColor = node.category === 'utility' ? 'border-slate-500/40 bg-slate-500/5' : node.category === 'workspace' ? 'border-amber-500/40 bg-amber-500/5' : node.category === 'external' ? 'border-emerald-500/40 bg-emerald-500/5' : ''}
							{@const dotColor = node.category === 'utility' ? 'bg-slate-500/40' : node.category === 'workspace' ? 'bg-amber-500/40' : node.category === 'external' ? 'bg-emerald-500/40' : 'bg-primary/40'}
							<div
								class={cn(
									'absolute flex flex-col justify-center gap-1 rounded-md border px-3 py-1.5 text-xs shadow-sm transition-colors',
									isRoot
										? 'border-rose-500/40 bg-rose-500/5'
										: !isComponent
											? catColor
											: 'border-border bg-card hover:border-primary/30 hover:bg-muted/30',
								)}
								style="left: {node.x}px; top: {node.y}px; width: {NODE_W}px; height: {NODE_H}px;"
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
											class={cn('truncate font-medium text-primary underline-offset-2 hover:underline', isRoot && 'font-semibold')}
										>
											{toTitle(node.component)}
										</a>
									{:else}
										<code class="truncate text-[10px] text-foreground" title={node.component}>{node.component}</code>
									{/if}
									{#if !isRoot && kindLabel(node.kind)}
										<span class={cn('ml-auto shrink-0 rounded px-1 py-0.5 text-[9px] font-medium leading-none', kindClass(node.kind))}>
											{kindLabel(node.kind)}
										</span>
									{/if}
								</div>
								<!-- Row 2: size chips -->
								{#if sc || bc}
									<div class="flex items-center gap-1 pl-3.5">
										{#if sc}
											<span class="rounded bg-muted px-1 py-0.5 text-[9px] font-medium leading-none text-muted-foreground">{sc}</span>
										{/if}
										{#if bc}
											<span class="rounded bg-teal-500/10 px-1 py-0.5 text-[9px] font-medium leading-none text-teal-600 dark:text-teal-400">{bc}</span>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</div>
			{/if}
		</div>
	{/if}

	<!-- UI Components (genuine component deps only) -->
	{#if uiComponentDeps.length > 0}
		<div class="overflow-hidden rounded-md border bg-card">
			<button
				type="button"
				class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/50"
				onclick={() => toggle('internal')}
			>
				<ChevronRight class={cn('size-4 shrink-0 transition-transform', expanded.internal && 'rotate-90')} />
				<ComponentIcon class="size-4 shrink-0 text-primary" />
				<span>UI Components</span>
				<Badge variant="secondary" class="ml-auto text-xs">{uiComponentDeps.length}</Badge>
			</button>
			{#if expanded.internal}
				<div class="border-t px-3 py-2" transition:slide={{ duration: 200 }}>
					<ul class="space-y-1">
						{#each uiComponentDeps as dep, di (di)}
							<li class="group/dep flex items-center gap-2 text-sm">
								<span class="size-1 shrink-0 rounded-full bg-primary/40"></span>
								<a
									href="/components/{dep.component}"
									class="font-medium text-primary underline-offset-2 hover:underline"
								>
									{toTitle(dep.component)}
								</a>
								{#if kindLabel(dep.kind)}
									<span class={cn('rounded px-1 py-0.5 text-[10px] font-medium leading-none', kindClass(dep.kind))}>
										{kindLabel(dep.kind)}
									</span>
								{/if}
								{#if sourceChip(dep.component)}
									<span class="rounded bg-muted px-1 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
										{sourceChip(dep.component)}
									</span>
								{/if}
								{#if bundledChip(dep.component)}
									<span class="rounded bg-teal-500/10 px-1 py-0.5 text-[10px] font-medium leading-none text-teal-600 dark:text-teal-400">
										{bundledChip(dep.component)}
									</span>
								{/if}
								<span class="ml-auto flex shrink-0 items-center gap-1.5">
									<code class="truncate text-xs text-muted-foreground">{dep.path}</code>
									<Tooltip.Root delayDuration={200}>
										<Tooltip.Trigger>
											{#snippet child({ props: tooltipProps })}
												<button
													{...tooltipProps}
													type="button"
													class="inline-flex size-5 items-center justify-center rounded text-muted-foreground/50 opacity-0 transition-opacity hover:text-foreground group-hover/dep:opacity-100"
													onclick={() => copyPath(dep.path)}
												>
													{#if copiedPath === dep.path}
														<Check class="size-3 text-emerald-500" />
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
				<ChevronRight class={cn('size-4 shrink-0 transition-transform', expanded.utilities && 'rotate-90')} />
				<Wrench class="size-4 shrink-0 text-slate-500" />
				<span>Internal Utilities</span>
				<Badge variant="secondary" class="ml-auto text-xs">{utilityDeps.length}</Badge>
			</button>
			{#if expanded.utilities}
				<div class="border-t px-3 py-2" transition:slide={{ duration: 200 }}>
					<ul class="space-y-1">
						{#each utilityDeps as dep, ui (ui)}
							<li class="group/dep flex items-center gap-2 text-sm">
								<span class="size-1 shrink-0 rounded-full bg-slate-500/40"></span>
								<code class="truncate text-xs text-foreground">{dep.path}</code>
								{#if kindLabel(dep.kind)}
									<span class={cn('rounded px-1 py-0.5 text-[10px] font-medium leading-none', kindClass(dep.kind))}>
										{kindLabel(dep.kind)}
									</span>
								{/if}
								<span class="ml-auto flex shrink-0 items-center gap-1.5">
									<span class="truncate text-xs text-muted-foreground">{dep.names.join(', ')}</span>
									<Tooltip.Root delayDuration={200}>
										<Tooltip.Trigger>
											{#snippet child({ props: tooltipProps })}
												<button
													{...tooltipProps}
													type="button"
													class="inline-flex size-5 items-center justify-center rounded text-muted-foreground/50 opacity-0 transition-opacity hover:text-foreground group-hover/dep:opacity-100"
													onclick={() => copyPath(dep.path)}
												>
													{#if copiedPath === dep.path}
														<Check class="size-3 text-emerald-500" />
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
				<ChevronRight class={cn('size-4 shrink-0 transition-transform', expanded.workspace && 'rotate-90')} />
				<FolderOpen class="size-4 shrink-0 text-amber-500" />
				<span>Workspace</span>
				<Badge variant="secondary" class="ml-auto text-xs">{validated.deps.workspace.length}</Badge>
			</button>
			{#if expanded.workspace}
				<div class="border-t px-3 py-2" transition:slide={{ duration: 200 }}>
					<ul class="space-y-1">
						{#each validated.deps.workspace as dep, wi (wi)}
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
									<span class={cn('rounded px-1 py-0.5 text-[10px] font-medium leading-none', kindClass(dep.kind))}>
										{kindLabel(dep.kind)}
									</span>
								{/if}
								<span class="ml-auto flex shrink-0 items-center gap-1.5">
									<span class="truncate text-xs text-muted-foreground">{dep.names.join(', ')}</span>
									<Tooltip.Root delayDuration={200}>
										<Tooltip.Trigger>
											{#snippet child({ props: tooltipProps })}
												<button
													{...tooltipProps}
													type="button"
													class="inline-flex size-5 items-center justify-center rounded text-muted-foreground/50 opacity-0 transition-opacity hover:text-foreground group-hover/dep:opacity-100"
													onclick={() => copyPath(dep.path)}
												>
													{#if copiedPath === dep.path}
														<Check class="size-3 text-emerald-500" />
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
				<ChevronRight class={cn('size-4 shrink-0 transition-transform', expanded.external && 'rotate-90')} />
				<Package class="size-4 shrink-0 text-emerald-500" />
				<span>External</span>
				<Badge variant="secondary" class="ml-auto text-xs">{validated.deps.external.length}</Badge>
			</button>
			{#if expanded.external}
				<div class="border-t px-3 py-2" transition:slide={{ duration: 200 }}>
					<ul class="space-y-1">
						{#each validated.deps.external as dep, ei (ei)}
							<li class="group/dep flex items-center gap-2 text-sm">
								<span class="size-1 shrink-0 rounded-full bg-emerald-500/40"></span>
								<code class="truncate text-xs text-foreground">{dep.path}</code>
								{#if kindLabel(dep.kind)}
									<span class={cn('rounded px-1 py-0.5 text-[10px] font-medium leading-none', kindClass(dep.kind))}>
										{kindLabel(dep.kind)}
									</span>
								{/if}
								<span class="ml-auto flex shrink-0 items-center gap-1.5">
									<span class="truncate text-xs text-muted-foreground">{dep.names.join(', ')}</span>
									<Tooltip.Root delayDuration={200}>
										<Tooltip.Trigger>
											{#snippet child({ props: tooltipProps })}
												<button
													{...tooltipProps}
													type="button"
													class="inline-flex size-5 items-center justify-center rounded text-muted-foreground/50 opacity-0 transition-opacity hover:text-foreground group-hover/dep:opacity-100"
													onclick={() => copyPath(dep.path)}
												>
													{#if copiedPath === dep.path}
														<Check class="size-3 text-emerald-500" />
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
