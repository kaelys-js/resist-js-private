/**
 * External Tool: OCaml Compiler
 *
 * Lints OCaml source files (.ml, .mli) using `ocamlc -c`.
 * Parses text output in the OCaml compiler diagnostic format
 * (`File "filename", line N, characters C1-C2: Error: message`)
 * into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for OCaml compiler diagnostic output.
 *
 * Matches lines like:
 * `File "src/main.ml", line 10, characters 5-12: Error: Unbound value foo`
 * `File "lib/utils.mli", line 3, characters 0-15: Warning 32: unused value bar`
 */
const OCAML_LINE: RegExp =
  /^File "(.+?)", line (\d+), characters (\d+)-(\d+):\s*(Error|Warning)(?:\s+\d+)?:\s*(.+)$/;

/**
 * Transform OCaml compiler text output into LintResult[].
 *
 * The OCaml compiler (`ocamlc -c`) outputs diagnostics in the format:
 * `File "filename", line N, characters C1-C2: Error: message`
 * `File "filename", line N, characters C1-C2: Warning N: message`
 *
 * Multi-line diagnostics are joined before parsing: continuation lines
 * (those not starting with `File "`) are appended to the previous diagnostic.
 *
 * Severity mapping:
 * - `Error` → error
 * - `Warning` → warning
 *
 * @param {string} output - Raw text output from ocamlc
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformOcamlOutput('File "src/main.ml", line 10, characters 5-12: Error: Unbound value foo');
 * // results[0].ruleId === 'ocaml/compile'
 * // results[0].severity === 'error'
 * ```
 */
export function transformOcamlOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();

  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];

  /* Join continuation lines into single diagnostic lines */
  const rawLines: string[] = trimmed.split('\n');
  const diagnosticLines: string[] = [];

  for (const raw of rawLines) {
    const stripped: string = raw.trim();

    if (stripped.length === 0) {
      continue;
    }
    if (stripped.startsWith('File "')) {
      diagnosticLines.push(stripped);
    } else if (diagnosticLines.length > 0) {
      diagnosticLines[diagnosticLines.length - 1] += ` ${stripped}`;
    }
  }

  for (const line of diagnosticLines) {
    const match: RegExpMatchArray | null = OCAML_LINE.exec(line);

    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const startChar: number = Number.parseInt(match[3] ?? '0', 10);
    const endChar: number = Number.parseInt(match[4] ?? '0', 10);
    const level: string = match[5] ?? 'Error';
    const message: string = match[6] ?? '';

    const severity: 'error' | 'warning' | 'info' = level === 'Error' ? 'error' : 'warning';
    const column: number = startChar + 1;

    results.push(
      createResult('ocaml/compile', file, lineNum, column, severity, message, {
        endColumn: endChar + 1,
      }),
    );
  }

  return results;
}

/** OCaml compiler external tool definition. */
export const ocamlTool: ExternalTool = {
  args: ['-c'],
  command: 'ocamlc',
  filePatterns: ['**/*.ml', '**/*.mli'],
  isAvailable(): boolean {
    return isCommandAvailable('ocamlc');
  },
  name: 'ocaml',
  outputFormat: 'text',
  transform: transformOcamlOutput,
};
