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
import { transformTyposOutput, typosTool } from './typos.ts';
import { transformCommitlintOutput, commitlintTool } from './commitlint.ts';
import { transformKnipOutput, knipTool } from './knip.ts';
import { transformHtmlhintOutput, htmlhintTool } from './htmlhint.ts';
import { transformJsonlintOutput, jsonlintTool } from './jsonlint.ts';
import { transformDotenvLinterOutput, dotenvLinterTool } from './dotenv-linter.ts';

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

  it('typos whitespace-only output returns empty', () => {
    expect(transformTyposOutput('   \n  ')).toHaveLength(0);
  });

  it('htmlhint whitespace-only output returns empty', () => {
    expect(transformHtmlhintOutput('   \n  ')).toHaveLength(0);
  });

  it('dotenv-linter whitespace-only output returns empty', () => {
    expect(transformDotenvLinterOutput('   \n  ')).toHaveLength(0);
  });

  it('knip whitespace-only output returns empty', () => {
    expect(transformKnipOutput('   \n  ')).toHaveLength(0);
  });

  it('commitlint whitespace-only output returns empty', () => {
    expect(transformCommitlintOutput('   \n  ')).toHaveLength(0);
  });

  it('jsonlint whitespace-only output returns empty', () => {
    expect(transformJsonlintOutput('   \n  ')).toHaveLength(0);
  });
});

// =============================================================================
// typos transform
// =============================================================================

describe('transformTyposOutput', () => {
  it('parses JSONL output with typos', () => {
    const output: string =
      '{"type":"typo","path":"src/foo.ts","line_num":10,"byte_offset":5,"typo":"teh","corrections":["the"]}';

    const results: LintResult[] = transformTyposOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('typos/misspelling');
    expect(results[0]?.file).toBe('src/foo.ts');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.column).toBe(6);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain('teh');
    expect(results[0]?.message).toContain('the');
  });

  it('skips non-typo entries', () => {
    const output: string = [
      '{"type":"binary","path":"image.png"}',
      '{"type":"typo","path":"a.ts","line_num":1,"byte_offset":0,"typo":"nto","corrections":["not","into"]}',
    ].join('\n');

    const results: LintResult[] = transformTyposOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.message).toContain('nto');
  });

  it('handles multiple corrections', () => {
    const output: string =
      '{"type":"typo","path":"a.ts","line_num":1,"byte_offset":0,"typo":"fo","corrections":["of","for","do"]}';

    const results: LintResult[] = transformTyposOutput(output);
    expect(results[0]?.message).toContain('of, for, do');
  });

  it('returns empty array for empty output', () => {
    expect(transformTyposOutput('')).toHaveLength(0);
  });

  it('handles invalid JSON lines gracefully', () => {
    const output: string =
      'not json\n{"type":"typo","path":"a.ts","line_num":1,"byte_offset":0,"typo":"teh","corrections":["the"]}';

    const results: LintResult[] = transformTyposOutput(output);
    expect(results).toHaveLength(1);
  });

  it('includes tip with fix suggestion', () => {
    const output: string =
      '{"type":"typo","path":"a.ts","line_num":1,"byte_offset":0,"typo":"teh","corrections":["the"]}';

    const results: LintResult[] = transformTyposOutput(output);
    expect(results[0]?.tip).toContain('teh');
    expect(results[0]?.tip).toContain('the');
  });

  it('handles empty corrections array', () => {
    const output: string =
      '{"type":"typo","path":"a.ts","line_num":1,"byte_offset":0,"typo":"xyz","corrections":[]}';

    const results: LintResult[] = transformTyposOutput(output);
    expect(results[0]?.message).toContain('unknown');
  });
});

// =============================================================================
// commitlint transform
// =============================================================================

describe('transformCommitlintOutput', () => {
  it('parses error output', () => {
    const output: string = '✖   subject may not be empty [subject-empty]';

    const results: LintResult[] = transformCommitlintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('commitlint/subject-empty');
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain('subject may not be empty');
  });

  it('parses warning output', () => {
    const output: string = '⚠   header must not be longer than 72 characters [header-max-length]';

    const results: LintResult[] = transformCommitlintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('commitlint/header-max-length');
    expect(results[0]?.severity).toBe('warning');
  });

  it('handles multiple issues', () => {
    const output: string =
      '✖   subject may not be empty [subject-empty]\n⚠   body must have leading blank line [body-leading-blank]';

    const results: LintResult[] = transformCommitlintOutput(output);
    expect(results).toHaveLength(2);
  });

  it('skips non-matching lines', () => {
    const output: string =
      'input: some commit message\n✖   subject may not be empty [subject-empty]\n\nfound 1 problems, 0 warnings';

    const results: LintResult[] = transformCommitlintOutput(output);
    expect(results).toHaveLength(1);
  });

  it('returns empty array for empty output', () => {
    expect(transformCommitlintOutput('')).toHaveLength(0);
  });

  it('sets file to .git/COMMIT_EDITMSG', () => {
    const output: string = '✖   type must be one of [feat, fix] [type-enum]';

    const results: LintResult[] = transformCommitlintOutput(output);
    expect(results[0]?.file).toBe('.git/COMMIT_EDITMSG');
  });
});

// =============================================================================
// knip transform
// =============================================================================

describe('transformKnipOutput', () => {
  it('parses unused files', () => {
    const output: string = JSON.stringify({
      files: ['src/unused.ts', 'src/dead-code.ts'],
      issues: [],
    });

    const results: LintResult[] = transformKnipOutput(output);
    expect(results).toHaveLength(2);
    expect(results[0]?.ruleId).toBe('knip/unused-file');
    expect(results[0]?.file).toBe('src/unused.ts');
    expect(results[1]?.file).toBe('src/dead-code.ts');
  });

  it('parses unused exports', () => {
    const output: string = JSON.stringify({
      files: [],
      issues: [
        { type: 'exports', filePath: 'src/utils.ts', symbol: 'helperFn', line: 42, col: 14 },
      ],
    });

    const results: LintResult[] = transformKnipOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('knip/unused-export');
    expect(results[0]?.file).toBe('src/utils.ts');
    expect(results[0]?.line).toBe(42);
    expect(results[0]?.message).toContain('helperFn');
  });

  it('parses unused types', () => {
    const output: string = JSON.stringify({
      files: [],
      issues: [{ type: 'types', filePath: 'src/types.ts', symbol: 'OldType', line: 5, col: 1 }],
    });

    const results: LintResult[] = transformKnipOutput(output);
    expect(results[0]?.ruleId).toBe('knip/unused-type');
  });

  it('parses unused dependencies', () => {
    const output: string = JSON.stringify({
      files: [],
      issues: [
        { type: 'dependencies', filePath: 'package.json', symbol: 'lodash', line: 1, col: 1 },
      ],
    });

    const results: LintResult[] = transformKnipOutput(output);
    expect(results[0]?.ruleId).toBe('knip/unused-dependency');
  });

  it('parses unused devDependencies', () => {
    const output: string = JSON.stringify({
      files: [],
      issues: [
        {
          type: 'devDependencies',
          filePath: 'package.json',
          symbol: 'jest',
          line: 1,
          col: 1,
        },
      ],
    });

    const results: LintResult[] = transformKnipOutput(output);
    expect(results[0]?.ruleId).toBe('knip/unused-dev-dependency');
  });

  it('returns empty array for empty output', () => {
    expect(transformKnipOutput('')).toHaveLength(0);
  });

  it('returns empty array for invalid JSON', () => {
    expect(transformKnipOutput('not json')).toHaveLength(0);
  });

  it('handles missing fields with defaults', () => {
    const output: string = JSON.stringify({
      issues: [{ type: 'other', filePath: 'a.ts' }],
    });

    const results: LintResult[] = transformKnipOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('knip/unused');
    expect(results[0]?.line).toBe(1);
  });
});

// =============================================================================
// HTMLHint transform
// =============================================================================

describe('transformHtmlhintOutput', () => {
  it('parses JSON output with messages', () => {
    const output: string = JSON.stringify([
      {
        file: 'index.html',
        messages: [
          {
            line: 1,
            col: 1,
            type: 'error',
            message: 'Doctype must be declared first.',
            rule: { id: 'doctype-first' },
          },
        ],
      },
    ]);

    const results: LintResult[] = transformHtmlhintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('htmlhint/doctype-first');
    expect(results[0]?.file).toBe('index.html');
    expect(results[0]?.line).toBe(1);
    expect(results[0]?.severity).toBe('error');
  });

  it('handles warning severity', () => {
    const output: string = JSON.stringify([
      {
        file: 'page.html',
        messages: [
          {
            line: 5,
            col: 3,
            type: 'warning',
            message: 'Tag must be paired.',
            rule: { id: 'tag-pair' },
          },
        ],
      },
    ]);

    const results: LintResult[] = transformHtmlhintOutput(output);
    expect(results[0]?.severity).toBe('warning');
  });

  it('handles info severity', () => {
    const output: string = JSON.stringify([
      {
        file: 'page.html',
        messages: [{ line: 1, col: 1, type: 'info', message: 'Info msg', rule: { id: 'rule' } }],
      },
    ]);

    const results: LintResult[] = transformHtmlhintOutput(output);
    expect(results[0]?.severity).toBe('info');
  });

  it('handles multiple files and messages', () => {
    const output: string = JSON.stringify([
      {
        file: 'a.html',
        messages: [
          { line: 1, col: 1, type: 'error', message: 'msg1', rule: { id: 'r1' } },
          { line: 5, col: 3, type: 'warning', message: 'msg2', rule: { id: 'r2' } },
        ],
      },
      {
        file: 'b.html',
        messages: [{ line: 10, col: 1, type: 'error', message: 'msg3', rule: { id: 'r3' } }],
      },
    ]);

    const results: LintResult[] = transformHtmlhintOutput(output);
    expect(results).toHaveLength(3);
  });

  it('returns empty array for empty output', () => {
    expect(transformHtmlhintOutput('')).toHaveLength(0);
  });

  it('returns empty array for invalid JSON', () => {
    expect(transformHtmlhintOutput('not json')).toHaveLength(0);
  });

  it('handles missing fields with defaults', () => {
    const output: string = JSON.stringify([{ file: 'a.html', messages: [{}] }]);

    const results: LintResult[] = transformHtmlhintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('htmlhint/unknown');
    expect(results[0]?.severity).toBe('warning');
  });

  it('includes tip with documentation URL', () => {
    const output: string = JSON.stringify([
      {
        file: 'a.html',
        messages: [
          { line: 1, col: 1, type: 'error', message: 'msg', rule: { id: 'doctype-first' } },
        ],
      },
    ]);

    const results: LintResult[] = transformHtmlhintOutput(output);
    expect(results[0]?.tip).toContain('https://htmlhint.com/docs/user-guide/rules/doctype-first');
  });
});

// =============================================================================
// jsonlint transform
// =============================================================================

describe('transformJsonlintOutput', () => {
  it('parses compact format output', () => {
    const output: string = 'config.json: line 5, col 10, Error - Expected comma';

    const results: LintResult[] = transformJsonlintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('jsonlint/parse-error');
    expect(results[0]?.file).toBe('config.json');
    expect(results[0]?.line).toBe(5);
    expect(results[0]?.column).toBe(10);
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain('Expected comma');
  });

  it('parses warning level in compact format', () => {
    const output: string = 'data.json: line 3, col 1, Warning - Trailing comma';

    const results: LintResult[] = transformJsonlintOutput(output);
    expect(results[0]?.severity).toBe('warning');
  });

  it('parses standard format output', () => {
    const output: string =
      "Error: Parse error on line 5:\n...some context...\nExpecting 'STRING', got 'EOF'";

    const results: LintResult[] = transformJsonlintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('jsonlint/parse-error');
    expect(results[0]?.line).toBe(5);
    expect(results[0]?.severity).toBe('error');
  });

  it('handles multiple compact format lines', () => {
    const output: string =
      'a.json: line 1, col 5, Error - msg1\nb.json: line 10, col 2, Error - msg2';

    const results: LintResult[] = transformJsonlintOutput(output);
    expect(results).toHaveLength(2);
  });

  it('returns empty array for empty output', () => {
    expect(transformJsonlintOutput('')).toHaveLength(0);
  });

  it('skips non-matching lines', () => {
    const output: string =
      'Validating files...\nconfig.json: line 5, col 10, Error - Bad token\nDone.';

    const results: LintResult[] = transformJsonlintOutput(output);
    expect(results).toHaveLength(1);
  });
});

// =============================================================================
// dotenv-linter transform
// =============================================================================

describe('transformDotenvLinterOutput', () => {
  it('parses output with issues', () => {
    const output: string = '.env:3 DuplicatedKey: The FOO key is duplicated';

    const results: LintResult[] = transformDotenvLinterOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('dotenv-linter/DuplicatedKey');
    expect(results[0]?.file).toBe('.env');
    expect(results[0]?.line).toBe(3);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain('FOO key is duplicated');
  });

  it('handles multiple issues', () => {
    const output: string =
      '.env:1 LeadingCharacter: Invalid leading character detected\n.env:5 DuplicatedKey: The BAR key is duplicated';

    const results: LintResult[] = transformDotenvLinterOutput(output);
    expect(results).toHaveLength(2);
  });

  it('handles .env.production files', () => {
    const output: string = '.env.production:10 UnorderedKey: The keys should go in order';

    const results: LintResult[] = transformDotenvLinterOutput(output);
    expect(results[0]?.file).toBe('.env.production');
    expect(results[0]?.line).toBe(10);
  });

  it('skips non-matching lines', () => {
    const output: string = 'Checking .env files...\n.env:1 DuplicatedKey: msg\nDone.';

    const results: LintResult[] = transformDotenvLinterOutput(output);
    expect(results).toHaveLength(1);
  });

  it('returns empty array for empty output', () => {
    expect(transformDotenvLinterOutput('')).toHaveLength(0);
  });

  it('includes tip with documentation URL', () => {
    const output: string = '.env:1 DuplicatedKey: msg';

    const results: LintResult[] = transformDotenvLinterOutput(output);
    expect(results[0]?.tip).toContain('https://dotenv-linter.github.io/#/checks/DuplicatedKey');
  });
});

// =============================================================================
// New tool definition property tests
// =============================================================================

describe('new tool definitions', () => {
  it('typosTool has correct properties', () => {
    expect(typosTool.name).toBe('typos');
    expect(typosTool.command).toBe('typos');
    expect(typosTool.args).toContain('--format');
    expect(typosTool.args).toContain('json');
    expect(typosTool.outputFormat).toBe('json');
    expect(typosTool.filePatterns).toContain('**/*');
    expect(typosTool.transform).toBe(transformTyposOutput);
  });

  it('commitlintTool has correct properties', () => {
    expect(commitlintTool.name).toBe('commitlint');
    expect(commitlintTool.command).toBe('commitlint');
    expect(commitlintTool.args).toContain('--from');
    expect(commitlintTool.outputFormat).toBe('text');
    expect(commitlintTool.filePatterns).toHaveLength(0);
    expect(commitlintTool.transform).toBe(transformCommitlintOutput);
  });

  it('knipTool has correct properties', () => {
    expect(knipTool.name).toBe('knip');
    expect(knipTool.command).toBe('knip');
    expect(knipTool.args).toContain('--reporter');
    expect(knipTool.args).toContain('json');
    expect(knipTool.outputFormat).toBe('json');
    expect(knipTool.filePatterns).toHaveLength(0);
    expect(knipTool.transform).toBe(transformKnipOutput);
  });

  it('htmlhintTool has correct properties', () => {
    expect(htmlhintTool.name).toBe('htmlhint');
    expect(htmlhintTool.command).toBe('htmlhint');
    expect(htmlhintTool.args).toContain('--format');
    expect(htmlhintTool.outputFormat).toBe('json');
    expect(htmlhintTool.filePatterns).toContain('**/*.html');
    expect(htmlhintTool.filePatterns).toContain('**/*.htm');
    expect(htmlhintTool.transform).toBe(transformHtmlhintOutput);
  });

  it('jsonlintTool has correct properties', () => {
    expect(jsonlintTool.name).toBe('jsonlint');
    expect(jsonlintTool.command).toBe('jsonlint');
    expect(jsonlintTool.args).toContain('--quiet');
    expect(jsonlintTool.outputFormat).toBe('text');
    expect(jsonlintTool.filePatterns).toContain('**/*.json');
    expect(jsonlintTool.filePatterns).toContain('**/*.jsonc');
    expect(jsonlintTool.transform).toBe(transformJsonlintOutput);
  });

  it('dotenvLinterTool has correct properties', () => {
    expect(dotenvLinterTool.name).toBe('dotenv-linter');
    expect(dotenvLinterTool.command).toBe('dotenv-linter');
    expect(dotenvLinterTool.outputFormat).toBe('text');
    expect(dotenvLinterTool.filePatterns).toContain('**/.env');
    expect(dotenvLinterTool.filePatterns).toContain('**/.env.*');
    expect(dotenvLinterTool.transform).toBe(transformDotenvLinterOutput);
  });
});

// =============================================================================
// New tool isAvailable() tests
// =============================================================================

describe('new tool isAvailable()', () => {
  it('typosTool.isAvailable resolves', async () => {
    const result = await typosTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('commitlintTool.isAvailable resolves', async () => {
    const result = await commitlintTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('knipTool.isAvailable resolves', async () => {
    const result = await knipTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('htmlhintTool.isAvailable resolves', async () => {
    const result = await htmlhintTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('jsonlintTool.isAvailable resolves', async () => {
    const result = await jsonlintTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('dotenvLinterTool.isAvailable resolves', async () => {
    const result = await dotenvLinterTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });
});
