/**
 * Tests for locale schema and format utility.
 *
 * @module
 */

import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { en } from './locales/en.ts';
import { format, LintStringsSchema } from './schema.ts';

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
    const result: string = format('Line {line}, column {col}', { col: 7, line: 42 });
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
      files: 42,
      warnings: 3,
    });
    expect(summary).toBe('Found 5 error(s) and 3 warning(s) in 42 file(s).');
  });

  it('has error strings with placeholders', () => {
    expect(en.errors.crash).toContain('{error}');
    expect(en.errors.pathNotFound).toContain('{path}');
    expect(en.errors.workerError).toContain('{taskId}');
    expect(en.errors.workerError).toContain('{error}');
    expect(en.errors.fixFailed).toContain('{filePath}');
    expect(en.errors.fixApplied).toContain('{count}');
    expect(en.errors.usageError).toContain('{name}');
    expect(en.errors.usageErrorConfig).toContain('{configFilename}');
    expect(en.errors.ruleLoadFailed).toContain('{path}');
    expect(en.errors.duplicateRule).toContain('{ruleId}');
    expect(en.errors.invalidJsonc).toContain('{path}');
    expect(en.errors.invalidConfig).toContain('{path}');
    expect(en.errors.workerNotFound).toContain('{index}');
    expect(en.errors.jsonParseError.length).toBeGreaterThan(0);
  });

  it('renders error strings correctly', () => {
    const crash: string = format(en.errors.crash, { error: 'OOM' });
    expect(crash).toBe('Linter crashed: OOM');

    const invalidJsonc: string = format(en.errors.invalidJsonc, {
      error: 'Unexpected token',
      path: '/cfg.json',
    });
    expect(invalidJsonc).toBe('Invalid JSONC in /cfg.json: Unexpected token');

    const workerNotFound: string = format(en.errors.workerNotFound, { index: 3 });
    expect(workerNotFound).toBe('Worker 3 not found');
  });

  it('has tool strings with placeholders', () => {
    expect(en.tools.knipUnusedFile.length).toBeGreaterThan(0);
    expect(en.tools.knipUnusedFileTip.length).toBeGreaterThan(0);
    expect(en.tools.knipUnused).toContain('{issueType}');
    expect(en.tools.knipUnusedExport).toContain('{symbol}');
    expect(en.tools.knipUnusedType).toContain('{symbol}');
    expect(en.tools.knipUnusedDep).toContain('{symbol}');
    expect(en.tools.knipUnusedDevDep).toContain('{symbol}');
    expect(en.tools.typosMisspelling).toContain('{typo}');
    expect(en.tools.typosMisspelling).toContain('{correction}');
    expect(en.tools.typosFix).toContain('{typo}');
    expect(en.tools.typosFix).toContain('{correction}');
  });

  it('renders tool strings correctly', () => {
    const unused: string = format(en.tools.knipUnused, { issueType: 'exports' });
    expect(unused).toBe('Unused exports detected');

    const misspelling: string = format(en.tools.typosMisspelling, {
      correction: 'the',
      typo: 'teh',
    });
    expect(misspelling).toBe('"teh" should be "the"');
  });

  it('has listRulesFormat strings', () => {
    expect(en.listRulesFormat.debugPrefix).toBe('[debug]');
    expect(en.listRulesFormat.patternsLabel).toBe('patterns:');
    expect(en.listRulesFormat.categoriesLabel).toBe('categories:');
    expect(en.listRulesFormat.stagesLabel).toBe('stages:');
  });
});
