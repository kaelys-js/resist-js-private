/**
 * Rule: workspace/no-disallowed-worker-headers
 *
 * Cloudflare Worker code must not use disallowed HTTP headers.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** HTTP headers disallowed in Cloudflare Workers. */
const DISALLOWED_HEADERS: ReadonlyArray<string> = [
  'Transfer-Encoding',
  'Connection',
  'Keep-Alive',
  'Upgrade',
  'Proxy-Connection',
  'TE',
  'Trailer',
];

/** Source file extensions to scan. */
const SOURCE_EXTENSIONS: ReadonlySet<string> = new Set<string>(['.ts', '.tsx', '.js', '.jsx']);

/** Worker-related file basenames. */
const WORKER_FILE_NAMES: ReadonlySet<string> = new Set<string>([
  'worker.ts',
  '_worker.ts',
  'worker.js',
  '_worker.js',
]);

/** Flags disallowed HTTP headers in Cloudflare Worker code. */
const rule: WorkspaceRule = {
  id: 'workspace/no-disallowed-worker-headers',
  description: 'Cloudflare Worker code must not use disallowed HTTP headers.',
  scope: 'workspace',
  categories: ['workspace', 'cloudflare'],
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

      /* Only scan source files. */
      const hasSourceExt: boolean = [...SOURCE_EXTENSIONS].some((ext: string): boolean =>
        filePath.endsWith(ext),
      );
      if (!hasSourceExt) {
        continue;
      }

      /* Check if file is in a worker directory or is a worker file. */
      const isWorkerFile: boolean =
        WORKER_FILE_NAMES.has(name) || filePath.toLowerCase().includes('worker');

      if (!isWorkerFile) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      const contentLower: string = content.toLowerCase();

      for (const header of DISALLOWED_HEADERS) {
        const headerLower: string = header.toLowerCase();

        /** Match patterns: .set('Header'), .append('Header'), .get('Header'), .delete('Header'), 'Header' in new Headers */
        const patterns: Array<string> = [
          `.set('${headerLower}'`,
          `.set("${headerLower}"`,
          `.append('${headerLower}'`,
          `.append("${headerLower}"`,
          `.get('${headerLower}'`,
          `.get("${headerLower}"`,
          `.delete('${headerLower}'`,
          `.delete("${headerLower}"`,
          `'${headerLower}'`,
          `"${headerLower}"`,
        ];

        const found: boolean = patterns.some((pattern: string): boolean =>
          contentLower.includes(pattern),
        );

        if (found) {
          const relativePath: string = relative(ctx.rootDir, filePath);
          results.push(
            createResult(
              'workspace/no-disallowed-worker-headers',
              filePath,
              1,
              1,
              'error',
              `Disallowed HTTP header '${header}' used in Worker file ${relativePath}`,
              {
                tip: `The '${header}' header is not supported in Cloudflare Workers — remove it`,
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
