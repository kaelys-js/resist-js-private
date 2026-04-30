/**
 * External Tool: Kubeconform
 *
 * Validates Kubernetes manifests using Kubeconform.
 * Outputs JSONL format (one JSON object per line), transformed into LintResult[].
 * Each object contains `{filename, kind, status, msg}`.
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Transform Kubeconform JSONL output into LintResult[].
 *
 * Kubeconform with `-output json` produces one JSON object per line:
 * `{filename, kind, status, msg}`
 *
 * Status values:
 * - `'statusInvalid'` — resource failed validation (error)
 * - `'statusError'` — processing error (error)
 * - Other statuses (e.g. `'statusValid'`, `'statusSkipped'`) are ignored.
 *
 * @param {string} output - Raw JSONL output from Kubeconform
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformKubeconformOutput('{"filename":"deploy.yaml","kind":"Deployment","status":"statusInvalid","msg":"missing field"}');
 * // results[0].ruleId === 'kubeconform/statusInvalid'
 * ```
 */
export function transformKubeconformOutput(output: string): LintResult[] {
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

    let obj: Record<string, unknown>;

    try {
      obj = JSON.parse(stripped) as Record<string, unknown>;
    } catch {
      continue;
    }

    const status: string = (obj.status as string) ?? '';

    if (status !== 'statusInvalid' && status !== 'statusError') {
      continue;
    }

    const filename: string = (obj.filename as string) ?? '';
    const kind: string = (obj.kind as string) ?? '';
    const msg: string = (obj.msg as string) ?? '';

    const message: string = kind.length > 0 ? `${kind}: ${msg}` : msg;

    results.push(createResult(`kubeconform/${status}`, filename, 1, 1, 'error', message));
  }

  return results;
}

/** Kubeconform external tool definition. */
export const kubeconformTool: ExternalTool = {
  args: ['-output', 'json'],
  command: 'kubeconform',
  filePatterns: ['**/*.yaml', '**/*.yml'],
  isAvailable(): boolean {
    return isCommandAvailable('kubeconform');
  },
  name: 'kubeconform',
  outputFormat: 'json',
  transform: transformKubeconformOutput,
};
