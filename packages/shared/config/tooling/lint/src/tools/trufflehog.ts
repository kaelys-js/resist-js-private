/**
 * External Tool: TruffleHog
 *
 * Detects leaked credentials and secrets in source code using TruffleHog.
 * Outputs JSONL format (one JSON object per line), which is transformed into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * A single TruffleHog JSONL output entry.
 *
 * @example
 * ```typescript
 * const entry: TrufflehogEntry = {
 *   SourceMetadata: {
 *     Data: {
 *       Filesystem: {
 *         file: 'src/config.ts',
 *         line: 12,
 *       },
 *     },
 *   },
 *   DetectorName: 'AWS',
 *   Verified: true,
 * };
 * ```
 */
type TrufflehogEntry = {
  /** Source metadata containing file location information. */
  SourceMetadata: {
    /** Data container for source-specific metadata. */
    Data: {
      /** Filesystem source metadata. */
      Filesystem: {
        /** File path where the secret was found. */
        file: string;
        /** Line number where the secret was found. */
        line: number;
      };
    };
  };
  /** Name of the detector that found the secret (e.g. 'AWS', 'GitHub'). */
  DetectorName: string;
  /** Whether the secret was verified to be active/valid. */
  Verified: boolean;
};

/**
 * Transform TruffleHog JSONL output into LintResult[].
 *
 * TruffleHog outputs one JSON object per line (JSONL) with:
 * `{ SourceMetadata: { Data: { Filesystem: { file, line } } }, DetectorName, Verified }`
 *
 * Verified secrets are classified as 'error' severity (confirmed active credentials).
 * Unverified secrets are classified as 'warning' severity (potential false positives).
 *
 * @param {string} output - Raw JSONL output from TruffleHog
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformTrufflehogOutput('{"SourceMetadata":{"Data":{"Filesystem":{"file":"config.ts","line":12}}},"DetectorName":"AWS","Verified":true}');
 * // results[0].ruleId === 'trufflehog/AWS'
 * // results[0].severity === 'error'
 * ```
 */
export function transformTrufflehogOutput(output: string): LintResult[] {
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

    let entry: Record<string, unknown>;
    try {
      entry = JSON.parse(stripped) as Record<string, unknown>;
    } catch {
      continue;
    }

    const typed: TrufflehogEntry = entry as unknown as TrufflehogEntry;

    const file: string = typed.SourceMetadata?.Data?.Filesystem?.file ?? '';
    const lineNum: number = typed.SourceMetadata?.Data?.Filesystem?.line ?? 1;
    const detectorName: string = typed.DetectorName ?? 'unknown';
    const verified: boolean = typed.Verified ?? false;

    const severity: 'error' | 'warning' = verified ? 'error' : 'warning';
    const verifiedText: string = verified ? 'verified' : 'unverified';
    const message: string = `${detectorName} credential detected (${verifiedText})`;

    results.push(
      createResult(`trufflehog/${detectorName}`, file, lineNum, 1, severity, message, {
        tip: verified
          ? 'This credential is verified active — rotate it immediately'
          : 'This credential could not be verified — review and remove if real',
      }),
    );
  }

  return results;
}

/** TruffleHog external tool definition. */
export const trufflehogTool: ExternalTool = {
  args: ['filesystem', '--json', '--no-update'],
  command: 'trufflehog',
  filePatterns: ['**/*'],
  isAvailable(): boolean {
    return isCommandAvailable('trufflehog');
  },
  name: 'trufflehog',
  outputFormat: 'json',
  transform: transformTrufflehogOutput,
};
