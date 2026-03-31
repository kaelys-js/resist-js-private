/**
 * Tests for Code Action Provider
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-55.md TASK 15
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResistCodeActionProvider } from '../code-actions';
import * as vscode from 'vscode';

function createMockDocument(text: string = 'const x = 1;\n'): vscode.TextDocument {
  return {
    uri: vscode.Uri.file('/test.ts'),
    getText: () => text,
    positionAt: (offset: number) => {
      // Simple offset-to-position: count newlines
      let line = 0;
      let col = 0;
      for (let i = 0; i < offset && i < text.length; i++) {
        if (text[i] === '\n') {
          line++;
          col = 0;
        } else {
          col++;
        }
      }
      return new vscode.Position(line, col);
    },
    isUntitled: false,
    lineCount: text.split('\n').length,
    lineAt: (line: number) => ({ text: text.split('\n')[line] ?? '' }),
    getWordRangeAtPosition: () => undefined,
  } as unknown as vscode.TextDocument;
}

function createDiagnostic(
  fix?: { start: number; end: number; text: string },
  tip?: string,
): vscode.Diagnostic {
  const range = new vscode.Range(0, 0, 0, 5);
  const diag = new vscode.Diagnostic(range, 'test message', vscode.DiagnosticSeverity.Error);
  diag.source = 'resist-linter';
  diag.code = 'test/rule';
  if (fix) {
    (diag as { data?: unknown }).data = {
      fix: { range: { start: fix.start, end: fix.end }, text: fix.text },
      tip,
    };
  }
  return diag;
}

describe('ResistCodeActionProvider', () => {
  let provider: ResistCodeActionProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new ResistCodeActionProvider();
  });

  it('provides QuickFix code action kind', () => {
    expect(ResistCodeActionProvider.providedCodeActionKinds).toContain(
      vscode.CodeActionKind.QuickFix,
    );
  });

  it('creates individual fix action for fixable diagnostic', () => {
    const doc = createMockDocument('const x = 1;\n');
    const diag = createDiagnostic({ start: 6, end: 7, text: 'y' });

    const actions = provider.provideCodeActions(doc, new vscode.Range(0, 0, 0, 5), {
      diagnostics: [diag],
    } as vscode.CodeActionContext);

    expect(actions.length).toBe(1);
    expect(actions[0].title).toBe('Fix: test/rule');
    expect(actions[0].isPreferred).toBe(true);
  });

  it('includes tip in action title when present', () => {
    const doc = createMockDocument('const x = 1;\n');
    const diag = createDiagnostic({ start: 6, end: 7, text: 'y' }, 'Use let instead');

    const actions = provider.provideCodeActions(doc, new vscode.Range(0, 0, 0, 5), {
      diagnostics: [diag],
    } as vscode.CodeActionContext);

    expect(actions[0].title).toContain('Use let instead');
  });

  it('skips diagnostics without fix data', () => {
    const doc = createMockDocument();
    const diag = createDiagnostic(); // No fix

    const actions = provider.provideCodeActions(doc, new vscode.Range(0, 0, 0, 5), {
      diagnostics: [diag],
    } as vscode.CodeActionContext);

    expect(actions.length).toBe(0);
  });

  it('skips no-op fixes (start === end && text === empty)', () => {
    const doc = createMockDocument();
    const diag = createDiagnostic({ start: 0, end: 0, text: '' });

    const actions = provider.provideCodeActions(doc, new vscode.Range(0, 0, 0, 5), {
      diagnostics: [diag],
    } as vscode.CodeActionContext);

    expect(actions.length).toBe(0);
  });

  it('creates "Fix all" action when multiple fixable diagnostics exist', () => {
    const doc = createMockDocument('const x = 1;\nconst y = 2;\n');
    const diag1 = createDiagnostic({ start: 6, end: 7, text: 'a' });
    const diag2 = createDiagnostic({ start: 20, end: 21, text: 'b' });

    const actions = provider.provideCodeActions(doc, new vscode.Range(0, 0, 1, 5), {
      diagnostics: [diag1, diag2],
    } as vscode.CodeActionContext);

    // 2 individual + 1 fix-all
    expect(actions.length).toBe(3);
    expect(actions[2].title).toContain('Fix all');
    expect(actions[2].title).toContain('2');
  });

  it('filters out non-resist-linter diagnostics', () => {
    const doc = createMockDocument();
    const diag = createDiagnostic({ start: 0, end: 1, text: 'x' });
    diag.source = 'other-linter';

    const actions = provider.provideCodeActions(doc, new vscode.Range(0, 0, 0, 5), {
      diagnostics: [diag],
    } as vscode.CodeActionContext);

    expect(actions.length).toBe(0);
  });

  it('skips fixes with out-of-bounds byte offsets', () => {
    const doc = createMockDocument('hi'); // length 2
    const diag = createDiagnostic({ start: 0, end: 999, text: 'x' });

    const actions = provider.provideCodeActions(doc, new vscode.Range(0, 0, 0, 2), {
      diagnostics: [diag],
    } as vscode.CodeActionContext);

    expect(actions.length).toBe(0);
  });

  it('skips fixes with negative byte offsets', () => {
    const doc = createMockDocument('hello');
    const diag = createDiagnostic({ start: -1, end: 3, text: 'x' });

    const actions = provider.provideCodeActions(doc, new vscode.Range(0, 0, 0, 5), {
      diagnostics: [diag],
    } as vscode.CodeActionContext);

    expect(actions.length).toBe(0);
  });
});
