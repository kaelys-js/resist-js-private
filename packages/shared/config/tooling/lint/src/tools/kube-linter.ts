/**
 * External Tool: KubeLinter
 *
 * Lints Kubernetes manifests for best practices using kube-linter.
 * Outputs JSON format, which is transformed into LintResult[].
 *
 * JSON structure:
 * `{Reports: [{Diagnostic: {Message}, Object: {K8sObject: {FilePath, GroupVersionKind: {Kind}}}, Check}]}`
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Transform kube-linter JSON output into LintResult[].
 *
 * kube-linter with `--format json` outputs a JSON object with a `Reports` array.
 * Each report contains:
 * - `Diagnostic.Message` — the lint message
 * - `Object.K8sObject.FilePath` — file path of the resource
 * - `Object.K8sObject.GroupVersionKind.Kind` — Kubernetes resource kind
 * - `Check` — the check/rule name
 *
 * @param {string} output - Raw JSON output from kube-linter
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformKubeLinterOutput('{"Reports":[{"Diagnostic":{"Message":"no read-only root fs"},"Object":{"K8sObject":{"FilePath":"deploy.yaml","GroupVersionKind":{"Kind":"Deployment"}}},"Check":"no-read-only-root-fs"}]}');
 * // results[0].ruleId === 'kube-linter/no-read-only-root-fs'
 * ```
 */
export function transformKubeLinterOutput(output: string): LintResult[] {
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

  const reports: unknown[] = (parsed.Reports as unknown[]) ?? [];
  const results: LintResult[] = [];

  for (const report of reports) {
    const obj: Record<string, unknown> = report as Record<string, unknown>;

    /* Extract Diagnostic.Message */
    const diagnostic: Record<string, unknown> = (obj.Diagnostic as Record<string, unknown>) ?? {};
    const message: string = (diagnostic.Message as string) ?? '';

    /* Extract Object.K8sObject.FilePath and GroupVersionKind.Kind */
    const objectField: Record<string, unknown> = (obj.Object as Record<string, unknown>) ?? {};
    const k8sObject: Record<string, unknown> =
      (objectField.K8sObject as Record<string, unknown>) ?? {};
    const filePath: string = (k8sObject.FilePath as string) ?? '';
    const gvk: Record<string, unknown> =
      (k8sObject.GroupVersionKind as Record<string, unknown>) ?? {};
    const kind: string = (gvk.Kind as string) ?? '';

    /* Extract Check name */
    const check: string = (obj.Check as string) ?? 'unknown';

    const fullMessage: string = kind.length > 0 ? `${kind}: ${message}` : message;

    results.push(createResult(`kube-linter/${check}`, filePath, 1, 1, 'warning', fullMessage));
  }

  return results;
}

/** KubeLinter external tool definition. */
export const kubeLinterTool: ExternalTool = {
  args: ['lint', '--format', 'json'],
  command: 'kube-linter',
  filePatterns: ['**/*.yaml', '**/*.yml'],
  isAvailable(): boolean {
    return isCommandAvailable('kube-linter');
  },
  name: 'kube-linter',
  outputFormat: 'json',
  transform: transformKubeLinterOutput,
};
