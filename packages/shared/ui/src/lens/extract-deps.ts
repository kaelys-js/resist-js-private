/**
 * Runtime dependency extraction from raw Svelte component source.
 *
 * Parses `import` statements to build a categorized dependency tree:
 * - **Internal**: imports from `../` relative paths (sibling UI components)
 * - **Workspace**: imports from `@/` workspace aliases
 * - **External**: imports from npm packages (everything else)
 *
 * @example
 * ```typescript
 * import { extractDeps } from './extract-deps.js';
 * const deps = extractDeps(rawSvelteSource);
 * // { internal: [{ path: '../button/index.js', names: ['Button'] }], ... }
 * ```
 */
import type { Str } from '@/schemas/common';

/** Import kind — how the symbol was imported. */
export type DepKind = 'type' | 'namespace' | 'named' | 'default';

/**
 * A single import dependency extracted from source.
 */
export type DepEntry = {
	/** The import specifier (e.g., `../button/index.js`, `@/schemas/common`, `valibot`). */
	path: Str;
	/** Imported names — named imports, default import, or namespace import. */
	names: Str[];
	/** The UI component directory name, if this is a sibling component import (e.g., `button`). */
	component: Str;
	/** How this import was declared (`type`, `namespace`, `named`, `default`). */
	kind: DepKind;
};

/**
 * Categorized dependency tree extracted from a component's source.
 */
export type DepTree = {
	/** Sibling UI component imports (`../` relative paths). */
	internal: DepEntry[];
	/** Workspace package imports (`@/` aliases). */
	workspace: DepEntry[];
	/** External npm package imports. */
	external: DepEntry[];
};

/** Regex to match import statements — captures the import clause and the module specifier. */
const IMPORT_RE: RegExp = /^\s*import\s+(.+?)\s+from\s+['"]([^'"]+)['"]/gm;

/** Regex to extract named imports from `{ A, B as C }`. */
const NAMED_RE: RegExp = /\{([^}]+)\}/;

/** Regex to extract a component directory name from a relative path like `../button/index.js`. */
const COMPONENT_DIR_RE: RegExp = /\.\.\/([^/]+)\//;

/** Parsed import result with names and kind. */
type ParsedImport = {
	/** Imported names. */
	names: Str[];
	/** Import kind. */
	kind: DepKind;
};

/**
 * Parse import names and kind from an import clause string.
 *
 * Handles: `{ A, B }`, `* as X`, `Default`, `Default, { A }`, `type { A }`.
 *
 * @param clause - The import clause (everything between `import` and `from`)
 * @returns Parsed import with names and kind
 */
function parseImport(clause: Str): ParsedImport {
	const names: Str[] = [];

	// Pure type imports: `import type { A } from '...'` or `import type Foo from '...'`
	if (clause.startsWith('type ')) {
		const inner: Str = clause.slice(5).trim();
		const namedMatch: RegExpMatchArray | null = inner.match(NAMED_RE);
		if (namedMatch?.[1]) {
			const [, raw]: RegExpMatchArray = namedMatch;
			for (const part of raw.split(',')) {
				const trimmed: Str = part.trim();
				if (!trimmed) continue;
				// Handle `type X` prefix inside braces and `A as B` aliases
				const clean: Str = trimmed.replace(/^type\s+/, '');
				const asIdx: number = clean.indexOf(' as ');
				names.push(asIdx >= 0 ? clean.slice(asIdx + 4).trim() : clean);
			}
		} else {
			// `type Foo` — single type import
			names.push(inner);
		}
		return { names, kind: 'type' };
	}

	// Namespace: `* as X`
	if (clause.includes('* as ')) {
		const nsMatch: RegExpMatchArray | null = clause.match(/\*\s+as\s+(\w+)/);
		if (nsMatch?.[1]) names.push(nsMatch[1]);
		return { names, kind: 'namespace' };
	}

	// Named imports: `{ A, B as C }`
	const namedMatch: RegExpMatchArray | null = clause.match(NAMED_RE);
	if (namedMatch?.[1]) {
		const [, raw]: RegExpMatchArray = namedMatch;
		for (const part of raw.split(',')) {
			const trimmed: Str = part.trim();
			if (!trimmed) continue;
			const clean: Str = trimmed.replace(/^type\s+/, '');
			const asIdx: number = clean.indexOf(' as ');
			names.push(asIdx >= 0 ? clean.slice(asIdx + 4).trim() : clean);
		}
	}

	// Default import (before `{` or standalone)
	const defaultPart: Str = clause
		.replace(/\{[^}]*\}/, '')
		.replaceAll(',', '')
		.trim();
	if (defaultPart && !defaultPart.startsWith('*')) {
		names.push(defaultPart);
		// If we have BOTH named and default, classify as 'named' since named is more useful
		if (namedMatch) return { names, kind: 'named' };
		return { names, kind: 'default' };
	}

	return { names, kind: 'named' };
}

/**
 * Extract and categorize all import dependencies from raw Svelte source.
 *
 * Scans all `<script>` blocks (both `module` and instance) for import statements.
 * Categorizes each into internal (sibling component), workspace (`@/`), or external.
 *
 * @param source - Raw Svelte component source string
 * @returns Categorized dependency tree
 *
 * @example
 * ```typescript
 * const deps = extractDeps(`
 *   <script lang="ts">
 *   import * as v from 'valibot';
 *   import { Button } from '../button/index.js';
 *   import { safeParse } from '@/utils/result/safe';
 *   </script>
 * `);
 * // deps.internal = [{ path: '../button/index.js', names: ['Button'], component: 'button' }]
 * // deps.workspace = [{ path: '@/utils/result/safe', names: ['safeParse'], component: '' }]
 * // deps.external = [{ path: 'valibot', names: ['v'], component: '' }]
 * ```
 */
export function extractDeps(source: Str): DepTree {
	const internal: DepEntry[] = [];
	const workspace: DepEntry[] = [];
	const external: DepEntry[] = [];

	// Extract all <script> block contents
	const scriptBlocks: Str[] = [];
	const scriptRe: RegExp = /<script[^>]*>([\s\S]*?)<\/script>/g;
	let scriptMatch: RegExpExecArray | null = scriptRe.exec(source);
	while (scriptMatch) {
		if (scriptMatch[1]) scriptBlocks.push(scriptMatch[1]);
		scriptMatch = scriptRe.exec(source);
	}

	const fullScript: Str = scriptBlocks.join('\n');

	// Reset global regex state
	IMPORT_RE.lastIndex = 0;

	let match: RegExpExecArray | null = IMPORT_RE.exec(fullScript);
	while (match) {
		const [, clause, specifier]: RegExpExecArray = match;
		const parsed: ParsedImport = parseImport(clause);

		const entry: DepEntry = {
			path: specifier,
			names: parsed.names,
			component: '',
			kind: parsed.kind,
		};

		if (specifier.startsWith('../') || specifier.startsWith('./')) {
			// Internal sibling component import
			const dirMatch: RegExpMatchArray | null = specifier.match(COMPONENT_DIR_RE);
			const component: Str = dirMatch?.[1] ?? '';
			internal.push({ ...entry, component });
		} else if (specifier.startsWith('@/')) {
			// Workspace alias import
			workspace.push(entry);
		} else {
			// External npm package
			external.push(entry);
		}

		match = IMPORT_RE.exec(fullScript);
	}

	return { internal, workspace, external };
}

/**
 * A reverse dependency entry — a component that imports the current one.
 */
export type ReverseDep = {
	/** The component directory name that imports the current component. */
	component: Str;
	/** Imported names that reference the current component. */
	names: Str[];
	/** Import kind used by the consumer. */
	kind: DepKind;
};

/**
 * Extract reverse dependencies — find all components that import the given component.
 *
 * Scans all provided raw sources, extracts their dependencies, and returns
 * entries where the dependency is an internal import pointing to `targetComponent`.
 *
 * @param targetComponent - The component directory name to find consumers of
 * @param allSources - Map of glob keys → raw source strings for ALL components
 * @param extractDirFn - Function to extract directory name from a glob key
 * @returns Array of components that import the target component
 *
 * @example
 * ```typescript
 * const usedBy = extractReverseDeps('button', rawSources, extractDir);
 * // [{ component: 'dialog', names: ['Button'], kind: 'named' }]
 * ```
 */
export function extractReverseDeps(
	targetComponent: Str,
	allSources: Record<Str, Str>,
	extractDirFn: (key: Str) => Str,
): ReverseDep[] {
	const results: ReverseDep[] = [];
	/** Track unique consumer components to avoid duplicates from multi-file dirs. */
	const seen: Set<Str> = new Set();

	for (const [key, source] of Object.entries(allSources)) {
		const dir: Str = extractDirFn(key);
		// Skip the target component itself and already-processed dirs
		if (!dir || dir === targetComponent || seen.has(dir)) continue;

		const deps: DepTree = extractDeps(source);
		for (const dep of deps.internal) {
			if (dep.component === targetComponent && !seen.has(dir)) {
				seen.add(dir);
				results.push({
					component: dir,
					names: dep.names,
					kind: dep.kind,
				});
			}
		}
	}

	return results.toSorted((a: ReverseDep, b: ReverseDep): number =>
		a.component.localeCompare(b.component),
	);
}
