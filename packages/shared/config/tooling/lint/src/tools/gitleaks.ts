/**
 * External Tool: Gitleaks
 *
 * Detects hardcoded secrets and credentials in source code using Gitleaks.
 * Outputs JSON format, which is transformed into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { format, type LintStrings } from '@/lint/locale/schema.ts';

/**
 * A single Gitleaks JSON output entry.
 *
 * @example
 * ```typescript
 * const entry: GitleaksEntry = {
 *   Description: 'AWS Access Key',
 *   File: 'src/config.ts',
 *   StartLine: 5,
 *   EndLine: 5,
 *   StartColumn: 10,
 *   EndColumn: 30,
 *   Match: 'AKIA...',
 *   Secret: 'AKIA...',
 *   RuleID: 'aws-access-key-id',
 * };
 * ```
 */
type GitleaksEntry = {
  /** Human-readable description of the detected secret type. */
  Description: string;
  /** File path where the secret was found. */
  File: string;
  /** Start line number (1-based). */
  StartLine: number;
  /** End line number (1-based). */
  EndLine: number;
  /** Start column number (1-based). */
  StartColumn: number;
  /** End column number (1-based). */
  EndColumn: number;
  /** The matched text fragment. */
  Match: string;
  /** The detected secret value. */
  Secret: string;
  /** Gitleaks rule identifier that triggered the detection. */
  RuleID: string;
};

/**
 * Transform Gitleaks JSON output into LintResult[].
 *
 * Gitleaks JSON output (with `--report-format json`) is an array of objects:
 * `{ Description, File, StartLine, EndLine, StartColumn, EndColumn, Match, Secret, RuleID }`
 *
 * All findings are classified as 'error' severity since leaked secrets are critical security issues.
 *
 * @param {string} output - Raw JSON output from Gitleaks
 * @param {LintStrings} strings - Locale strings
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformGitleaksOutput('[{"Description":"AWS Access Key","File":"config.ts","StartLine":5,"EndLine":5,"StartColumn":10,"EndColumn":30,"Match":"AKIA...","Secret":"AKIA...","RuleID":"aws-access-key-id"}]');
 * // results[0].ruleId === 'gitleaks/aws-access-key-id'
 * // results[0].severity === 'error'
 * ```
 */
export function transformGitleaksOutput(output: string, strings: LintStrings): LintResult[] {
  const trimmed: string = output.trim();

  if (trimmed.length === 0) {
    return [];
  }

  let items: unknown[];

  try {
    items = JSON.parse(trimmed) as unknown[];
  } catch {
    return [];
  }

  if (!Array.isArray(items)) {
    return [];
  }

  const results: LintResult[] = [];

  for (const item of items) {
    const obj: Record<string, unknown> = item as Record<string, unknown>;
    const typed: GitleaksEntry = obj as unknown as GitleaksEntry;
    const file: string = typed.File ?? '';
    const startLine: number = typed.StartLine ?? 1;
    const startColumn: number = typed.StartColumn ?? 1;
    const endLine: number | undefined = typed.EndLine;
    const endColumn: number | undefined = typed.EndColumn;
    const description: string = typed.Description ?? 'Secret detected';
    const ruleID: string = typed.RuleID ?? 'unknown';
    const secret: string = typed.Secret ?? '';

    const maskedSecret: string =
      secret.length > 4 ? `${secret.slice(0, 2)}***${secret.slice(-2)}` : '***';

    const message: string = format(strings.tools.gitleaksMessage, {
      description,
      secret: maskedSecret,
    });

    results.push(
      createResult(`gitleaks/${ruleID}`, file, startLine, startColumn, 'error', message, {
        endColumn: endColumn ?? undefined,
        endLine: endLine ?? undefined,
        tip: strings.tools.gitleaksTip,
      }),
    );
  }

  return results;
}

/** Gitleaks external tool definition. */
export const gitleaksTool: ExternalTool = {
  args: ['detect', '--report-format', 'json', '--no-git'],
  command: 'gitleaks',
  filePatterns: ['**/*'],
  isAvailable(): boolean {
    return isCommandAvailable('gitleaks');
  },
  name: 'gitleaks',
  outputFormat: 'json',
  transform: transformGitleaksOutput,
};
