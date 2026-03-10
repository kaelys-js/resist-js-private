/**
 * Bundle Sizes API — Svelte Compiler + esbuild Minify + Gzip
 *
 * Server route that compiles all UI component `.svelte` files using
 * the Svelte compiler's `generate: 'client'` mode, minifies with
 * esbuild (matching Vite's production pipeline), then computes gzip
 * sizes. Returns a JSON map of component directory → `{ compiled, gzip }`
 * byte counts.
 *
 * This gives an accurate representation of the per-component JavaScript
 * footprint sent to the browser in production. Labeled "bundled" in
 * the UI to distinguish from raw source sizes.
 *
 * Pipeline: `.svelte` → Svelte compile (client JS) → esbuild minify → gzip
 *
 * Results are cached in-memory — subsequent requests return instantly
 * until the server restarts (dev HMR restart clears the cache).
 *
 * @module
 */

import type { RequestHandler } from './$types';
import type { Num, Str } from '@/schemas/common';
import { compile } from 'svelte/compiler';
import { transformSync } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Compiled size entry for a single component directory. */
type SizeEntry = {
	/** Minified client JS byte count. */
	compiled: Num;
	/** Gzip-compressed minified JS byte count — closest to actual download size. */
	gzip: Num;
};

/** Cached results — cleared only on server restart. */
let cache: Record<Str, SizeEntry> | null = null;

/**
 * Resolve the absolute path to `packages/shared/ui/src/` from the project root.
 *
 * Walks up from the current file to find the workspace root (contains `pnpm-workspace.yaml`),
 * then resolves the UI source directory.
 *
 * @returns Absolute path to the UI source directory
 */
function resolveUiSrcDir(): Str {
	const currentDir: Str = dirname(fileURLToPath(import.meta.url)) as Str;
	// Walk up until we find the workspace root (pnpm-workspace.yaml)
	let dir: Str = currentDir;
	for (let i: Num = 0 as Num; i < 20; i++) {
		try {
			statSync(join(dir, 'pnpm-workspace.yaml'));
			return join(dir, 'packages', 'shared', 'ui', 'src') as Str;
		} catch {
			/* Not the root yet — continue walking up */
			dir = dirname(dir) as Str;
		}
	}
	// Fallback: assume standard monorepo structure relative to editor
	return resolve(currentDir, '..', '..', '..', '..', '..', '..', 'shared', 'ui', 'src') as Str;
}

/**
 * Find all `.svelte` files in immediate child directories of `baseDir`.
 *
 * Only scans one level deep (e.g., `button/`, `dialog/`) — ignores nested
 * subdirectories like `examples/` to match the `@/ui/*​/*.svelte` glob pattern.
 *
 * @param baseDir - The UI source directory
 * @returns Array of `{ dir, filePath }` tuples
 */
function findSvelteFiles(baseDir: Str): Array<{ dir: Str; filePath: Str }> {
	const results: Array<{ dir: Str; filePath: Str }> = [];

	let entries: string[];
	try {
		entries = readdirSync(baseDir);
	} catch {
		/* UI source directory not found — return empty */
		return results;
	}

	for (const entry of entries) {
		const entryPath: Str = join(baseDir, entry) as Str;
		try {
			const stat = statSync(entryPath);
			if (!stat.isDirectory()) continue;
		} catch {
			/* Stat failed — skip */
			continue;
		}

		// Read .svelte files in this component directory
		let files: string[];
		try {
			files = readdirSync(entryPath);
		} catch {
			/* Cannot read directory — skip */
			continue;
		}

		for (const file of files) {
			if (!file.endsWith('.svelte')) continue;
			results.push({
				dir: entry as Str,
				filePath: join(entryPath, file) as Str,
			});
		}
	}

	return results;
}

/**
 * Compile all UI component `.svelte` files, minify with esbuild, and compute sizes.
 *
 * Pipeline per file:
 * 1. Read raw `.svelte` source
 * 2. Compile with Svelte (`generate: 'client'`) → unminified client JS
 * 3. Minify with esbuild (`minify: true`) → production-size JS
 * 4. Gzip compress → actual download size
 *
 * Sizes are accumulated per component directory (multi-file components
 * like dialog get summed).
 *
 * @returns Map of component directory → minified + gzip byte sizes
 */
function computeBundleSizes(): Record<Str, SizeEntry> {
	const uiSrcDir: Str = resolveUiSrcDir();
	const svelteFiles = findSvelteFiles(uiSrcDir);
	const sizes: Record<Str, SizeEntry> = {};

	for (const { dir, filePath } of svelteFiles) {
		let source: Str;
		try {
			source = readFileSync(filePath, 'utf8') as Str;
		} catch {
			/* File read failed — skip */
			continue;
		}

		// Step 1: Svelte compile → client JS
		let compiledCode: Str;
		try {
			const result = compile(source, {
				generate: 'client',
				filename: basename(filePath),
			});
			compiledCode = result.js.code as Str;
		} catch {
			/* Compilation failed (e.g., invalid Svelte syntax) — skip */
			continue;
		}

		// Step 2: esbuild minify → production-size JS (matches Vite's build pipeline)
		let minifiedCode: Str;
		try {
			const minResult = transformSync(compiledCode, {
				minify: true,
				loader: 'js',
			});
			minifiedCode = minResult.code as Str;
		} catch {
			/* Minification failed — fall back to unminified size */
			minifiedCode = compiledCode;
		}

		// Step 3: Measure sizes
		const compiledBytes: Num = minifiedCode.length as Num;
		const gzipBytes: Num = gzipSync(minifiedCode).byteLength as Num;

		// Accumulate sizes per directory
		const existing: SizeEntry | undefined = sizes[dir];
		if (existing) {
			sizes[dir] = {
				compiled: (existing.compiled + compiledBytes) as Num,
				gzip: (existing.gzip + gzipBytes) as Num,
			};
		} else {
			sizes[dir] = { compiled: compiledBytes, gzip: gzipBytes };
		}
	}

	return sizes;
}

/**
 * GET handler — returns minified + gzip sizes for all UI components.
 *
 * Caches results in-memory after first computation. Returns JSON with
 * `Cache-Control: no-cache` (dev-only endpoint).
 *
 * @returns JSON response with component sizes
 */
export const GET: RequestHandler = () => {
	if (!cache) {
		cache = computeBundleSizes();
	}

	return new Response(JSON.stringify(cache), {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-cache',
		},
	});
};
