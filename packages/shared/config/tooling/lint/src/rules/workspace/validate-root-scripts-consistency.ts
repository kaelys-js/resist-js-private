/**
 * Rule: workspace/validate-root-scripts-consistency
 *
 * Enforces that root package.json contains exactly the standard
 * orchestration scripts using 'pnpm -r run' format, with no
 * unexpected extras.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Standard root scripts expected in the workspace root package.json. */
const EXPECTED_SCRIPTS: ReadonlyArray<string> = [
  'benchmark',
  'bootstrap',
  'build',
  'check',
  'clean',
  'deploy',
  'dev',
  'format',
  'lint',
  'logs',
  'prepare',
  'preview',
  'preinstall',
  'test',
];

/** Scripts exempt from the 'pnpm -r run' format check. */
const FORMAT_EXEMPT: ReadonlySet<string> = new Set<string>(['prepare', 'preinstall']);

/** Enforces root package.json script consistency. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-root-scripts-consistency',
  description: 'Enforces root package.json script consistency.',
  scope: 'workspace',
  categories: ['workspace', 'package'],
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

    /* Find root package.json */
    let rootPkgPath: string | undefined;

    for await (const filePath of ctx.allFiles()) {
      const relativePath: string = relative(ctx.rootDir, filePath);
      if (relativePath === 'package.json') {
        rootPkgPath = filePath;
        break;
      }
    }

    if (!rootPkgPath) {
      results.push(
        createResult(
          'workspace/validate-root-scripts-consistency',
          ctx.rootDir,
          1,
          1,
          'error',
          'Root package.json not found',
        ),
      );
      return results;
    }

    const content: string = await ctx.readFile(rootPkgPath);
    const pkgJson: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;

    const scripts: Record<string, unknown> =
      typeof pkgJson.scripts === 'object' && pkgJson.scripts !== null
        ? (pkgJson.scripts as Record<string, unknown>)
        : {};

    /* Extract meta.scripts.description for checking */
    let descriptions: Record<string, unknown> | undefined;
    const meta: unknown = pkgJson.meta;

    if (typeof meta === 'object' && meta !== null) {
      const metaObj: Record<string, unknown> = meta as Record<string, unknown>;
      const metaScripts: unknown = metaObj.scripts;

      if (typeof metaScripts === 'object' && metaScripts !== null) {
        const metaScriptsObj: Record<string, unknown> = metaScripts as Record<string, unknown>;
        const desc: unknown = metaScriptsObj.description;

        if (typeof desc === 'object' && desc !== null) {
          descriptions = desc as Record<string, unknown>;
        }
      }
    }

    /* Check each expected script */
    for (const name of EXPECTED_SCRIPTS) {
      const scriptValue: unknown = scripts[name];

      if (scriptValue === undefined) {
        results.push(
          createResult(
            'workspace/validate-root-scripts-consistency',
            rootPkgPath,
            1,
            1,
            'error',
            `Missing root script: ${name}`,
            {
              tip: 'Limit root scripts to the standard orchestration set',
            },
          ),
        );
        continue;
      }

      /* Check format for non-exempt scripts */
      if (!FORMAT_EXEMPT.has(name)) {
        const expectedValue: string = `pnpm -r run ${name}`;
        if (typeof scriptValue === 'string' && scriptValue !== expectedValue) {
          results.push(
            createResult(
              'workspace/validate-root-scripts-consistency',
              rootPkgPath,
              1,
              1,
              'error',
              `Root script '${name}' must use 'pnpm -r run ${name}' format`,
              {
                tip: 'Limit root scripts to the standard orchestration set',
              },
            ),
          );
        }
      }

      /* Check meta.scripts.description has entry */
      if (
        !descriptions ||
        typeof descriptions[name] !== 'string' ||
        (descriptions[name] as string).trim().length === 0
      ) {
        results.push(
          createResult(
            'workspace/validate-root-scripts-consistency',
            rootPkgPath,
            1,
            1,
            'error',
            `Missing meta.scripts.description for root script '${name}'`,
            {
              tip: 'Limit root scripts to the standard orchestration set',
            },
          ),
        );
      }
    }

    /* Check for unexpected scripts */
    const expectedSet: ReadonlySet<string> = new Set<string>(EXPECTED_SCRIPTS);

    for (const name of Object.keys(scripts)) {
      if (!expectedSet.has(name)) {
        results.push(
          createResult(
            'workspace/validate-root-scripts-consistency',
            rootPkgPath,
            1,
            1,
            'error',
            `Unexpected script in root package.json: ${name}`,
            {
              tip: 'Limit root scripts to the standard orchestration set',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
