/**
 * Rule: workspace/require-license
 *
 * Ensures a canonical LICENSE file exists at docs/en-US/LICENSE and that
 * every workspace package's "license" field matches the canonical SPDX.
 *
 * @module
 */

import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext, WorkspacePackage } from '@/lint/framework/rule-context.ts';

/** SPDX identifiers we recognise in the canonical LICENSE file. */
const SPDX_RE: RegExp = /^(MIT|Apache-2\.0|GPL-3\.0|BSD-3-Clause)/m;

/** Validates canonical license and per-package license consistency. */
const rule: WorkspaceRule = {
  id: 'workspace/require-license',
  description: 'Ensures a canonical LICENSE exists and every package license field matches it.',
  scope: 'workspace',
  categories: ['package', 'licensing'],
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
    const licensePath: string = join(ctx.rootDir, 'docs/en-US/LICENSE');

    let licenseContent: string;
    try {
      licenseContent = await ctx.readFile(licensePath);
    } catch {
      results.push(
        createResult(
          'workspace/require-license',
          licensePath,
          1,
          1,
          'error',
          'Missing canonical LICENSE file at docs/en-US/LICENSE',
        ),
      );
      return results;
    }

    const spdxMatch: RegExpMatchArray | null = licenseContent.match(SPDX_RE);
    if (!spdxMatch) {
      results.push(
        createResult(
          'workspace/require-license',
          licensePath,
          1,
          1,
          'error',
          'Could not determine canonical license from docs/en-US/LICENSE',
        ),
      );
      return results;
    }

    const canonical: string = spdxMatch[1] as string;

    const packages: WorkspacePackage[] = await ctx.getWorkspacePackages();

    for (const pkg of packages) {
      let pkgContent: string;
      try {
        pkgContent = await ctx.readFile(pkg.path);
      } catch {
        continue;
      }

      const pkgJson: Record<string, unknown> = JSON.parse(pkgContent) as Record<string, unknown>;
      const license: unknown = pkgJson.license;

      if (license === undefined || license === null) {
        results.push(
          createResult(
            'workspace/require-license',
            pkg.path,
            1,
            1,
            'error',
            `Missing "license" field in ${pkg.path}`,
          ),
        );
        continue;
      }

      if (typeof license === 'string' && license !== canonical) {
        results.push(
          createResult(
            'workspace/require-license',
            pkg.path,
            1,
            1,
            'error',
            `License mismatch in ${pkg.path}: found "${license}", expected "${canonical}"`,
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
