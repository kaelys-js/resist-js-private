/**
 * Tests for external tool transform functions and tool definitions.
 *
 * Each tool's transform function converts raw tool output
 * into LintResult[]. These tests use mock output to verify
 * correct parsing. Tool definition tests verify properties
 * and isAvailable() integration.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest';

import type { LintResult } from '@/lint/framework/types.ts';
import type * as ToolOrchestratorModule from '@/lint/framework/tool-orchestrator.ts';
import { transformShellcheckOutput, shellcheckTool } from './shellcheck.ts';
import { transformHadolintOutput, hadolintTool } from './hadolint.ts';
import { transformYamllintOutput, yamllintTool } from './yamllint.ts';
import { transformMarkdownlintOutput, markdownlintTool } from './markdownlint.ts';
import { transformStylelintOutput, stylelintTool } from './stylelint.ts';
import { transformTaploOutput, taploTool } from './taplo.ts';
import { transformActionlintOutput, actionlintTool } from './actionlint.ts';
import { transformSqlfluffOutput, sqlfluffTool } from './sqlfluff.ts';
import { transformRuffOutput, ruffTool } from './ruff.ts';

// Mock isCommandAvailable to avoid real `which` calls
vi.mock('@/lint/framework/tool-orchestrator.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof ToolOrchestratorModule>();
  return {
    ...actual,
    isCommandAvailable: vi.fn().mockResolvedValue(true),
  };
});

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
    const output: string = 'a.yml:1:1: [warning] msg1\nb.yml:2:3: [error] msg2\n';

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

  it('handles missing location fields with defaults', () => {
    const output: string = JSON.stringify([
      { code: 'F401', message: 'unused import', filename: 'x.py' },
    ]);

    const results: LintResult[] = transformRuffOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.line).toBe(1);
    expect(results[0]?.column).toBe(1);
  });

  it('handles missing code with "unknown" fallback', () => {
    const output: string = JSON.stringify([
      { message: 'msg', filename: 'x.py', location: { row: 1, column: 1 } },
    ]);

    const results: LintResult[] = transformRuffOutput(output);
    expect(results[0]?.ruleId).toBe('ruff/unknown');
  });
});

// =============================================================================
// Tool definition property tests
// =============================================================================

describe('tool definitions', () => {
  it('shellcheckTool has correct properties', () => {
    expect(shellcheckTool.name).toBe('shellcheck');
    expect(shellcheckTool.command).toBe('shellcheck');
    expect(shellcheckTool.args).toContain('--format=json');
    expect(shellcheckTool.outputFormat).toBe('json');
    expect(shellcheckTool.filePatterns).toContain('**/*.sh');
    expect(shellcheckTool.filePatterns).toContain('**/*.bash');
    expect(shellcheckTool.filePatterns).toContain('**/*.zsh');
    expect(shellcheckTool.transform).toBe(transformShellcheckOutput);
  });

  it('hadolintTool has correct properties', () => {
    expect(hadolintTool.name).toBe('hadolint');
    expect(hadolintTool.command).toBe('hadolint');
    expect(hadolintTool.outputFormat).toBe('json');
    expect(hadolintTool.filePatterns).toContain('Dockerfile');
    expect(hadolintTool.transform).toBe(transformHadolintOutput);
  });

  it('yamllintTool has correct properties', () => {
    expect(yamllintTool.name).toBe('yamllint');
    expect(yamllintTool.command).toBe('yamllint');
    expect(yamllintTool.outputFormat).toBe('text');
    expect(yamllintTool.filePatterns).toContain('**/*.yaml');
    expect(yamllintTool.filePatterns).toContain('**/*.yml');
    expect(yamllintTool.transform).toBe(transformYamllintOutput);
  });

  it('markdownlintTool has correct properties', () => {
    expect(markdownlintTool.name).toBe('markdownlint');
    expect(markdownlintTool.command).toBe('markdownlint-cli2');
    expect(markdownlintTool.outputFormat).toBe('text');
    expect(markdownlintTool.filePatterns).toContain('**/*.md');
    expect(markdownlintTool.filePatterns).toContain('**/*.mdx');
    expect(markdownlintTool.transform).toBe(transformMarkdownlintOutput);
  });

  it('stylelintTool has correct properties', () => {
    expect(stylelintTool.name).toBe('stylelint');
    expect(stylelintTool.command).toBe('stylelint');
    expect(stylelintTool.outputFormat).toBe('json');
    expect(stylelintTool.filePatterns).toContain('**/*.css');
    expect(stylelintTool.filePatterns).toContain('**/*.scss');
    expect(stylelintTool.filePatterns).toContain('**/*.less');
    expect(stylelintTool.transform).toBe(transformStylelintOutput);
  });

  it('taploTool has correct properties', () => {
    expect(taploTool.name).toBe('taplo');
    expect(taploTool.command).toBe('taplo');
    expect(taploTool.outputFormat).toBe('text');
    expect(taploTool.filePatterns).toContain('**/*.toml');
    expect(taploTool.transform).toBe(transformTaploOutput);
  });

  it('actionlintTool has correct properties', () => {
    expect(actionlintTool.name).toBe('actionlint');
    expect(actionlintTool.command).toBe('actionlint');
    expect(actionlintTool.outputFormat).toBe('json');
    expect(actionlintTool.filePatterns).toContain('**/.github/workflows/*.yml');
    expect(actionlintTool.transform).toBe(transformActionlintOutput);
  });

  it('sqlfluffTool has correct properties', () => {
    expect(sqlfluffTool.name).toBe('sqlfluff');
    expect(sqlfluffTool.command).toBe('sqlfluff');
    expect(sqlfluffTool.outputFormat).toBe('json');
    expect(sqlfluffTool.filePatterns).toContain('**/*.sql');
    expect(sqlfluffTool.transform).toBe(transformSqlfluffOutput);
  });

  it('ruffTool has correct properties', () => {
    expect(ruffTool.name).toBe('ruff');
    expect(ruffTool.command).toBe('ruff');
    expect(ruffTool.outputFormat).toBe('json');
    expect(ruffTool.filePatterns).toContain('**/*.py');
    expect(ruffTool.transform).toBe(transformRuffOutput);
  });
});

// =============================================================================
// Tool isAvailable() tests
// =============================================================================

describe('tool isAvailable()', () => {
  it('shellcheckTool.isAvailable resolves', async () => {
    const result = await shellcheckTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('hadolintTool.isAvailable resolves', async () => {
    const result = await hadolintTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('yamllintTool.isAvailable resolves', async () => {
    const result = await yamllintTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('markdownlintTool.isAvailable resolves', async () => {
    const result = await markdownlintTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('stylelintTool.isAvailable resolves', async () => {
    const result = await stylelintTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('taploTool.isAvailable resolves', async () => {
    const result = await taploTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('actionlintTool.isAvailable resolves', async () => {
    const result = await actionlintTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('sqlfluffTool.isAvailable resolves', async () => {
    const result = await sqlfluffTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('ruffTool.isAvailable resolves', async () => {
    const result = await ruffTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });
});

// =============================================================================
// Transform edge cases — uncovered branches
// =============================================================================

describe('transform edge cases', () => {
  it('shellcheck handles info level', () => {
    const output: string = JSON.stringify([
      { file: 'a.sh', line: 1, column: 1, level: 'info', code: 1000, message: 'note' },
    ]);

    const results: LintResult[] = transformShellcheckOutput(output);
    expect(results[0]?.severity).toBe('info');
  });

  it('shellcheck handles missing fields with defaults', () => {
    const output: string = JSON.stringify([{}]);

    const results: LintResult[] = transformShellcheckOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.file).toBe('');
    expect(results[0]?.line).toBe(1);
    expect(results[0]?.column).toBe(1);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.ruleId).toBe('shellcheck/SC0');
  });

  it('hadolint handles info level', () => {
    const output: string = JSON.stringify([
      { file: 'Dockerfile', line: 1, column: 1, level: 'info', code: 'DL0', message: 'info' },
    ]);

    const results: LintResult[] = transformHadolintOutput(output);
    expect(results[0]?.severity).toBe('info');
  });

  it('hadolint handles missing fields with defaults', () => {
    const output: string = JSON.stringify([{}]);

    const results: LintResult[] = transformHadolintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.file).toBe('Dockerfile');
    expect(results[0]?.severity).toBe('warning');
  });

  it('yamllint skips non-matching lines', () => {
    const output: string = 'some random text\nconfig.yml:1:1: [warning] msg\nanother line';

    const results: LintResult[] = transformYamllintOutput(output);
    expect(results).toHaveLength(1);
  });

  it('markdownlint skips non-matching lines', () => {
    const output: string = 'random header\nREADME.md:1:1 MD001/heading-increment msg\nfooter';

    const results: LintResult[] = transformMarkdownlintOutput(output);
    expect(results).toHaveLength(1);
  });

  it('stylelint handles warning severity', () => {
    const output: string = JSON.stringify([
      {
        source: 'a.css',
        warnings: [{ line: 1, column: 1, rule: 'r', severity: 'warning', text: 'warn' }],
      },
    ]);

    const results: LintResult[] = transformStylelintOutput(output);
    expect(results[0]?.severity).toBe('warning');
  });

  it('stylelint handles empty warnings array', () => {
    const output: string = JSON.stringify([{ source: 'a.css', warnings: [] }]);

    const results: LintResult[] = transformStylelintOutput(output);
    expect(results).toHaveLength(0);
  });

  it('stylelint handles missing fields with defaults', () => {
    const output: string = JSON.stringify([{ source: 'a.css', warnings: [{}] }]);

    const results: LintResult[] = transformStylelintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('stylelint/unknown');
    expect(results[0]?.severity).toBe('warning');
  });

  it('taplo handles warning level', () => {
    const output: string = 'warning[deprecated_key]: key is deprecated  --> config.toml:5:3';

    const results: LintResult[] = transformTaploOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.ruleId).toBe('taplo/deprecated_key');
    expect(results[0]?.line).toBe(5);
    expect(results[0]?.column).toBe(3);
  });

  it('taplo handles multiple lines', () => {
    const output: string = 'error[e1]: msg1  --> a.toml:1:1\nwarning[w1]: msg2  --> b.toml:2:3\n';

    const results: LintResult[] = transformTaploOutput(output);
    expect(results).toHaveLength(2);
  });

  it('taplo skips non-matching lines', () => {
    const output: string = 'random text\nerror[e1]: msg  --> a.toml:1:1\nmore text';

    const results: LintResult[] = transformTaploOutput(output);
    expect(results).toHaveLength(1);
  });

  it('actionlint handles missing kind with default', () => {
    const output: string = JSON.stringify([
      { message: 'msg', filepath: 'ci.yml', line: 1, column: 1 },
    ]);

    const results: LintResult[] = transformActionlintOutput(output);
    expect(results[0]?.ruleId).toBe('actionlint/syntax-check');
  });

  it('actionlint includes source snippet', () => {
    const output: string = JSON.stringify([
      { message: 'msg', filepath: 'ci.yml', line: 1, column: 1, kind: 'k', snippet: 'code here' },
    ]);

    const results: LintResult[] = transformActionlintOutput(output);
    expect(results[0]?.source).toBe('code here');
  });

  it('sqlfluff handles multiple files with violations', () => {
    const output: string = JSON.stringify([
      {
        filepath: 'a.sql',
        violations: [{ start_line_no: 1, start_line_pos: 1, code: 'L001', description: 'msg1' }],
      },
      {
        filepath: 'b.sql',
        violations: [{ start_line_no: 5, start_line_pos: 3, code: 'L002', description: 'msg2' }],
      },
    ]);

    const results: LintResult[] = transformSqlfluffOutput(output);
    expect(results).toHaveLength(2);
    expect(results[0]?.file).toBe('a.sql');
    expect(results[1]?.file).toBe('b.sql');
  });

  it('sqlfluff handles empty violations array', () => {
    const output: string = JSON.stringify([{ filepath: 'a.sql', violations: [] }]);

    const results: LintResult[] = transformSqlfluffOutput(output);
    expect(results).toHaveLength(0);
  });

  it('sqlfluff handles missing fields with defaults', () => {
    const output: string = JSON.stringify([{ filepath: 'a.sql', violations: [{}] }]);

    const results: LintResult[] = transformSqlfluffOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('sqlfluff/unknown');
    expect(results[0]?.line).toBe(1);
  });

  it('ruff includes tip with documentation URL', () => {
    const output: string = JSON.stringify([
      { code: 'E501', message: 'msg', filename: 'x.py', location: { row: 1, column: 1 } },
    ]);

    const results: LintResult[] = transformRuffOutput(output);
    expect(results[0]?.tip).toContain('https://docs.astral.sh/ruff/rules/E501');
  });

  it('shellcheck includes tip with wiki URL', () => {
    const output: string = JSON.stringify([
      { file: 'a.sh', line: 1, column: 1, level: 'warning', code: 2086, message: 'msg' },
    ]);

    const results: LintResult[] = transformShellcheckOutput(output);
    expect(results[0]?.tip).toContain('https://www.shellcheck.net/wiki/SC2086');
  });

  it('hadolint includes tip with wiki URL', () => {
    const output: string = JSON.stringify([
      { file: 'Dockerfile', line: 1, column: 1, level: 'warning', code: 'DL3008', message: 'msg' },
    ]);

    const results: LintResult[] = transformHadolintOutput(output);
    expect(results[0]?.tip).toContain('https://github.com/hadolint/hadolint/wiki/DL3008');
  });

  it('shellcheck whitespace-only output returns empty', () => {
    expect(transformShellcheckOutput('   \n  ')).toHaveLength(0);
  });

  it('hadolint whitespace-only output returns empty', () => {
    expect(transformHadolintOutput('   \n  ')).toHaveLength(0);
  });

  it('stylelint whitespace-only output returns empty', () => {
    expect(transformStylelintOutput('   \n  ')).toHaveLength(0);
  });

  it('ruff whitespace-only output returns empty', () => {
    expect(transformRuffOutput('   \n  ')).toHaveLength(0);
  });
});
