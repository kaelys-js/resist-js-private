/**
 * Custom Linter — Output Formatters
 *
 * Format lint results as text, JSON, or SARIF 2.1.0.
 *
 * @module
 */

import { relative } from 'node:path';

import * as v from 'valibot';

import { LINTER_NAME } from '@/lint/constants.ts';
import type { LintResult } from '@/lint/framework/types.ts';

// =============================================================================
// Types
// =============================================================================

/** Supported output format identifiers. */
export const OutputFormatSchema = v.picklist(['text', 'json', 'sarif']);

/** Output format identifier. See {@link OutputFormatSchema}. */
export type OutputFormat = v.InferOutput<typeof OutputFormatSchema>;

// =============================================================================
// Text Formatter
// =============================================================================

/**
 * Format lint results as human-readable text.
 *
 * @param {LintResult[]} results - Results to display
 * @param {number} totalFiles - Total files linted (for summary line)
 * @returns {string} Formatted text output
 */
export function formatText(results: LintResult[], totalFiles: number): string {
  const lines: string[] = [];
  const cwd: string = process.cwd();

  const errors: LintResult[] = results.filter((r: LintResult): boolean => r.severity === 'error');
  const warnings: LintResult[] = results.filter(
    (r: LintResult): boolean => r.severity === 'warning',
  );

  for (const result of results) {
    const relPath: string = relative(cwd, result.file);
    const icon: string = result.severity === 'error' ? '✗' : '⚠';
    lines.push(
      `  ${icon} ${relPath}:${result.line}:${result.column} ${result.message} [${result.ruleId}]`,
    );
    if (result.source) {
      lines.push(`    │ ${result.source.trimEnd()}`);
    }
    if (result.tip) {
      lines.push(`    → ${result.tip}`);
    }
  }

  if (results.length > 0) {
    lines.push('');
    lines.push(
      `Found ${errors.length} error(s) and ${warnings.length} warning(s) in ${totalFiles} file(s).`,
    );
  }

  return lines.length > 0 ? `${lines.join('\n')}\n` : '';
}

// =============================================================================
// JSON Formatter
// =============================================================================

/**
 * Format lint results as JSON.
 *
 * @param {LintResult[]} results - Results to serialize
 * @returns {string} JSON string
 */
export function formatJson(results: LintResult[]): string {
  return `${JSON.stringify(results, null, 2)}\n`;
}

// =============================================================================
// SARIF Formatter
// =============================================================================

/** SARIF 2.1.0 rule descriptor. */
interface SarifRule {
  /** Rule identifier. */
  id: string;
  /** Short description of the rule. */
  shortDescription: { text: string };
  /** Help URI for the rule. */
  helpUri?: string;
}

/** SARIF 2.1.0 result entry. */
interface SarifResult {
  /** Rule ID that produced this result. */
  ruleId: string;
  /** Severity level. */
  level: 'error' | 'warning' | 'note';
  /** Human-readable message. */
  message: { text: string };
  /** File locations. */
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region: {
        startLine: number;
        startColumn: number;
        endLine?: number;
        endColumn?: number;
      };
    };
  }>;
}

/** SARIF 2.1.0 document. */
interface SarifDocument {
  /** SARIF schema URI. */
  $schema: string;
  /** SARIF version. */
  version: string;
  /** Tool runs. */
  runs: Array<{
    tool: {
      driver: {
        name: string;
        rules: SarifRule[];
      };
    };
    results: SarifResult[];
  }>;
}

/**
 * Format lint results as SARIF 2.1.0.
 *
 * SARIF (Static Analysis Results Interchange Format) is used by
 * GitHub Code Scanning, VS Code SARIF Viewer, and other tools.
 *
 * @param {LintResult[]} results - Results to format
 * @param {Map<string, string>} ruleDescriptions - Rule ID → description map
 * @returns {string} SARIF JSON string
 */
export function formatSarif(results: LintResult[], ruleDescriptions: Map<string, string>): string {
  const cwd: string = process.cwd();

  /* Collect unique rule IDs */
  const ruleIds: Set<string> = new Set<string>();
  for (const r of results) {
    ruleIds.add(r.ruleId);
  }

  const rules: SarifRule[] = [...ruleIds].map((id: string): SarifRule => {
    const desc: string = ruleDescriptions.get(id) ?? id;
    return {
      id,
      shortDescription: { text: desc },
    };
  });

  const sarifResults: SarifResult[] = results.map((r: LintResult): SarifResult => {
    const level: 'error' | 'warning' | 'note' =
      r.severity === 'error' ? 'error' : r.severity === 'warning' ? 'warning' : 'note';
    const relPath: string = relative(cwd, r.file);

    return {
      ruleId: r.ruleId,
      level,
      message: { text: r.message },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: relPath },
            region: {
              startLine: r.line,
              startColumn: r.column,
              endLine: r.endLine,
              endColumn: r.endColumn,
            },
          },
        },
      ],
    };
  });

  const sarif: SarifDocument = {
    $schema:
      'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: LINTER_NAME,
            rules,
          },
        },
        results: sarifResults,
      },
    ],
  };

  return `${JSON.stringify(sarif, null, 2)}\n`;
}

// =============================================================================
// Unified Format Dispatcher
// =============================================================================

/**
 * Format lint results using the specified output format.
 *
 * @param {LintResult[]} results - Results to format
 * @param {OutputFormat} format - Output format ('text', 'json', 'sarif')
 * @param {number} totalFiles - Total files linted (used by text format)
 * @param {Map<string, string>} ruleDescriptions - Rule descriptions (used by SARIF)
 * @returns {string} Formatted output string
 */
export function formatResults(
  results: LintResult[],
  format: OutputFormat,
  totalFiles: number,
  ruleDescriptions: Map<string, string>,
): string {
  switch (format) {
    case 'json':
      return formatJson(results);
    case 'sarif':
      return formatSarif(results, ruleDescriptions);
    case 'text':
    default:
      return formatText(results, totalFiles);
  }
}
