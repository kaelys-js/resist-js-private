/**
 * Rule: workspace/no-forbidden-node-imports-in-workers
 *
 * Blocks forbidden Node.js module imports in Cloudflare Worker source files
 * (files in directories containing wrangler.json).
 *
 * @module
 */

import { basename, dirname, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Node.js modules forbidden in Cloudflare Workers. */
const FORBIDDEN_MODULES: ReadonlySet<string> = new Set<string>([
  'fs',
  'path',
  'os',
  'net',
  'child_process',
  'cluster',
  'dgram',
  'dns',
  'http2',
  'inspector',
  'readline',
  'repl',
  'tls',
  'tty',
  'v8',
  'vm',
  'worker_threads',
]);

/** Pattern to extract import specifiers from source code. */
const IMPORT_RE: RegExp =
  /(?:from\s+['"])([^'"]+)(?:['"])|(?:require\s*\(\s*['"])([^'"]+)(?:['"])/g;

/** Source file extensions to scan. */
const SOURCE_EXTENSIONS: ReadonlySet<string> = new Set<string>(['.ts', '.tsx', '.js', '.jsx']);

/** Blocks forbidden Node.js imports in Worker code. */
const rule: WorkspaceRule = {
  id: 'workspace/no-forbidden-node-imports-in-workers',
  description: 'Worker code must not import forbidden Node.js modules.',
  scope: 'workspace',
  categories: ['workspace', 'wrangler'],
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

    /* First pass: identify directories containing wrangler.json. */
    const workerDirs: Set<string> = new Set<string>();

    for (const filePath of await ctx.allFiles()) {
      const name: string = basename(filePath);

      if (name === 'wrangler.json' || name === 'wrangler.jsonc') {
        workerDirs.add(dirname(filePath));
      }
    }

    if (workerDirs.size === 0) {
      return results;
    }

    /* Second pass: scan source files in worker directories. */
    for (const filePath of await ctx.allFiles()) {
      /* Check if file is in a worker directory. */
      let isInWorkerDir: boolean = false;

      for (const dir of workerDirs) {
        if (filePath.startsWith(`${dir}/`) || filePath === dir) {
          isInWorkerDir = true;
          break;
        }
      }

      if (!isInWorkerDir) {
        continue;
      }

      /* Only scan source files. */
      let hasSourceExt: boolean = false;

      for (const ext of SOURCE_EXTENSIONS) {
        if (filePath.endsWith(ext)) {
          hasSourceExt = true;
          break;
        }
      }

      if (!hasSourceExt) {
        continue;
      }

      let content: string;

      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      let match: RegExpExecArray | null = IMPORT_RE.exec(content);

      while (match !== null) {
        const specifier: string = match[1] ?? match[2] ?? '';

        /* Extract the module name (strip node: prefix if present). */
        const moduleName: string = specifier.startsWith('node:') ? specifier.slice(5) : specifier;

        /* Only check bare module imports. */
        if (
          !specifier.startsWith('.') &&
          !specifier.startsWith('/') &&
          !specifier.startsWith('@/')
        ) {
          const rootModule: string = moduleName.split('/')[0] ?? moduleName;

          if (FORBIDDEN_MODULES.has(rootModule)) {
            const relativePath: string = relative(ctx.rootDir, filePath);
            results.push(
              createResult(
                'workspace/no-forbidden-node-imports-in-workers',
                filePath,
                1,
                1,
                'error',
                `Forbidden Node.js module '${specifier}' imported in Worker file ${relativePath}`,
                {
                  tip: 'Workers do not support this Node.js module — use a Worker-compatible alternative',
                },
              ),
            );
          }
        }

        match = IMPORT_RE.exec(content);
      }

      /* Reset regex lastIndex for next file. */
      IMPORT_RE.lastIndex = 0;
    }

    return results;
  },
};

export default rule;
