/**
 * Tests for Status Bar Management
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-55.md TASK 13
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStatusBar, updateStatusBar, getFileDiagnosticCounts } from '../status-bar';
import * as vscode from 'vscode';

describe('Status Bar', () => {
  let statusBarItem: ReturnType<typeof vscode.window.createStatusBarItem>;

  beforeEach(() => {
    vi.clearAllMocks();
    const context = {
      subscriptions: [] as Array<{ dispose: () => void }>,
    } as unknown as vscode.ExtensionContext;
    statusBarItem = createStatusBar(context);
  });

  it('createStatusBar creates item with correct defaults', () => {
    expect(vscode.window.createStatusBarItem).toHaveBeenCalledWith(
      vscode.StatusBarAlignment.Right,
      100,
    );
    expect(statusBarItem.text).toBe('$(check) Resist');
    expect(statusBarItem.tooltip).toBe('Resist Linter — Click to show output');
    expect(statusBarItem.command).toBe('resist.lint.showOutput');
    expect(statusBarItem.show).toHaveBeenCalled();
  });

  it('updateStatusBar("ready") shows check icon', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready');
    expect(statusBarItem.text).toBe('$(check) Resist');
    expect(statusBarItem.backgroundColor).toBeUndefined();
  });

  it('updateStatusBar("ready") with counts shows error/warning counts', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready', {
      errors: 3,
      warnings: 7,
    });
    expect(statusBarItem.text).toBe('$(error) 3 $(warning) 7');
  });

  it('updateStatusBar("ready") with only errors shows error count', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready', {
      errors: 5,
      warnings: 0,
    });
    expect(statusBarItem.text).toBe('$(error) 5');
  });

  it('updateStatusBar("ready") with only warnings shows warning count', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready', {
      errors: 0,
      warnings: 2,
    });
    expect(statusBarItem.text).toBe('$(warning) 2');
  });

  it('updateStatusBar("ready") with zero counts shows check', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready', {
      errors: 0,
      warnings: 0,
    });
    expect(statusBarItem.text).toBe('$(check) Resist');
  });

  it('updateStatusBar("linting") shows spinner', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'linting');
    expect(statusBarItem.text).toBe('$(sync~spin) Linting...');
    expect(statusBarItem.backgroundColor).toBeUndefined();
  });

  it('updateStatusBar("error") shows error background', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'error');
    expect(statusBarItem.text).toBe('$(error) Resist');
    expect(statusBarItem.backgroundColor).toBeDefined();
  });

  it('updateStatusBar("disabled") shows slash icon', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'disabled');
    expect(statusBarItem.text).toBe('$(circle-slash) Resist');
    expect(statusBarItem.backgroundColor).toBeUndefined();
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
