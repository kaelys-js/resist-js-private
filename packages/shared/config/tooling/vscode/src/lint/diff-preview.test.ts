/**
 * Tests for Diff Preview.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { FixDiffPreviewProvider, applyFixes, showFixDiffPreview } from './diff-preview';
import { DIAGNOSTIC_SOURCE, PREVIEW_SCHEME } from '../shared/brand';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockDoc(text = 'const x = 1;\nlet y = 2;\n'): any {
  return {
    uri: vscode.Uri.file('/test/file.ts'),
    getText: () => text,
    isUntitled: false,
    fsPath: '/test/file.ts',
  };
}

function createDiagWithFix(start: number, end: number, fixText: string): any {
  return {
    range: new vscode.Range(0, 0, 0, 5),
    message: 'test issue',
    severity: vscode.DiagnosticSeverity.Warning,
    source: DIAGNOSTIC_SOURCE,
    data: {
      fix: { range: { start, end }, text: fixText },
    },
  };
}

function createDiagWithoutFix(): any {
  return {
    range: new vscode.Range(0, 0, 0, 5),
    message: 'no fix',
    severity: vscode.DiagnosticSeverity.Warning,
    source: DIAGNOSTIC_SOURCE,
    data: undefined,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('applyFixes', () => {
  it('applies single fix to document text', () => {
    const doc = createMockDoc('const x = 1;');
    const collection = vscode.languages.createDiagnosticCollection('test');
    collection.set(doc.uri, [createDiagWithFix(0, 5, 'let')]);

    const result = applyFixes(doc, collection);
    expect(result).toBe('let x = 1;');
  });

  it('applies multiple fixes sorted by offset', () => {
    const doc = createMockDoc('const x = 1; const y = 2;');
    const collection = vscode.languages.createDiagnosticCollection('test');
    collection.set(doc.uri, [createDiagWithFix(0, 5, 'let'), createDiagWithFix(13, 18, 'let')]);

    const result = applyFixes(doc, collection);
    expect(result).toBe('let x = 1; let y = 2;');
  });

  it('returns original text when no fixes available', () => {
    const text = 'const x = 1;';
    const doc = createMockDoc(text);
    const collection = vscode.languages.createDiagnosticCollection('test');
    collection.set(doc.uri, [createDiagWithoutFix()]);

    const result = applyFixes(doc, collection);
    expect(result).toBe(text);
  });

  it('returns original text when no diagnostics', () => {
    const text = 'const x = 1;';
    const doc = createMockDoc(text);
    const collection = vscode.languages.createDiagnosticCollection('test');

    const result = applyFixes(doc, collection);
    expect(result).toBe(text);
  });

  it('skips no-op fixes', () => {
    const text = 'const x = 1;';
    const doc = createMockDoc(text);
    const collection = vscode.languages.createDiagnosticCollection('test');
    collection.set(doc.uri, [createDiagWithFix(5, 5, '')]);

    const result = applyFixes(doc, collection);
    expect(result).toBe(text);
  });
});

describe('FixDiffPreviewProvider', () => {
  it('provides fixed content for virtual document', () => {
    const doc = createMockDoc('const x = 1;');
    vscode.workspace.textDocuments = [doc] as any;

    const collection = vscode.languages.createDiagnosticCollection('test');
    collection.set(doc.uri, [createDiagWithFix(0, 5, 'let')]);

    const provider = new FixDiffPreviewProvider(collection);
    const uri = vscode.Uri.parse(`${PREVIEW_SCHEME}:/test/file.ts`);
    const content = provider.provideTextDocumentContent(uri);

    expect(content).toBe('let x = 1;');
  });

  it('returns empty string when document not found', () => {
    vscode.workspace.textDocuments = [];
    const collection = vscode.languages.createDiagnosticCollection('test');
    const provider = new FixDiffPreviewProvider(collection);
    const uri = vscode.Uri.parse(`${PREVIEW_SCHEME}:/nonexistent.ts`);

    const content = provider.provideTextDocumentContent(uri);
    expect(content).toBe('');
  });
});

describe('showFixDiffPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows info message when no fixable diagnostics', async () => {
    const doc = createMockDoc();
    (vscode.window as any).activeTextEditor = { document: doc };
    const collection = vscode.languages.createDiagnosticCollection('test');
    collection.set(doc.uri, [createDiagWithoutFix()]);

    await showFixDiffPreview(collection);

    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining('No'),
    );
  });
});
