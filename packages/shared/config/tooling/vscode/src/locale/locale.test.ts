/**
 * Tests for Locale Module
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-57.md TASK 2
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import { format, formatPlural, type VscodeStrings } from './schema';
import { en } from './en';
import { BRAND_NAME, BINARY_NAME } from '../shared/brand';

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
      expect(en.output.channelName).toBe(BRAND_NAME);
      expect(en.output.errorPrefix).toBe('ERROR');
      expect(en.output.activated).toBeTruthy();
    });

    it('has all status bar strings', () => {
      expect(en.statusBar.tooltip).toContain(BRAND_NAME);
      expect(en.statusBar.ready).toContain('$(check)');
      expect(en.statusBar.linting).toContain('$(sync~spin)');
      expect(en.statusBar.error).toContain('$(error)');
      expect(en.statusBar.disabled).toContain('$(circle-slash)');
    });

    it('has all message strings', () => {
      expect(en.messages.binaryNotFound).toContain(BINARY_NAME);
      expect(en.messages.noWorkspaceFolder).toBeTruthy();
      expect(en.messages.noFixableProblems).toBeTruthy();
      expect(en.messages.fixRejected).toBeTruthy();
      expect(en.messages.diagnosticsCleared).toBeTruthy();
      expect(en.messages.linterRestarted).toBeTruthy();
    });

    it('has parameterized message strings', () => {
      expect(format(en.messages.fixesApplied, { count: 3 })).toBe('Applied 3 fixes');
      expect(format(en.messages.lintFailed, { file: 'a.ts', error: 'boom' })).toBe(
        'Lint failed for a.ts: boom',
      );
      expect(format(en.messages.foundDiagnostics, { count: 10 })).toBe('Set 10 diagnostics');
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

  describe('exhaustive field existence', () => {
    /**
     * Helper: asserts every value in an object is a non-empty string.
     *
     * @param group - The string record to check
     * @param label - Label used in assertion messages
     */
    function assertAllStrings(group: Record<string, string>, label: string): void {
      for (const [key, value] of Object.entries(group)) {
        expect(typeof value).toBe('string');
        expect(value.length, `${label}.${key} should be non-empty`).toBeGreaterThan(0);
      }
    }

    it('documentFilter has all fields', () => {
      assertAllStrings(en.documentFilter, 'documentFilter');
      expect(en.documentFilter.iterationError).toContain('{file}');
    });

    it('notifications has all fields', () => {
      assertAllStrings(en.notifications, 'notifications');
      expect(en.notifications.suppressed).toContain('{key}');
    });

    it('config has all fields', () => {
      assertAllStrings(en.config, 'config');
      expect(en.config.changeDetected).toContain('{section}');
    });

    it('lifecycle has all fields', () => {
      assertAllStrings(en.lifecycle, 'lifecycle');
      expect(en.lifecycle.disposing).toContain('{name}');
      expect(en.lifecycle.disposed).toContain('{count}');
      expect(en.lifecycle.disposalError).toContain('{name}');
    });

    it('watcher has all fields', () => {
      assertAllStrings(en.watcher, 'watcher');
      expect(en.watcher.configChanged).toContain('{pattern}');
      expect(en.watcher.batchFired).toContain('{count}');
      expect(en.watcher.relintError).toContain('{file}');
    });

    it('progressHelper has all fields', () => {
      assertAllStrings(en.progressHelper, 'progressHelper');
      expect(en.progressHelper.processing).toContain('{file}');
      expect(en.progressHelper.fileError).toContain('{error}');
    });

    it('state has all fields', () => {
      assertAllStrings(en.state, 'state');
      expect(en.state.transitioned).toContain('{tool}');
      expect(en.state.observerError).toContain('{tool}');
    });

    it('diagnosticManager has all fields', () => {
      assertAllStrings(en.diagnosticManager, 'diagnosticManager');
      expect(en.diagnosticManager.maxProblemsReached).toContain('{max}');
      expect(en.diagnosticManager.invalidEntry).toContain('{reason}');
      expect(en.diagnosticManager.skippedEntries).toContain('{count}');
    });

    it('runner has all fields', () => {
      assertAllStrings(en.runner, 'runner');
      expect(en.runner.timeout).toContain('{ms}');
      expect(en.runner.spawnFailed).toContain('{error}');
      expect(en.runner.exitCode).toContain('{code}');
      expect(en.runner.jsonParseFailed).toContain('{error}');
    });

    it('errorBoundary has all fields', () => {
      assertAllStrings(en.errorBoundary, 'errorBoundary');
      expect(en.errorBoundary.errorLog).toContain('{label}');
    });

    it('events has all fields', () => {
      assertAllStrings(en.events, 'events');
      expect(en.events.handlerError).toContain('{error}');
    });

    it('fixOnSave has all fields', () => {
      assertAllStrings(en.fixOnSave, 'fixOnSave');
      expect(en.fixOnSave.applied).toContain('{count}');
    });

    it('codeLens has all fields', () => {
      assertAllStrings(en.codeLens, 'codeLens');
      expect(en.codeLens.issueCount).toContain('{rule}');
    });

    it('diffPreview has all fields', () => {
      assertAllStrings(en.diffPreview, 'diffPreview');
      expect(en.diffPreview.title).toContain('{file}');
    });

    it('formatting has all fields', () => {
      assertAllStrings(en.formatting, 'formatting');
      expect(en.formatting.applied).toContain('{count}');
    });

    it('filter has all fields', () => {
      assertAllStrings(en.filter, 'filter');
      expect(en.filter.filterApplied).toContain('{categories}');
    });

    it('perFolder has all fields', () => {
      assertAllStrings(en.perFolder, 'perFolder');
      expect(en.perFolder.resolved).toContain('{folder}');
    });

    it('staleCleanup has all fields', () => {
      assertAllStrings(en.staleCleanup, 'staleCleanup');
      expect(en.staleCleanup.cleared).toContain('{count}');
      expect(en.staleCleanup.skippedVisible).toContain('{file}');
    });

    it('imports has all fields', () => {
      assertAllStrings(en.imports, 'imports');
      expect(en.imports.removedCount).toContain('{count}');
    });

    it('stageIndicator has all fields', () => {
      assertAllStrings(en.stageIndicator, 'stageIndicator');
      expect(en.stageIndicator.currentStage).toContain('{stage}');
      expect(en.stageIndicator.stageChanged).toContain('{stage}');
    });

    it('hover has all fields', () => {
      assertAllStrings(en.hover, 'hover');
    });

    it('plurals has all fields', () => {
      assertAllStrings(en.plurals, 'plurals');
    });

    it('all 30 VscodeStrings groups are present', () => {
      const groups = Object.keys(en);
      expect(groups).toHaveLength(30);
      const expected = [
        'output',
        'statusBar',
        'messages',
        'progress',
        'codeActions',
        'documentFilter',
        'notifications',
        'config',
        'lifecycle',
        'watcher',
        'progressHelper',
        'state',
        'diagnosticManager',
        'runner',
        'errorBoundary',
        'plurals',
        'events',
        'fixOnSave',
        'codeLens',
        'diffPreview',
        'formatting',
        'filter',
        'perFolder',
        'staleCleanup',
        'imports',
        'hover',
        'rulesViewer',
        'statusBarMenu',
        'stageIndicator',
        'panel',
      ];

      for (const group of expected) {
        expect(en).toHaveProperty(group);
      }
    });
  });

  describe('parameterized string formatting', () => {
    it('documentFilter.iterationError formats correctly', () => {
      const result = format(en.documentFilter.iterationError, { file: 'a.ts', error: 'boom' });
      expect(result).toBe('Document iteration failed for a.ts: boom');
      expect(result).not.toContain('{');
    });

    it('notifications.suppressed formats correctly', () => {
      const result = format(en.notifications.suppressed, { key: 'missing-binary' });
      expect(result).not.toContain('{');
    });

    it('config strings format correctly', () => {
      expect(format(en.config.changeDetected, { section: 'lint' })).not.toContain('{');
    });

    it('lifecycle strings format correctly', () => {
      expect(format(en.lifecycle.disposing, { name: 'debouncer' })).not.toContain('{');
      expect(format(en.lifecycle.disposed, { count: 3 })).not.toContain('{');
      expect(format(en.lifecycle.disposalError, { name: 'watcher', error: 'e' })).not.toContain(
        '{',
      );
    });

    it('watcher strings format correctly', () => {
      expect(format(en.watcher.configChanged, { pattern: '*.ts' })).not.toContain('{');
      expect(format(en.watcher.batchFired, { count: 5 })).not.toContain('{');
      expect(format(en.watcher.relintError, { file: 'x.ts', error: 'e' })).not.toContain('{');
    });

    it('progressHelper strings format correctly', () => {
      expect(format(en.progressHelper.processing, { file: 'a.ts' })).not.toContain('{');
      expect(format(en.progressHelper.fileError, { file: 'a.ts', error: 'e' })).not.toContain('{');
    });

    it('state strings format correctly', () => {
      const t = format(en.state.transitioned, { tool: 'Lint', from: 'Ready', to: 'Running' });
      expect(t).toBe('[Lint] Ready → Running');
      expect(format(en.state.observerError, { tool: 'lint', error: 'e' })).not.toContain('{');
    });

    it('diagnosticManager strings format correctly', () => {
      expect(format(en.diagnosticManager.maxProblemsReached, { max: 100 })).not.toContain('{');
      expect(format(en.diagnosticManager.invalidEntry, { reason: 'bad' })).not.toContain('{');
      expect(format(en.diagnosticManager.invalidReason, { line: 5 })).not.toContain('{');
      expect(format(en.diagnosticManager.skippedEntries, { count: 2, file: 'x.ts' })).not.toContain(
        '{',
      );
    });

    it('runner strings format correctly', () => {
      expect(format(en.runner.timeout, { ms: 5000 })).not.toContain('{');
      expect(format(en.runner.spawnFailed, { error: 'ENOENT' })).not.toContain('{');
      expect(format(en.runner.exitCode, { code: 1 })).not.toContain('{');
      expect(format(en.runner.jsonParseFailed, { error: 'e', preview: '...' })).not.toContain('{');
    });

    it('errorBoundary.errorLog formats correctly', () => {
      expect(format(en.errorBoundary.errorLog, { label: 'lint', message: 'e' })).toBe('lint: e');
    });

    it('events strings format correctly', () => {
      expect(
        format(en.events.handlerError, { tool: 'lint', event: 'save', error: 'e' }),
      ).not.toContain('{');
    });

    it('fixOnSave strings format correctly', () => {
      expect(format(en.fixOnSave.applied, { count: 3 })).toBe('Auto-fixed 3 problems on save');
    });

    it('codeLens strings format correctly', () => {
      expect(format(en.codeLens.issueCount, { rule: 'no-var', count: 2 })).not.toContain('{');
    });

    it('diffPreview.title formats correctly', () => {
      expect(format(en.diffPreview.title, { file: 'main.ts' })).not.toContain('{');
    });

    it('formatting strings format correctly', () => {
      expect(format(en.formatting.applied, { count: 5 })).not.toContain('{');
    });

    it('filter strings format correctly', () => {
      expect(format(en.filter.filterApplied, { categories: 'style,lint' })).not.toContain('{');
    });

    it('perFolder strings format correctly', () => {
      expect(format(en.perFolder.resolved, { folder: '/src' })).not.toContain('{');
    });

    it('staleCleanup strings format correctly', () => {
      expect(format(en.staleCleanup.cleared, { count: 3 })).not.toContain('{');
      expect(format(en.staleCleanup.skippedVisible, { file: 'a.ts' })).not.toContain('{');
    });

    it('imports strings format correctly', () => {
      expect(format(en.imports.removedCount, { count: 2 })).toBe('Removed 2 unused imports');
    });

    it('stageIndicator strings format correctly', () => {
      expect(format(en.stageIndicator.currentStage, { stage: 'lint' })).not.toContain('{');
      expect(format(en.stageIndicator.stageChanged, { stage: 'build' })).not.toContain('{');
    });

    it('messages strings with multiple params format correctly', () => {
      expect(
        format(en.messages.diagnosticMapFailed, { rule: 'no-var', location: '1:5', error: 'e' }),
      ).not.toContain('{');
      expect(format(en.messages.stderrOutput, { output: 'warning' })).not.toContain('{');
      expect(format(en.messages.workspaceLintFailed, { error: 'e' })).not.toContain('{');
      expect(format(en.messages.timingReportFailed, { error: 'e' })).not.toContain('{');
      expect(format(en.messages.skipBinaryNotFound, { file: 'a.ts' })).not.toContain('{');
      expect(format(en.messages.skipWorkspaceNotFound, { file: 'a.ts' })).not.toContain('{');
      expect(format(en.messages.lintedFile, { file: 'a.ts' })).not.toContain('{');
    });

    it('codeActions error strings format correctly', () => {
      expect(format(en.codeActions.actionFailed, { rule: 'no-var', error: 'boom' })).not.toContain(
        '{',
      );
      expect(format(en.codeActions.fixAllFailed, { error: 'boom' })).not.toContain('{');
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
      expect(formatPlural(1_000_000, { one: '# result', other: '# results' })).toBe(
        '1000000 results',
      );
    });

    it('works with en locale plurals strings', () => {
      expect(formatPlural(1, { one: en.plurals.error, other: en.plurals.errors })).toBe('1 error');
      expect(formatPlural(2, { one: en.plurals.error, other: en.plurals.errors })).toBe('2 errors');
    });
  });
});
