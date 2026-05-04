/**
 * Rule: workspace/no-missing-image-refs
 *
 * Source code must not reference images that do not exist.
 * Checks that every image filename referenced in source files corresponds
 * to an actual image file in the workspace.
 *
 * @module
 */

import { basename } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Image extensions to check references for. */
const IMAGE_EXTENSIONS: readonly string[] = ['.webp', '.svg', '.ico'];

/** Source file extensions to scan for image references. */
const SOURCE_EXTENSIONS: readonly string[] = ['.ts', '.tsx', '.js', '.jsx', '.html', '.md', '.css'];

/** Pattern to match image filename references in source code. */
const IMAGE_REF_PATTERN: RegExp = /[\w./-]+\.(webp|svg|ico)\b/g;

/** Source code must not reference images that do not exist. */
const rule: WorkspaceRule = {
  id: 'workspace/no-missing-image-refs',
  description: 'Source code must not reference images that do not exist.',
  scope: 'workspace',
  categories: ['workspace', 'encoding'],
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

    /* Collect all image file basenames. */
    const imageBasenames: Set<string> = new Set<string>();

    for (const filePath of allFiles) {
      const lowerPath: string = filePath.toLowerCase();
      let isImage: boolean = false;

      for (const ext of IMAGE_EXTENSIONS) {
        if (lowerPath.endsWith(ext)) {
          isImage = true;
          break;
        }
      }

      if (isImage) {
        imageBasenames.add(basename(filePath));
      }
    }

    /* Scan source files for image references. */
    for (const filePath of allFiles) {
      const lowerPath: string = filePath.toLowerCase();
      let isSource: boolean = false;

      for (const ext of SOURCE_EXTENSIONS) {
        if (lowerPath.endsWith(ext)) {
          isSource = true;
          break;
        }
      }

      if (!isSource) {
        continue;
      }

      let content: string;

      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      const matches: IterableIterator<RegExpMatchArray> = content.matchAll(IMAGE_REF_PATTERN);
      const checkedRefs: Set<string> = new Set<string>();

      for (const match of matches) {
        const [ref] = match;
        const refBasename: string = basename(ref);

        if (checkedRefs.has(refBasename)) {
          continue;
        }
        checkedRefs.add(refBasename);

        if (!imageBasenames.has(refBasename)) {
          results.push(
            createResult(
              'workspace/no-missing-image-refs',
              filePath,
              1,
              1,
              'error',
              `Referenced image not found: ${ref}`,
              {
                tip: 'Fix the path, restore the file, or remove the reference',
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
