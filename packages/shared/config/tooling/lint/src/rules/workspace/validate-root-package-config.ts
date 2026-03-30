/**
 * Rule: workspace/validate-root-package-config
 *
 * Validates root package.json tooling configuration including required
 * devDependencies, lint-staged config, packageManager field, and
 * engines.node version.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Required devDependencies that must be present in root package.json. */
const REQUIRED_DEV_DEPS: ReadonlyArray<string> = [
  '@biomejs/biome',
  'oxlint',
  'husky',
  'lint-staged',
  'tsx',
  'wrangler',
  '@cloudflare/workers-types',
  '@types/ua-parser-js',
];

/** Regex matching a valid packageManager field format. */
const PACKAGE_MANAGER_RE: RegExp = /^pnpm@(\d+)\.(\d+)\.(\d+)$/;

/** Regex matching Node 24+ in engines.node. */
const NODE_ENGINE_RE: RegExp = /^[\^~>=]*2[4-9]/;

/** Validates root package.json tooling configuration. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-root-package-config',
  description: 'Validates root package.json tooling configuration.',
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
          'workspace/validate-root-package-config',
          ctx.rootDir,
          1,
          1,
          'error',
          'Missing root package.json',
        ),
      );
      return results;
    }

    const content: string = await ctx.readFile(rootPkgPath);
    const pkgJson: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;

    /* Check required devDependencies */
    const devDeps: Record<string, unknown> =
      typeof pkgJson.devDependencies === 'object' && pkgJson.devDependencies !== null
        ? (pkgJson.devDependencies as Record<string, unknown>)
        : {};

    for (const dep of REQUIRED_DEV_DEPS) {
      if (!(dep in devDeps)) {
        results.push(
          createResult(
            'workspace/validate-root-package-config',
            rootPkgPath,
            1,
            1,
            'error',
            `Missing required devDependency: ${dep}`,
          ),
        );
      }
    }

    /* Check lint-staged config */
    const lintStaged: unknown = pkgJson['lint-staged'];

    if (!lintStaged || typeof lintStaged !== 'object') {
      results.push(
        createResult(
          'workspace/validate-root-package-config',
          rootPkgPath,
          1,
          1,
          'error',
          'Missing lint-staged configuration in root package.json',
        ),
      );
    } else {
      const lintStagedStr: string = JSON.stringify(lintStaged);

      if (!lintStagedStr.includes('biome')) {
        results.push(
          createResult(
            'workspace/validate-root-package-config',
            rootPkgPath,
            1,
            1,
            'error',
            'lint-staged configuration must reference biome',
          ),
        );
      }

      if (!lintStagedStr.includes('oxlint')) {
        results.push(
          createResult(
            'workspace/validate-root-package-config',
            rootPkgPath,
            1,
            1,
            'error',
            'lint-staged configuration must reference oxlint',
          ),
        );
      }
    }

    /* Check packageManager field */
    const packageManager: unknown = pkgJson.packageManager;

    if (typeof packageManager !== 'string') {
      results.push(
        createResult(
          'workspace/validate-root-package-config',
          rootPkgPath,
          1,
          1,
          'error',
          'Missing packageManager field in root package.json',
        ),
      );
    } else {
      const pmMatch: RegExpMatchArray | null = packageManager.match(PACKAGE_MANAGER_RE);
      if (!pmMatch) {
        results.push(
          createResult(
            'workspace/validate-root-package-config',
            rootPkgPath,
            1,
            1,
            'error',
            `packageManager must match format 'pnpm@x.y.z', found: '${packageManager}'`,
          ),
        );
      } else {
        const major: number = Number(pmMatch[1]);
        const minor: number = Number(pmMatch[2]);

        if (major < 10 || (major === 10 && minor < 12)) {
          results.push(
            createResult(
              'workspace/validate-root-package-config',
              rootPkgPath,
              1,
              1,
              'error',
              `packageManager pnpm version must be >= 10.12.0, found: '${packageManager}'`,
            ),
          );
        }
      }
    }

    /* Check engines.node */
    const engines: unknown = pkgJson.engines;

    if (typeof engines !== 'object' || engines === null) {
      results.push(
        createResult(
          'workspace/validate-root-package-config',
          rootPkgPath,
          1,
          1,
          'error',
          'Missing engines field in root package.json',
        ),
      );
    } else {
      const enginesObj: Record<string, unknown> = engines as Record<string, unknown>;
      const nodeEngine: unknown = enginesObj.node;

      if (typeof nodeEngine !== 'string') {
        results.push(
          createResult(
            'workspace/validate-root-package-config',
            rootPkgPath,
            1,
            1,
            'error',
            'Missing engines.node field in root package.json',
          ),
        );
      } else if (!NODE_ENGINE_RE.test(nodeEngine)) {
        results.push(
          createResult(
            'workspace/validate-root-package-config',
            rootPkgPath,
            1,
            1,
            'error',
            `engines.node must reference Node 24+, found: '${nodeEngine}'`,
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
