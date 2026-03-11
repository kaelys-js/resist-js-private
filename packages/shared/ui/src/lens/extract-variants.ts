/**
 * Runtime TV (tailwind-variants) metadata extraction from raw Svelte source.
 *
 * Parses `tv()` calls to extract variant keys, their available options,
 * and default values. Runs in the browser against raw source loaded via
 * `import.meta.glob('?raw')`.
 *
 * @example
 * ```typescript
 * import { extractVariants } from './extract-variants.js';
 * const meta = extractVariants(rawSvelteSource);
 * // { variants: [{ key: 'variant', options: ['default', 'secondary', ...], default: 'default' }] }
 * ```
 */
import type { VariantKeyMeta, VariantMeta } from './types.js';

/**
 * Extract TV variant metadata from raw .svelte component source.
 *
 * Looks for a `tv(...)` call containing a `variants` object, then parses
 * each variant key and its options. Also extracts `defaultVariants` if present.
 *
 * @param source - Raw .svelte file content
 * @returns VariantMeta with all variant keys, or null if no tv() call found
 */
export function extractVariants(source: string): VariantMeta | null {
  if (!source) return null;

  // Find `tv({` in the source
  const tvIdx: number = source.indexOf('tv({');
  if (tvIdx === -1) return null;

  // Find the opening brace of the tv() argument
  const tvBraceIdx: number = source.indexOf('{', tvIdx + 2);
  if (tvBraceIdx === -1) return null;

  // Find the matching closing brace
  const tvEndIdx: number = findMatchingBrace(source, tvBraceIdx);
  if (tvEndIdx === -1) return null;

  const tvBody: string = source.slice(tvBraceIdx + 1, tvEndIdx);

  // Extract the `variants: { ... }` block
  const variantsBlock: string | null = extractBlock(tvBody, 'variants');
  if (!variantsBlock) return null;

  // Extract the `defaultVariants: { ... }` block
  const defaultsBlock: string | null = extractBlock(tvBody, 'defaultVariants');
  const defaults: Map<string, string> = defaultsBlock ? parseDefaults(defaultsBlock) : new Map();

  // Parse each variant key from the variants block
  const variants: VariantKeyMeta[] = parseVariantKeys(variantsBlock, defaults);

  return { variants };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Find the matching closing brace for an opening brace at the given index.
 *
 * @param source - Full source string
 * @param openIdx - Index of the opening brace
 * @returns Index of the matching closing brace, or -1 if not found
 */
function findMatchingBrace(source: string, openIdx: number): number {
  let depth: number = 0;
  let inString: string | null = null;

  for (let i: number = openIdx; i < source.length; i++) {
    const ch: string = source[i] ?? '';
    const prev: string = source[i - 1] ?? '';

    if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
      inString = ch;
      continue;
    }
    if (inString && ch === inString && prev !== '\\') {
      inString = null;
      continue;
    }
    if (inString) continue;

    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

/**
 * Extract a named block from a TV config body.
 *
 * Finds `keyName: { ... }` and returns the content between the braces.
 *
 * @param body - The body of the tv() call (between outer braces)
 * @param keyName - The key to find (e.g., 'variants', 'defaultVariants')
 * @returns The block content, or null if not found
 */
function extractBlock(body: string, keyName: string): string | null {
  const keyPattern: RegExp = new RegExp(`${keyName}\\s*:\\s*\\{`);
  const match: RegExpExecArray | null = keyPattern.exec(body);
  if (!match) return null;

  const braceIdx: number = body.indexOf('{', (match.index ?? 0) + keyName.length);
  if (braceIdx === -1) return null;

  const endIdx: number = findMatchingBrace(body, braceIdx);
  if (endIdx === -1) return null;

  return body.slice(braceIdx + 1, endIdx);
}

/**
 * Parse defaultVariants block into a name-to-value map.
 *
 * @param block - Content inside defaultVariants braces
 * @returns Map of variant key to its default value string
 */
function parseDefaults(block: string): Map<string, string> {
  const defaults: Map<string, string> = new Map();
  // Match: key: 'value', or key: "value",
  const regex: RegExp = /(\w+)\s*:\s*['"]([^'"]*)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(block)) !== null) {
    const key: string = match[1] ?? '';
    const value: string = match[2] ?? '';
    if (key) defaults.set(key, value);
  }
  return defaults;
}

/**
 * Parse variant keys and their options from the variants block.
 *
 * Each variant key contains an object mapping option names to CSS classes.
 * Extracts the option names (keys of the inner objects).
 *
 * @param block - Content inside the variants braces
 * @param defaults - Default values map from parseDefaults
 * @returns Array of VariantKeyMeta
 */
function parseVariantKeys(block: string, defaults: Map<string, string>): VariantKeyMeta[] {
  const variants: VariantKeyMeta[] = [];

  // Find each variant key: `keyName: { ... }`
  // Use regex to find key names followed by `: {`
  const keyRegex: RegExp = /(\w+)\s*:\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = keyRegex.exec(block)) !== null) {
    const key: string = match[1] ?? '';
    if (!key) continue;

    // Find the opening brace for this variant's options
    const braceIdx: number = block.indexOf('{', (match.index ?? 0) + key.length);
    if (braceIdx === -1) continue;

    const endIdx: number = findMatchingBrace(block, braceIdx);
    if (endIdx === -1) continue;

    const optionsBlock: string = block.slice(braceIdx + 1, endIdx);

    // Extract option names — keys of the inner object
    // Match: optionName: 'css classes', or 'option-name': 'css classes',
    const options: string[] = parseOptionNames(optionsBlock);

    variants.push({
      key,
      options,
      default: defaults.get(key) ?? '',
    });

    // Advance past this variant's block to avoid re-matching inner keys
    keyRegex.lastIndex = endIdx + 1;
  }

  return variants;
}

/**
 * Parse option names from a variant options block.
 *
 * Handles both identifier keys (`default: '...'`) and quoted keys (`'icon-sm': '...'`).
 *
 * @param block - Content inside a single variant key's braces
 * @returns Array of option name strings in order
 */
function parseOptionNames(block: string): string[] {
  const names: string[] = [];
  let i: number = 0;

  while (i < block.length) {
    const ch: string = block[i] ?? '';

    // Skip whitespace and commas
    if (/\s|,/.test(ch)) {
      i++;
      continue;
    }

    // Try to match a quoted key: 'key-name': or "key-name":
    // Must be checked BEFORE string-skip to avoid consuming quoted keys as values
    const quotedMatch: RegExpExecArray | null = /^(['"])([^'"]+)\1\s*:/.exec(block.slice(i));
    if (quotedMatch) {
      const name: string = quotedMatch[2] ?? '';
      if (name) names.push(name);
      i += (quotedMatch[0] ?? '').length;
      // Skip the value after the colon (may be a string)
      i = skipValue(block, i);
      continue;
    }

    // Try to match an identifier key: keyName:
    const identMatch: RegExpExecArray | null = /^(\w+)\s*:/.exec(block.slice(i));
    if (identMatch) {
      const name: string = identMatch[1] ?? '';
      if (name) names.push(name);
      i += (identMatch[0] ?? '').length;
      // Skip the value after the colon (may be a string)
      i = skipValue(block, i);
      continue;
    }

    // Skip any other character (stray tokens, nested braces, etc.)
    i++;
  }
  return names;
}

/**
 * Skip a value expression after a key's colon.
 *
 * Advances past whitespace and any string literal to avoid matching
 * CSS pseudo-classes like `hover:` inside Tailwind class strings.
 *
 * @param block - The options block source
 * @param start - Index right after the colon
 * @returns New index past the value
 */
function skipValue(block: string, start: number): number {
  let i: number = start;

  // Skip whitespace
  while (i < block.length && /\s/.test(block[i] ?? '')) i++;

  const ch: string = block[i] ?? '';
  // If the value is a string literal, skip it entirely
  if (ch === "'" || ch === '"' || ch === '`') {
    const quote: string = ch;
    i++; // skip opening quote
    while (i < block.length && block[i] !== quote) {
      if (block[i] === '\\') i++; // skip escaped chars
      i++;
    }
    i++; // skip closing quote
  }

  return i;
}
