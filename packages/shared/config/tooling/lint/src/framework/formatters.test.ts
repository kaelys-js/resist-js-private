/**
 * Tests for output formatters (text, JSON, SARIF, GitHub, JUnit, compact).
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import {
  formatText,
  formatJson,
  formatSarif,
  formatGitHub,
  formatJunit,
  formatCompact,
  formatResults,
} from './formatters.ts';
import type { LintResult } from './types.ts';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a minimal LintResult for testing.
 *
 * @param overrides - Partial LintResult fields to override defaults
 * @returns A complete LintResult with defaults applied
 */
function makeResult(overrides: Partial<LintResult> = {}): LintResult {
  return {
    ruleId: 'test/rule',
    file: '/src/foo.ts',
    line: 10,
    column: 5,
    severity: 'error',
    message: 'Test error',
    fix: { range: { start: 0, end: 0 }, text: '' },
    ...overrides,
  };
}

// =============================================================================
// formatText
// =============================================================================

describe('formatText', () => {
  it('returns empty string for no results', () => {
    expect(formatText([], 0)).toBe('');
  });

  it('formats a single error with oxlint-style output', () => {
    const text: string = formatText([makeResult()], 5);
    expect(text).toContain('✗');
    expect(text).toContain('test/rule: Test error');
    expect(text).toContain('1 error(s) and 0 warning(s) in 5 file(s)');
  });

  it('shows file location header', () => {
    const text: string = formatText([makeResult()], 1);
    expect(text).toContain(',-[');
    expect(text).toContain(':10:5]');
  });

  it('shows closing decoration', () => {
    const text: string = formatText([makeResult()], 1);
    expect(text).toContain('`----');
  });

  it('shows warning icon for warnings', () => {
    const text: string = formatText([makeResult({ severity: 'warning' })], 1);
    expect(text).toContain('⚠');
  });

  it('includes source line with line number', () => {
    const text: string = formatText([makeResult({ source: 'const x = 42;' })], 1);
    expect(text).toContain('10 | const x = 42;');
  });

  it('includes caret marker for source', () => {
    const text: string = formatText(
      [makeResult({ source: 'const x = 42;', column: 7, endColumn: 8 })],
      1,
    );
    expect(text).toContain(': ');
    expect(text).toContain('^');
  });

  it('includes help line for tips', () => {
    const text: string = formatText([makeResult({ tip: 'Add type annotation' })], 1);
    expect(text).toContain('help: Add type annotation');
  });

  it('aligns line numbers correctly for multi-digit lines', () => {
    const text: string = formatText([makeResult({ line: 100, source: 'const x = 42;' })], 1);
    expect(text).toContain('100 | const x = 42;');
    /* Padding should match line number width (3 chars) */
    expect(text).toContain('    ,-[');
    expect(text).toContain('    `----');
  });
});

// =============================================================================
// formatJson
// =============================================================================

describe('formatJson', () => {
  it('returns valid JSON array', () => {
    const json: string = formatJson([makeResult()]);
    const parsed: unknown = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it('includes all result fields', () => {
    const json: string = formatJson([makeResult()]);
    const parsed: LintResult[] = JSON.parse(json) as LintResult[];
    expect(parsed[0]?.ruleId).toBe('test/rule');
    expect(parsed[0]?.message).toBe('Test error');
  });

  it('returns empty array for no results', () => {
    const json: string = formatJson([]);
    const parsed: unknown = JSON.parse(json);
    expect(parsed).toEqual([]);
  });
});

// =============================================================================
// formatSarif
// =============================================================================

describe('formatSarif', () => {
  const ruleDescs: Map<string, string> = new Map([['test/rule', 'A test rule for validation']]);

  it('returns valid JSON', () => {
    const sarif: string = formatSarif([makeResult()], ruleDescs);
    expect(() => JSON.parse(sarif)).not.toThrow();
  });

  it('has correct SARIF schema and version', () => {
    const sarif: string = formatSarif([makeResult()], ruleDescs);
    const parsed = JSON.parse(sarif) as Record<string, unknown>;
    expect(parsed.$schema).toContain('sarif-schema-2.1.0');
    expect(parsed.version).toBe('2.1.0');
  });

  it('includes tool driver name', () => {
    const sarif: string = formatSarif([makeResult()], ruleDescs);
    const parsed = JSON.parse(sarif) as {
      runs: Array<{ tool: { driver: { name: string } } }>;
    };
    expect(parsed.runs[0]?.tool.driver.name).toBe('resist-lint');
  });

  it('includes rule definitions', () => {
    const sarif: string = formatSarif([makeResult()], ruleDescs);
    const parsed = JSON.parse(sarif) as {
      runs: Array<{
        tool: { driver: { rules: Array<{ id: string; shortDescription: { text: string } }> } };
      }>;
    };
    const rules = parsed.runs[0]?.tool.driver.rules ?? [];
    expect(rules.length).toBe(1);
    expect(rules[0]?.id).toBe('test/rule');
    expect(rules[0]?.shortDescription.text).toBe('A test rule for validation');
  });

  it('maps severity correctly', () => {
    const results: LintResult[] = [
      makeResult({ severity: 'error' }),
      makeResult({ severity: 'warning', ruleId: 'test/warn' }),
      makeResult({ severity: 'info', ruleId: 'test/info' }),
    ];
    const sarif: string = formatSarif(results, ruleDescs);
    const parsed = JSON.parse(sarif) as {
      runs: Array<{ results: Array<{ level: string }> }>;
    };
    const levels: string[] = (parsed.runs[0]?.results ?? []).map(
      (r: { level: string }): string => r.level,
    );
    expect(levels).toEqual(['error', 'warning', 'note']);
  });

  it('returns empty results for no input', () => {
    const sarif: string = formatSarif([], ruleDescs);
    const parsed = JSON.parse(sarif) as {
      runs: Array<{ results: unknown[] }>;
    };
    expect(parsed.runs[0]?.results).toEqual([]);
  });
});

// =============================================================================
// formatGitHub
// =============================================================================

describe('formatGitHub', () => {
  it('returns empty string for no results', () => {
    expect(formatGitHub([])).toBe('');
  });

  it('formats error as ::error annotation', () => {
    const output: string = formatGitHub([makeResult()]);
    expect(output).toContain('::error file=');
    expect(output).toContain(',line=10,col=5::');
    expect(output).toContain('Test error [test/rule]');
  });

  it('formats warning as ::warning annotation', () => {
    const output: string = formatGitHub([makeResult({ severity: 'warning' })]);
    expect(output).toContain('::warning file=');
  });

  it('outputs one line per result', () => {
    const output: string = formatGitHub([
      makeResult({ ruleId: 'rule/a' }),
      makeResult({ ruleId: 'rule/b' }),
    ]);
    const lines: string[] = output.trim().split('\n');
    expect(lines.length).toBe(2);
  });

  it('includes file path, line, and column', () => {
    const output: string = formatGitHub([makeResult({ line: 42, column: 7 })]);
    expect(output).toContain('line=42,col=7');
  });
});

// =============================================================================
// formatJunit
// =============================================================================

describe('formatJunit', () => {
  it('produces valid XML structure', () => {
    const xml: string = formatJunit([makeResult()], 5);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<testsuites');
    expect(xml).toContain('</testsuites>');
  });

  it('includes tool name in testsuites', () => {
    const xml: string = formatJunit([makeResult()], 1);
    expect(xml).toContain('name="resist-lint"');
  });

  it('groups results by file as test suites', () => {
    const results: LintResult[] = [
      makeResult({ file: '/src/a.ts', ruleId: 'rule/1' }),
      makeResult({ file: '/src/a.ts', ruleId: 'rule/2' }),
      makeResult({ file: '/src/b.ts', ruleId: 'rule/3' }),
    ];
    const xml: string = formatJunit(results, 2);
    const suiteCount: number = (xml.match(/<testsuite /g) ?? []).length;
    expect(suiteCount).toBe(2);
  });

  it('includes failure elements with message', () => {
    const xml: string = formatJunit([makeResult()], 1);
    expect(xml).toContain('<failure');
    expect(xml).toContain('message="Test error"');
    expect(xml).toContain('type="error"');
  });

  it('includes source in failure body when present', () => {
    const xml: string = formatJunit([makeResult({ source: 'const x = 42;' })], 1);
    expect(xml).toContain('const x = 42;');
  });

  it('escapes XML special characters', () => {
    const xml: string = formatJunit([makeResult({ message: 'Use <T> & "safe" parsing' })], 1);
    expect(xml).toContain('&lt;T&gt;');
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&quot;safe&quot;');
  });

  it('counts failures correctly', () => {
    const results: LintResult[] = [
      makeResult({ severity: 'error' }),
      makeResult({ severity: 'warning' }),
      makeResult({ severity: 'error' }),
    ];
    const xml: string = formatJunit(results, 3);
    expect(xml).toContain('tests="3" failures="2"');
  });

  it('sets warning type for non-error results', () => {
    const xml: string = formatJunit([makeResult({ severity: 'warning' })], 1);
    expect(xml).toContain('type="warning"');
  });

  it('produces output even for empty results', () => {
    const xml: string = formatJunit([], 0);
    expect(xml).toContain('<testsuites');
    expect(xml).toContain('tests="0"');
  });
});

// =============================================================================
// formatCompact
// =============================================================================

describe('formatCompact', () => {
  it('returns empty string for no results', () => {
    expect(formatCompact([])).toBe('');
  });

  it('formats each result as a single line', () => {
    const output: string = formatCompact([makeResult()]);
    const lines: string[] = output.trim().split('\n');
    expect(lines.length).toBe(1);
  });

  it('includes file, line, column, severity, ruleId, and message', () => {
    const output: string = formatCompact([makeResult()]);
    expect(output).toContain(':10:5:');
    expect(output).toContain('error');
    expect(output).toContain('test/rule');
    expect(output).toContain('Test error');
  });

  it('outputs multiple results on separate lines', () => {
    const output: string = formatCompact([
      makeResult({ ruleId: 'rule/a', line: 1 }),
      makeResult({ ruleId: 'rule/b', line: 2 }),
    ]);
    const lines: string[] = output.trim().split('\n');
    expect(lines.length).toBe(2);
    expect(lines[0]).toContain('rule/a');
    expect(lines[1]).toContain('rule/b');
  });

  it('shows correct severity for warnings', () => {
    const output: string = formatCompact([makeResult({ severity: 'warning' })]);
    expect(output).toContain('warning');
  });
});

// =============================================================================
// formatResults dispatcher
// =============================================================================

describe('formatResults', () => {
  const ruleDescs: Map<string, string> = new Map();

  it('dispatches to text format', () => {
    const result: string = formatResults([makeResult()], 'text', 1, ruleDescs);
    expect(result).toContain('✗');
  });

  it('dispatches to json format', () => {
    const result: string = formatResults([makeResult()], 'json', 1, ruleDescs);
    expect(() => JSON.parse(result)).not.toThrow();
    expect(result).toContain('"ruleId"');
  });

  it('dispatches to sarif format', () => {
    const result: string = formatResults([makeResult()], 'sarif', 1, ruleDescs);
    expect(result).toContain('sarif-schema-2.1.0');
  });

  it('dispatches to github format', () => {
    const result: string = formatResults([makeResult()], 'github', 1, ruleDescs);
    expect(result).toContain('::error');
  });

  it('dispatches to junit format', () => {
    const result: string = formatResults([makeResult()], 'junit', 1, ruleDescs);
    expect(result).toContain('<testsuites');
  });

  it('dispatches to compact format', () => {
    const result: string = formatResults([makeResult()], 'compact', 1, ruleDescs);
    expect(result).toContain(':10:5:');
  });
});
