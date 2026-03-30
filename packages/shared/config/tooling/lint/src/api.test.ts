/**
 * resist-lint — Programmatic API Tests
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { lint, lintSource } from '@/lint/api.ts';
import type { LintApiResult, LintResultSummary, LintSource as LintSourceType } from '@/lint/api.ts';
import type { LintResult } from '@/lint/framework/types.ts';

// =============================================================================
// lint()
// =============================================================================

describe('lint()', (): void => {
  it('returns ok result with valid options', async (): Promise<void> => {
    const result: LintApiResult<LintResultSummary> = await lint({
      paths: [],
      sources: [{ filePath: 'test.ts', content: 'const x: number = 1;\n' }],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveProperty('results');
      expect(result.data).toHaveProperty('exitCode');
      expect(result.data).toHaveProperty('filesLinted');
      expect(result.data).toHaveProperty('fixesApplied');
      expect(result.data.filesLinted).toBe(1);
      expect(Array.isArray(result.data.results)).toBe(true);
    }
  });

  it('returns error result for invalid locale', async (): Promise<void> => {
    const result: LintApiResult<LintResultSummary> = await lint({
      locale: 'xx-INVALID',
      paths: [],
      sources: [{ filePath: 'test.ts', content: '' }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Unknown locale');
      expect(result.error).toContain('xx-INVALID');
    }
  });

  it('returns exitCode 0 when source has no issues', async (): Promise<void> => {
    const result: LintApiResult<LintResultSummary> = await lint({
      paths: [],
      ruleIds: ['nonexistent-rule-that-matches-nothing'],
      sources: [{ filePath: 'clean.ts', content: 'export const x: number = 1;\n' }],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.exitCode).toBe(0);
      expect(result.data.results.length).toBe(0);
    }
  });

  it('lints in-memory sources without disk I/O', async (): Promise<void> => {
    const source: LintSourceType = {
      filePath: 'virtual.ts',
      content: 'export const x: number = 1;\n',
    };

    const result: LintApiResult<LintResultSummary> = await lint({
      paths: [],
      sources: [source],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.filesLinted).toBe(1);
      /* Results may or may not have issues depending on rules — we just
         verify the pipeline ran without crashing */
      expect(Array.isArray(result.data.results)).toBe(true);
    }
  });

  it('filters by ruleIds on sources', async (): Promise<void> => {
    const result: LintApiResult<LintResultSummary> = await lint({
      paths: [],
      ruleIds: ['nonexistent/fake-rule'],
      sources: [{ filePath: 'test.ts', content: 'const x = 1;\n' }],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      /* No rules match the fake ID, so no results */
      expect(result.data.results.length).toBe(0);
    }
  });

  it('uses default locale (en) when locale is omitted', async (): Promise<void> => {
    const result: LintApiResult<LintResultSummary> = await lint({
      paths: [],
      sources: [{ filePath: 'test.ts', content: '' }],
    });

    expect(result.ok).toBe(true);
  });

  it('accepts explicit en locale', async (): Promise<void> => {
    const result: LintApiResult<LintResultSummary> = await lint({
      locale: 'en',
      paths: [],
      sources: [{ filePath: 'test.ts', content: '' }],
    });

    expect(result.ok).toBe(true);
  });

  it('returns empty results when no paths or sources', async (): Promise<void> => {
    const result: LintApiResult<LintResultSummary> = await lint({
      paths: [],
      sources: [],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.filesLinted).toBe(0);
      expect(result.data.results.length).toBe(0);
    }
  });

  it('handles multiple sources', async (): Promise<void> => {
    const result: LintApiResult<LintResultSummary> = await lint({
      paths: [],
      sources: [
        { filePath: 'a.ts', content: 'export const a: number = 1;\n' },
        { filePath: 'b.ts', content: 'export const b: number = 2;\n' },
        { filePath: 'c.ts', content: 'export const c: number = 3;\n' },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.filesLinted).toBe(3);
    }
  });
});

// =============================================================================
// lintSource()
// =============================================================================

describe('lintSource()', (): void => {
  it('returns ok result for valid source', async (): Promise<void> => {
    const result: LintApiResult<readonly LintResult[]> = await lintSource({
      filePath: 'test.ts',
      content: 'export const x: number = 1;\n',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.isArray(result.data)).toBe(true);
    }
  });

  it('returns error for invalid locale', async (): Promise<void> => {
    const result: LintApiResult<readonly LintResult[]> = await lintSource(
      { filePath: 'test.ts', content: '' },
      { locale: 'zz-BAD' },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Unknown locale');
    }
  });

  it('filters by ruleIds', async (): Promise<void> => {
    const result: LintApiResult<readonly LintResult[]> = await lintSource(
      { filePath: 'test.ts', content: 'const x = 1;\n' },
      { ruleIds: ['nonexistent/fake-rule'] },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBe(0);
    }
  });

  it('returns results with correct file path', async (): Promise<void> => {
    const result: LintApiResult<readonly LintResult[]> = await lintSource({
      filePath: 'my-module.ts',
      content: 'export const x: number = 1;\n',
    });

    expect(result.ok).toBe(true);
    if (result.ok && result.data.length > 0) {
      for (const r of result.data) {
        expect(r.file).toBe('my-module.ts');
      }
    }
  });

  it('handles empty content', async (): Promise<void> => {
    const result: LintApiResult<readonly LintResult[]> = await lintSource({
      filePath: 'empty.ts',
      content: '',
    });

    expect(result.ok).toBe(true);
  });
});

// =============================================================================
// Integration Tests — real files and rules
// =============================================================================

describe('integration', (): void => {
  it('lint() with a real file path returns well-formed results', async (): Promise<void> => {
    const result: LintApiResult<LintResultSummary> = await lint({
      paths: ['packages/shared/config/tooling/lint/src/constants.ts'],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.filesLinted).toBeGreaterThanOrEqual(1);
      expect(typeof result.data.exitCode).toBe('number');
      expect(result.data.exitCode === 0 || result.data.exitCode === 1).toBe(true);
      expect(typeof result.data.fixesApplied).toBe('number');

      /* Verify each result has required LintResult fields */
      for (const r of result.data.results) {
        expect(typeof r.file).toBe('string');
        expect(r.file.length).toBeGreaterThan(0);
        expect(typeof r.line).toBe('number');
        expect(r.line).toBeGreaterThanOrEqual(1);
        expect(typeof r.column).toBe('number');
        expect(r.column).toBeGreaterThanOrEqual(1);
        expect(typeof r.ruleId).toBe('string');
        expect(r.ruleId.length).toBeGreaterThan(0);
        expect(['error', 'warning', 'info']).toContain(r.severity);
        expect(typeof r.message).toBe('string');
        expect(r.message.length).toBeGreaterThan(0);
      }
    }
  });

  it('lint() filters by ruleIds on real files', async (): Promise<void> => {
    const result: LintApiResult<LintResultSummary> = await lint({
      paths: ['packages/shared/config/tooling/lint/src/constants.ts'],
      ruleIds: ['jsdoc/require-param'],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      /* All results should belong to the filtered rule */
      for (const r of result.data.results) {
        expect(r.ruleId).toBe('jsdoc/require-param');
      }
    }
  });

  it('lint() with invalid locale returns error Result', async (): Promise<void> => {
    const result: LintApiResult<LintResultSummary> = await lint({
      locale: 'invalid',
      paths: ['packages/shared/config/tooling/lint/src/constants.ts'],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Unknown locale');
      expect(result.error).toContain('invalid');
      expect(result.error).toContain('en');
    }
  });

  it('lint() with explicit en locale works on real files', async (): Promise<void> => {
    const result: LintApiResult<LintResultSummary> = await lint({
      locale: 'en',
      paths: ['packages/shared/config/tooling/lint/src/constants.ts'],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.filesLinted).toBeGreaterThanOrEqual(1);
    }
  });

  it('lint() with categories filter only returns matching rules', async (): Promise<void> => {
    const result: LintApiResult<LintResultSummary> = await lint({
      categories: ['nonexistent-category-xyz'],
      paths: ['packages/shared/config/tooling/lint/src/constants.ts'],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      /* No rules should match this fake category */
      expect(result.data.results.length).toBe(0);
    }
  });

  it('lint() defaults to config include paths when no paths provided', async (): Promise<void> => {
    const result: LintApiResult<LintResultSummary> = await lint();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.filesLinted).toBeGreaterThan(0);
    }
  }, 30_000);

  it('lintSource() results have correct structure', async (): Promise<void> => {
    /* Use code that will definitely trigger a rule */
    const result: LintApiResult<readonly LintResult[]> = await lintSource({
      filePath: 'test-file.ts',
      content: [
        '/* eslint-disable */',
        'function foo(a: string, b: number): void {',
        '  console.log(a, b);',
        '}',
        '',
      ].join('\n'),
    });

    expect(result.ok).toBe(true);
    if (result.ok && result.data.length > 0) {
      const r: LintResult = result.data[0]!;
      expect(r.file).toBe('test-file.ts');
      expect(typeof r.line).toBe('number');
      expect(typeof r.column).toBe('number');
      expect(typeof r.ruleId).toBe('string');
      expect(typeof r.severity).toBe('string');
      expect(typeof r.message).toBe('string');
    }
  });
});
