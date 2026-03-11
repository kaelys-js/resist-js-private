/**
 * Shared utility functions for the Lens component documentation system.
 *
 * Provides directory/file extraction helpers and text transformation
 * used by both the Lens layout sidebar and component detail pages.
 */
import type { Str } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';
import { type LensMeta, LensMetaSchema } from './types.js';

/** Set of Svelte-internal prop names that must be stripped before schema validation. */
const SVELTE_INTERNAL_PROPS: ReadonlySet<Str> = new Set(['children', 'child']);

/**
 * Strip Svelte-internal props (children, child) from a raw props object.
 *
 * Svelte 5 injects `children` (default slot snippet) and `child` (shadcn snippet
 * pattern) into props. These must be removed before `v.strictObject()` validation
 * since the component schemas don't include them.
 *
 * @param props - The raw $props() object
 * @returns A shallow copy with Svelte-internal keys removed
 *
 * @example
 * ```typescript
 * const allProps: MyProps = $props();
 * const rawProps: Record<Str, unknown> = stripSvelteProps(allProps);
 * const validated = safeParse(MySchema, rawProps);
 * ```
 */
export function stripSvelteProps<T extends Record<Str, unknown>>(props: T): T {
  const result: Record<Str, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!SVELTE_INTERNAL_PROPS.has(key)) {
      result[key] = value;
    }
  }
  // Stripped keys are Svelte internals (children, child) not present in T
  return result as T;
}

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
  // Handle dotted keys: meta.category → Meta · Category
  if (name.includes('.')) {
    return name
      .split('.')
      .map((part: Str): Str => toTitle(part))
      .join(' · ');
  }
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

/**
 * Validate raw lens.ts metadata against LensMetaSchema.
 *
 * Returns `Result<LensMeta>` — callers propagate errors via the Result pattern.
 *
 * @param raw - The raw meta export from a lens.ts module
 * @returns Validated LensMeta on success, or AppError on failure
 */
export function parseLensMeta(raw: unknown): Result<LensMeta> {
  return safeParse(LensMetaSchema, raw);
}

/** Regex to capture the first JSDoc block inside `<script lang="ts">`. */
const INSTANCE_JSDOC_RE: RegExp = /<script\s+lang="ts">\s*\/\*\*\s*([\s\S]*?)\*\//;

/**
 * Extract the component-level JSDoc description from a raw `.svelte` source.
 *
 * Looks for the first `/** ... *​/` block immediately after `<script lang="ts">`
 * and returns the first sentence (the summary line).
 *
 * @param src - Raw `.svelte` file content
 * @returns The JSDoc summary, or undefined if none found
 *
 * @example
 * ```typescript
 * extractComponentDescription(raw); // 'Dependency tree visualization for Lens documentation pages.'
 * ```
 */
export function extractComponentDescription(src: Str): Str | undefined {
  const match: RegExpExecArray | null = INSTANCE_JSDOC_RE.exec(src);
  if (!match?.[1]) return undefined;
  const firstLine: Str | undefined = match[1]
    .split('\n')
    .map((l: Str): Str => l.replace(/^\s*\*\s?/, '').trim())
    .find((l: Str): boolean => l.length > 0);
  return firstLine;
}
