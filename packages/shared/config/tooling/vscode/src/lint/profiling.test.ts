/**
 * Tests for Performance Profiling.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import { parseTimingOutput, formatTimingReport, type TimingEntry } from './profiling';

describe('parseTimingOutput', () => {
  it('parses standard timing format', () => {
    const output = 'no-console: 150ms\nno-var: 80ms\njsdoc/require-param: 45ms\n';
    const entries = parseTimingOutput(output);

    expect(entries).toHaveLength(3);
    expect(entries[0]!).toEqual({ rule: 'no-console', ms: 150 });
    expect(entries[1]!).toEqual({ rule: 'no-var', ms: 80 });
    expect(entries[2]!).toEqual({ rule: 'jsdoc/require-param', ms: 45 });
  });

  it('sorts by time descending', () => {
    const output = 'rule-a: 10ms\nrule-b: 100ms\nrule-c: 50ms\n';
    const entries = parseTimingOutput(output);

    expect(entries[0]!.rule).toBe('rule-b');
    expect(entries[1]!.rule).toBe('rule-c');
    expect(entries[2]!.rule).toBe('rule-a');
  });

  it('handles decimal milliseconds', () => {
    const output = 'rule-a: 12.5ms\n';
    const entries = parseTimingOutput(output);

    expect(entries).toHaveLength(1);
    expect(entries[0]!.ms).toBe(12.5);
  });

  it('returns empty array for non-timing output', () => {
    const output = 'some random output\nno timing here\n';
    const entries = parseTimingOutput(output);

    expect(entries).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(parseTimingOutput('')).toHaveLength(0);
  });
});

describe('formatTimingReport', () => {
  it('formats entries as readable report', () => {
    const entries: TimingEntry[] = [
      { rule: 'no-console', ms: 150 },
      { rule: 'no-var', ms: 80 },
    ];

    const report = formatTimingReport(entries);

    expect(report).toContain('Performance Timing');
    expect(report).toContain('no-console');
    expect(report).toContain('150');
    expect(report).toContain('no-var');
    expect(report).toContain('80');
    expect(report).toContain('Total');
    expect(report).toContain('2 rules');
  });

  it('shows no-data message for empty entries', () => {
    const report = formatTimingReport([]);
    expect(report).toContain('No timing data');
  });
});
