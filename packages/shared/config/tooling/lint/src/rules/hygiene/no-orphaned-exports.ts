/**
 * Rule: hygiene/no-orphaned-exports
 *
 * Exported symbols must have at least one non-test consumer.
 * Reports exports that are never imported by any non-test `.ts` file
 * in the workspace, so dead exports can be removed or wired up.
 *
 * @module
 */

import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';
import { createResult, type LintResult, type WorkspaceRule } from '@/lint/framework/types.ts';

/** Rule ID constant. */
const RULE_ID: string = 'hygiene/no-orphaned-exports';

/** Regex to capture named exports (function, class, const, interface, type, enum). */
const EXPORT_RE: RegExp = /^export\s+(?:async\s+)?(?:function|class|const|interface|enum)\s+(\w+)/;

/** Regex for `export type <Name>` but NOT `export type { ... }` re-exports. */
const EXPORT_TYPE_RE: RegExp = /^export\s+type\s+([A-Z]\w*)\s/;

/**
 * Check if a file path is a test file.
 *
 * @param {string} filePath - Absolute file path
 * @returns {boolean} True if the file is a test file
 */
function isTestFile(filePath: string): boolean {
  return filePath.endsWith('.test.ts');
}

/**
 * Check if a file path is a declaration file.
 *
 * @param {string} filePath - Absolute file path
 * @returns {boolean} True if the file is a .d.ts declaration file
 */
function isDeclarationFile(filePath: string): boolean {
  return filePath.endsWith('.d.ts');
}

/**
 * Check if a file path is a barrel/index file.
 *
 * @param {string} filePath - Absolute file path
 * @returns {boolean} True if the file is an index.ts barrel file
 */
function isBarrelFile(filePath: string): boolean {
  return filePath.endsWith('/index.ts') || filePath === 'index.ts';
}

/**
 * Check if a file should be skipped entirely (test, declaration, or barrel).
 *
 * @param {string} filePath - Absolute file path
 * @returns {boolean} True if the file should be skipped
 */
function shouldSkipFile(filePath: string): boolean {
  return isTestFile(filePath) || isDeclarationFile(filePath) || isBarrelFile(filePath);
}

/** Description. */
const rule: WorkspaceRule = {
  categories: ['hygiene'],
  async inputs(context: unknown): Promise<readonly string[]> {
    const ctx = context as WorkspaceContext;
    return ctx.filesByExtension('.ts');
  },

  async check(context: unknown): Promise<LintResult[]> {
    const ctx: WorkspaceContext = context as WorkspaceContext;
    const results: LintResult[] = [];

    const tsFiles: readonly string[] = await ctx.filesByExtension('.ts');

    /* Collect all file contents up-front for searching. */
    const fileContents: Map<string, string> = new Map();
    await Promise.all(
      tsFiles.map(async (filePath: string): Promise<void> => {
        const content: string = await ctx.readFile(filePath);
        fileContents.set(filePath, content);
      }),
    );

    /* Build list of non-test consumer files and their content for import searching. */
    const consumerFiles: Array<{ path: string; content: string }> = [];
    for (const filePath of tsFiles) {
      if (!isTestFile(filePath)) {
        const content: string = fileContents.get(filePath) ?? '';
        consumerFiles.push({ path: filePath, content });
      }
    }

    /* Check each non-skipped file for orphaned exports. */
    for (const filePath of tsFiles) {
      if (shouldSkipFile(filePath)) {
        continue;
      }

      const content: string = fileContents.get(filePath) ?? '';
      const lines: string[] = content.split('\n');

      for (let i: number = 0; i < lines.length; i++) {
        const line: string = lines[i] ?? '';
        const trimmed: string = line.trim();

        /* Skip export default — entry points. */
        if (trimmed.startsWith('export default')) {
          continue;
        }

        /* Try to extract an exported symbol name. */
        let symbolName: string | undefined;

        const mainMatch: RegExpMatchArray | null = trimmed.match(EXPORT_RE);
        if (mainMatch) {
          symbolName = mainMatch[1];
        }

        if (symbolName === undefined) {
          const typeMatch: RegExpMatchArray | null = trimmed.match(EXPORT_TYPE_RE);
          if (typeMatch) {
            symbolName = typeMatch[1];
          }
        }

        if (symbolName === undefined) {
          continue;
        }

        /* Check for resist-lint-allow comment on the line above. */
        if (i > 0) {
          const prevLine: string = (lines[i - 1] ?? '').trim();
          if (prevLine.includes('resist-lint-allow: hygiene/no-orphaned-exports')) {
            continue;
          }
        }

        /* Search all non-test consumer files for an import referencing this symbol. */
        let found: boolean = false;
        for (const consumer of consumerFiles) {
          /* Don't count the file itself as a consumer. */
          if (consumer.path === filePath) {
            continue;
          }

          /* Simple text search: look for the symbol name in import lines. */
          const consumerLines: string[] = consumer.content.split('\n');
          for (const cLine of consumerLines) {
            const cTrimmed: string = cLine.trim();
            if (cTrimmed.startsWith('import') && cTrimmed.includes(symbolName)) {
              found = true;
              break;
            }
          }

          if (found) {
            break;
          }
        }

        if (!found) {
          results.push(
            createResult(
              RULE_ID,
              filePath,
              i + 1,
              1,
              'warning',
              `Exported symbol '${symbolName}' has no non-test consumer — remove it or wire it up.`,
              {
                tip: 'Remove unused exports or add an import in a non-test file.',
              },
            ),
          );
        }
      }
    }

    return results;
  },
  description:
    'Exported symbols must have at least one non-test consumer \u2014 remove unused exports or wire them up.',
  fixable: false,
  id: RULE_ID,
  scope: 'workspace',
  stages: ['ci'],
};

export default rule;
