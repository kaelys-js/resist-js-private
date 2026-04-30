/**
 * Rule: hygiene/no-dead-locale-keys
 *
 * Every locale key must have at least one non-test, non-definition reference —
 * remove dead keys to prevent locale bloat.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/**
 * Check whether a file path is a test file.
 *
 * @param {string} filePath - Absolute file path
 * @returns {boolean} True if the file is a test file
 */
function isTestFile(filePath: string): boolean {
  return (
    filePath.includes('.test.') ||
    filePath.includes('.spec.') ||
    filePath.includes('__tests__') ||
    filePath.includes('__test__')
  );
}

/**
 * Check whether a file path is a schema file.
 *
 * @param {string} filePath - Absolute file path
 * @returns {boolean} True if the file is a schema file
 */
function isSchemaFile(filePath: string): boolean {
  const lower: string = filePath.toLowerCase();

  return lower.includes('schema');
}

/**
 * Parse a locale object literal to extract dot-path keys with their line numbers.
 *
 * Uses a simple state machine with depth tracking to handle nested groups:
 * ```
 * export const en = {
 *   messages: {
 *     binaryNotFound: 'Binary not found',
 *   },
 * };
 * ```
 * Produces: [{ key: 'messages.binaryNotFound', line: 3 }]
 *
 * @param {string} content - File content of the locale definition
 * @returns {Array<{ key: string; line: number }>} Extracted dot-path keys with line numbers
 */
function parseLocaleKeys(content: string): Array<{ key: string; line: number }> {
  const keys: Array<{ key: string; line: number }> = [];
  const lines: string[] = content.split('\n');
  const groupStack: string[] = [];
  let insideExport: boolean = false;
  let depth: number = 0;

  for (let i: number = 0; i < lines.length; i++) {
    const line: string = (lines[i] ?? '').trim();

    /* Detect the start of the exported object literal */
    if (!insideExport && /^export\s+const\s+\w+\s*=\s*\{/.test(line)) {
      insideExport = true;
      depth = 1;
      continue;
    }

    if (!insideExport) {
      continue;
    }

    /* Count braces to track nesting */
    const openBraces: number = (line.match(/\{/g) ?? []).length;
    const closeBraces: number = (line.match(/\}/g) ?? []).length;

    /* Check for a group start: `groupName: {` */
    const groupMatch: RegExpMatchArray | null = line.match(/^(\w+)\s*:\s*\{/);

    if (groupMatch && groupMatch[1]) {
      groupStack.push(groupMatch[1]);
      depth += openBraces;
      depth -= closeBraces;
      continue;
    }

    /* Check for a leaf key: `keyName: 'value'` or `keyName: "value"` or `keyName: `value`` */
    const keyMatch: RegExpMatchArray | null = line.match(/^(\w+)\s*:\s*[`'"]/);

    if (keyMatch && keyMatch[1] && groupStack.length > 0) {
      const dotPath: string = [...groupStack, keyMatch[1]].join('.');
      keys.push({ key: dotPath, line: i + 1 });
    }

    depth += openBraces;
    depth -= closeBraces;

    /* When a closing brace reduces depth, pop a group off the stack */
    if (closeBraces > 0 && groupStack.length > 0 && depth <= groupStack.length + 1) {
      /* Pop groups as we close nested braces */
      while (groupStack.length > 0 && depth <= groupStack.length) {
        groupStack.pop();
      }
    }

    /* Fully exited the top-level export object */
    if (depth <= 0) {
      break;
    }
  }

  return keys;
}

/** Detects locale keys with no non-test, non-definition references. */
const rule: WorkspaceRule = {
  id: 'hygiene/no-dead-locale-keys',
  description:
    'Every locale key must have at least one non-test, non-definition reference — remove dead keys to prevent locale bloat.',
  scope: 'workspace',
  categories: ['hygiene'],
  stages: ['ci'],
  fixable: false,
  optionsSchema: {
    localeFile: {
      type: 'string',
      description: 'Suffix path to the locale definition file (default: "locale/en.ts").',
    },
    localePrefix: {
      type: 'string',
      description: 'Export name prefix for the locale object (default: "en").',
    },
  },
  async check(context: unknown): Promise<
    Array<{
      ruleId: string;
      file: string;
      line: number;
      column: number;
      severity: 'error' | 'warning' | 'info';
      message: string;
      fix: { range: { start: number; end: number }; text: string };
      tip?: string;
      example?: string;
      source?: string;
      url?: string;
      endLine?: number;
      endColumn?: number;
    }>
  > {
    const ctx = context as WorkspaceContext & { ruleOptions?: Record<string, unknown> };
    const localeFileSuffix: string =
      typeof ctx.ruleOptions?.localeFile === 'string' ? ctx.ruleOptions.localeFile : 'locale/en.ts';
    const localePrefix: string =
      typeof ctx.ruleOptions?.localePrefix === 'string' ? ctx.ruleOptions.localePrefix : 'en';

    /* Step 1: Find the locale definition file */
    const tsFiles: readonly string[] = await ctx.filesByExtension('.ts');
    const localeFilePath: string | undefined = tsFiles.find((f: string): boolean =>
      f.endsWith(localeFileSuffix),
    );

    if (localeFilePath === undefined) {
      return [];
    }

    /* Step 2: Parse locale keys */
    const localeContent: string = await ctx.readFile(localeFilePath);
    const localeKeys: Array<{ key: string; line: number }> = parseLocaleKeys(localeContent);

    if (localeKeys.length === 0) {
      return [];
    }

    /* Step 3: Gather non-test, non-locale-definition, non-schema .ts files */
    const searchFiles: readonly string[] = tsFiles.filter(
      (f: string): boolean =>
        f !== localeFilePath && !isTestFile(f) && !isSchemaFile(f) && f.endsWith('.ts'),
    );

    /* Step 4: Read all search files once */
    const fileContents: Map<string, string> = new Map();
    await Promise.all(
      searchFiles.map(async (f: string): Promise<void> => {
        const content: string = await ctx.readFile(f);
        fileContents.set(f, content);
      }),
    );

    /* Step 5: Check each key for references */
    const results: Array<{
      ruleId: string;
      file: string;
      line: number;
      column: number;
      severity: 'error' | 'warning' | 'info';
      message: string;
      fix: { range: { start: number; end: number }; text: string };
      tip?: string;
      example?: string;
      source?: string;
      url?: string;
      endLine?: number;
      endColumn?: number;
    }> = [];

    for (const { key, line } of localeKeys) {
      const referencePattern: string = `${localePrefix}.${key}`;
      let found: boolean = false;

      for (const content of fileContents.values()) {
        if (content.includes(referencePattern)) {
          found = true;
          break;
        }
      }

      if (!found) {
        results.push(
          createResult(
            'hygiene/no-dead-locale-keys',
            localeFilePath,
            line,
            1,
            'warning',
            `Locale key '${key}' has no non-test references — remove it to prevent locale bloat.`,
            {
              tip: `Search for '${referencePattern}' — if no production code uses it, delete the key.`,
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
