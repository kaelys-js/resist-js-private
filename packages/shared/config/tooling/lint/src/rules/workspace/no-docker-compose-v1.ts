/**
 * Rule: workspace/no-docker-compose-v1
 *
 * Reject deprecated Docker Compose v1/v2 version declarations.
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
]);

/** Pattern matching deprecated version declarations (v1 or v2). */
const DEPRECATED_VERSION_RE: RegExp = /^version:\s*['"]?[12](\.\d+)?['"]?\s*$/m;

/** Flags deprecated Docker Compose version declarations. */
const rule: WorkspaceRule = {
  id: 'workspace/no-docker-compose-v1',
  description: 'Docker Compose files must not use deprecated v1/v2 version declarations.',
  scope: 'workspace',
  categories: ['workspace', 'infra'],
  stages: ['lint', 'check'],
  fixable: false,
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

    for await (const filePath of ctx.allFiles()) {
      const name: string = basename(filePath);
      if (!COMPOSE_FILENAMES.has(name)) {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const match: RegExpMatchArray | null = DEPRECATED_VERSION_RE.exec(content);

      if (match !== null) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-docker-compose-v1',
            filePath,
            1,
            1,
            'error',
            `Deprecated Docker Compose version declaration in ${relativePath}`,
            {
              tip: 'Remove the version field — Docker Compose v2+ does not require it',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
