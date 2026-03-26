/**
 * External Tool: graphql-schema-linter
 *
 * Lints GraphQL schema files (.graphql, .gql) using graphql-schema-linter.
 * Parses text output in unix-like format into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for graphql-schema-linter output lines.
 *
 * Matches unix-like format lines:
 * `schema.graphql:5:3 The field "Query.user" is missing a description.`
 * `types.gql:12:1 The type "Mutation" is missing a description.`
 */
const GRAPHQL_LINE: RegExp = /^(.+):(\d+):(\d+)\s+(.+)$/;

/**
 * Transform graphql-schema-linter text output into LintResult[].
 *
 * graphql-schema-linter outputs diagnostics in a unix-like format:
 * `file:line:col message`
 *
 * Lines that don't match the expected pattern (headers, summaries,
 * blank lines) are silently skipped.
 *
 * @param {string} output - Raw text output from graphql-schema-linter
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformGraphqlOutput('schema.graphql:5:3 The field "Query.user" is missing a description.');
 * // results[0].ruleId === 'graphql/lint'
 * // results[0].line === 5
 * ```
 */
export function transformGraphqlOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  for (const line of lines) {
    const stripped: string = line.trim();
    if (stripped.length === 0) {
      continue;
    }

    const match: RegExpMatchArray | null = GRAPHQL_LINE.exec(stripped);
    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const column: number = Number.parseInt(match[3] ?? '1', 10);
    const message: string = match[4] ?? '';

    results.push(createResult('graphql/lint', file, lineNum, column, 'warning', message));
  }

  return results;
}

/** graphql-schema-linter external tool definition. */
export const graphqlTool: ExternalTool = {
  args: [],
  command: 'graphql-schema-linter',
  filePatterns: ['**/*.graphql', '**/*.gql'],
  isAvailable(): boolean {
    return isCommandAvailable('graphql-schema-linter');
  },
  name: 'graphql-schema-linter',
  outputFormat: 'text',
  transform: transformGraphqlOutput,
};
