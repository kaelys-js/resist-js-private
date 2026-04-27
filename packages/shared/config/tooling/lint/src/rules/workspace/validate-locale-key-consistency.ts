/**
 * Rule: workspace/validate-locale-key-consistency
 *
 * Locale JSON files must have consistent keys across all languages.
 *
 * @module
 */

import { basename, dirname, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Parent directory names that indicate locale files. */
const LOCALE_DIR_NAMES: ReadonlySet<string> = new Set<string>([
  'locales',
  'i18n',
  'lang',
  'messages',
  'translations',
]);

/** Validates that locale JSON files have consistent keys across all languages. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-locale-key-consistency',
  description: 'Locale JSON files must have consistent keys across all languages.',
  scope: 'workspace',
  categories: ['workspace', 'i18n'],
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

    /** Group locale JSON files by their parent directory. */
    const groups: Map<string, string[]> = new Map<string, string[]>();

    for (const filePath of await ctx.allFiles()) {
      if (!filePath.endsWith('.json')) {
        continue;
      }

      const parentDir: string = dirname(filePath);
      const parentDirName: string = basename(parentDir);

      if (!LOCALE_DIR_NAMES.has(parentDirName)) {
        continue;
      }

      const existing: string[] | undefined = groups.get(parentDir);
      if (existing === undefined) {
        groups.set(parentDir, [filePath]);
      } else {
        existing.push(filePath);
      }
    }

    /** Compare keys within each group. */
    for (const [_dir, files] of groups) {
      /* Skip groups with only one file — nothing to compare. */
      if (files.length <= 1) {
        continue;
      }

      /* Sort alphabetically — first file is the reference. */
      const sorted: string[] = [...files].toSorted();
      const referenceFile: string = sorted[0] as string;

      let referenceContent: string;
      try {
        referenceContent = await ctx.readFile(referenceFile);
      } catch {
        continue;
      }

      let referenceData: Record<string, unknown>;
      try {
        referenceData = JSON.parse(referenceContent) as Record<string, unknown>;
      } catch {
        continue;
      }

      const referenceKeys: string[] = Object.keys(referenceData).toSorted();
      const referenceRelative: string = relative(ctx.rootDir, referenceFile);

      /** Compare each other file to the reference. */
      for (let i: number = 1; i < sorted.length; i++) {
        const comparisonFile: string = sorted[i] as string;

        let comparisonContent: string;
        try {
          comparisonContent = await ctx.readFile(comparisonFile);
        } catch {
          continue;
        }

        let comparisonData: Record<string, unknown>;
        try {
          comparisonData = JSON.parse(comparisonContent) as Record<string, unknown>;
        } catch {
          continue;
        }

        const comparisonKeys: string[] = Object.keys(comparisonData).toSorted();
        const comparisonRelative: string = relative(ctx.rootDir, comparisonFile);

        /** Find missing keys (in reference but not in comparison). */
        const missingKeys: string[] = referenceKeys.filter(
          (key: string): boolean => !comparisonKeys.includes(key),
        );

        /** Find extra keys (in comparison but not in reference). */
        const extraKeys: string[] = comparisonKeys.filter(
          (key: string): boolean => !referenceKeys.includes(key),
        );

        if (missingKeys.length > 0) {
          results.push(
            createResult(
              'workspace/validate-locale-key-consistency',
              comparisonFile,
              1,
              1,
              'error',
              `Locale file ${comparisonRelative} is missing keys present in ${referenceRelative}: ${missingKeys.join(', ')}`,
              {
                tip: 'Add the missing translation keys to ensure all locales are consistent',
              },
            ),
          );
        }

        if (extraKeys.length > 0) {
          results.push(
            createResult(
              'workspace/validate-locale-key-consistency',
              comparisonFile,
              1,
              1,
              'error',
              `Locale file ${comparisonRelative} has extra keys not in ${referenceRelative}: ${extraKeys.join(', ')}`,
              {
                tip: 'Remove extra keys or add them to all locale files for consistency',
              },
            ),
          );
        }
      }
    }

    return results;
  },
};

export default rule;
