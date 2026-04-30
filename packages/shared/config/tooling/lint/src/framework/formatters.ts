/**
 * Custom Linter — Output Formatters
 *
 * Format lint results as text, JSON, SARIF 2.1.0, GitHub Actions, JUnit XML, or compact.
 *
 * @module
 */

import { relative, resolve } from 'node:path';

import * as v from 'valibot';

import { LINTER_NAME } from '@/lint/constants.ts';
import { buildCaretMarker } from '@/lint/framework/source-reader.ts';
import type { LintResult } from '@/lint/framework/types.ts';
import { format as formatTemplate, type LintStrings } from '@/lint/locale/schema.ts';

// =============================================================================
// Types
// =============================================================================

/** Supported output format identifiers. */
export const OutputFormatSchema = v.picklist([
  'text',
  'json',
  'sarif',
  'github',
  'junit',
  'compact',
]);

/** Output format identifier. See {@link OutputFormatSchema}. */
export type OutputFormat = v.InferOutput<typeof OutputFormatSchema>;

// =============================================================================
// Text Formatter
// =============================================================================

/**
 * Format lint results as human-readable text in oxlint-style output.
 *
 * Shows each result with a header, source context, caret markers,
 * and help suggestions. Includes a summary line with error/warning counts.
 *
 * @param {LintResult[]} results - Results to display
 * @param {number} totalFiles - Total files linted (for summary line)
 * @returns {string} Formatted text output
 *
 * @example
 * ```typescript
 * const output = formatText(results, 10);
 * // Output:
 * //   ✗ rule-id: message
 * //      ,-[file:10:5]
 * //   10 | source line
 * //      :     ^^^^
 * //      '----
 * //   help: suggestion text
 * ```
 * @param {LintStrings} strings - Locale strings for user-facing messages
 */
export function formatText(
  results: LintResult[],
  totalFiles: number,
  strings: LintStrings,
): string {
  const lines: string[] = [];
  const cwd: string = process.cwd();

  const errors: LintResult[] = results.filter((r: LintResult): boolean => r.severity === 'error');
  const warnings: LintResult[] = results.filter(
    (r: LintResult): boolean => r.severity === 'warning',
  );

  for (const result of results) {
    const relPath: string = relative(cwd, result.file);
    const icon: string = result.severity === 'error' ? '✗' : '⚠';
    const lineStr: string = String(result.line);
    const pad: string = ' '.repeat(lineStr.length);

    /* Header: severity icon + rule-id: message */
    lines.push(`  ${icon} ${result.ruleId}: ${result.message}`);

    /* File location header */
    lines.push(`  ${pad} ,-[${relPath}:${result.line}:${result.column}]`);

    if (result.source) {
      /* Source line with line number */
      lines.push(`  ${lineStr} | ${result.source.trimEnd()}`);

      /* Caret marker highlighting the error column range */
      const marker: string = buildCaretMarker(result.column, result.endColumn);
      lines.push(`  ${pad} : ${marker}`);
    }

    /* Closing decoration */
    lines.push(`  ${pad} \`----`);

    /* Help/tip line */
    if (result.tip) {
      lines.push(`  ${strings.output.helpPrefix}: ${result.tip}`);
    }

    lines.push('');
  }

  if (results.length > 0) {
    lines.push(
      formatTemplate(strings.output.summary, {
        errors: errors.length,
        warnings: warnings.length,
        files: totalFiles,
      }),
    );

    /* Per-tool breakdown with file listing */
    lines.push(strings.output.toolSummaryHeader);

    const toolGroups: Map<string, LintResult[]> = new Map();

    for (const result of results) {
      const slashIndex: number = result.ruleId.indexOf('/');
      const toolName: string = slashIndex > 0 ? result.ruleId.slice(0, slashIndex) : 'custom';
      const group: LintResult[] | undefined = toolGroups.get(toolName);

      if (group) {
        group.push(result);
      } else {
        toolGroups.set(toolName, [result]);
      }
    }

    /* Stable ordering: oxlint first, tsgo second, rest alphabetical */
    const toolNames: string[] = [...toolGroups.keys()].toSorted((a: string, b: string): number => {
      if (a === 'oxlint') {
        return -1;
      }
      if (b === 'oxlint') {
        return 1;
      }
      if (a === 'tsgo') {
        return -1;
      }
      if (b === 'tsgo') {
        return 1;
      }
      return a.localeCompare(b);
    });

    for (const toolName of toolNames) {
      const group: LintResult[] | undefined = toolGroups.get(toolName);

      if (!group) {
        continue;
      }

      const toolErrors: number = group.filter(
        (r: LintResult): boolean => r.severity === 'error',
      ).length;
      const toolWarnings: number = group.filter(
        (r: LintResult): boolean => r.severity === 'warning',
      ).length;

      if (toolErrors === 0 && toolWarnings === 0) {
        lines.push(formatTemplate(strings.output.toolSummaryClean, { tool: toolName }));
      } else {
        lines.push(
          formatTemplate(strings.output.toolSummaryLine, {
            tool: toolName,
            errors: toolErrors,
            warnings: toolWarnings,
          }),
        );

        /* Deduplicated absolute file paths */
        const files: Set<string> = new Set<string>();

        for (const r of group) {
          files.add(resolve(cwd, r.file));
        }
        for (const file of [...files].toSorted()) {
          lines.push(formatTemplate(strings.output.toolSummaryFile, { file }));
        }
      }
    }
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
type SarifRule = {
  /** Rule identifier. */
  id: string;
  /** Short description of the rule. */
  shortDescription: { text: string };
  /** Help URI for the rule. */
  helpUri?: string;
};

/** SARIF 2.1.0 result entry. */
type SarifResult = {
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
};

/** SARIF 2.1.0 document. */
type SarifDocument = {
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
};

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
    let level: 'error' | 'warning' | 'note' = 'note';

    if (r.severity === 'error') {
      level = 'error';
    } else if (r.severity === 'warning') {
      level = 'warning';
    }

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
// GitHub Actions Formatter
// =============================================================================

/**
 * Format lint results as GitHub Actions workflow annotations.
 *
 * Produces `::error` and `::warning` commands that GitHub Actions
 * renders as inline annotations on pull request diffs.
 *
 * @param {LintResult[]} results - Results to format
 * @returns {string} GitHub Actions annotation commands
 *
 * @example
 * ```typescript
 * const output = formatGitHub(results);
 * // ::error file=src/foo.ts,line=10,col=5::Missing type annotation [typescript/require-type-annotation]
 * ```
 */
export function formatGitHub(results: LintResult[]): string {
  const cwd: string = process.cwd();
  const lines: string[] = [];

  for (const result of results) {
    const relPath: string = relative(cwd, result.file);
    const level: string = result.severity === 'error' ? 'error' : 'warning';
    lines.push(
      `::${level} file=${relPath},line=${result.line},col=${result.column}::${result.message} [${result.ruleId}]`,
    );
  }

  return lines.length > 0 ? `${lines.join('\n')}\n` : '';
}

// =============================================================================
// JUnit XML Formatter
// =============================================================================

/**
 * Escape special XML characters in a string.
 *
 * @param {string} text - Raw text to escape
 * @returns {string} XML-safe string
 */
function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/**
 * Format lint results as JUnit XML for CI tools (Jenkins, CircleCI, GitLab CI).
 *
 * Groups results by file into test suites. Each lint result becomes a
 * test case with a failure element containing the message and source.
 *
 * @param {LintResult[]} results - Results to format
 * @param {number} totalFiles - Total files linted
 * @returns {string} JUnit XML string
 *
 * @example
 * ```typescript
 * const xml = formatJunit(results, 10);
 * // <?xml version="1.0" encoding="UTF-8"?>
 * // <testsuites><testsuite name="resist-lint" ...>...</testsuite></testsuites>
 * ```
 */
export function formatJunit(results: LintResult[], totalFiles: number): string {
  const cwd: string = process.cwd();
  const lines: string[] = [];

  /* Group results by file */
  const byFile: Map<string, LintResult[]> = new Map();

  for (const result of results) {
    const relPath: string = relative(cwd, result.file);
    const existing: LintResult[] | undefined = byFile.get(relPath);

    if (existing) {
      existing.push(result);
    } else {
      byFile.set(relPath, [result]);
    }
  }

  const errorCount: number = results.filter(
    (r: LintResult): boolean => r.severity === 'error',
  ).length;

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<testsuites name="${LINTER_NAME}" tests="${results.length}" failures="${errorCount}" files="${totalFiles}">`,
  );

  for (const [file, fileResults] of byFile) {
    const fileErrors: number = fileResults.filter(
      (r: LintResult): boolean => r.severity === 'error',
    ).length;
    lines.push(
      `  <testsuite name="${escapeXml(file)}" tests="${fileResults.length}" failures="${fileErrors}">`,
    );

    for (const result of fileResults) {
      lines.push(
        `    <testcase name="${escapeXml(result.ruleId)}" classname="${escapeXml(file)}">`,
      );

      const failureType: string = result.severity === 'error' ? 'error' : 'warning';
      const body: string = result.source
        ? `${result.message}\n${result.source.trimEnd()}`
        : result.message;
      lines.push(
        `      <failure message="${escapeXml(result.message)}" type="${failureType}">${escapeXml(body)}</failure>`,
      );

      lines.push('    </testcase>');
    }

    lines.push('  </testsuite>');
  }

  lines.push('</testsuites>');
  return `${lines.join('\n')}\n`;
}

// =============================================================================
// Compact Formatter
// =============================================================================

/**
 * Format lint results as compact single-line output for piping and grepping.
 *
 * Each result is one line: `file:line:col: severity ruleId message`
 *
 * @param {LintResult[]} results - Results to format
 * @returns {string} Compact text output
 *
 * @example
 * ```typescript
 * const output = formatCompact(results);
 * // src/foo.ts:10:5: error typescript/require-type-annotation Missing type annotation
 * ```
 */
export function formatCompact(results: LintResult[]): string {
  const cwd: string = process.cwd();
  const lines: string[] = [];

  for (const result of results) {
    const relPath: string = relative(cwd, result.file);
    lines.push(
      `${relPath}:${result.line}:${result.column}: ${result.severity} ${result.ruleId} ${result.message}`,
    );
  }

  return lines.length > 0 ? `${lines.join('\n')}\n` : '';
}

// =============================================================================
// Unified Format Dispatcher
// =============================================================================

/**
 * Format lint results using the specified output format.
 *
 * @param {LintResult[]} results - Results to format
 * @param {OutputFormat} format - Output format ('text', 'json', 'sarif', 'github', 'junit', 'compact')
 * @param {number} totalFiles - Total files linted (used by text and junit formats)
 * @param {Map<string, string>} ruleDescriptions - Rule descriptions (used by SARIF)
 * @param {LintStrings} strings - Locale strings for user-facing messages
 * @returns {string} Formatted output string
 */
export function formatResults(
  results: LintResult[],
  format: OutputFormat,
  totalFiles: number,
  ruleDescriptions: Map<string, string>,
  strings: LintStrings,
): string {
  switch (format) {
    case 'json': {
      return formatJson(results);
    }
    case 'sarif': {
      return formatSarif(results, ruleDescriptions);
    }
    case 'github': {
      return formatGitHub(results);
    }
    case 'junit': {
      return formatJunit(results, totalFiles);
    }
    case 'compact': {
      return formatCompact(results);
    }
    default: {
      return formatText(results, totalFiles, strings);
    }
  }
}
