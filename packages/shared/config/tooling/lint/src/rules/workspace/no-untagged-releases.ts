/**
 * Rule: workspace/no-untagged-releases
 *
 * Release/version commits must have a git tag.
 * Detects when the HEAD commit matches a release or version pattern
 * but has no associated git tag.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags when release commits lack a git tag. */
const rule: WorkspaceRule = {
  id: 'workspace/no-untagged-releases',
  description: 'Release/version commits must have a git tag.',
  scope: 'workspace',
  categories: ['workspace', 'git'],
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

    let subject: string;
    try {
      subject = execSync('git log -1 --pretty=%s', {
        cwd: ctx.rootDir,
        encoding: 'utf8',
      }).trim();
    } catch {
      return results;
    }

    if (!/^(release|version)\(/.test(subject)) {
      return results;
    }

    let tags: string;
    try {
      tags = execSync('git tag --points-at HEAD', {
        cwd: ctx.rootDir,
        encoding: 'utf8',
      }).trim();
    } catch {
      return results;
    }

    if (tags === '') {
      results.push(
        createResult(
          'workspace/no-untagged-releases',
          ctx.rootDir,
          1,
          1,
          'warning',
          `Release commit has no git tag: ${subject}`,
          {
            tip: 'Tag with: git tag v1.0.0 && git push origin v1.0.0',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
