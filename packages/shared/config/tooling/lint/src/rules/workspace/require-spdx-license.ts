/**
 * Rule: workspace/require-spdx-license
 *
 * All package.json files must declare a valid SPDX license identifier.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Set of common valid SPDX license identifiers. */
const VALID_SPDX_LICENSES: ReadonlySet<string> = new Set<string>([
  '0BSD',
  'AAL',
  'AFL-3.0',
  'AGPL-3.0-only',
  'AGPL-3.0-or-later',
  'Apache-2.0',
  'Artistic-2.0',
  'BlueOak-1.0.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'BSL-1.0',
  'CAL-1.0',
  'CAL-1.0-Combined-Work-Exception',
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
  'CC0-1.0',
  'CPAL-1.0',
  'ECL-2.0',
  'EFL-2.0',
  'EPL-2.0',
  'EUPL-1.2',
  'GPL-2.0-only',
  'GPL-2.0-or-later',
  'GPL-3.0-only',
  'GPL-3.0-or-later',
  'ISC',
  'LGPL-2.1-only',
  'LGPL-2.1-or-later',
  'LGPL-3.0-only',
  'LGPL-3.0-or-later',
  'LiLiQ-P-1.1',
  'LiLiQ-R-1.1',
  'LiLiQ-Rplus-1.1',
  'MIT',
  'MIT-0',
  'MPL-2.0',
  'MS-PL',
  'MS-RL',
  'MulanPSL-2.0',
  'NCSA',
  'OFL-1.1',
  'OSL-3.0',
  'PostgreSQL',
  'RPL-1.5',
  'RPSL-1.0',
  'SimPL-2.0',
  'UPL-1.0',
  'Unlicense',
  'VSL-1.0',
  'W3C',
  'WTFPL',
  'Xnet',
  'Zlib',
  'ZPL-2.0',
  'ZPL-2.1',
  'SEE LICENSE IN LICENSE',
  'UNLICENSED',
]);

/** Ensures all package.json files declare a valid SPDX license. */
const rule: WorkspaceRule = {
  id: 'workspace/require-spdx-license',
  description: 'All package.json files must declare a valid SPDX license identifier.',
  scope: 'workspace',
  categories: ['workspace', 'package'],
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
      const fileName: string = basename(filePath);
      if (fileName !== 'package.json') {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const relativePath: string = relative(ctx.rootDir, filePath);

      const license: unknown = parsed.license;
      if (typeof license !== 'string' || license.trim().length === 0) {
        results.push(
          createResult(
            'workspace/require-spdx-license',
            filePath,
            1,
            1,
            'error',
            `Missing "license" field in ${relativePath}`,
            {
              tip: 'Add a valid SPDX license identifier like "MIT" or "Apache-2.0"',
            },
          ),
        );
      } else if (!VALID_SPDX_LICENSES.has(license)) {
        results.push(
          createResult(
            'workspace/require-spdx-license',
            filePath,
            1,
            1,
            'error',
            `Invalid SPDX license "${license}" in ${relativePath}`,
            {
              tip: 'Use a valid SPDX identifier from https://spdx.org/licenses/',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
