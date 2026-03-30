/**
 * Rule: workspace/validate-json-schema-fields
 *
 * Checks that JSON files with a "$schema" field reference well-formed URLs.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Basic URL validation. */
const URL_RE: RegExp = /^https?:\/\/.+/;

/** Validates $schema fields in JSON files. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-json-schema-fields',
  description: 'JSON $schema fields must reference valid URLs.',
  scope: 'workspace',
  categories: ['workspace', 'json'],
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
      const name: string = basename(filePath);
      if (!name.endsWith('.json') && !name.endsWith('.jsonc')) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(content) as Record<string, unknown>;
      } catch {
        continue;
      }

      const schema: unknown = parsed.$schema;
      if (typeof schema !== 'string') {
        continue;
      }

      if (schema.length === 0) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/validate-json-schema-fields',
            filePath,
            1,
            1,
            'error',
            `Empty $schema field in ${relativePath}`,
            {
              tip: 'Provide a valid schema URL or remove the $schema field',
            },
          ),
        );
        continue;
      }

      if (!URL_RE.test(schema)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/validate-json-schema-fields',
            filePath,
            1,
            1,
            'error',
            `Invalid $schema URL '${schema}' in ${relativePath} — must start with http:// or https://`,
            {
              tip: 'Use a full HTTP/HTTPS URL for the schema reference',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
