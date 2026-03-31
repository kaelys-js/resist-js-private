/**
 * Tests for Locale Module
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-57.md TASK 2
 */

import { describe, it, expect } from 'vitest';
import { format } from './schema';
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
});
