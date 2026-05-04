/**
 * Rule: workspace/detect-undeclared-dependencies
 *
 * Detect imports of packages not declared in dependencies or devDependencies.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** File extensions to scan for import statements. */
const SOURCE_EXTENSIONS: ReadonlySet<string> = new Set<string>(['.ts', '.tsx', '.js', '.jsx']);

/** Node.js built-in module names (without `node:` prefix). */
const NODE_BUILTINS: ReadonlySet<string> = new Set<string>([
  'fs',
  'path',
  'os',
  'http',
  'https',
  'stream',
  'util',
  'url',
  'crypto',
  'events',
  'buffer',
  'querystring',
  'child_process',
  'worker_threads',
  'assert',
  'tty',
  'net',
  'dns',
  'zlib',
  'readline',
  'cluster',
  'perf_hooks',
  'async_hooks',
  'v8',
  'vm',
  'module',
  'console',
  'timers',
  'diagnostics_channel',
  'inspector',
  'trace_events',
  'string_decoder',
]);

/** Pattern to extract import specifiers from source code. */
const IMPORT_RE: RegExp =
  /(?:from\s+['"])([^'"]+)(?:['"])|(?:require\s*\(\s*['"])([^'"]+)(?:['"])/g;

/** Detects imports of undeclared dependencies. */
const rule: WorkspaceRule = {
  id: 'workspace/detect-undeclared-dependencies',
  description: 'Imports must reference packages declared in dependencies or devDependencies.',
  scope: 'workspace',
  categories: ['workspace', 'package'],
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

    const workspacePackages: Awaited<ReturnType<typeof ctx.getWorkspacePackages>> =
      await ctx.getWorkspacePackages();

    for (const pkg of workspacePackages) {
      const pkgDir: string = pkg.dir;
      const deps: Record<string, unknown> =
        (pkg.packageJson.dependencies as Record<string, unknown>) ?? {};
      const devDeps: Record<string, unknown> =
        (pkg.packageJson.devDependencies as Record<string, unknown>) ?? {};
      const declaredDeps: Set<string> = new Set<string>([
        ...Object.keys(deps),
        ...Object.keys(devDeps),
      ]);

      for (const filePath of await ctx.allFiles()) {
        /* Only check files inside this package. */
        const relToPackage: string = relative(pkgDir, filePath);

        if (relToPackage.startsWith('..') || relToPackage.startsWith('/')) {
          continue;
        }

        /* Only check source files. */
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

        const content: string = await ctx.readFile(filePath);
        let match: RegExpExecArray | null = IMPORT_RE.exec(content);

        while (match !== null) {
          const specifier: string = match[1] ?? match[2] ?? '';

          /* Skip relative, alias, and absolute imports. */
          if (
            specifier.startsWith('.') ||
            specifier.startsWith('@/') ||
            specifier.startsWith('/')
          ) {
            match = IMPORT_RE.exec(content);
            continue;
          }

          /* Skip Node.js builtins. */
          if (specifier.startsWith('node:') || NODE_BUILTINS.has(specifier)) {
            match = IMPORT_RE.exec(content);
            continue;
          }

          /* Extract root package name. */
          const parts: string[] = specifier.split('/');
          const rootPkg: string = specifier.startsWith('@')
            ? `${parts[0]}/${parts[1]}`
            : (parts[0] ?? specifier);

          if (!declaredDeps.has(rootPkg)) {
            const relativePath: string = relative(ctx.rootDir, filePath);
            results.push(
              createResult(
                'workspace/detect-undeclared-dependencies',
                filePath,
                1,
                1,
                'error',
                `Undeclared dependency '${rootPkg}' imported in ${relativePath}`,
                {
                  tip: 'Declare it in dependencies or devDependencies',
                },
              ),
            );
          }

          match = IMPORT_RE.exec(content);
        }

        /* Reset regex lastIndex for next file. */
        IMPORT_RE.lastIndex = 0;
      }
    }

    return results;
  },
};

export default rule;
