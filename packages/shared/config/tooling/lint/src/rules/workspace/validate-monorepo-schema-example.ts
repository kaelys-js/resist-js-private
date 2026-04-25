/**
 * Rule: workspace/validate-monorepo-schema-example
 *
 * Monorepo layout example must match the canonical schema.
 * If the canonical schema file exists, the example file must also exist
 * and must not be empty.
 *
 * @module
 */

import { join, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Validates monorepo layout example file presence and non-emptiness. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-monorepo-schema-example',
  description: 'Monorepo layout example must match the canonical schema.',
  scope: 'workspace',
  categories: ['workspace', 'config'],
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

    const canonicalPath: string = join(ctx.rootDir, 'monorepo-layout.schema.yaml');
    const examplePath: string = join(
      ctx.rootDir,
      'packages/shared/schemas/monorepo-layout.example.yaml',
    );

    const canonicalExists: boolean = await ctx.fileExists(canonicalPath);

    /* If canonical doesn't exist, skip entirely */
    if (!canonicalExists) {
      return results;
    }

    const exampleExists: boolean = await ctx.fileExists(examplePath);

    if (!exampleExists) {
      const relCanonical: string = relative(ctx.rootDir, canonicalPath);
      results.push(
        createResult(
          'workspace/validate-monorepo-schema-example',
          canonicalPath,
          1,
          1,
          'error',
          `Missing monorepo layout example file — canonical schema exists at ${relCanonical} but no example found`,
          {
            tip: 'Create packages/shared/schemas/monorepo-layout.example.yaml based on the canonical schema',
          },
        ),
      );
      return results;
    }

    /* Both exist — check example is non-empty */
    let exampleContent: string;
    try {
      exampleContent = await ctx.readFile(examplePath);
    } catch {
      return results;
    }

    if (exampleContent.trim().length === 0) {
      results.push(
        createResult(
          'workspace/validate-monorepo-schema-example',
          examplePath,
          1,
          1,
          'error',
          `Example schema file is empty: ${relative(ctx.rootDir, examplePath)}`,
          {
            tip: 'Populate the example file with a valid monorepo layout configuration',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
