/**
 * Rule: workspace/no-unreferenced-images
 *
 * Image files must be referenced in source code.
 * Checks that every .webp, .svg, and .ico file is referenced by at least
 * one source file in the workspace.
 *
 * @module
 */

import { basename } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Allowed image extensions. */
const IMAGE_EXTENSIONS: readonly string[] = ['.webp', '.svg', '.ico'];

/** Source file extensions to search for references. */
const SOURCE_EXTENSIONS: readonly string[] = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.html',
  '.md',
  '.css',
  '.json',
];

/** Image files must be referenced in source code. */
const rule: WorkspaceRule = {
  id: 'workspace/no-unreferenced-images',
  description: 'Image files must be referenced in source code.',
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

    /* Collect all image files. */
    const imageFiles: string[] = [];

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
        imageFiles.push(filePath);
      }
    }

    if (imageFiles.length === 0) {
      return results;
    }

    /* Collect all source file contents. */
    const sourceContents: string[] = [];

    for (const filePath of allFiles) {
      const lowerPath: string = filePath.toLowerCase();
      let isSource: boolean = false;

      for (const ext of SOURCE_EXTENSIONS) {
        if (lowerPath.endsWith(ext)) {
          isSource = true;
          break;
        }
      }

      if (isSource) {
        try {
          const content: string = await ctx.readFile(filePath);
          sourceContents.push(content);
        } catch {
          continue;
        }
      }
    }

    /* Concatenate all source content for searching. */
    const allSourceContent: string = sourceContents.join('\n');

    /* Check each image file for references. */
    for (const imageFile of imageFiles) {
      const imageName: string = basename(imageFile);

      if (!allSourceContent.includes(imageName)) {
        results.push(
          createResult(
            'workspace/no-unreferenced-images',
            imageFile,
            1,
            1,
            'warning',
            `Unreferenced image file: ${imageFile}`,
            {
              tip: 'Remove unused images or confirm they are loaded dynamically',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
