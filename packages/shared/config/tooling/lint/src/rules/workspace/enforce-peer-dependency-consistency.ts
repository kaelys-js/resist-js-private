/**
 * Rule: workspace/enforce-peer-dependency-consistency
 *
 * Ensures peerDependencies are consistent across workspace packages
 * and not duplicated in regular dependencies.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext, WorkspacePackage } from '@/lint/framework/rule-context.ts';

/** Tracks a peerDependency version declared by a specific package. */
type PeerEntry = {
  /** Name of the workspace package declaring this peer. */
  packageName: string;
  /** Version range string declared for the peer. */
  version: string;
};

/** Enforces consistent peerDependency versions across workspace packages. */
const rule: WorkspaceRule = {
  id: 'workspace/enforce-peer-dependency-consistency',
  description: 'Ensures peerDependencies are consistent across workspace packages.',
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

    const packages: WorkspacePackage[] = await ctx.getWorkspacePackages();

    /* Build a map: dependency name → array of { packageName, version } */
    const peerMap: Map<string, PeerEntry[]> = new Map();

    for (const pkg of packages) {
      const pkgName: string = pkg.name ?? pkg.dir;
      const peerDeps: unknown = pkg.packageJson.peerDependencies;

      if (typeof peerDeps !== 'object' || peerDeps === null) {
        continue;
      }

      const peers: Record<string, unknown> = peerDeps as Record<string, unknown>;

      for (const [depName, depVersion] of Object.entries(peers)) {
        if (typeof depVersion !== 'string') {
          continue;
        }

        const entries: PeerEntry[] | undefined = peerMap.get(depName);
        const entry: PeerEntry = { packageName: pkgName, version: depVersion };

        if (entries) {
          entries.push(entry);
        } else {
          peerMap.set(depName, [entry]);
        }
      }
    }

    /* Check 1: inconsistent versions across packages */
    for (const [depName, entries] of peerMap) {
      const uniqueVersions: Set<string> = new Set(entries.map((e: PeerEntry): string => e.version));

      if (uniqueVersions.size > 1) {
        for (const entry of entries) {
          let matchingPkg: WorkspacePackage | undefined;

          for (const p of packages) {
            if ((p.name ?? p.dir) === entry.packageName) {
              matchingPkg = p;
              break;
            }
          }
          
const filePath: string = matchingPkg?.path ?? entry.packageName;
          results.push(
            createResult(
              'workspace/enforce-peer-dependency-consistency',
              filePath,
              1,
              1,
              'error',
              `Inconsistent peerDependency versions for '${depName}': '${entry.version}' in ${entry.packageName}`,
              {
                tip: 'Align all peerDependency versions across packages',
              },
            ),
          );
        }
      }
    }

    /* Check 2: dependency in both dependencies and peerDependencies */
    for (const pkg of packages) {
      const pkgName: string = pkg.name ?? pkg.dir;
      const peerDeps: unknown = pkg.packageJson.peerDependencies;
      const regularDeps: unknown = pkg.packageJson.dependencies;

      if (typeof peerDeps !== 'object' || peerDeps === null) {
        continue;
      }
      if (typeof regularDeps !== 'object' || regularDeps === null) {
        continue;
      }

      const peers: Record<string, unknown> = peerDeps as Record<string, unknown>;
      const deps: Record<string, unknown> = regularDeps as Record<string, unknown>;

      for (const depName of Object.keys(peers)) {
        if (depName in deps) {
          results.push(
            createResult(
              'workspace/enforce-peer-dependency-consistency',
              pkg.path,
              1,
              1,
              'error',
              `'${depName}' declared in both dependencies and peerDependencies in ${pkgName}`,
              {
                tip: 'Align all peerDependency versions across packages',
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
