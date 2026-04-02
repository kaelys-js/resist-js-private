/**
 * Tests for Status Bar Management
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-55.md TASK 13
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateStatusBar, createToolStatusBar, getFileDiagnosticCounts } from './status-bar';
import * as vscode from 'vscode';
import { BRAND_NAME } from './brand';

describe('Status Bar', () => {
  let statusBarItem: ReturnType<typeof vscode.window.createStatusBarItem>;

  beforeEach(() => {
    vi.clearAllMocks();
    const context = {
      subscriptions: [] as Array<{ dispose: () => void }>,
    } as unknown as vscode.ExtensionContext;
    statusBarItem = createToolStatusBar(context, 'Lint');
  });

  it('updateStatusBar("ready") shows check icon', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready');
    expect(statusBarItem.text).toBe(`$(check) ${BRAND_NAME}`);
    expect(statusBarItem.backgroundColor).toBeUndefined();
  });

  it('updateStatusBar("ready") with counts shows branded prefix with pluralized counts', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready', {
      errors: 3,
      warnings: 7,
    });
    expect(statusBarItem.text).toBe(
      `$(check) ${BRAND_NAME}: $(error) 3 errors, $(warning) 7 warnings`,
    );
  });

  it('updateStatusBar("ready") with only errors shows branded prefix with error count', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready', {
      errors: 5,
      warnings: 0,
    });
    expect(statusBarItem.text).toBe(`$(check) ${BRAND_NAME}: $(error) 5 errors`);
  });

  it('updateStatusBar("ready") with only warnings shows branded prefix with warning count', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready', {
      errors: 0,
      warnings: 2,
    });
    expect(statusBarItem.text).toBe(`$(check) ${BRAND_NAME}: $(warning) 2 warnings`);
  });

  it('updateStatusBar("ready") uses singular form for count of 1', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready', {
      errors: 1,
      warnings: 1,
    });
    expect(statusBarItem.text).toBe(
      `$(check) ${BRAND_NAME}: $(error) 1 error, $(warning) 1 warning`,
    );
  });

  it('updateStatusBar("ready") with zero counts shows check', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready', {
      errors: 0,
      warnings: 0,
    });
    expect(statusBarItem.text).toBe(`$(check) ${BRAND_NAME}`);
  });

  it('updateStatusBar("linting") shows spinner', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'linting');
    expect(statusBarItem.text).toBe(`$(sync~spin) ${BRAND_NAME}: Linting...`);
    expect(statusBarItem.backgroundColor).toBeUndefined();
  });

  it('updateStatusBar("error") shows error background', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'error');
    expect(statusBarItem.text).toBe(`$(error) ${BRAND_NAME}`);
    expect(statusBarItem.backgroundColor).toBeDefined();
  });

  it('updateStatusBar("disabled") shows slash icon', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'disabled');
    expect(statusBarItem.text).toBe(`$(circle-slash) ${BRAND_NAME}`);
    expect(statusBarItem.backgroundColor).toBeUndefined();
  });

  it('updateStatusBar sets rich MarkdownString tooltip with command links', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready');
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    expect(tooltip).toBeInstanceOf(vscode.MarkdownString);
    expect(tooltip.value).toContain('Resist Linter');
    expect(tooltip.value).toContain('**ready**');
    expect(tooltip.value).toContain('command:resist.lint.toggleEnable');
    expect(tooltip.value).toContain('command:resist.lint.showOutput');
    expect(tooltip.supportThemeIcons).toBe(true);
    expect(tooltip.isTrusted).toBe(true);
  });

  it('updateStatusBar tooltip shows error/warning counts with separator', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready', { errors: 2, warnings: 3 });
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    expect(tooltip.value).toContain('2 errors');
    expect(tooltip.value).toContain('3 warnings');
    expect(tooltip.value).toContain('in current file');
  });

  it('updateStatusBar tooltip shows "No issues" when counts are zero', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready');
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    expect(tooltip.value).toContain('No issues');
  });

  it('updateStatusBar tooltip shows Resume action when disabled', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'disabled');
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    expect(tooltip.value).toContain('**paused**');
    expect(tooltip.value).toContain('Resume Linting');
    expect(tooltip.value).not.toContain('Pause');
  });

  it('updateStatusBar tooltip shows Pause action when ready', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready');
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    expect(tooltip.value).toContain('Pause');
    expect(tooltip.value).toContain('Restart');
  });

  it('getFileDiagnosticCounts counts errors and warnings', () => {
    const collection = vscode.languages.createDiagnosticCollection('test');
    const uri = vscode.Uri.file('/test.ts');
    const range = new vscode.Range(0, 0, 0, 1);

    const diags = [
      new vscode.Diagnostic(range, 'err1', vscode.DiagnosticSeverity.Error),
      new vscode.Diagnostic(range, 'err2', vscode.DiagnosticSeverity.Error),
      new vscode.Diagnostic(range, 'warn1', vscode.DiagnosticSeverity.Warning),
      new vscode.Diagnostic(range, 'info1', vscode.DiagnosticSeverity.Information),
    ];

    collection.set(uri, diags);
    const counts = getFileDiagnosticCounts(
      collection as unknown as vscode.DiagnosticCollection,
      uri,
    );
    expect(counts.errors).toBe(2);
    expect(counts.warnings).toBe(1);
  });

  it('getFileDiagnosticCounts returns zeros for unknown URI', () => {
    const collection = vscode.languages.createDiagnosticCollection('test');
    const uri = vscode.Uri.file('/unknown.ts');
    const counts = getFileDiagnosticCounts(
      collection as unknown as vscode.DiagnosticCollection,
      uri,
    );
    expect(counts.errors).toBe(0);
    expect(counts.warnings).toBe(0);
  });
});
