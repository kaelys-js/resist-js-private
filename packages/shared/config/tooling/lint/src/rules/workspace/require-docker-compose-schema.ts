/**
 * Rule: workspace/require-docker-compose-schema
 *
 * Docker Compose files must have a schema annotation comment.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Set of Docker Compose filenames to inspect. */
const COMPOSE_FILENAMES: ReadonlySet<string> = new Set<string>([
  'docker-compose.yml',
  'docker-compose.yaml',
  'compose.yml',
  'compose.yaml',
]);

/** Flags Docker Compose files missing a schema annotation comment. */
const rule: WorkspaceRule = {
  id: 'workspace/require-docker-compose-schema',
  description: 'Docker Compose files must have a schema annotation comment.',
  scope: 'workspace',
  categories: ['workspace', 'docker'],
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

    for (const filePath of await ctx.allFiles()) {
      const name: string = basename(filePath);
      if (!COMPOSE_FILENAMES.has(name)) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      const firstLine: string = content.split('\n')[0] ?? '';
      const hasSchemaAnnotation: boolean =
        firstLine.startsWith('# yaml-language-server: $schema=') ||
        firstLine.startsWith('# $schema=');

      if (!hasSchemaAnnotation) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/require-docker-compose-schema',
            filePath,
            1,
            1,
            'error',
            `Docker Compose file missing schema annotation: ${relativePath}`,
            {
              tip: 'Add "# yaml-language-server: $schema=https://json.schemastore.org/docker-compose" as the first line',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
