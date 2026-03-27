/**
 * resist-lint — Public API
 *
 * Barrel file for programmatic consumers. Re-exports the lint API,
 * core types, formatters, config, and locale utilities.
 *
 * @module
 */

export { lint, lintSource } from '@/lint/api.ts';
export type {
  LintApiResult,
  LintOptions,
  LintResultSummary,
  LintSource,
} from '@/lint/api.ts';

export type { LintFix, LintResult } from '@/lint/framework/types.ts';

export type { LintConfig } from '@/lint/config/schema.ts';
export { loadConfig, resolveRuleSeverity } from '@/lint/config/schema.ts';

export { formatResults } from '@/lint/framework/formatters.ts';
export type { OutputFormat } from '@/lint/framework/formatters.ts';

export { getAvailableLocales, resolveLocale } from '@/lint/locale/registry.ts';
export type { LintStrings } from '@/lint/locale/schema.ts';
