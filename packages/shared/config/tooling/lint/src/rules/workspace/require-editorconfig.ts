/**
 * Rule: workspace/require-editorconfig
 *
 * Ensures .editorconfig exists at root and follows conventions.
 *
 * @module
 */

import { basename, dirname, join, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Validates .editorconfig existence and content conventions. */
const rule: WorkspaceRule = {
  id: 'workspace/require-editorconfig',
  description: '.editorconfig must exist and follow conventions.',
  scope: 'workspace',
  categories: ['workspace', 'tooling'],
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

    let found: boolean = false;
    let rootFilePath: string = join(ctx.rootDir, '.editorconfig');
    let rootContent: string = '';

    for (const filePath of await ctx.allFiles()) {
      if (basename(filePath) === '.editorconfig' && dirname(filePath) === ctx.rootDir) {
        found = true;
        rootFilePath = filePath;
        rootContent = await ctx.readFile(filePath);
      }
    }

    if (!found) {
      results.push(
        createResult(
          'workspace/require-editorconfig',
          rootFilePath,
          1,
          1,
          'error',
          'Missing .editorconfig at project root',
          {
            tip: 'Add a .editorconfig file to enforce consistent coding styles',
          },
        ),
      );
      return results;
    }

    if (rootContent.trim().length === 0) {
      results.push(
        createResult(
          'workspace/require-editorconfig',
          rootFilePath,
          1,
          1,
          'error',
          '.editorconfig is empty',
          {
            tip: 'Add editor configuration rules for indent style, charset, etc.',
          },
        ),
      );
      return results;
    }

    const hasRootTrue: boolean = /^root\s*=\s*true/m.test(rootContent);
    if (!hasRootTrue) {
      results.push(
        createResult(
          'workspace/require-editorconfig',
          rootFilePath,
          1,
          1,
          'warning',
          "Missing 'root = true' in .editorconfig",
          {
            tip: "Add 'root = true' at the top to prevent editors from searching parent directories",
          },
        ),
      );
    }

    const sectionRegex: RegExp = /^\[.*\]$/gm;
    const sections: Array<string> = [];
    let match: RegExpExecArray | null = sectionRegex.exec(rootContent);
    while (match !== null) {
      sections.push(match[0]);
      match = sectionRegex.exec(rootContent);
    }

    const seen: Set<string> = new Set<string>();
    const duplicates: Array<string> = [];
    for (const section of sections) {
      if (seen.has(section)) {
        duplicates.push(section);
      }
      seen.add(section);
    }

    if (duplicates.length > 0) {
      results.push(
        createResult(
          'workspace/require-editorconfig',
          rootFilePath,
          1,
          1,
          'error',
          `Duplicate section headers in .editorconfig: ${duplicates.join(', ')}`,
          {
            tip: 'Merge duplicate sections into a single block',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
