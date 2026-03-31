/**
 * Tests for Locale Module
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-57.md TASK 2
 */

import { describe, it, expect } from 'vitest';
import { format, formatPlural, formatNumber } from './schema';
import { en } from './en';
import type { VscodeStrings } from './schema';

describe('Locale', () => {
  describe('format', () => {
    it('replaces single placeholder', () => {
      expect(format('Hello {name}', { name: 'World' })).toBe('Hello World');
    });

    it('replaces multiple placeholders', () => {
      expect(format('{a} and {b}', { a: 'X', b: 'Y' })).toBe('X and Y');
    });

    it('replaces numeric values', () => {
      expect(format('Found {count} items', { count: 42 })).toBe('Found 42 items');
    });

    it('replaces all occurrences of the same placeholder', () => {
      expect(format('{x} plus {x}', { x: '1' })).toBe('1 plus 1');
    });

    it('returns template unchanged when no placeholders match', () => {
      expect(format('No placeholders here', { a: '1' })).toBe('No placeholders here');
    });

    it('leaves unmatched placeholders as-is', () => {
      expect(format('{a} and {b}', { a: 'X' })).toBe('X and {b}');
    });
  });

  describe('en locale', () => {
    it('satisfies VscodeStrings interface', () => {
      const strings: VscodeStrings = en;
      expect(strings).toBeDefined();
    });

    it('has all output strings', () => {
      expect(en.output.channelName).toBe('Resist');
      expect(en.output.errorPrefix).toBe('ERROR');
      expect(en.output.activated).toBeTruthy();
    });

    it('has all status bar strings', () => {
      expect(en.statusBar.tooltip).toContain('Resist');
      expect(en.statusBar.ready).toContain('$(check)');
      expect(en.statusBar.linting).toContain('$(sync~spin)');
      expect(en.statusBar.error).toContain('$(error)');
      expect(en.statusBar.disabled).toContain('$(circle-slash)');
    });

    it('has all message strings', () => {
      expect(en.messages.binaryNotFound).toContain('resist-lint');
      expect(en.messages.noWorkspaceFolder).toBeTruthy();
      expect(en.messages.noFixableProblems).toBeTruthy();
      expect(en.messages.fixRejected).toBeTruthy();
      expect(en.messages.diagnosticsCleared).toBeTruthy();
      expect(en.messages.linterRestarted).toBeTruthy();
    });

    it('has parameterized message strings', () => {
      expect(format(en.messages.fixesApplied, { count: 3 })).toBe('Applied 3 auto-fix(es)');
      expect(format(en.messages.lintFailed, { file: 'a.ts', error: 'boom' })).toBe(
        'Lint failed for a.ts: boom',
      );
      expect(format(en.messages.foundDiagnostics, { count: 10 })).toBe('Found 10 diagnostics');
      expect(format(en.messages.progressFiles, { processed: 5, total: 20 })).toBe('5/20 files');
      expect(en.messages.availableRulesHeader).toBe('=== Available Rules ===');
    });

    it('has all progress strings', () => {
      expect(en.progress.workspace).toContain('workspace');
      expect(en.progress.staged).toContain('staged');
      expect(en.progress.uncommitted).toContain('uncommitted');
    });

    it('has all code action strings', () => {
      expect(format(en.codeActions.fix, { rule: 'no-var' })).toBe('Fix: no-var');
      expect(format(en.codeActions.fixWithTip, { rule: 'no-var', tip: 'Use let' })).toBe(
        'Fix: no-var — Use let',
      );
      expect(format(en.codeActions.fixAll, { count: 5 })).toBe('Fix all auto-fixable problems (5)');
    });
  });

  describe('formatPlural', () => {
    it('returns singular form for count 1', () => {
      expect(formatPlural(1, { one: '# error', other: '# errors' })).toBe('1 error');
    });

    it('returns plural form for count 0', () => {
      expect(formatPlural(0, { one: '# error', other: '# errors' })).toBe('0 errors');
    });

    it('returns plural form for count > 1', () => {
      expect(formatPlural(5, { one: '# warning', other: '# warnings' })).toBe('5 warnings');
    });

    it('replaces all # placeholders in form', () => {
      expect(formatPlural(3, { one: '#/#', other: '#/# items' })).toBe('3/3 items');
    });

    it('works with custom locale', () => {
      expect(formatPlural(1, { one: '# file', other: '# files' }, 'en-US')).toBe('1 file');
    });

    it('falls back to count === 1 check on invalid locale', () => {
      expect(formatPlural(1, { one: '# item', other: '# items' }, 'invalid-locale-xxx')).toBe(
        '1 item',
      );
      expect(formatPlural(2, { one: '# item', other: '# items' }, 'invalid-locale-xxx')).toBe(
        '2 items',
      );
    });

    it('handles large numbers', () => {
      expect(formatPlural(1000000, { one: '# result', other: '# results' })).toBe(
        '1000000 results',
      );
    });

    it('works with en locale plurals strings', () => {
      expect(formatPlural(1, { one: en.plurals.error, other: en.plurals.errors })).toBe('error');
      expect(formatPlural(2, { one: en.plurals.error, other: en.plurals.errors })).toBe('errors');
    });
  });

  describe('formatNumber', () => {
    it('formats integer with locale separators', () => {
      const result = formatNumber(1000, 'en');
      expect(result).toBe('1,000');
    });

    it('formats zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('formats negative numbers', () => {
      const result = formatNumber(-1234, 'en');
      expect(result).toContain('1,234');
    });

    it('formats decimal numbers', () => {
      const result = formatNumber(3.14, 'en');
      expect(result).toBe('3.14');
    });

    it('formats large numbers with separators', () => {
      const result = formatNumber(1000000, 'en');
      expect(result).toBe('1,000,000');
    });

    it('defaults to en locale', () => {
      const result = formatNumber(1000);
      expect(result).toBe('1,000');
    });

    it('falls back to String(value) on invalid locale', () => {
      // Intl.NumberFormat may throw on invalid locale — fallback should be plain string
      const result = formatNumber(42, 'invalid-locale-xxx');
      // Either formatted or plain string fallback
      expect(result).toBeTruthy();
      expect(result).toContain('42');
    });
  });
});
