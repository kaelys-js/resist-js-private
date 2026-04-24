/**
 * Tests for the base Vitest preset configuration object.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { baseTestConfig } from './base';

describe('baseTestConfig', () => {
  it('is defined', () => {
    expect(baseTestConfig).toBeDefined();
  });

  it('disables globals by default', () => {
    expect(baseTestConfig?.globals).toBe(false);
  });

  it('enables restoreMocks', () => {
    expect(baseTestConfig?.restoreMocks).toBe(true);
  });

  it('enables isolate', () => {
    expect(baseTestConfig?.isolate).toBe(true);
  });

  it('uses the threads pool', () => {
    expect(baseTestConfig?.pool).toBe('threads');
  });

  it('disables sequence shuffle', () => {
    expect(baseTestConfig?.sequence).toEqual({ shuffle: false });
  });

  it('enables passWithNoTests', () => {
    expect(baseTestConfig?.passWithNoTests).toBe(true);
  });

  it('sets bail to 0', () => {
    expect(baseTestConfig?.bail).toBe(0);
  });

  it('sets retry to 0', () => {
    expect(baseTestConfig?.retry).toBe(0);
  });

  it('uses 10s test and hook timeouts', () => {
    expect(baseTestConfig?.testTimeout).toBe(10_000);
    expect(baseTestConfig?.hookTimeout).toBe(10_000);
  });

  it('includes colocated test files', () => {
    expect(baseTestConfig?.include).toEqual(['src/**/*.test.ts']);
  });

  it('configures benchmark include and reporter', () => {
    expect(baseTestConfig?.benchmark).toEqual({
      include: ['src/**/*.bench.ts'],
      reporters: ['default'],
    });
  });

  describe('coverage', () => {
    const coverage = baseTestConfig?.coverage as Record<string, unknown> | undefined;

    it('uses v8 provider', () => {
      expect(coverage?.provider).toBe('v8');
    });

    it('includes all src .ts files', () => {
      expect(coverage?.include).toEqual(['src/**/*.ts']);
    });

    it('excludes test, spec, bench, and .d.ts files', () => {
      expect(coverage?.exclude).toEqual([
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/*.bench.ts',
        'src/**/*.d.ts',
      ]);
    });

    it('applies industry-standard thresholds (S:80 B:75 F:80 L:80)', () => {
      expect(coverage?.thresholds).toEqual({
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      });
    });

    it('writes reports to ./coverage', () => {
      expect(coverage?.reportsDirectory).toBe('coverage');
    });

    it('uses text-summary, json, and html reporters', () => {
      expect(coverage?.reporter).toEqual(['text-summary', 'json', 'html']);
    });

    it('enables skipFull', () => {
      expect(coverage?.skipFull).toBe(true);
    });

    it('enables reportOnFailure', () => {
      expect(coverage?.reportOnFailure).toBe(true);
    });
  });

  it('uses default and json reporters', () => {
    expect(baseTestConfig?.reporters).toEqual(['default', 'json']);
  });

  it('writes json test results to coverage/test-results.json', () => {
    expect(baseTestConfig?.outputFile).toEqual({ json: 'coverage/test-results.json' });
  });
});
