/**
 * Rule: workspace/no-sensitive-cert-files
 *
 * Workspace must not contain certificate or private key files.
 *
 * @module
 */

import { extname, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Set of sensitive certificate/key file extensions (lowercase). */
const SENSITIVE_EXTENSIONS: ReadonlySet<string> = new Set<string>([
  '.pem',
  '.key',
  '.crt',
  '.p12',
  '.cer',
  '.der',
]);

/** Flags certificate and private key files in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-sensitive-cert-files',
  description: 'Workspace must not contain certificate or private key files.',
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
      const ext: string = extname(filePath).toLowerCase();
      if (SENSITIVE_EXTENSIONS.has(ext)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-sensitive-cert-files',
            filePath,
            1,
            1,
            'error',
            `Sensitive credential file found: ${relativePath}`,
            {
              tip: 'Store certs outside version control or use a secrets manager.',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
