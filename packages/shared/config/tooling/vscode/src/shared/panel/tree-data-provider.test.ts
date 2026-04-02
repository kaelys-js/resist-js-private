/**
 * Tests for Tree Data Provider
 *
 * Plan: .claude/plans/keen-noodling-newt.md TASK 4
 *
 * @module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { ResistTreeDataProvider } from './tree-data-provider';
import { SectionItem, ToolStatusItem, FileDiagnosticItem, PlaceholderItem } from './tree-items';
import { ToolStateManager } from '../state';
import { en } from '../../locale/en';

// =============================================================================
// Helpers
// =============================================================================

let stateManager: ToolStateManager;
let diagnosticCollection: vscode.DiagnosticCollection;
let provider: ResistTreeDataProvider;

beforeEach(() => {
  stateManager = new ToolStateManager();
  diagnosticCollection = vscode.languages.createDiagnosticCollection(
    'test',
  ) as unknown as vscode.DiagnosticCollection;
  provider = new ResistTreeDataProvider(stateManager, diagnosticCollection);
});

// =============================================================================
// Root
// =============================================================================

describe('Root children', () => {
  it('returns 3 section items', () => {
    const children: vscode.TreeItem[] = provider.getChildren();
    expect(children).toHaveLength(3);
    expect(children[0]!).toBeInstanceOf(SectionItem);
    expect(children[1]!).toBeInstanceOf(SectionItem);
    expect(children[2]!).toBeInstanceOf(SectionItem);
  });

  it('sections are Linting, Formatting, Testing', () => {
    const children: SectionItem[] = provider.getChildren() as SectionItem[];
    expect(children[0]!.label).toBe(en.panel.lintingSection);
    expect(children[1]!.label).toBe(en.panel.formattingSection);
    expect(children[2]!.label).toBe(en.panel.testingSection);
  });

  it('sections have correct toolKeys', () => {
    const children: SectionItem[] = provider.getChildren() as SectionItem[];
    expect(children[0]!.toolKey).toBe('lint');
    expect(children[1]!.toolKey).toBe('format');
    expect(children[2]!.toolKey).toBe('test');
  });
});

// =============================================================================
// Lint section
// =============================================================================

describe('Lint section children', () => {
  it('shows status + no-issues placeholder when ready with no diagnostics', () => {
    stateManager.setState('lint', 'ready');
    const lintSection: SectionItem = provider.getChildren()[0]! as SectionItem;
    const children: vscode.TreeItem[] = provider.getChildren(lintSection);

    expect(children).toHaveLength(2);
    expect(children[0]!).toBeInstanceOf(ToolStatusItem);
    expect(children[1]!).toBeInstanceOf(PlaceholderItem);
    expect(children[1]!.label).toBe(en.panel.noIssues);
  });

  it('shows file diagnostic items when ready with diagnostics', () => {
    stateManager.setState('lint', 'ready');
    const uri = vscode.Uri.file('/test/file.ts');
    const range = new vscode.Range(0, 0, 0, 1);
    const diags = [
      new vscode.Diagnostic(range, 'err1', vscode.DiagnosticSeverity.Error),
      new vscode.Diagnostic(range, 'warn1', vscode.DiagnosticSeverity.Warning),
    ];
    diagnosticCollection.set(uri, diags);

    const lintSection: SectionItem = provider.getChildren()[0]! as SectionItem;
    const children: vscode.TreeItem[] = provider.getChildren(lintSection);

    expect(children).toHaveLength(2);
    expect(children[0]!).toBeInstanceOf(ToolStatusItem);
    expect(children[1]!).toBeInstanceOf(FileDiagnosticItem);
  });

  it('shows error placeholder when in error state', () => {
    stateManager.setState('lint', 'error');
    const lintSection: SectionItem = provider.getChildren()[0]! as SectionItem;
    const children: vscode.TreeItem[] = provider.getChildren(lintSection);

    expect(children).toHaveLength(2);
    expect(children[0]!).toBeInstanceOf(ToolStatusItem);
    expect(children[1]!).toBeInstanceOf(PlaceholderItem);
    expect(children[1]!.label).toBe(en.panel.stateError);
  });

  it('shows disabled placeholder when disabled', () => {
    stateManager.setState('lint', 'disabled');
    const lintSection: SectionItem = provider.getChildren()[0]! as SectionItem;
    const children: vscode.TreeItem[] = provider.getChildren(lintSection);

    expect(children).toHaveLength(2);
    expect(children[0]!).toBeInstanceOf(ToolStatusItem);
    expect(children[1]!).toBeInstanceOf(PlaceholderItem);
    expect(children[1]!.label).toBe(en.panel.stateDisabled);
  });

  it('shows not-installed placeholder when not installed', () => {
    // Default state is not-installed
    const lintSection: SectionItem = provider.getChildren()[0]! as SectionItem;
    const children: vscode.TreeItem[] = provider.getChildren(lintSection);

    expect(children).toHaveLength(2);
    expect(children[0]!).toBeInstanceOf(ToolStatusItem);
    expect(children[1]!).toBeInstanceOf(PlaceholderItem);
    expect(children[1]!.label).toBe(en.panel.stateNotInstalled);
  });

  it('shows no-issues when running with no diagnostics', () => {
    stateManager.setState('lint', 'running');
    const lintSection: SectionItem = provider.getChildren()[0]! as SectionItem;
    const children: vscode.TreeItem[] = provider.getChildren(lintSection);

    expect(children).toHaveLength(2);
    expect(children[0]!).toBeInstanceOf(ToolStatusItem);
    expect(children[1]!).toBeInstanceOf(PlaceholderItem);
    expect(children[1]!.label).toBe(en.panel.noIssues);
  });
});

// =============================================================================
// Format / Test sections
// =============================================================================

describe('Format and Test section children', () => {
  it('format section shows status + not-configured placeholder', () => {
    const formatSection: SectionItem = provider.getChildren()[1]! as SectionItem;
    const children: vscode.TreeItem[] = provider.getChildren(formatSection);

    expect(children).toHaveLength(2);
    expect(children[0]!).toBeInstanceOf(ToolStatusItem);
    expect(children[1]!).toBeInstanceOf(PlaceholderItem);
    expect(children[1]!.label).toBe(en.panel.notConfigured);
  });

  it('test section shows status + not-configured placeholder', () => {
    const testSection: SectionItem = provider.getChildren()[2]! as SectionItem;
    const children: vscode.TreeItem[] = provider.getChildren(testSection);

    expect(children).toHaveLength(2);
    expect(children[0]!).toBeInstanceOf(ToolStatusItem);
    expect(children[1]!).toBeInstanceOf(PlaceholderItem);
    expect(children[1]!.label).toBe(en.panel.notConfigured);
  });
});

// =============================================================================
// getTreeItem
// =============================================================================

describe('getTreeItem', () => {
  it('returns the element as-is', () => {
    const section = new SectionItem('Linting', 'lint');
    expect(provider.getTreeItem(section)).toBe(section);
  });
});

// =============================================================================
// Refresh
// =============================================================================

describe('refresh', () => {
  it('fires onDidChangeTreeData with undefined for full refresh', () => {
    let fired = false;
    provider.onDidChangeTreeData(() => {
      fired = true;
    });
    provider.refresh();
    expect(fired).toBe(true);
  });
});

// =============================================================================
// Non-section element
// =============================================================================

describe('non-section element', () => {
  it('returns empty array for non-section items', () => {
    const placeholder = new PlaceholderItem('test');
    expect(provider.getChildren(placeholder)).toEqual([]);
  });
});
