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
import {
  SectionItem,
  ToolStatusItem,
  FileDiagnosticItem,
  RuleGroupItem,
  DiagnosticDetailItem,
  PlaceholderItem,
} from './tree-items';
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
  it('returns 5 section items', () => {
    const children: vscode.TreeItem[] = provider.getChildren();
    expect(children).toHaveLength(5);
    expect(children[0]!).toBeInstanceOf(SectionItem);
    expect(children[1]!).toBeInstanceOf(SectionItem);
    expect(children[2]!).toBeInstanceOf(SectionItem);
    expect(children[3]!).toBeInstanceOf(SectionItem);
    expect(children[4]!).toBeInstanceOf(SectionItem);
  });

  it('sections are Linting, Formatting, Testing, Benchmarks, E2E Testing', () => {
    const children: SectionItem[] = provider.getChildren() as SectionItem[];
    expect(children[0]!.label).toBe(en.panel.lintingSection);
    expect(children[1]!.label).toBe(en.panel.formattingSection);
    expect(children[2]!.label).toBe(en.panel.testingSection);
    expect(children[3]!.label).toBe(en.panel.benchmarksSection);
    expect(children[4]!.label).toBe(en.panel.e2eSection);
  });

  it('sections have correct toolKeys', () => {
    const children: SectionItem[] = provider.getChildren() as SectionItem[];
    expect(children[0]!.toolKey).toBe('lint');
    expect(children[1]!.toolKey).toBe('format');
    expect(children[2]!.toolKey).toBe('test');
    expect(children[3]!.toolKey).toBe('benchmark');
    expect(children[4]!.toolKey).toBe('e2e');
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

describe('Format, Test, Benchmark, E2E section children', () => {
  it('format section shows single placeholder', () => {
    const formatSection: SectionItem = provider.getChildren()[1]! as SectionItem;
    const children: vscode.TreeItem[] = provider.getChildren(formatSection);

    expect(children).toHaveLength(1);
    expect(children[0]!).toBeInstanceOf(PlaceholderItem);
    expect(children[0]!.label).toBe(en.panel.notConfigured);
  });

  it('test section shows single placeholder', () => {
    const testSection: SectionItem = provider.getChildren()[2]! as SectionItem;
    const children: vscode.TreeItem[] = provider.getChildren(testSection);

    expect(children).toHaveLength(1);
    expect(children[0]!).toBeInstanceOf(PlaceholderItem);
    expect(children[0]!.label).toBe(en.panel.notConfigured);
  });

  it('benchmark section shows single placeholder', () => {
    const benchmarkSection: SectionItem = provider.getChildren()[3]! as SectionItem;
    const children: vscode.TreeItem[] = provider.getChildren(benchmarkSection);

    expect(children).toHaveLength(1);
    expect(children[0]!).toBeInstanceOf(PlaceholderItem);
    expect(children[0]!.label).toBe(en.panel.notConfigured);
  });

  it('e2e section shows single placeholder', () => {
    const e2eSection: SectionItem = provider.getChildren()[4]! as SectionItem;
    const children: vscode.TreeItem[] = provider.getChildren(e2eSection);

    expect(children).toHaveLength(1);
    expect(children[0]!).toBeInstanceOf(PlaceholderItem);
    expect(children[0]!.label).toBe(en.panel.notConfigured);
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

// =============================================================================
// Multi-level tree (file → diagnostics)
// =============================================================================

describe('Multi-level lint tree', () => {
  it('FileDiagnosticItem has Collapsed collapsible state', () => {
    stateManager.setState('lint', 'ready');
    const uri = vscode.Uri.file('/test/file.ts');
    const range = new vscode.Range(0, 0, 0, 1);
    const diag = new vscode.Diagnostic(range, 'err1', vscode.DiagnosticSeverity.Error);
    diag.code = 'no-unused-vars';
    diagnosticCollection.set(uri, [diag]);

    const lintSection: SectionItem = provider.getChildren()[0]! as SectionItem;
    const children: vscode.TreeItem[] = provider.getChildren(lintSection);
    const fileItem: FileDiagnosticItem = children[1]! as FileDiagnosticItem;

    expect(fileItem.collapsibleState).toBe(vscode.TreeItemCollapsibleState.Collapsed);
  });

  it('returns RuleGroupItems for file children', () => {
    stateManager.setState('lint', 'ready');
    const uri = vscode.Uri.file('/test/file.ts');
    const range = new vscode.Range(0, 0, 0, 1);
    const diag1 = new vscode.Diagnostic(range, 'err1', vscode.DiagnosticSeverity.Error);
    diag1.code = 'no-unused-vars';
    const diag2 = new vscode.Diagnostic(range, 'warn1', vscode.DiagnosticSeverity.Warning);
    diag2.code = 'no-console';
    diagnosticCollection.set(uri, [diag1, diag2]);

    const lintSection: SectionItem = provider.getChildren()[0]! as SectionItem;
    const sectionChildren: vscode.TreeItem[] = provider.getChildren(lintSection);
    const fileItem: FileDiagnosticItem = sectionChildren[1]! as FileDiagnosticItem;
    const ruleGroups: vscode.TreeItem[] = provider.getChildren(fileItem);

    expect(ruleGroups).toHaveLength(2);
    expect(ruleGroups[0]!).toBeInstanceOf(RuleGroupItem);
    expect(ruleGroups[1]!).toBeInstanceOf(RuleGroupItem);
  });

  it('groups diagnostics by rule ID', () => {
    stateManager.setState('lint', 'ready');
    const uri = vscode.Uri.file('/test/file.ts');
    const range = new vscode.Range(0, 0, 0, 1);
    const diag1 = new vscode.Diagnostic(range, 'err1', vscode.DiagnosticSeverity.Error);
    diag1.code = 'no-unused-vars';
    const diag2 = new vscode.Diagnostic(range, 'err2', vscode.DiagnosticSeverity.Error);
    diag2.code = 'no-unused-vars';
    const diag3 = new vscode.Diagnostic(range, 'warn1', vscode.DiagnosticSeverity.Warning);
    diag3.code = 'no-console';
    diagnosticCollection.set(uri, [diag1, diag2, diag3]);

    const lintSection: SectionItem = provider.getChildren()[0]! as SectionItem;
    const sectionChildren: vscode.TreeItem[] = provider.getChildren(lintSection);
    const fileItem: FileDiagnosticItem = sectionChildren[1]! as FileDiagnosticItem;
    const ruleGroups: RuleGroupItem[] = provider.getChildren(fileItem) as RuleGroupItem[];

    expect(ruleGroups).toHaveLength(2);
    expect(ruleGroups[0]!.ruleId).toBe('no-unused-vars');
    expect(ruleGroups[0]!.diagnostics).toHaveLength(2);
    expect(ruleGroups[1]!.ruleId).toBe('no-console');
    expect(ruleGroups[1]!.diagnostics).toHaveLength(1);
  });

  it('returns DiagnosticDetailItems for rule group children', () => {
    stateManager.setState('lint', 'ready');
    const uri = vscode.Uri.file('/test/file.ts');
    const range = new vscode.Range(5, 0, 5, 10);
    const diag1 = new vscode.Diagnostic(range, 'an error', vscode.DiagnosticSeverity.Error);
    diag1.code = 'no-unused-vars';
    const diag2 = new vscode.Diagnostic(range, 'another error', vscode.DiagnosticSeverity.Error);
    diag2.code = 'no-unused-vars';
    diagnosticCollection.set(uri, [diag1, diag2]);

    const lintSection: SectionItem = provider.getChildren()[0]! as SectionItem;
    const sectionChildren: vscode.TreeItem[] = provider.getChildren(lintSection);
    const fileItem: FileDiagnosticItem = sectionChildren[1]! as FileDiagnosticItem;
    const ruleGroups: RuleGroupItem[] = provider.getChildren(fileItem) as RuleGroupItem[];
    const detailChildren: vscode.TreeItem[] = provider.getChildren(ruleGroups[0]!);

    expect(detailChildren).toHaveLength(2);
    expect(detailChildren[0]!).toBeInstanceOf(DiagnosticDetailItem);
    expect(detailChildren[1]!).toBeInstanceOf(DiagnosticDetailItem);
  });

  it('detail items have correct severity icons', () => {
    stateManager.setState('lint', 'ready');
    const uri = vscode.Uri.file('/test/file.ts');
    const range = new vscode.Range(5, 0, 5, 10);
    const diag1 = new vscode.Diagnostic(range, 'an error', vscode.DiagnosticSeverity.Error);
    diag1.code = 'rule-a';
    const diag2 = new vscode.Diagnostic(range, 'a warning', vscode.DiagnosticSeverity.Warning);
    diag2.code = 'rule-a';
    diagnosticCollection.set(uri, [diag1, diag2]);

    const lintSection: SectionItem = provider.getChildren()[0]! as SectionItem;
    const sectionChildren: vscode.TreeItem[] = provider.getChildren(lintSection);
    const fileItem: FileDiagnosticItem = sectionChildren[1]! as FileDiagnosticItem;
    const ruleGroups: RuleGroupItem[] = provider.getChildren(fileItem) as RuleGroupItem[];
    const detailChildren: DiagnosticDetailItem[] = provider.getChildren(
      ruleGroups[0]!,
    ) as DiagnosticDetailItem[];

    expect((detailChildren[0]!.iconPath as vscode.ThemeIcon).id).toBe('error');
    expect((detailChildren[1]!.iconPath as vscode.ThemeIcon).id).toBe('warning');
  });

  it('detail items have correct labels and descriptions', () => {
    stateManager.setState('lint', 'ready');
    const uri = vscode.Uri.file('/test/file.ts');
    const range = new vscode.Range(9, 0, 9, 5);
    const diag = new vscode.Diagnostic(
      range,
      'some error message',
      vscode.DiagnosticSeverity.Error,
    );
    diag.code = 'my-rule';
    diagnosticCollection.set(uri, [diag]);

    const lintSection: SectionItem = provider.getChildren()[0]! as SectionItem;
    const sectionChildren: vscode.TreeItem[] = provider.getChildren(lintSection);
    const fileItem: FileDiagnosticItem = sectionChildren[1]! as FileDiagnosticItem;
    const ruleGroups: RuleGroupItem[] = provider.getChildren(fileItem) as RuleGroupItem[];
    const detailChildren: DiagnosticDetailItem[] = provider.getChildren(
      ruleGroups[0]!,
    ) as DiagnosticDetailItem[];

    expect(detailChildren[0]!.label).toBe('Ln 10, Col 1 · my-rule');
    expect(detailChildren[0]!.description).toBe('some error message');
  });
});

// =============================================================================
// getParent
// =============================================================================

describe('getParent', () => {
  it('returns undefined for root sections', () => {
    const roots: SectionItem[] = provider.getChildren() as SectionItem[];
    expect(provider.getParent(roots[0]!)).toBeUndefined();
  });

  it('returns section for section children', () => {
    stateManager.setState('lint', 'ready');
    const uri = vscode.Uri.file('/test/file.ts');
    const range = new vscode.Range(0, 0, 0, 1);
    const diags = [new vscode.Diagnostic(range, 'err', vscode.DiagnosticSeverity.Error)];
    diagnosticCollection.set(uri, diags);

    const roots: SectionItem[] = provider.getChildren() as SectionItem[];
    const lintSection: SectionItem = roots[0]!;
    const sectionChildren: vscode.TreeItem[] = provider.getChildren(lintSection);

    expect(provider.getParent(sectionChildren[0]!)).toBe(lintSection);
    expect(provider.getParent(sectionChildren[1]!)).toBe(lintSection);
  });

  it('returns file item for rule group children', () => {
    stateManager.setState('lint', 'ready');
    const uri = vscode.Uri.file('/test/file.ts');
    const range = new vscode.Range(0, 0, 0, 1);
    const diag = new vscode.Diagnostic(range, 'err', vscode.DiagnosticSeverity.Error);
    diag.code = 'no-unused-vars';
    diagnosticCollection.set(uri, [diag]);

    const roots: SectionItem[] = provider.getChildren() as SectionItem[];
    const lintSection: SectionItem = roots[0]!;
    const sectionChildren: vscode.TreeItem[] = provider.getChildren(lintSection);
    const fileItem: FileDiagnosticItem = sectionChildren[1]! as FileDiagnosticItem;
    const ruleGroups: vscode.TreeItem[] = provider.getChildren(fileItem);

    expect(provider.getParent(ruleGroups[0]!)).toBe(fileItem);
  });

  it('returns rule group for diagnostic detail children', () => {
    stateManager.setState('lint', 'ready');
    const uri = vscode.Uri.file('/test/file.ts');
    const range = new vscode.Range(0, 0, 0, 1);
    const diag = new vscode.Diagnostic(range, 'err', vscode.DiagnosticSeverity.Error);
    diag.code = 'no-unused-vars';
    diagnosticCollection.set(uri, [diag]);

    const roots: SectionItem[] = provider.getChildren() as SectionItem[];
    const lintSection: SectionItem = roots[0]!;
    const sectionChildren: vscode.TreeItem[] = provider.getChildren(lintSection);
    const fileItem: FileDiagnosticItem = sectionChildren[1]! as FileDiagnosticItem;
    const ruleGroups: RuleGroupItem[] = provider.getChildren(fileItem) as RuleGroupItem[];
    const detailChildren: vscode.TreeItem[] = provider.getChildren(ruleGroups[0]!);

    expect(provider.getParent(detailChildren[0]!)).toBe(ruleGroups[0]!);
  });
});

// =============================================================================
// getRoots
// =============================================================================

describe('getRoots', () => {
  it('returns empty before first getChildren call', () => {
    expect(provider.getRoots()).toHaveLength(0);
  });

  it('returns cached roots after getChildren call', () => {
    provider.getChildren();
    expect(provider.getRoots()).toHaveLength(5);
  });
});

// =============================================================================
// Filter
// =============================================================================

describe('Filter', () => {
  it('setFilter stores text and getFilterText retrieves it', () => {
    provider.setFilter('unused');
    expect(provider.getFilterText()).toBe('unused');
  });

  it('clearFilter resets filter text', () => {
    provider.setFilter('unused');
    provider.clearFilter();
    expect(provider.getFilterText()).toBe('');
  });

  it('filter by filename returns only matching files', () => {
    stateManager.setState('lint', 'ready');
    const uri1 = vscode.Uri.file('/test/alpha.ts');
    const uri2 = vscode.Uri.file('/test/beta.ts');
    const range = new vscode.Range(0, 0, 0, 1);
    diagnosticCollection.set(uri1, [
      new vscode.Diagnostic(range, 'err', vscode.DiagnosticSeverity.Error),
    ]);
    diagnosticCollection.set(uri2, [
      new vscode.Diagnostic(range, 'err', vscode.DiagnosticSeverity.Error),
    ]);

    provider.setFilter('alpha');
    const lintSection: SectionItem = provider.getChildren()[0]! as SectionItem;
    const children: vscode.TreeItem[] = provider.getChildren(lintSection);

    // status + 1 file (alpha only)
    expect(children).toHaveLength(2);
    expect(children[1]!).toBeInstanceOf(FileDiagnosticItem);
    expect(children[1]!.label).toBe('alpha.ts');
  });

  it('filter by rule ID returns only matching diagnostics', () => {
    stateManager.setState('lint', 'ready');
    const uri = vscode.Uri.file('/test/file.ts');
    const range = new vscode.Range(0, 0, 0, 1);
    const diag1 = new vscode.Diagnostic(range, 'err1', vscode.DiagnosticSeverity.Error);
    diag1.code = 'no-unused-vars';
    const diag2 = new vscode.Diagnostic(range, 'err2', vscode.DiagnosticSeverity.Error);
    diag2.code = 'no-console';
    diagnosticCollection.set(uri, [diag1, diag2]);

    provider.setFilter('no-unused');
    const lintSection: SectionItem = provider.getChildren()[0]! as SectionItem;
    const children: vscode.TreeItem[] = provider.getChildren(lintSection);

    expect(children).toHaveLength(2);
    const fileItem: FileDiagnosticItem = children[1]! as FileDiagnosticItem;
    expect(fileItem.diagnostics).toHaveLength(1);
  });

  it('filter by message returns only matching diagnostics', () => {
    stateManager.setState('lint', 'ready');
    const uri = vscode.Uri.file('/test/file.ts');
    const range = new vscode.Range(0, 0, 0, 1);
    diagnosticCollection.set(uri, [
      new vscode.Diagnostic(range, 'unused variable x', vscode.DiagnosticSeverity.Warning),
      new vscode.Diagnostic(range, 'missing semicolon', vscode.DiagnosticSeverity.Error),
    ]);

    provider.setFilter('unused');
    const lintSection: SectionItem = provider.getChildren()[0]! as SectionItem;
    const children: vscode.TreeItem[] = provider.getChildren(lintSection);

    expect(children).toHaveLength(2);
    const fileItem: FileDiagnosticItem = children[1]! as FileDiagnosticItem;
    expect(fileItem.diagnostics).toHaveLength(1);
  });

  it('no filter results shows filterNoResults placeholder', () => {
    stateManager.setState('lint', 'ready');
    const uri = vscode.Uri.file('/test/file.ts');
    const range = new vscode.Range(0, 0, 0, 1);
    diagnosticCollection.set(uri, [
      new vscode.Diagnostic(range, 'err', vscode.DiagnosticSeverity.Error),
    ]);

    provider.setFilter('zzz-no-match-zzz');
    const lintSection: SectionItem = provider.getChildren()[0]! as SectionItem;
    const children: vscode.TreeItem[] = provider.getChildren(lintSection);

    expect(children).toHaveLength(2);
    expect(children[1]!).toBeInstanceOf(PlaceholderItem);
    expect(children[1]!.label).toBe(en.panel.filterNoResults);
  });

  it('clear filter restores all items', () => {
    stateManager.setState('lint', 'ready');
    const uri1 = vscode.Uri.file('/test/alpha.ts');
    const uri2 = vscode.Uri.file('/test/beta.ts');
    const range = new vscode.Range(0, 0, 0, 1);
    diagnosticCollection.set(uri1, [
      new vscode.Diagnostic(range, 'err', vscode.DiagnosticSeverity.Error),
    ]);
    diagnosticCollection.set(uri2, [
      new vscode.Diagnostic(range, 'err', vscode.DiagnosticSeverity.Error),
    ]);

    provider.setFilter('alpha');
    provider.clearFilter();
    const lintSection: SectionItem = provider.getChildren()[0]! as SectionItem;
    const children: vscode.TreeItem[] = provider.getChildren(lintSection);

    // status + 2 files
    expect(children).toHaveLength(3);
  });

  it('filter is case-insensitive', () => {
    stateManager.setState('lint', 'ready');
    const uri = vscode.Uri.file('/test/MyFile.ts');
    const range = new vscode.Range(0, 0, 0, 1);
    diagnosticCollection.set(uri, [
      new vscode.Diagnostic(range, 'err', vscode.DiagnosticSeverity.Error),
    ]);

    provider.setFilter('myfile');
    const lintSection: SectionItem = provider.getChildren()[0]! as SectionItem;
    const children: vscode.TreeItem[] = provider.getChildren(lintSection);

    expect(children).toHaveLength(2);
    expect(children[1]!).toBeInstanceOf(FileDiagnosticItem);
  });
});
