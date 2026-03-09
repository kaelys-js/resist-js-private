/**
 * Shared utility functions for the Lens component documentation system.
 *
 * Provides directory/file extraction helpers and text transformation
 * used by both the Lens layout sidebar and component detail pages.
 */
import type { Str } from '@/schemas/common';

/**
 * Extract directory name from a glob key like `.../button/button.svelte`.
 *
 * @param key - Glob-resolved module path
 * @returns The directory name segment, or empty string if unmatched
 *
 * @example
 * ```typescript
 * extractDir('/ui/button/button.svelte'); // 'button'
 * extractDir('/ui/dialog/dialog-content.svelte'); // 'dialog'
 * ```
 */
export function extractDir(key: Str): Str {
	const parts: Str[] = key.split('/');
	return parts.at(-2) ?? '';
}

/**
 * Extract filename stem from a glob key (without extension).
 *
 * @param key - Glob-resolved module path
 * @returns The filename without `.svelte` extension
 *
 * @example
 * ```typescript
 * extractStem('/ui/button/button.svelte'); // 'button'
 * extractStem('/ui/dialog/dialog-content.svelte'); // 'dialog-content'
 * ```
 */
export function extractStem(key: Str): Str {
	const file: Str = key.split('/').pop() ?? '';
	return file.replace(/\.svelte$/, '');
}

/**
 * Convert kebab-case to Title Case for display.
 *
 * @param name - A kebab-case string like `help-tooltip`
 * @returns Title-cased string like `Help Tooltip`
 *
 * @example
 * ```typescript
 * toTitle('help-tooltip'); // 'Help Tooltip'
 * toTitle('button'); // 'Button'
 * ```
 */
export function toTitle(name: Str): Str {
	return name
		.split('-')
		.map((w: Str): Str => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
}

/**
 * Check if a glob key is an internal file to skip (Demo, index).
 *
 * @param key - Glob-resolved module path
 * @returns True if the file should be skipped
 */
export function isInternalFile(key: Str): boolean {
	const stem: Str = extractStem(key);
	return stem === 'Demo' || stem === 'index';
}

/**
 * Find the primary source key for a component directory.
 *
 * Prefers the file matching the directory name (e.g., `button/button.svelte`),
 * then falls back to the first non-internal `.svelte` file in the directory.
 *
 * @param dir - Component directory name
 * @param rawSources - Record of glob-resolved paths to raw source strings
 * @returns The glob key, or undefined if no match
 *
 * @example
 * ```typescript
 * findPrimaryKey('button', rawSources); // '/ui/button/button.svelte'
 * ```
 */
export function findPrimaryKey(dir: Str, rawSources: Record<Str, unknown>): Str | undefined {
	const keys: Str[] = Object.keys(rawSources).filter(
		(k: Str): boolean => extractDir(k) === dir && !isInternalFile(k),
	);
	return keys.find((k: Str): boolean => extractStem(k) === dir) ?? keys[0];
}
