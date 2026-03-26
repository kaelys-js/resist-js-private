/**
 * Tests for output formatters (text, JSON, SARIF).
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { formatText, formatJson, formatSarif, formatResults } from './formatters.ts';
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

  it('formats a single error with summary', () => {
    const text: string = formatText([makeResult()], 5);
    expect(text).toContain('✗');
    expect(text).toContain('Test error');
    expect(text).toContain('[test/rule]');
    expect(text).toContain('1 error(s) and 0 warning(s) in 5 file(s)');
  });

  it('shows warning icon for warnings', () => {
    const text: string = formatText([makeResult({ severity: 'warning' })], 1);
    expect(text).toContain('⚠');
  });

  it('includes source snippet when present', () => {
    const text: string = formatText([makeResult({ source: 'const x = 42;' })], 1);
    expect(text).toContain('│ const x = 42;');
  });

  it('includes tip when present', () => {
    const text: string = formatText([makeResult({ tip: 'Add type annotation' })], 1);
    expect(text).toContain('→ Add type annotation');
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
});
