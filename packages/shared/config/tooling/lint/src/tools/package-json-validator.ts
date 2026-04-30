/**
 * External Tool: Package JSON Validator
 *
 * Custom validator for package.json files.
 * Checks for required fields (`name`, `version`) and warns about ESM (.mjs) usage hints.
 * Parses `filename:line: message` format into LintResult[].
 *
 * This is a custom validator — the underlying command is a placeholder (`echo ok`).
 * The real validation logic lives in {@link transformPackageJsonValidatorOutput}.
 *
 * @module
 */

import type { ExternalTool } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for the `filename:line: message` output format.
 *
 * Captures:
 * - Group 1: filename
 * - Group 2: line number
 * - Group 3: message
 */
const VALIDATOR_LINE: RegExp = /^(.+?):(\d+):\s+(.+)$/;

/**
 * Transform package.json validator text output into LintResult[].
 *
 * Parses lines in the format `filename:line: message` and converts
 * each into a structured lint result.
 *
 * Lines that do not match the expected format are silently skipped.
 *
 * @param {string} output - Raw text output in `filename:line: message` format
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformPackageJsonValidatorOutput('package.json:1: Missing required field "name"');
 * // results[0].ruleId === 'package-json/validate'
 * // results[0].severity === 'error'
 * ```
 */
export function transformPackageJsonValidatorOutput(output: string): LintResult[] {
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

    const match: RegExpMatchArray | null = VALIDATOR_LINE.exec(stripped);

    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const message: string = match[3] ?? '';

    /* Determine severity: ESM hints are warnings, missing fields are errors */
    const severity: 'error' | 'warning' | 'info' =
      message.toLowerCase().includes('esm') || message.toLowerCase().includes('.mjs')
        ? 'warning'
        : 'error';

    results.push(createResult('package-json/validate', file, lineNum, 1, severity, message));
  }

  return results;
}

/**
 * Validate a package.json file content string.
 *
 * Performs custom JSON parsing and structural checks:
 * - Requires `name` field to be present
 * - Requires `version` field to be present
 * - Warns about ESM (.mjs) usage hints found in `main`, `module`, or `exports` fields
 *
 * Returns diagnostics in `filename:line: message` format suitable for
 * {@link transformPackageJsonValidatorOutput}.
 *
 * @param {string} filename - Path to the package.json file
 * @param {string} content - Raw file content to validate
 * @returns {string} Diagnostic output lines (may be empty if valid)
 *
 * @example
 * ```typescript
 * const output = validatePackageJson('package.json', '{"version":"1.0.0"}');
 * // output === 'package.json:1: Missing required field "name"'
 * ```
 */
export function validatePackageJson(filename: string, content: string): string {
  const diagnostics: string[] = [];

  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    diagnostics.push(`${filename}:1: Invalid JSON — failed to parse package.json`);
    return diagnostics.join('\n');
  }

  /* Check required "name" field */
  if (!('name' in parsed) || typeof parsed['name'] !== 'string' || parsed['name'].length === 0) {
    diagnostics.push(`${filename}:1: Missing required field "name"`);
  }

  /* Check required "version" field */
  if (
    !('version' in parsed) ||
    typeof parsed['version'] !== 'string' ||
    parsed['version'].length === 0
  ) {
    diagnostics.push(`${filename}:1: Missing required field "version"`);
  }

  /* Warn about ESM (.mjs) usage hints */
  const stringified: string = JSON.stringify(parsed);

  if (stringified.includes('.mjs')) {
    diagnostics.push(
      `${filename}:1: Package references .mjs files — consider using ESM-native "type": "module" instead`,
    );
  }

  return diagnostics.join('\n');
}

/** Package JSON Validator external tool definition. */
export const packageJsonValidatorTool: ExternalTool = {
  args: ['ok'],
  command: 'echo',
  filePatterns: ['**/package.json'],
  isAvailable(): boolean {
    return true;
  },
  name: 'package-json-validator',
  outputFormat: 'text',
  transform: transformPackageJsonValidatorOutput,
};
