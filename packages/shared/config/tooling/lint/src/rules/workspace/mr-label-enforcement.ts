/**
 * Rule: workspace/mr-label-enforcement
 *
 * MR must include at least one approved domain/scope label.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Approved label categories. */
const APPROVED_LABELS: string[] = [
  'api',
  'auth',
  'billing',
  'db',
  'email',
  'forms',
  'metrics',
  'search',
  'storage',
  'telemetry',
  'frontend',
  'backend',
  'mobile',
  'serverless',
  'edge',
  'cli',
  'sdk',
  'integration',
  'ci',
  'cd',
  'devops',
  'infra',
  'secrets',
  'security',
  'accessibility',
  'performance',
  'observability',
  'docs',
  'tests',
  'refactor',
  'cleanup',
  'migration',
  'legal',
  'privacy',
  'gdpr',
  'staging',
  'production',
  'preview',
  'release',
  'hotfix',
  'rollback',
  'marketing',
  'data',
  'ml',
  'content',
  'analytics',
  'growth',
  'customer-support',
  'pricing',
  'checkout',
  'accounts',
  'onboarding',
  'subscriptions',
  'ux',
  'i18n',
  'dark-mode',
  'mobile-ui',
  'web-ui',
  'ai',
  'llm',
];

/** MR must include at least one approved domain/scope label. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-label-enforcement',
  description: 'MR must include at least one approved domain/scope label.',
  scope: 'workspace',
  categories: ['workspace', 'ci'],
  stages: ['lint', 'check'],
  fixable: false,
  /* Caching is opt-out: this rule depends on CI environment variables (process.env). */
  check(context: unknown): Promise<
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

    const labels: string | undefined = process.env['CI_MERGE_REQUEST_LABELS'];

    if (labels === undefined) {
      return Promise.resolve(results);
    }

    const hasApproved: boolean = APPROVED_LABELS.some((label: string): boolean =>
      new RegExp(`\\b${label}\\b`).test(labels),
    );

    if (!hasApproved) {
      results.push(
        createResult(
          'workspace/mr-label-enforcement',
          ctx.rootDir,
          1,
          1,
          'error',
          'Merge Request is missing required domain or scope label',
          {
            tip: 'Label your MR to indicate feature area, domain, or concern',
          },
        ),
      );
    }

    return Promise.resolve(results);
  },
};

export default rule;
