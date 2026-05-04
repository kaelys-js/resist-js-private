/**
 * Rule: workspace/no-hardcoded-ips
 *
 * Source files must not contain hardcoded IP addresses.
 * Localhost (127.0.0.1) and bind-all (0.0.0.0) are allowed.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Source file extensions to scan. */
const SOURCE_EXTENSIONS: readonly string[] = ['.ts', '.js', '.json', '.yaml', '.yml'];

/** IP addresses that are allowed (localhost and bind-all). */
const ALLOWED_IPS: ReadonlySet<string> = new Set(['127.0.0.1', '0.0.0.0']);

/** Regex to match IPv4 addresses. */
const IP_REGEX: RegExp = /\b(\d{1,3}\.){3}\d{1,3}\b/g;

/** Flags files containing hardcoded IP addresses. */
const rule: WorkspaceRule = {
  id: 'workspace/no-hardcoded-ips',
  description: 'Source files must not contain hardcoded IP addresses.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
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
      let hasSourceExt: boolean = false;

      for (const ext of SOURCE_EXTENSIONS) {
        if (filePath.endsWith(ext)) {
          hasSourceExt = true;
          break;
        }
      }

      if (!hasSourceExt) {
        continue;
      }

      let content: string;

      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      /** Reset regex state before each file. */
      IP_REGEX.lastIndex = 0;
      let match: RegExpExecArray | null = IP_REGEX.exec(content);
      let found: boolean = false;

      while (match !== null) {
        const ip: string = match[0] ?? '';

        if (!ALLOWED_IPS.has(ip)) {
          found = true;
          break;
        }
        match = IP_REGEX.exec(content);
      }

      if (found) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-hardcoded-ips',
            filePath,
            1,
            1,
            'warning',
            `Hardcoded IP address found: ${relativePath}`,
            {
              tip: 'Replace hardcoded IPs with environment variables or DNS hostnames',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
