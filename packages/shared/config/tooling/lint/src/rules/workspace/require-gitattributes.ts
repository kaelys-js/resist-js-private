/**
 * Rule: workspace/require-gitattributes
 *
 * .gitattributes must exist with required file type rules.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Critical patterns that must be present in .gitattributes. */
const REQUIRED_PATTERNS: readonly string[] = [
  '* text=auto',
  '*.ts text eol=lf',
  '*.js text eol=lf',
  'pnpm-lock.yaml -text',
  '*.png binary',
];

/** Ensures .gitattributes exists at root with required attribute rules. */
const rule: WorkspaceRule = {
  id: 'workspace/require-gitattributes',
  description: '.gitattributes must exist with required file type rules.',
  scope: 'workspace',
  categories: ['workspace', 'tooling'],
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

    let gitattributesPath: string | undefined;

    for (const filePath of await ctx.allFiles()) {
      const relativePath: string = relative(ctx.rootDir, filePath);
      if (relativePath === '.gitattributes') {
        gitattributesPath = filePath;
        break;
      }
    }

    if (gitattributesPath === undefined) {
      results.push(
        createResult(
          'workspace/require-gitattributes',
          ctx.rootDir,
          1,
          1,
          'error',
          'Missing .gitattributes at project root',
          {
            tip: 'Create a .gitattributes file to ensure consistent line endings and binary file handling.',
          },
        ),
      );
      return results;
    }

    const content: string = await ctx.readFile(gitattributesPath);

    if (content.trim().length === 0) {
      results.push(
        createResult(
          'workspace/require-gitattributes',
          gitattributesPath,
          1,
          1,
          'error',
          '.gitattributes is empty',
          {
            tip: 'Add file type rules to .gitattributes for consistent handling across platforms.',
          },
        ),
      );
      return results;
    }

    for (const pattern of REQUIRED_PATTERNS) {
      if (!content.includes(pattern)) {
        results.push(
          createResult(
            'workspace/require-gitattributes',
            gitattributesPath,
            1,
            1,
            'error',
            `Missing required attribute: ${pattern}`,
            {
              tip: `Add "${pattern}" to .gitattributes.`,
            },
          ),
        );
      }
    }

    const lines: string[] = content.split('\n');
    const globs: string[] = [];

    for (const line of lines) {
      const trimmed: string = line.trim();
      if (trimmed.length === 0 || trimmed.startsWith('#')) {
        continue;
      }
      const firstWord: string | undefined = trimmed.split(/\s+/)[0];
      if (firstWord !== undefined) {
        globs.push(firstWord);
      }
    }

    const seen: Set<string> = new Set<string>();
    const duplicates: Set<string> = new Set<string>();

    for (const glob of globs) {
      if (seen.has(glob)) {
        duplicates.add(glob);
      } else {
        seen.add(glob);
      }
    }

    if (duplicates.size > 0) {
      const dupes: string = [...duplicates].join(', ');
      results.push(
        createResult(
          'workspace/require-gitattributes',
          gitattributesPath,
          1,
          1,
          'error',
          `Duplicate rules in .gitattributes: ${dupes}`,
          {
            tip: 'Remove duplicate glob patterns — each file pattern should have exactly one rule.',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
