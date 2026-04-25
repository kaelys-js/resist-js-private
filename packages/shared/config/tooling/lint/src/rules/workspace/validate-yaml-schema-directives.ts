/**
 * Rule: workspace/validate-yaml-schema-directives
 *
 * Checks that YAML files with `# yaml-language-server: $schema=` directives
 * reference well-formed URLs.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern to extract schema directive. */
const SCHEMA_DIRECTIVE_RE: RegExp = /^#\s*yaml-language-server:\s*\$schema=(.*)$/m;

/** Basic URL validation. */
const URL_RE: RegExp = /^https?:\/\/.+/;

/** Validates yaml-language-server schema directives. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-yaml-schema-directives',
  description: 'YAML schema directives must reference valid URLs.',
  scope: 'workspace',
  categories: ['workspace', 'yaml'],
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

    for (const filePath of await ctx.allFiles()) {
      if (!filePath.endsWith('.yml') && !filePath.endsWith('.yaml')) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      const match: RegExpExecArray | null = SCHEMA_DIRECTIVE_RE.exec(content);
      if (match === null) {
        continue;
      }

      const schemaUrl: string = (match[1] ?? '').trim();

      if (schemaUrl.length === 0) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/validate-yaml-schema-directives',
            filePath,
            1,
            1,
            'error',
            `Empty schema URL in yaml-language-server directive in ${relativePath}`,
            {
              tip: 'Provide a valid schema URL after $schema=',
            },
          ),
        );
        continue;
      }

      if (!URL_RE.test(schemaUrl)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/validate-yaml-schema-directives',
            filePath,
            1,
            1,
            'error',
            `Invalid schema URL '${schemaUrl}' in ${relativePath} — must start with http:// or https://`,
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
