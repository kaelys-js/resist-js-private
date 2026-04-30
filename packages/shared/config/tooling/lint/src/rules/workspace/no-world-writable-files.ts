/**
 * Rule: workspace/no-world-writable-files
 *
 * Detects `chmod 777`, `chmod 666`, `chmod a+w`, and similar overly
 * permissive permission patterns in shell scripts and config files.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Patterns matching world-writable chmod commands. */
const WORLD_WRITABLE_RE: RegExp = /chmod\s+(?:777|666|a\+w|o\+w)/g;

/** File extensions to scan. */
const SCANNABLE_EXTENSIONS: ReadonlySet<string> = new Set<string>([
  '.sh',
  '.bash',
  '.zsh',
  '.yml',
  '.yaml',
  '.toml',
  '.ts',
  '.js',
  '.json',
]);

/** Detects world-writable permission patterns. */
const rule: WorkspaceRule = {
  id: 'workspace/no-world-writable-files',
  description: 'Files must not be set world-writable (chmod 777/666/a+w).',
  scope: 'workspace',
  categories: ['workspace', 'security'],
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

    for (const filePath of await ctx.allFiles()) {
      const hasScanExt: boolean = [...SCANNABLE_EXTENSIONS].some((ext: string): boolean =>
        filePath.endsWith(ext),
      );

      if (!hasScanExt) {
        continue;
      }

      let content: string;

      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      let match: RegExpExecArray | null = WORLD_WRITABLE_RE.exec(content);

      while (match !== null) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-world-writable-files',
            filePath,
            1,
            1,
            'error',
            `World-writable permission '${match[0]}' found in ${relativePath}`,
            {
              tip: 'Use restrictive permissions like chmod 755 or chmod 644',
            },
          ),
        );
        match = WORLD_WRITABLE_RE.exec(content);
      }

      WORLD_WRITABLE_RE.lastIndex = 0;
    }

    return results;
  },
};

export default rule;
