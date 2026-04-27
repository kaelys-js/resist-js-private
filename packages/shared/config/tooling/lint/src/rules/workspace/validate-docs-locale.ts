/**
 * Rule: workspace/validate-docs-locale
 *
 * All locale folders in /docs/ must match /docs/en-US/ structure.
 * Ensures every canonical English doc file has a corresponding translation file
 * in each locale directory, and flags extra files not in the canonical set.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern to extract locale directory and filename from docs paths. */
const LOCALE_PATH_PATTERN: RegExp = /docs\/([a-zA-Z]{2}-[a-zA-Z]{2})\/(.+\.md)$/;

/** All locale folders in /docs/ must match /docs/en-US/ structure. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-docs-locale',
  description: 'All locale folders in /docs/ must match /docs/en-US/ structure.',
  scope: 'workspace',
  categories: ['workspace', 'docs'],
  stages: ['lint', 'check'],
  fixable: false,
  async inputs(context: unknown): Promise<readonly string[]> {
    const ctx = context as WorkspaceContext;
    return ctx.allFiles();
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
    const ctx: WorkspaceContext = context as WorkspaceContext;
    const results: Array<ReturnType<typeof createResult>> = [];
    const allFiles: readonly string[] = await ctx.allFiles();

    /* Collect canonical files from docs/en-US/. */
    const canonicalFiles: Set<string> = new Set<string>();
    for (const filePath of allFiles) {
      const match: RegExpMatchArray | null = filePath.match(LOCALE_PATH_PATTERN);
      if (match !== null && match[1] === 'en-US' && match[2] !== undefined) {
        canonicalFiles.add(match[2]);
      }
    }

    /* Collect locale directories and their files. */
    const localeFiles: Map<string, Set<string>> = new Map<string, Set<string>>();
    for (const filePath of allFiles) {
      const match: RegExpMatchArray | null = filePath.match(LOCALE_PATH_PATTERN);
      if (
        match !== null &&
        match[1] !== 'en-US' &&
        match[1] !== undefined &&
        match[2] !== undefined
      ) {
        const [, locale] = match;
        if (!localeFiles.has(locale)) {
          localeFiles.set(locale, new Set<string>());
        }
        localeFiles.get(locale)?.add(match[2]);
      }
    }

    /* Check each locale for missing and extra files. */
    for (const [locale, files] of localeFiles) {
      for (const canonicalFile of canonicalFiles) {
        if (!files.has(canonicalFile)) {
          results.push(
            createResult(
              'workspace/validate-docs-locale',
              `docs/${locale}/${canonicalFile}`,
              1,
              1,
              'error',
              `Missing locale file: docs/${locale}/${canonicalFile}`,
            ),
          );
        }
      }

      for (const file of files) {
        if (!canonicalFiles.has(file)) {
          results.push(
            createResult(
              'workspace/validate-docs-locale',
              `docs/${locale}/${file}`,
              1,
              1,
              'warning',
              `Extra file in docs/${locale}: ${file}`,
            ),
          );
        }
      }
    }

    return results;
  },
};

export default rule;
