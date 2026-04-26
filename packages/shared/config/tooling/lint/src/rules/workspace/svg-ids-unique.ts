/**
 * Rule: workspace/svg-ids-unique
 *
 * SVG id values must be unique across all SVG files in the workspace.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern matching id attributes in SVG content. */
const ID_ATTR_RE: RegExp = /id="([^"]+)"/g;

/** SVG id values must be unique across all SVG files in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/svg-ids-unique',
  description: 'SVG id values must be unique across all SVG files in the workspace.',
  scope: 'workspace',
  categories: ['workspace', 'encoding'],
  stages: ['lint', 'check'],
  fixable: false,
  /* Caching is opt-out: this rule depends on git/CI state via execSync. */
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

    /** Map of id value to the first file it was seen in. */
    const seenIds: Map<string, string> = new Map();

    /** Collect all SVG file paths first. */
    const svgFiles: string[] = [];

    for (const filePath of await ctx.allFiles()) {
      if (filePath.toLowerCase().endsWith('.svg')) {
        svgFiles.push(filePath);
      }
    }

    for (const filePath of svgFiles) {
      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      let match: RegExpExecArray | null = ID_ATTR_RE.exec(content);
      while (match !== null) {
        const idValue: string = match[1]!;
        const existingFile: string | undefined = seenIds.get(idValue);

        if (existingFile !== undefined && existingFile !== filePath) {
          results.push(
            createResult(
              'workspace/svg-ids-unique',
              filePath,
              1,
              1,
              'error',
              `SVG id="${idValue}" is duplicated across files: ${existingFile} and ${filePath}`,
              {
                tip: 'All SVG id values must be unique across the repository',
              },
            ),
          );
        } else {
          seenIds.set(idValue, filePath);
        }

        match = ID_ATTR_RE.exec(content);
      }
    }

    return results;
  },
};

export default rule;
