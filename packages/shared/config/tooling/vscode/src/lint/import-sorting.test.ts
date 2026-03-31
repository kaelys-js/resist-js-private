/**
 * Tests for Import Sorting Integration.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import {
  isImportDiagnostic,
  collectImportDiagnostics,
  removeUnusedImports,
} from './import-sorting';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createDiag(ruleId: string, fix?: { start: number; end: number; text: string }): any {
  return {
    range: new vscode.Range(0, 0, 0, 5),
    message: 'test issue',
    severity: vscode.DiagnosticSeverity.Warning,
    source: 'resist-linter',
    code: ruleId,
    data: fix ? { fix: { range: { start: fix.start, end: fix.end }, text: fix.text } } : undefined,
  };
}

function createMockDoc(): any {
  return {
    uri: vscode.Uri.file('/test/file.ts'),
    getText: () => "import { foo } from 'bar';\nconst x = 1;",
    positionAt: (offset: number) => new vscode.Position(0, offset),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('isImportDiagnostic', () => {
  it('returns true for import-related rules', () => {
    expect(isImportDiagnostic(createDiag('no-unused-import'))).toBe(true);
    expect(isImportDiagnostic(createDiag('import/no-duplicates'))).toBe(true);
    expect(isImportDiagnostic(createDiag('unused-import/check'))).toBe(true);
  });

  it('returns false for non-import rules', () => {
    expect(isImportDiagnostic(createDiag('no-console'))).toBe(false);
    expect(isImportDiagnostic(createDiag('naming/camelCase'))).toBe(false);
  });

  it('returns false for non-resist diagnostics', () => {
    const diag = createDiag('import/no-duplicates');
    diag.source = 'eslint';
    expect(isImportDiagnostic(diag)).toBe(false);
  });
});

describe('collectImportDiagnostics', () => {
  it('collects fixable import diagnostics', () => {
    const diagnostics = [
      createDiag('no-unused-import', { start: 0, end: 25, text: '' }),
      createDiag('no-console'), // not import
      createDiag('import/order', { start: 0, end: 10, text: 'sorted' }),
    ];

    const result = collectImportDiagnostics(diagnostics);
    expect(result).toHaveLength(2);
  });

  it('excludes import diagnostics without fixes', () => {
    const diagnostics = [
      createDiag('no-unused-import'), // no fix
    ];

    const result = collectImportDiagnostics(diagnostics);
    expect(result).toHaveLength(0);
  });

  it('excludes no-op fixes', () => {
    const diagnostics = [createDiag('no-unused-import', { start: 5, end: 5, text: '' })];

    const result = collectImportDiagnostics(diagnostics);
    expect(result).toHaveLength(0);
  });
});

describe('removeUnusedImports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies import fixes and returns true', async () => {
    const doc = createMockDoc();
    const collection = vscode.languages.createDiagnosticCollection('test');
    collection.set(doc.uri, [createDiag('no-unused-import', { start: 0, end: 25, text: '' })]);

    const result = await removeUnusedImports(doc, collection);
    expect(result).toBe(true);
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });

  it('shows info message when no import diagnostics', async () => {
    const doc = createMockDoc();
    const collection = vscode.languages.createDiagnosticCollection('test');
    collection.set(doc.uri, [createDiag('no-console')]);

    const result = await removeUnusedImports(doc, collection);
    expect(result).toBe(false);
    expect(vscode.window.showInformationMessage).toHaveBeenCalled();
  });
});
