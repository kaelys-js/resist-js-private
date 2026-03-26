/**
 * Tests for locale schema and format utility.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import * as v from 'valibot';

import { format, LintStringsSchema } from './schema.ts';
import { en } from './locales/en.ts';

// =============================================================================
// format
// =============================================================================

describe('format', () => {
  it('replaces single placeholder', () => {
    const result: string = format('Hello, {name}!', { name: 'World' });
    expect(result).toBe('Hello, World!');
  });

  it('replaces multiple placeholders', () => {
    const result: string = format('Found {errors} error(s) in {files} file(s).', {
      errors: 3,
      files: 10,
    });
    expect(result).toBe('Found 3 error(s) in 10 file(s).');
  });

  it('replaces all occurrences of the same placeholder', () => {
    const result: string = format('{x} + {x} = {y}', { x: 2, y: 4 });
    expect(result).toBe('2 + 2 = 4');
  });

  it('returns template unchanged when no params match', () => {
    const result: string = format('No placeholders here', {});
    expect(result).toBe('No placeholders here');
  });

  it('handles numeric values', () => {
    const result: string = format('Line {line}, column {col}', { line: 42, col: 7 });
    expect(result).toBe('Line 42, column 7');
  });

  it('handles empty string values', () => {
    const result: string = format('prefix{sep}suffix', { sep: '' });
    expect(result).toBe('prefixsuffix');
  });
});

// =============================================================================
// LintStringsSchema
// =============================================================================

describe('LintStringsSchema', () => {
  it('validates the English locale', () => {
    const result: v.SafeParseResult<typeof LintStringsSchema> = v.safeParse(LintStringsSchema, en);
    expect(result.success).toBe(true);
  });

  it('rejects missing fields', () => {
    const result: v.SafeParseResult<typeof LintStringsSchema> = v.safeParse(LintStringsSchema, {});
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// English locale completeness
// =============================================================================

describe('en locale', () => {
  it('has all CLI sections', () => {
    expect(en.cli.title).toContain('{name}');
    expect(en.cli.usageHeader).toBe('USAGE');
    expect(en.cli.optionsHeader).toBe('OPTIONS');
    expect(en.cli.examplesHeader).toBe('EXAMPLES');
  });

  it('has all flag descriptions', () => {
    const { flags } = en;
    expect(Object.keys(flags).length).toBeGreaterThanOrEqual(20);
    for (const [key, value] of Object.entries(flags)) {
      expect(value.length, `flags.${key} should not be empty`).toBeGreaterThan(0);
    }
  });

  it('has output strings with placeholders', () => {
    expect(en.output.summary).toContain('{errors}');
    expect(en.output.summary).toContain('{warnings}');
    expect(en.output.summary).toContain('{files}');
  });

  it('has debug strings with placeholders', () => {
    expect(en.debug.configLoaded).toContain('{path}');
    expect(en.debug.rulesLoaded).toContain('{tsCount}');
    expect(en.debug.filesFound).toContain('{fileCount}');
    expect(en.debug.totalTime).toContain('{ms}');
  });

  it('renders summary correctly', () => {
    const summary: string = format(en.output.summary, {
      errors: 5,
      warnings: 3,
      files: 42,
    });
    expect(summary).toBe('Found 5 error(s) and 3 warning(s) in 42 file(s).');
  });
});
