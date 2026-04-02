/**
 * Tests for Import Sorting Integration.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { removeUnusedImports } from './import-sorting';
import { DIAGNOSTIC_SOURCE } from '../shared/brand';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createDiag(ruleId: string, fix?: { start: number; end: number; text: string }): any {
  return {
    range: new vscode.Range(0, 0, 0, 5),
    message: 'test issue',
    severity: vscode.DiagnosticSeverity.Warning,
    source: DIAGNOSTIC_SOURCE,
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
