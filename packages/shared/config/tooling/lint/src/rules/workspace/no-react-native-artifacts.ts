/**
 * Rule: workspace/no-react-native-artifacts
 *
 * Workspace must not contain React Native project artifacts.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Set of React Native config filenames that are forbidden. */
const METRO_CONFIG_NAMES: ReadonlySet<string> = new Set<string>([
  'metro.config.js',
  'metro.config.ts',
]);

/** Flags React Native artifacts in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-react-native-artifacts',
  description: 'Workspace must not contain React Native project artifacts.',
  scope: 'workspace',
  categories: ['workspace', 'mobile'],
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
      const name: string = basename(filePath);
      const relativePath: string = relative(ctx.rootDir, filePath);
      const hasMetroConfig: boolean = METRO_CONFIG_NAMES.has(name);
      const hasPlatformDir: boolean =
        relativePath.includes('/android/') ||
        relativePath.startsWith('android/') ||
        relativePath.includes('/ios/') ||
        relativePath.startsWith('ios/');

      if (hasMetroConfig || hasPlatformDir) {
        results.push(
          createResult(
            'workspace/no-react-native-artifacts',
            filePath,
            1,
            1,
            'error',
            `React Native artifact not allowed: ${relativePath}`,
            {
              tip: 'Remove React Native files — this workspace does not target mobile platforms',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
