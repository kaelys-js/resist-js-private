/**
 * External Tool: dependency-cruiser
 *
 * Validates module dependencies against rules using dependency-cruiser (depcruise).
 * Outputs JSON format, which is transformed into LintResult[].
 * This is a workspace-level tool (not per-file).
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { en } from '@/lint/locale/locales/en.ts';
import { format } from '@/lint/locale/schema.ts';

/**
 * A single violation entry from dependency-cruiser JSON output.
 *
 * @example
 * ```typescript
 * const violation: DepcruiseViolation = {
 *   from: 'src/ui/button.ts',
 *   to: 'src/core/internal.ts',
 *   rule: { severity: 'error', name: 'no-circular' },
 * };
 * ```
 */
type DepcruiseViolation = {
  /** Source module that imports the dependency. */
  from: string;
  /** Target module being imported. */
  to: string;
  /** Rule that was violated. */
  rule: {
    /** Rule severity ('error', 'warn', 'info'). */
    severity: string;
    /** Rule name identifier. */
    name: string;
  };
};

/**
 * Map dependency-cruiser severity to LintResult severity.
 *
 * @param {string} severity - dependency-cruiser severity ('error', 'warn', 'info')
 * @returns {'error' | 'warning' | 'info'} Mapped severity level
 */
function mapSeverity(severity: string): 'error' | 'warning' | 'info' {
  if (severity === 'error') {
    return 'error';
  }
  if (severity === 'warn') {
    return 'warning';
  }
  return 'info';
}

/**
 * Transform dependency-cruiser JSON output into LintResult[].
 *
 * dependency-cruiser JSON output structure:
 * `{ output: { violations: [{ from, to, rule: { severity, name } }] } }`
 *
 * @param {string} output - Raw JSON output from depcruise
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const json = '{"output":{"violations":[{"from":"a.ts","to":"b.ts","rule":{"severity":"error","name":"no-circular"}}]}}';
 * const results = transformDependencyCruiserOutput(json);
 * // results[0].ruleId === 'dependency-cruiser/no-circular'
 * ```
 */
export function transformDependencyCruiserOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return [];
  }

  const results: LintResult[] = [];
  const outputObj: Record<string, unknown> = (parsed.output as Record<string, unknown>) ?? {};
  const violations: unknown[] = (outputObj.violations as unknown[]) ?? [];

  for (const violation of violations) {
    const entry: DepcruiseViolation = violation as DepcruiseViolation;
    const from: string = entry.from ?? '';
    const to: string = entry.to ?? '';
    const rule: DepcruiseViolation['rule'] | undefined = entry.rule;
    const ruleName: string = rule?.name ?? 'unknown';
    const severity: string = rule?.severity ?? 'error';

    results.push(
      createResult(
        `dependency-cruiser/${ruleName}`,
        from,
        1,
        1,
        mapSeverity(severity),
        format(en.tools.dependencyCruiserMessage, { from, to, rule: ruleName }),
        {
          tip: en.tools.dependencyCruiserTip,
        },
      ),
    );
  }

  return results;
}

/** dependency-cruiser external tool definition. */
export const dependencyCruiserTool: ExternalTool = {
  args: ['--output-type', 'json'],
  command: 'depcruise',
  filePatterns: [],
  isAvailable(): boolean {
    return isCommandAvailable('depcruise');
  },
  name: 'dependency-cruiser',
  outputFormat: 'json',
  transform: transformDependencyCruiserOutput,
};
