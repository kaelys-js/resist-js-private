/**
 * Tests for Format-on-Save Provider.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { ResistFormattingProvider } from './formatting-provider';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockDoc(text = 'const x = 1;\n'): any {
  return {
    uri: vscode.Uri.file('/test/file.ts'),
    getText: () => text,
    positionAt: (offset: number) => new vscode.Position(0, offset),
    isUntitled: false,
  };
}

function createDiagWithFix(start: number, end: number, fixText: string): any {
  return {
    range: new vscode.Range(0, 0, 0, 5),
    message: 'test issue',
    severity: vscode.DiagnosticSeverity.Warning,
    source: 'resist-linter',
    data: {
      fix: { range: { start, end }, text: fixText },
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ResistFormattingProvider', () => {
  let collection: any;
  let channel: any;

  beforeEach(() => {
    vi.clearAllMocks();
    collection = vscode.languages.createDiagnosticCollection('test');
    channel = { appendLine: vi.fn(), show: vi.fn(), dispose: vi.fn(), name: 'Resist' };
  });

  it('returns TextEdits for fixable diagnostics', () => {
    const doc = createMockDoc('const x = 1;');
    collection.set(doc.uri, [createDiagWithFix(0, 5, 'let')]);

    const provider = new ResistFormattingProvider(collection, channel);
    const edits = provider.provideDocumentFormattingEdits(doc);

    expect(edits).toHaveLength(1);
  });

  it('returns empty array when no fixable diagnostics', () => {
    const doc = createMockDoc();
    const noFixDiag: any = {
      range: new vscode.Range(0, 0, 0, 5),
      message: 'no fix',
      source: 'resist-linter',
      data: undefined,
    };
    collection.set(doc.uri, [noFixDiag]);

    const provider = new ResistFormattingProvider(collection, channel);
    const edits = provider.provideDocumentFormattingEdits(doc);

    expect(edits).toHaveLength(0);
  });

  it('returns empty array when no diagnostics', () => {
    const doc = createMockDoc();
    const provider = new ResistFormattingProvider(collection, channel);
    const edits = provider.provideDocumentFormattingEdits(doc);

    expect(edits).toHaveLength(0);
  });

  it('skips no-op fixes', () => {
    const doc = createMockDoc('hello');
    collection.set(doc.uri, [createDiagWithFix(3, 3, '')]);

    const provider = new ResistFormattingProvider(collection, channel);
    const edits = provider.provideDocumentFormattingEdits(doc);

    expect(edits).toHaveLength(0);
  });

  it('skips out-of-bounds fixes', () => {
    const doc = createMockDoc('hi');
    collection.set(doc.uri, [createDiagWithFix(0, 999, 'x')]);

    const provider = new ResistFormattingProvider(collection, channel);
    const edits = provider.provideDocumentFormattingEdits(doc);

    expect(edits).toHaveLength(0);
  });

  it('logs applied count to channel', () => {
    const doc = createMockDoc('const x = 1;');
    collection.set(doc.uri, [createDiagWithFix(0, 5, 'let')]);

    const provider = new ResistFormattingProvider(collection, channel);
    provider.provideDocumentFormattingEdits(doc);

    const logCalls = channel.appendLine.mock.calls.map((c: any) => c[0]);
    expect(logCalls.some((msg: string) => msg.includes('Formatting applied'))).toBe(true);
  });

  it('works without output channel', () => {
    const doc = createMockDoc('const x = 1;');
    collection.set(doc.uri, [createDiagWithFix(0, 5, 'let')]);

    const provider = new ResistFormattingProvider(collection);
    const edits = provider.provideDocumentFormattingEdits(doc);

    expect(edits).toHaveLength(1);
  });
});
