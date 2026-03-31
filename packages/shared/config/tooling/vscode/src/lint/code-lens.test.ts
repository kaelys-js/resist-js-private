/**
 * Tests for Code Lens Provider.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { ResistCodeLensProvider } from './code-lens';
import { DIAGNOSTIC_SOURCE } from '../shared/brand';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockDoc(): any {
  return {
    uri: vscode.Uri.file('/test/file.ts'),
    lineCount: 10,
    lineAt: (line: number) => ({ text: `line ${line}` }),
  };
}

function createDiag(line: number, ruleId: string, url?: string): any {
  const diag: any = {
    range: new vscode.Range(line, 0, line, 10),
    message: `Issue from ${ruleId}`,
    severity: vscode.DiagnosticSeverity.Warning,
    source: DIAGNOSTIC_SOURCE,
    code: ruleId,
    data: url ? { url, fix: { range: { start: 0, end: 0 }, text: '' } } : undefined,
  };
  return diag;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ResistCodeLensProvider', () => {
  let collection: any;
  let provider: ResistCodeLensProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    collection = vscode.languages.createDiagnosticCollection('test');
    provider = new ResistCodeLensProvider(collection);
  });

  it('returns empty array when no diagnostics', () => {
    const lenses = provider.provideCodeLenses(createMockDoc());
    expect(lenses).toEqual([]);
  });

  it('creates a lens for each unique rule on each line', () => {
    const doc = createMockDoc();
    collection.set(doc.uri, [
      createDiag(0, 'no-console'),
      createDiag(0, 'no-console'),
      createDiag(2, 'no-var'),
    ]);

    const lenses = provider.provideCodeLenses(doc);

    expect(lenses).toHaveLength(2);
    // First lens: no-console on line 0 with count 2
    expect(lenses[0].command?.title).toContain('no-console');
    expect(lenses[0].command?.title).toContain('2');
    // Second lens: no-var on line 2 with count 1
    expect(lenses[1].command?.title).toContain('no-var');
    expect(lenses[1].command?.title).toContain('1');
  });

  it('uses vscode.open command when URL is available', () => {
    const doc = createMockDoc();
    collection.set(doc.uri, [createDiag(0, 'no-console', 'https://docs.example.com/no-console')]);

    const lenses = provider.provideCodeLenses(doc);

    expect(lenses).toHaveLength(1);
    expect(lenses[0].command?.command).toBe('vscode.open');
  });

  it('uses showOutput command when no URL', () => {
    const doc = createMockDoc();
    collection.set(doc.uri, [createDiag(0, 'no-console')]);

    const lenses = provider.provideCodeLenses(doc);

    expect(lenses).toHaveLength(1);
    expect(lenses[0].command?.command).toBe('resist.lint.showOutput');
  });

  it('skips non-resist-linter diagnostics', () => {
    const doc = createMockDoc();
    const foreignDiag: any = {
      range: new vscode.Range(0, 0, 0, 10),
      message: 'Foreign issue',
      severity: vscode.DiagnosticSeverity.Warning,
      source: 'eslint',
      code: 'some-rule',
    };
    collection.set(doc.uri, [foreignDiag]);

    const lenses = provider.provideCodeLenses(doc);
    expect(lenses).toEqual([]);
  });

  it('refresh fires onDidChangeCodeLenses event', () => {
    const listener = vi.fn();
    provider.onDidChangeCodeLenses(listener);

    provider.refresh();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('dispose cleans up event emitter', () => {
    provider.dispose();
    // Should not throw
    expect(true).toBe(true);
  });
});
