/**
 * Rule: workspace/enforce-workspace-version-alignment
 *
 * Ensures workspace dependency version specifiers align with the actual
 * declared version of the referenced workspace package (major version match).
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Dependency fields to check. */
const DEP_FIELDS: readonly string[] = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
] as const;

/**
 * Strip leading version range specifiers (^, ~, >=, >, <=, <, =) from a
 * version string so only the raw semver remains.
 *
 * @param {string} spec - The version specifier (e.g. "^2.3.0")
 * @returns {string} The stripped version (e.g. "2.3.0")
 */
function stripRange(spec: string): string {
  return spec.replace(/^[^\d]*/, '');
}

/** Workspace dependency versions must match the declared major version. */
const rule: WorkspaceRule = {
  id: 'workspace/enforce-workspace-version-alignment',
  description:
    'Workspace dependency version specifiers must match the declared major version of the target package.',
  scope: 'workspace',
  categories: ['workspace', 'package'],
  stages: ['lint', 'check'],
  fixable: false,
  async inputs(context: unknown): Promise<readonly string[]> {
    const ctx = context as WorkspaceContext;
    try {
      const packages = await ctx.getWorkspacePackages();
      return packages.map((p) => p.path);
    } catch {
      return [];
    }
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

    /* Pass 1: Build a map of workspace package names → declared versions. */
    const workspacePackages: Awaited<ReturnType<typeof ctx.getWorkspacePackages>> =
      await ctx.getWorkspacePackages();
    const versionMap: Map<string, string> = new Map<string, string>();

    for (const pkg of workspacePackages) {
      const name: string | undefined = pkg.name;
      const version: unknown = pkg.packageJson.version;
      if (typeof name === 'string' && typeof version === 'string') {
        versionMap.set(name, version);
      }
    }

    /* Pass 2: Check each package's dependencies against the version map. */
    for (const pkg of workspacePackages) {
      const pkgName: string = pkg.name ?? relative(ctx.rootDir, pkg.path);

      for (const field of DEP_FIELDS) {
        const deps: unknown = pkg.packageJson[field];
        if (deps === undefined || deps === null || typeof deps !== 'object') {
          continue;
        }

        const depEntries: Record<string, unknown> = deps as Record<string, unknown>;

        for (const [depName, depVersion] of Object.entries(depEntries)) {
          if (typeof depVersion !== 'string') {
            continue;
          }

          const actualVersion: string | undefined = versionMap.get(depName);
          if (actualVersion === undefined) {
            continue;
          }

          /* Skip workspace:* protocol — those always resolve correctly. */
          if (depVersion.startsWith('workspace:')) {
            continue;
          }

          const actualMajor: string = String(actualVersion).replace(/^v/, '').split('.')[0] ?? '0';
          const depMajor: string = stripRange(depVersion).split('.')[0] ?? '0';

          if (actualMajor !== depMajor) {
            results.push(
              createResult(
                'workspace/enforce-workspace-version-alignment',
                pkg.path,
                1,
                1,
                'error',
                `Package ${pkgName} depends on ${depName}@${depVersion} but declared version is ${actualVersion}`,
                {
                  tip: 'Update the dependency to match the declared major version',
                },
              ),
            );
          }
        }
      }
    }

    return results;
  },
};

export default rule;
