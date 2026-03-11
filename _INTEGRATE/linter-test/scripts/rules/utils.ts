/**
 * Resist Linter - Shared Utilities for Rules
 *
 * TypeScript equivalents of the ff:: shell helpers
 */

import { readFile, stat, readdir } from 'fs/promises';
import { join, relative, dirname } from 'path';
import { existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import type {
	RuleContext,
	WorkspacePackage,
	SearchMatch,
	Stage,
	LintResult,
} from './types.js';

// =============================================================================
// File System Helpers
// =============================================================================

/**
 * Check if a file exists
 */
export async function fileExists(path: string): Promise<boolean> {
	try {
		const s = await stat(path);
		return s.isFile();
	} catch {
		return false;
	}
}

/**
 * Check if a directory exists
 */
export async function dirExists(path: string): Promise<boolean> {
	try {
		const s = await stat(path);
		return s.isDirectory();
	} catch {
		return false;
	}
}

/**
 * Read file contents, returns null if file doesn't exist
 */
export async function safeReadFile(path: string): Promise<string | null> {
	try {
		return await readFile(path, 'utf-8');
	} catch {
		return null;
	}
}

/**
 * Read and parse JSON file
 */
export async function readJsonFile<T = Record<string, unknown>>(
	path: string
): Promise<T | null> {
	const content = await safeReadFile(path);
	if (!content) return null;
	try {
		return JSON.parse(content) as T;
	} catch {
		return null;
	}
}

/**
 * Read and parse YAML file
 */
export async function readYamlFile<T = Record<string, unknown>>(
	path: string
): Promise<T | null> {
	const content = await safeReadFile(path);
	if (!content) return null;
	try {
		return parseYaml(content) as T;
	} catch {
		return null;
	}
}

// =============================================================================
// Glob / File Discovery
// =============================================================================

/** Patterns to always skip */
const SKIP_PATTERNS = [
	'node_modules',
	'.git',
	'.next',
	'.nuxt',
	'dist',
	'build',
	'coverage',
	'.wrangler',
	'.turbo',
	'.svelte-kit',
];

/**
 * Check if a path should be skipped
 */
export function shouldSkipPath(path: string): boolean {
	return SKIP_PATTERNS.some((pattern) => path.includes(`/${pattern}/`) || path.includes(`${pattern}/`));
}

/**
 * Recursively get all files in a directory
 */
export async function* getAllFiles(
	dir: string,
	rootDir?: string
): AsyncIterable<string> {
	const root = rootDir || dir;

	let entries;
	try {
		entries = await readdir(dir, { withFileTypes: true });
	} catch {
		return;
	}

	for (const entry of entries) {
		const fullPath = join(dir, entry.name);
		const relativePath = relative(root, fullPath);

		if (shouldSkipPath(relativePath)) {
			continue;
		}

		if (entry.isDirectory()) {
			yield* getAllFiles(fullPath, root);
		} else if (entry.isFile()) {
			yield fullPath;
		}
	}
}

/**
 * Match a file path against glob patterns (simple implementation)
 */
export function matchesPattern(filePath: string, patterns: string[]): boolean {
	const fileName = filePath.split('/').pop() || '';
	const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : '';

	for (const pattern of patterns) {
		// **/*.ts matches any .ts file
		if (pattern.startsWith('**/') && pattern.includes('.')) {
			const extPattern = pattern.slice(pattern.lastIndexOf('.'));
			if (ext === extPattern) return true;
		}

		// *.ts matches .ts extension
		if (pattern.startsWith('*.')) {
			const extPattern = pattern.slice(1);
			if (ext === extPattern) return true;
		}

		// Exact match
		if (filePath.endsWith(pattern) || fileName === pattern) {
			return true;
		}
	}

	return false;
}

// =============================================================================
// Workspace Helpers
// =============================================================================

interface PnpmWorkspace {
	packages?: string[];
}

/**
 * Get workspace package globs from pnpm-workspace.yaml
 */
export async function getWorkspaceGlobs(rootDir: string): Promise<string[]> {
	const workspaceFile = join(rootDir, 'pnpm-workspace.yaml');
	const workspace = await readYamlFile<PnpmWorkspace>(workspaceFile);
	return workspace?.packages || [];
}

/**
 * Expand a glob pattern to matching directories
 */
export async function expandGlob(rootDir: string, pattern: string): Promise<string[]> {
	const results: string[] = [];

	// Handle simple patterns like 'packages/*' or 'apps/*'
	if (pattern.endsWith('/*')) {
		const baseDir = join(rootDir, pattern.slice(0, -2));
		if (await dirExists(baseDir)) {
			const entries = await readdir(baseDir, { withFileTypes: true });
			for (const entry of entries) {
				if (entry.isDirectory() && !entry.name.startsWith('.')) {
					results.push(join(baseDir, entry.name));
				}
			}
		}
	} else if (pattern.endsWith('/**')) {
		// Recursive pattern - just return the base for now
		const baseDir = join(rootDir, pattern.slice(0, -3));
		if (await dirExists(baseDir)) {
			results.push(baseDir);
		}
	} else {
		// Literal path
		const fullPath = join(rootDir, pattern);
		if (await dirExists(fullPath)) {
			results.push(fullPath);
		}
	}

	return results;
}

/**
 * Get all workspace packages
 */
export async function getWorkspacePackages(
	rootDir: string
): Promise<WorkspacePackage[]> {
	const packages: WorkspacePackage[] = [];
	const globs = await getWorkspaceGlobs(rootDir);

	for (const glob of globs) {
		const dirs = await expandGlob(rootDir, glob);

		for (const dir of dirs) {
			const pkgPath = join(dir, 'package.json');
			const pkgJson = await readJsonFile(pkgPath);

			if (pkgJson) {
				packages.push({
					path: pkgPath,
					dir,
					packageJson: pkgJson,
					name: pkgJson.name as string | undefined,
				});
			}
		}
	}

	return packages;
}

// =============================================================================
// Search Helpers
// =============================================================================

/**
 * Search files for a pattern
 */
export async function* searchFiles(
	rootDir: string,
	pattern: RegExp,
	files?: AsyncIterable<string>
): AsyncIterable<SearchMatch> {
	const fileIterator = files || getAllFiles(rootDir);

	for await (const file of fileIterator) {
		const content = await safeReadFile(file);
		if (!content) continue;

		const lines = content.split('\n');
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const match = pattern.exec(line);

			if (match) {
				yield {
					file,
					line: i + 1,
					column: match.index + 1,
					match: match[0],
					lineContent: line,
				};
			}
		}
	}
}

// =============================================================================
// Result Helpers
// =============================================================================

/**
 * Create a lint result with tip
 */
export function createResult(
	ruleId: string,
	file: string,
	line: number,
	column: number,
	severity: 'error' | 'warning' | 'info',
	message: string,
	tip?: string,
	example?: string
): LintResult {
	return {
		file,
		line,
		column,
		severity,
		message,
		ruleId,
		tip,
		example,
	};
}

/**
 * Find line number where a string appears in content
 */
export function findLineNumber(content: string, searchStr: string): number {
	const lines = content.split('\n');
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].includes(searchStr)) {
			return i + 1;
		}
	}
	return 1;
}

// =============================================================================
// Context Factory
// =============================================================================

/**
 * Create a rule context
 */
export function createRuleContext(
	rootDir: string,
	stage: Stage,
	stagedFiles?: string[]
): RuleContext {
	const workspaceFile = existsSync(join(rootDir, 'pnpm-workspace.yaml'))
		? join(rootDir, 'pnpm-workspace.yaml')
		: undefined;

	return {
		rootDir,
		workspaceFile,
		stagedFiles,
		stage,

		allFiles: () => getAllFiles(rootDir),

		readFile: (path: string) => readFile(path, 'utf-8'),

		fileExists: (path: string) => fileExists(path),

		dirExists: (path: string) => dirExists(path),

		getWorkspacePackages: () => getWorkspacePackages(rootDir),

		search: (pattern: RegExp, files?: string[]) => {
			if (files) {
				return searchFiles(
					rootDir,
					pattern,
					(async function* () {
						for (const f of files) yield f;
					})()
				);
			}
			return searchFiles(rootDir, pattern);
		},
	};
}

// =============================================================================
// Binary / Text Detection
// =============================================================================

/**
 * Check if a file is likely binary
 */
export function isBinaryFile(filePath: string): boolean {
	const binaryExtensions = new Set([
		'.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.avif',
		'.woff', '.woff2', '.ttf', '.otf', '.eot',
		'.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
		'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
		'.exe', '.dll', '.so', '.dylib',
		'.mp3', '.mp4', '.wav', '.ogg', '.webm', '.avi', '.mov',
		'.sqlite', '.db',
	]);

	const ext = '.' + (filePath.split('.').pop() || '').toLowerCase();
	return binaryExtensions.has(ext);
}
