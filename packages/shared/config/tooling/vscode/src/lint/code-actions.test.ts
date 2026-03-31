/**
 * Tests for Code Action Provider
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-55.md TASK 15
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResistCodeActionProvider } from './code-actions';
import * as vscode from 'vscode';
import { DIAGNOSTIC_SOURCE } from '../shared/brand';

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
  diag.source = DIAGNOSTIC_SOURCE;
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

    // 1 fix action + 2 disable actions (line + file)
    expect(actions.length).toBe(3);
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

  it('skips fix actions for diagnostics without fix data but still adds disable actions', () => {
    const doc = createMockDocument();
    const diag = createDiagnostic(); // No fix

    const actions = provider.provideCodeActions(doc, new vscode.Range(0, 0, 0, 5), {
      diagnostics: [diag],
    } as vscode.CodeActionContext);

    // 2 disable actions (line + file) — no fix action
    expect(actions.length).toBe(2);
    expect(actions[0].title).toContain('Disable');
  });

  it('skips no-op fixes but still adds disable actions', () => {
    const doc = createMockDocument();
    const diag = createDiagnostic({ start: 0, end: 0, text: '' });

    const actions = provider.provideCodeActions(doc, new vscode.Range(0, 0, 0, 5), {
      diagnostics: [diag],
    } as vscode.CodeActionContext);

    // 2 disable actions — no fix action (no-op fix skipped)
    expect(actions.length).toBe(2);
  });

  it('creates "Fix all" action when multiple fixable diagnostics exist', () => {
    const doc = createMockDocument('const x = 1;\nconst y = 2;\n');
    const diag1 = createDiagnostic({ start: 6, end: 7, text: 'a' });
    const diag2 = createDiagnostic({ start: 20, end: 21, text: 'b' });

    const actions = provider.provideCodeActions(doc, new vscode.Range(0, 0, 1, 5), {
      diagnostics: [diag1, diag2],
    } as vscode.CodeActionContext);

    // 2 individual fix + 1 fix-all + 4 disable actions (2 per diagnostic)
    expect(actions.length).toBe(7);
    const fixAllAction = actions.find((a) => a.title.includes('Fix all'));
    expect(fixAllAction).toBeDefined();
    expect(fixAllAction!.title).toContain('2');
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

  it('skips fixes with out-of-bounds byte offsets but adds disable actions', () => {
    const doc = createMockDocument('hi'); // length 2
    const diag = createDiagnostic({ start: 0, end: 999, text: 'x' });

    const actions = provider.provideCodeActions(doc, new vscode.Range(0, 0, 0, 2), {
      diagnostics: [diag],
    } as vscode.CodeActionContext);

    // 2 disable actions — fix skipped due to out-of-bounds
    expect(actions.length).toBe(2);
    expect(actions[0].title).toContain('Disable');
  });

  it('skips fixes with negative byte offsets but adds disable actions', () => {
    const doc = createMockDocument('hello');
    const diag = createDiagnostic({ start: -1, end: 3, text: 'x' });

    const actions = provider.provideCodeActions(doc, new vscode.Range(0, 0, 0, 5), {
      diagnostics: [diag],
    } as vscode.CodeActionContext);

    // 2 disable actions — fix skipped due to negative offsets
    expect(actions.length).toBe(2);
  });

  it('accepts output channel in constructor', () => {
    const channel = vscode.window.createOutputChannel('Test');
    const providerWithChannel = new ResistCodeActionProvider(
      channel as unknown as vscode.OutputChannel,
    );
    expect(providerWithChannel).toBeInstanceOf(ResistCodeActionProvider);
  });

  it('works without output channel (backwards compatible)', () => {
    const providerNoChannel = new ResistCodeActionProvider();
    const doc = createMockDocument('const x = 1;\n');
    const diag = createDiagnostic({ start: 6, end: 7, text: 'y' });

    const actions = providerNoChannel.provideCodeActions(doc, new vscode.Range(0, 0, 0, 5), {
      diagnostics: [diag],
    } as vscode.CodeActionContext);

    // 1 fix action + 2 disable actions
    expect(actions.length).toBe(3);
    expect(actions[0].title).toBe('Fix: test/rule');
  });

  it('creates disable-line action with correct comment format', () => {
    const doc = createMockDocument('  const x = 1;\n');
    const diag = createDiagnostic({ start: 8, end: 9, text: 'y' });

    const actions = provider.provideCodeActions(doc, new vscode.Range(0, 0, 0, 5), {
      diagnostics: [diag],
    } as vscode.CodeActionContext);

    const disableLineAction = actions.find((a) => a.title.includes('for this line'));
    expect(disableLineAction).toBeDefined();
    expect(disableLineAction!.title).toContain('test/rule');
    expect(disableLineAction!.isPreferred).toBe(false);
  });

  it('creates disable-file action with correct comment format', () => {
    const doc = createMockDocument('const x = 1;\n');
    const diag = createDiagnostic({ start: 6, end: 7, text: 'y' });

    const actions = provider.provideCodeActions(doc, new vscode.Range(0, 0, 0, 5), {
      diagnostics: [diag],
    } as vscode.CodeActionContext);

    const disableFileAction = actions.find((a) => a.title.includes('for this file'));
    expect(disableFileAction).toBeDefined();
    expect(disableFileAction!.title).toContain('test/rule');
    expect(disableFileAction!.isPreferred).toBe(false);
  });
});
