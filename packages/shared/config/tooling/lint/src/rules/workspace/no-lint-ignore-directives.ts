/**
 * Rule: workspace/no-lint-ignore-directives
 *
 * Detect lint/format ignore directives in source files.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** File extensions to scan for ignore directives. */
const SCANNABLE_EXTENSIONS: ReadonlySet<string> = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.css',
  '.md',
  '.sh',
  '.yml',
  '.yaml',
  '.svelte',
]);

/** Ignore directive patterns to detect. */
const IGNORE_PATTERNS: readonly string[] = [
  'eslint-disable',
  'prettier-ignore',
  'biome-ignore',
  'oxlint-ignore',
  '@ts-ignore',
  '@ts-nocheck',
  '@ts-expect-error',
  'stylelint-disable',
  'markdownlint-disable',
  'cSpell:disable',
  'cSpell:ignore',
  'shellcheck disable',
  'yamllint disable',
  'hadolint ignore',
];

/** Detect lint/format ignore directives in source files. */
const rule: WorkspaceRule = {
  id: 'workspace/no-lint-ignore-directives',
  description: 'Source files must not contain lint/format ignore directives.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
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

    for await (const filePath of ctx.allFiles()) {
      const dotIndex: number = filePath.lastIndexOf('.');
      if (dotIndex === -1) {
        continue;
      }
      const ext: string = filePath.slice(dotIndex);
      if (!SCANNABLE_EXTENSIONS.has(ext)) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      const relativePath: string = relative(ctx.rootDir, filePath);

      for (const pattern of IGNORE_PATTERNS) {
        if (content.includes(pattern)) {
          results.push(
            createResult(
              'workspace/no-lint-ignore-directives',
              filePath,
              1,
              1,
              'warning',
              `Lint ignore directive '${pattern}' found in ${relativePath}`,
              {
                tip: 'Avoid disabling linters unless explicitly justified',
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
