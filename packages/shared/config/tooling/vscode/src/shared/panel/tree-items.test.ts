/**
 * Tests for Tree Item Classes
 *
 * Plan: .claude/plans/keen-noodling-newt.md TASK 3
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import * as vscode from 'vscode';
import {
  SectionItem,
  ToolStatusItem,
  FileDiagnosticItem,
  RuleGroupItem,
  DiagnosticDetailItem,
  PlaceholderItem,
} from './tree-items';
import { en } from '../../locale/en';
import { COMMANDS } from '../brand';

// =============================================================================
// SectionItem
// =============================================================================

describe('SectionItem', () => {
  it('sets collapsibleState to Collapsed', () => {
    const item = new SectionItem('Linting', 'lint');
    expect(item.collapsibleState).toBe(vscode.TreeItemCollapsibleState.Collapsed);
  });

  it('stores toolKey for provider matching', () => {
    const item = new SectionItem('Linting', 'lint');
    expect(item.toolKey).toBe('lint');
  });

  it('sets contextValue to resist.section', () => {
    const item = new SectionItem('Linting', 'lint');
    expect(item.contextValue).toBe('resist.section');
  });

  it('uses checklist icon for lint', () => {
    const item = new SectionItem('Linting', 'lint');
    expect(item.iconPath).toBeInstanceOf(vscode.ThemeIcon);
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('checklist');
  });

  it('uses symbol-color icon for format', () => {
    const item = new SectionItem('Formatting', 'format');
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('symbol-color');
  });

  it('uses beaker icon for test', () => {
    const item = new SectionItem('Testing', 'test');
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('beaker');
  });

  it('uses rocket icon for benchmark', () => {
    const item = new SectionItem('Benchmarks', 'benchmark');
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('rocket');
  });

  it('uses globe icon for e2e', () => {
    const item = new SectionItem('E2E Testing', 'e2e');
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('globe');
  });

  it('sets label from constructor', () => {
    const item = new SectionItem('Linting', 'lint');
    expect(item.label).toBe('Linting');
  });
});

// =============================================================================
// ToolStatusItem
// =============================================================================

describe('ToolStatusItem', () => {
  it('shows Ready label and pass-filled icon for ready state', () => {
    const item = new ToolStatusItem('ready');
    expect(item.label).toBe(en.panel.stateReady);
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('pass-filled');
  });

  it('shows Running label and sync~spin icon for running state', () => {
    const item = new ToolStatusItem('running');
    expect(item.label).toBe(en.panel.stateRunning);
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('sync~spin');
  });

  it('shows Error label and error icon for error state', () => {
    const item = new ToolStatusItem('error');
    expect(item.label).toBe(en.panel.stateError);
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('error');
  });

  it('shows Disabled label and circle-slash icon for disabled state', () => {
    const item = new ToolStatusItem('disabled');
    expect(item.label).toBe(en.panel.stateDisabled);
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('circle-slash');
  });

  it('shows Not installed label and circle-slash icon for not-installed state', () => {
    const item = new ToolStatusItem('not-installed');
    expect(item.label).toBe(en.panel.stateNotInstalled);
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('circle-slash');
  });

  it('sets contextValue to resist.toolError when error', () => {
    const item = new ToolStatusItem('error');
    expect(item.contextValue).toBe('resist.toolError');
  });

  it('sets contextValue to resist.toolStatus for non-error states', () => {
    const readyItem = new ToolStatusItem('ready');
    expect(readyItem.contextValue).toBe('resist.toolStatus');

    const runningItem = new ToolStatusItem('running');
    expect(runningItem.contextValue).toBe('resist.toolStatus');
  });

  it('sets restart command when in error state', () => {
    const item = new ToolStatusItem('error');
    expect(item.command).toBeDefined();
    expect(item.command?.command).toBe(COMMANDS.restart);
  });

  it('has no command for non-error states', () => {
    const item = new ToolStatusItem('ready');
    expect(item.command).toBeUndefined();
  });

  it('sets collapsibleState to None', () => {
    const item = new ToolStatusItem('ready');
    expect(item.collapsibleState).toBe(vscode.TreeItemCollapsibleState.None);
  });
});

// =============================================================================
// FileDiagnosticItem
// =============================================================================

describe('FileDiagnosticItem', () => {
  const uri = vscode.Uri.file('/workspace/src/index.ts');
  const range = new vscode.Range(0, 0, 0, 1);
  const diags = [new vscode.Diagnostic(range, 'err', vscode.DiagnosticSeverity.Error)];

  it('sets label to basename of file path', () => {
    const item = new FileDiagnosticItem(uri, 2, 3, diags);
    expect(item.label).toBe('index.ts');
  });

  it('sets description with error and warning counts', () => {
    const item = new FileDiagnosticItem(uri, 2, 3, diags);
    expect(item.description).toBe('2 errors, 3 warnings');
  });

  it('sets resourceUri for file icon', () => {
    const item = new FileDiagnosticItem(uri, 1, 0, diags);
    expect(item.resourceUri).toBe(uri);
  });

  it('sets contextValue to resist.fileDiagnostic', () => {
    const item = new FileDiagnosticItem(uri, 1, 0, diags);
    expect(item.contextValue).toBe('resist.fileDiagnostic');
  });

  it('sets command to open file in editor', () => {
    const item = new FileDiagnosticItem(uri, 1, 0, diags);
    expect(item.command).toBeDefined();
    expect(item.command?.command).toBe('vscode.open');
    expect(item.command?.arguments).toEqual([uri]);
  });

  it('sets collapsibleState to Collapsed', () => {
    const item = new FileDiagnosticItem(uri, 1, 0, diags);
    expect(item.collapsibleState).toBe(vscode.TreeItemCollapsibleState.Collapsed);
  });

  it('stores diagnostics array', () => {
    const item = new FileDiagnosticItem(uri, 1, 0, diags);
    expect(item.diagnostics).toBe(diags);
  });

  it('stores fileUri', () => {
    const item = new FileDiagnosticItem(uri, 1, 0, diags);
    expect(item.fileUri).toBe(uri);
  });
});

// =============================================================================
// RuleGroupItem
// =============================================================================

describe('RuleGroupItem', () => {
  const uri = vscode.Uri.file('/workspace/src/index.ts');
  const range = new vscode.Range(0, 0, 0, 1);

  it('sets label to rule ID', () => {
    const diags = [new vscode.Diagnostic(range, 'err', vscode.DiagnosticSeverity.Error)];
    const item = new RuleGroupItem('no-unused-vars', uri, diags);
    expect(item.label).toBe('no-unused-vars');
  });

  it('sets description with issue count', () => {
    const diags = [
      new vscode.Diagnostic(range, 'err1', vscode.DiagnosticSeverity.Error),
      new vscode.Diagnostic(range, 'err2', vscode.DiagnosticSeverity.Error),
      new vscode.Diagnostic(range, 'err3', vscode.DiagnosticSeverity.Warning),
    ];
    const item = new RuleGroupItem('no-console', uri, diags);
    expect(item.description).toBe('3 issues');
  });

  it('sets contextValue to resist.ruleGroup', () => {
    const diags = [new vscode.Diagnostic(range, 'err', vscode.DiagnosticSeverity.Error)];
    const item = new RuleGroupItem('no-unused-vars', uri, diags);
    expect(item.contextValue).toBe('resist.ruleGroup');
  });

  it('sets collapsibleState to Collapsed', () => {
    const diags = [new vscode.Diagnostic(range, 'err', vscode.DiagnosticSeverity.Error)];
    const item = new RuleGroupItem('no-unused-vars', uri, diags);
    expect(item.collapsibleState).toBe(vscode.TreeItemCollapsibleState.Collapsed);
  });

  it('uses error icon when any diagnostic is an error', () => {
    const diags = [
      new vscode.Diagnostic(range, 'warn', vscode.DiagnosticSeverity.Warning),
      new vscode.Diagnostic(range, 'err', vscode.DiagnosticSeverity.Error),
    ];
    const item = new RuleGroupItem('no-unused-vars', uri, diags);
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('error');
  });

  it('uses warning icon when only warnings', () => {
    const diags = [
      new vscode.Diagnostic(range, 'warn1', vscode.DiagnosticSeverity.Warning),
      new vscode.Diagnostic(range, 'warn2', vscode.DiagnosticSeverity.Warning),
    ];
    const item = new RuleGroupItem('no-console', uri, diags);
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('warning');
  });

  it('stores fileUri and diagnostics', () => {
    const diags = [new vscode.Diagnostic(range, 'err', vscode.DiagnosticSeverity.Error)];
    const item = new RuleGroupItem('no-unused-vars', uri, diags);
    expect(item.fileUri).toBe(uri);
    expect(item.diagnostics).toBe(diags);
  });

  it('stores ruleId', () => {
    const diags = [new vscode.Diagnostic(range, 'err', vscode.DiagnosticSeverity.Error)];
    const item = new RuleGroupItem('naming/camelCase', uri, diags);
    expect(item.ruleId).toBe('naming/camelCase');
  });
});

// =============================================================================
// DiagnosticDetailItem
// =============================================================================

describe('DiagnosticDetailItem', () => {
  const uri = vscode.Uri.file('/workspace/src/index.ts');
  const range = new vscode.Range(9, 0, 9, 5);

  it('sets label to position (always visible)', () => {
    const diag = new vscode.Diagnostic(range, 'unused variable', vscode.DiagnosticSeverity.Warning);
    const item = new DiagnosticDetailItem(diag, uri);
    expect(item.label).toBe('Ln 10, Col 1');
  });

  it('sets description to diagnostic message', () => {
    const diag = new vscode.Diagnostic(range, 'unused variable', vscode.DiagnosticSeverity.Warning);
    const item = new DiagnosticDetailItem(diag, uri);
    expect(item.description).toBe('unused variable');
  });

  it('does not truncate long messages (VS Code handles ellipsis in description)', () => {
    const longMsg = 'a'.repeat(100);
    const diag = new vscode.Diagnostic(range, longMsg, vscode.DiagnosticSeverity.Error);
    const item = new DiagnosticDetailItem(diag, uri);
    expect(item.description).toBe(longMsg);
  });

  it('uses error icon for Error severity', () => {
    const diag = new vscode.Diagnostic(range, 'err', vscode.DiagnosticSeverity.Error);
    const item = new DiagnosticDetailItem(diag, uri);
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('error');
  });

  it('uses warning icon for Warning severity', () => {
    const diag = new vscode.Diagnostic(range, 'warn', vscode.DiagnosticSeverity.Warning);
    const item = new DiagnosticDetailItem(diag, uri);
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('warning');
  });

  it('uses info icon for Information severity', () => {
    const diag = new vscode.Diagnostic(range, 'info', vscode.DiagnosticSeverity.Information);
    const item = new DiagnosticDetailItem(diag, uri);
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('info');
  });

  it('sets contextValue to resist.diagnosticDetail', () => {
    const diag = new vscode.Diagnostic(range, 'err', vscode.DiagnosticSeverity.Error);
    const item = new DiagnosticDetailItem(diag, uri);
    expect(item.contextValue).toBe('resist.diagnosticDetail');
  });

  it('sets command to open file at diagnostic range', () => {
    const diag = new vscode.Diagnostic(range, 'err', vscode.DiagnosticSeverity.Error);
    const item = new DiagnosticDetailItem(diag, uri);
    expect(item.command?.command).toBe('vscode.open');
    expect(item.command?.arguments).toEqual([uri, { selection: range }]);
  });

  it('sets collapsibleState to None', () => {
    const diag = new vscode.Diagnostic(range, 'err', vscode.DiagnosticSeverity.Error);
    const item = new DiagnosticDetailItem(diag, uri);
    expect(item.collapsibleState).toBe(vscode.TreeItemCollapsibleState.None);
  });

  it('includes rule ID in label when code is set', () => {
    const diag = new vscode.Diagnostic(range, 'err msg', vscode.DiagnosticSeverity.Error);
    diag.code = 'no-unused-vars';
    const item = new DiagnosticDetailItem(diag, uri);
    expect(item.label).toBe('Ln 10, Col 1 · no-unused-vars');
    expect(item.description).toBe('err msg');
  });

  it('tooltip is a MarkdownString with labeled message and rule ID', () => {
    const diag = new vscode.Diagnostic(range, 'err msg', vscode.DiagnosticSeverity.Error);
    diag.code = 'no-unused-vars';
    const item = new DiagnosticDetailItem(diag, uri);
    const tooltip = item.tooltip as vscode.MarkdownString;
    expect(tooltip).toBeInstanceOf(vscode.MarkdownString);
    expect(tooltip.value).toContain('**Message:** err msg');
    expect(tooltip.value).toContain('`no-unused-vars`');
  });

  it('tooltip shows labeled message when no code', () => {
    const diag = new vscode.Diagnostic(range, 'err msg', vscode.DiagnosticSeverity.Error);
    const item = new DiagnosticDetailItem(diag, uri);
    const tooltip = item.tooltip as vscode.MarkdownString;
    expect(tooltip).toBeInstanceOf(vscode.MarkdownString);
    expect(tooltip.value).toContain('**Message:** err msg');
    expect(tooltip.value).not.toContain('Rule:');
  });

  it('tooltip includes supplemental data when available', () => {
    const diag = new vscode.Diagnostic(range, 'err msg', vscode.DiagnosticSeverity.Error);
    diag.code = 'test-rule';
    (diag as vscode.Diagnostic & { data: unknown }).data = {
      tip: 'Use const instead',
      fix: { range: { start: 5, end: 10 }, text: 'const' },
      url: 'https://docs.example.com/test-rule',
    };
    const item = new DiagnosticDetailItem(diag, uri);
    const tooltip = item.tooltip as vscode.MarkdownString;
    expect(tooltip.value).toContain('Use const instead');
    expect(tooltip.value).toContain('Auto-fix available');
    expect(tooltip.value).toContain('View rule documentation');
    expect(tooltip.supportThemeIcons).toBe(true);
  });

  it('tooltip renders example as fenced code block', () => {
    const diag = new vscode.Diagnostic(range, 'err msg', vscode.DiagnosticSeverity.Error);
    diag.code = 'test-rule';
    (diag as vscode.Diagnostic & { data: unknown }).data = {
      example: 'const x = 1;\nconst y = 2;',
    };
    const item = new DiagnosticDetailItem(diag, uri);
    const tooltip = item.tooltip as vscode.MarkdownString;
    expect(tooltip.value).toContain('````typescript');
    expect(tooltip.value).toContain('const x = 1;');
    expect(tooltip.value).toContain('const y = 2;');
  });

  it('tooltip shows rule description when present', () => {
    const diag = new vscode.Diagnostic(range, 'err msg', vscode.DiagnosticSeverity.Error);
    diag.code = 'test-rule';
    (diag as vscode.Diagnostic & { data: unknown }).data = {
      description: 'Variables must be declared with const',
    };
    const item = new DiagnosticDetailItem(diag, uri);
    const tooltip = item.tooltip as vscode.MarkdownString;
    expect(tooltip.value).toContain('**Description:** Variables must be declared with const');
  });

  it('tooltip strips @example prefix and JSDoc fences from example', () => {
    const diag = new vscode.Diagnostic(range, 'err msg', vscode.DiagnosticSeverity.Error);
    diag.code = 'test-rule';
    (diag as vscode.Diagnostic & { data: unknown }).data = {
      example: '@example\n * ```typescript\n * const result = myFn(arg);\n * ```',
    };
    const item = new DiagnosticDetailItem(diag, uri);
    const tooltip = item.tooltip as vscode.MarkdownString;
    expect(tooltip.value).toContain('const result = myFn(arg);');
    expect(tooltip.value).not.toContain('@example');
  });

  it('stores fileUri and diagnostic references', () => {
    const diag = new vscode.Diagnostic(range, 'err', vscode.DiagnosticSeverity.Error);
    const item = new DiagnosticDetailItem(diag, uri);
    expect(item.fileUri).toBe(uri);
    expect(item.diagnostic).toBe(diag);
  });
});

// =============================================================================
// PlaceholderItem
// =============================================================================

describe('PlaceholderItem', () => {
  it('sets label from message', () => {
    const item = new PlaceholderItem('No issues found');
    expect(item.label).toBe('No issues found');
  });

  it('uses info icon', () => {
    const item = new PlaceholderItem('No issues found');
    expect(item.iconPath).toBeInstanceOf(vscode.ThemeIcon);
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('info');
  });

  it('sets collapsibleState to None', () => {
    const item = new PlaceholderItem('No issues found');
    expect(item.collapsibleState).toBe(vscode.TreeItemCollapsibleState.None);
  });
});
