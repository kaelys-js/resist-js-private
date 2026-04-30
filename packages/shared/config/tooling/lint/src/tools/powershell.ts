/**
 * External Tool: PowerShell (PSScriptAnalyzer)
 *
 * Lints PowerShell scripts (.ps1, .psm1, .psd1) using `pwsh` with Invoke-ScriptAnalyzer.
 * Outputs JSON format, which is transformed into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Transform PSScriptAnalyzer JSON output into LintResult[].
 *
 * PSScriptAnalyzer outputs a JSON array of diagnostic objects:
 * `[{ ScriptPath, Line, Column, Severity, RuleName, Message }]`
 *
 * Severity mapping:
 * - `'Error'` -> `'error'`
 * - `'Warning'` -> `'warning'`
 * - `'Information'` -> `'info'`
 *
 * @param {string} output - Raw JSON output from PSScriptAnalyzer
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformPowershellOutput(JSON.stringify([{
 *   ScriptPath: 'script.ps1',
 *   Line: 3,
 *   Column: 1,
 *   Severity: 'Warning',
 *   RuleName: 'PSAvoidUsingCmdletAliases',
 *   Message: 'Avoid using alias ls',
 * }]));
 * // results[0].ruleId === 'powershell/PSAvoidUsingCmdletAliases'
 * // results[0].severity === 'warning'
 * ```
 */
export function transformPowershellOutput(output: string): LintResult[] {
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

  /* PSScriptAnalyzer returns a single object (not array) for one result */
  if (!Array.isArray(items)) {
    items = [items];
  }

  const results: LintResult[] = [];

  for (const item of items) {
    const obj: Record<string, unknown> = item as Record<string, unknown>;
    const file: string = (obj.ScriptPath as string) ?? '';
    const line: number = (obj.Line as number) ?? 1;
    const column: number = (obj.Column as number) ?? 1;
    const rawSeverity: string = (obj.Severity as string) ?? 'Warning';
    const ruleName: string = (obj.RuleName as string) ?? 'unknown';
    const message: string = (obj.Message as string) ?? '';

    let severity: 'error' | 'warning' | 'info' = 'warning';

    if (rawSeverity === 'Error') {
      severity = 'error';
    } else if (rawSeverity === 'Information') {
      severity = 'info';
    }

    results.push(createResult(`powershell/${ruleName}`, file, line, column, severity, message));
  }

  return results;
}

/** PowerShell (PSScriptAnalyzer) external tool definition. */
export const powershellTool: ExternalTool = {
  args: ['-NoProfile', '-Command', 'Invoke-ScriptAnalyzer -Path'],
  command: 'pwsh',
  filePatterns: ['**/*.ps1', '**/*.psm1', '**/*.psd1'],
  isAvailable(): boolean {
    return isCommandAvailable('pwsh');
  },
  name: 'powershell',
  outputFormat: 'json',
  transform: transformPowershellOutput,
};
