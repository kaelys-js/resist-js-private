/**
 * Tests for external tool transform functions.
 *
 * Each tool's transform function converts raw tool output
 * into LintResult[]. These tests use mock output to verify
 * correct parsing.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import type { LintResult } from '@/lint/framework/types.ts';
import { transformShellcheckOutput } from './shellcheck.ts';
import { transformHadolintOutput } from './hadolint.ts';
import { transformYamllintOutput } from './yamllint.ts';
import { transformMarkdownlintOutput } from './markdownlint.ts';
import { transformStylelintOutput } from './stylelint.ts';
import { transformTaploOutput } from './taplo.ts';
import { transformActionlintOutput } from './actionlint.ts';
import { transformSqlfluffOutput } from './sqlfluff.ts';
import { transformRuffOutput } from './ruff.ts';

// =============================================================================
// ShellCheck transform
// =============================================================================

describe('transformShellcheckOutput', () => {
  it('parses JSON output with issues', () => {
    const output: string = JSON.stringify([
      {
        file: 'script.sh',
        line: 5,
        column: 3,
        endLine: 5,
        endColumn: 10,
        level: 'warning',
        code: 2086,
        message: 'Double quote to prevent globbing and word splitting.',
      },
    ]);

    const results: LintResult[] = transformShellcheckOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('shellcheck/SC2086');
    expect(results[0]?.file).toBe('script.sh');
    expect(results[0]?.line).toBe(5);
    expect(results[0]?.column).toBe(3);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain('Double quote');
  });

  it('handles error level', () => {
    const output: string = JSON.stringify([
      {
        file: 'script.sh',
        line: 1,
        column: 1,
        level: 'error',
        code: 1091,
        message: 'Not following: /path/to/file was not found.',
      },
    ]);

    const results: LintResult[] = transformShellcheckOutput(output);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformShellcheckOutput('')).toHaveLength(0);
  });

  it('returns empty array for invalid JSON', () => {
    expect(transformShellcheckOutput('not json')).toHaveLength(0);
  });

  it('parses multiple items', () => {
    const output: string = JSON.stringify([
      { file: 'a.sh', line: 1, column: 1, level: 'warning', code: 2001, message: 'msg1' },
      { file: 'b.sh', line: 2, column: 1, level: 'error', code: 2002, message: 'msg2' },
    ]);

    const results: LintResult[] = transformShellcheckOutput(output);
    expect(results).toHaveLength(2);
  });
});

// =============================================================================
// Hadolint transform
// =============================================================================

describe('transformHadolintOutput', () => {
  it('parses JSON output with issues', () => {
    const output: string = JSON.stringify([
      {
        file: 'Dockerfile',
        line: 3,
        column: 1,
        level: 'warning',
        code: 'DL3008',
        message: 'Pin versions in apt get install.',
      },
    ]);

    const results: LintResult[] = transformHadolintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('hadolint/DL3008');
    expect(results[0]?.file).toBe('Dockerfile');
    expect(results[0]?.line).toBe(3);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain('Pin versions');
  });

  it('returns empty array for empty output', () => {
    expect(transformHadolintOutput('')).toHaveLength(0);
  });

  it('returns empty array for invalid JSON', () => {
    expect(transformHadolintOutput('invalid')).toHaveLength(0);
  });
});

// =============================================================================
// yamllint transform
// =============================================================================

describe('transformYamllintOutput', () => {
  it('parses parsable output format', () => {
    const output: string = 'config.yml:3:1: [warning] too many blank lines (1 > 0) (empty-lines)';

    const results: LintResult[] = transformYamllintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('yamllint/yaml');
    expect(results[0]?.file).toBe('config.yml');
    expect(results[0]?.line).toBe(3);
    expect(results[0]?.column).toBe(1);
    expect(results[0]?.severity).toBe('warning');
  });

  it('handles error level', () => {
    const output: string = 'file.yml:10:5: [error] syntax error: expected a mapping value';

    const results: LintResult[] = transformYamllintOutput(output);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformYamllintOutput('')).toHaveLength(0);
  });

  it('handles multiple lines', () => {
    const output: string = 'a.yml:1:1: [warning] msg1\n' + 'b.yml:2:3: [error] msg2\n';

    const results: LintResult[] = transformYamllintOutput(output);
    expect(results).toHaveLength(2);
  });
});

// =============================================================================
// markdownlint transform
// =============================================================================

describe('transformMarkdownlintOutput', () => {
  it('parses output with line and column', () => {
    const output: string =
      'README.md:5:1 MD022/blanks-around-headings Headings should be surrounded by blank lines';

    const results: LintResult[] = transformMarkdownlintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('markdownlint/MD022');
    expect(results[0]?.file).toBe('README.md');
    expect(results[0]?.line).toBe(5);
    expect(results[0]?.column).toBe(1);
    expect(results[0]?.severity).toBe('warning');
  });

  it('parses output with line only (no column)', () => {
    const output: string =
      'README.md:3 MD012/no-multiple-blanks Multiple consecutive blank lines [Expected: 1; Actual: 2]';

    const results: LintResult[] = transformMarkdownlintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('markdownlint/MD012');
    expect(results[0]?.column).toBe(1);
  });

  it('returns empty array for empty output', () => {
    expect(transformMarkdownlintOutput('')).toHaveLength(0);
  });

  it('handles multiple issues', () => {
    const output: string =
      'a.md:1:1 MD001/heading-increment Heading levels should only increment by one level at a time\n' +
      'a.md:5:1 MD022/blanks-around-headings Headings should be surrounded by blank lines\n';

    const results: LintResult[] = transformMarkdownlintOutput(output);
    expect(results).toHaveLength(2);
  });
});

// =============================================================================
// Stylelint transform
// =============================================================================

describe('transformStylelintOutput', () => {
  it('parses JSON output with warnings', () => {
    const output: string = JSON.stringify([
      {
        source: 'src/styles.css',
        warnings: [
          {
            line: 5,
            column: 3,
            rule: 'color-no-invalid-hex',
            severity: 'error',
            text: 'Unexpected invalid hex color "#xyz" (color-no-invalid-hex)',
          },
        ],
      },
    ]);

    const results: LintResult[] = transformStylelintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('stylelint/color-no-invalid-hex');
    expect(results[0]?.file).toBe('src/styles.css');
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformStylelintOutput('')).toHaveLength(0);
  });

  it('returns empty array for invalid JSON', () => {
    expect(transformStylelintOutput('not json')).toHaveLength(0);
  });
});

// =============================================================================
// Taplo transform
// =============================================================================

describe('transformTaploOutput', () => {
  it('parses error output', () => {
    const output: string = 'error[expected_equals]: expected `=`  --> config.toml:3:1';

    const results: LintResult[] = transformTaploOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('taplo/expected_equals');
    expect(results[0]?.file).toBe('config.toml');
    expect(results[0]?.line).toBe(3);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformTaploOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// actionlint transform
// =============================================================================

describe('transformActionlintOutput', () => {
  it('parses JSON output', () => {
    const output: string = JSON.stringify([
      {
        message: 'unexpected key "on"',
        filepath: '.github/workflows/ci.yml',
        line: 1,
        column: 1,
        kind: 'syntax-check',
        snippet: 'on: push',
      },
    ]);

    const results: LintResult[] = transformActionlintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('actionlint/syntax-check');
    expect(results[0]?.file).toBe('.github/workflows/ci.yml');
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformActionlintOutput('')).toHaveLength(0);
  });

  it('returns empty array for invalid JSON', () => {
    expect(transformActionlintOutput('invalid')).toHaveLength(0);
  });
});

// =============================================================================
// SQLFluff transform
// =============================================================================

describe('transformSqlfluffOutput', () => {
  it('parses JSON output with violations', () => {
    const output: string = JSON.stringify([
      {
        filepath: 'query.sql',
        violations: [
          {
            start_line_no: 10,
            start_line_pos: 5,
            code: 'L010',
            description: 'Keywords should be consistently capitalised.',
          },
        ],
      },
    ]);

    const results: LintResult[] = transformSqlfluffOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('sqlfluff/L010');
    expect(results[0]?.file).toBe('query.sql');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformSqlfluffOutput('')).toHaveLength(0);
  });

  it('returns empty array for invalid JSON', () => {
    expect(transformSqlfluffOutput('invalid')).toHaveLength(0);
  });
});

// =============================================================================
// Ruff transform
// =============================================================================

describe('transformRuffOutput', () => {
  it('parses JSON output', () => {
    const output: string = JSON.stringify([
      {
        code: 'E501',
        message: 'Line too long (120 > 88 characters)',
        filename: 'script.py',
        location: { row: 15, column: 1 },
        end_location: { row: 15, column: 121 },
      },
    ]);

    const results: LintResult[] = transformRuffOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('ruff/E501');
    expect(results[0]?.file).toBe('script.py');
    expect(results[0]?.line).toBe(15);
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformRuffOutput('')).toHaveLength(0);
  });

  it('returns empty array for invalid JSON', () => {
    expect(transformRuffOutput('invalid')).toHaveLength(0);
  });
});
