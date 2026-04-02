/**
 * Tests for Hover Provider
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResistHoverProvider } from './hover';
import * as vscode from 'vscode';
import { DIAGNOSTIC_SOURCE } from '../shared/brand';

function createDiagnostic(
  overrides: {
    range?: vscode.Range;
    message?: string;
    severity?: vscode.DiagnosticSeverity;
    code?: string | { value: string; target: vscode.Uri };
    source?: string;
    data?: {
      fix?: { range: { start: number; end: number }; text: string };
      tip?: string;
      example?: string;
      url?: string;
    };
  } = {},
): vscode.Diagnostic {
  const diag = new vscode.Diagnostic(
    overrides.range ?? new vscode.Range(0, 0, 0, 10),
    overrides.message ?? 'Test error message',
    overrides.severity ?? vscode.DiagnosticSeverity.Error,
  );
  diag.source = overrides.source ?? DIAGNOSTIC_SOURCE;
  diag.code = overrides.code ?? 'test/rule';

  if (overrides.data) {
    (diag as vscode.Diagnostic & { data: unknown }).data = overrides.data;
  }

  return diag;
}

describe('ResistHoverProvider', () => {
  let collection: vscode.DiagnosticCollection;
  let provider: ResistHoverProvider;
  let doc: vscode.TextDocument;

  beforeEach(() => {
    vi.clearAllMocks();
    collection = vscode.languages.createDiagnosticCollection('test');
    provider = new ResistHoverProvider(collection);

    doc = {
      uri: vscode.Uri.file('/test.ts'),
    } as unknown as vscode.TextDocument;
  });

  it('returns undefined when no diagnostics at position', () => {
    const result = provider.provideHover(doc, new vscode.Position(5, 5));
    expect(result).toBeUndefined();
  });

  it('returns undefined when only non-resist diagnostics at position', () => {
    const diag = createDiagnostic({ source: 'other-linter' });
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    expect(result).toBeUndefined();
  });

  it('returns hover with rule ID header for matching diagnostic', () => {
    const diag = createDiagnostic({ code: 'jsdoc/require-param' });
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    expect(result).toBeDefined();
    expect(result!.contents.length).toBe(1);

    const md = result!.contents[0] as vscode.MarkdownString;
    expect(md.value).toContain('**jsdoc/require-param**');
  });

  it('includes error icon for error severity', () => {
    const diag = createDiagnostic({ severity: vscode.DiagnosticSeverity.Error });
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    const md = result!.contents[0] as vscode.MarkdownString;
    expect(md.value).toContain('$(error)');
  });

  it('includes warning icon for warning severity', () => {
    const diag = createDiagnostic({ severity: vscode.DiagnosticSeverity.Warning });
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    const md = result!.contents[0] as vscode.MarkdownString;
    expect(md.value).toContain('$(warning)');
  });

  it('includes message text', () => {
    const diag = createDiagnostic({ message: 'Missing return type annotation' });
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    const md = result!.contents[0] as vscode.MarkdownString;
    expect(md.value).toContain('Missing return type annotation');
  });

  it('includes tip as blockquote when present', () => {
    const diag = createDiagnostic({
      data: {
        fix: { range: { start: 0, end: 0 }, text: '' },
        tip: 'Add a JSDoc @param tag',
      },
    });
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    const md = result!.contents[0] as vscode.MarkdownString;
    expect(md.value).toContain('> **Tip:** Add a JSDoc @param tag');
  });

  it('includes example as fenced code block when present', () => {
    const diag = createDiagnostic({
      data: {
        fix: { range: { start: 0, end: 0 }, text: '' },
        example: '/** @param {string} name */',
      },
    });
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    const md = result!.contents[0] as vscode.MarkdownString;
    expect(md.value).toContain('```ts\n/** @param {string} name */\n```');
  });

  it('shows fix available indicator for non-empty fixes', () => {
    const diag = createDiagnostic({
      data: {
        fix: { range: { start: 5, end: 10 }, text: 'replacement' },
      },
    });
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    const md = result!.contents[0] as vscode.MarkdownString;
    expect(md.value).toContain('Fix available');
  });

  it('does not show fix indicator for no-op fixes', () => {
    const diag = createDiagnostic({
      data: {
        fix: { range: { start: 0, end: 0 }, text: '' },
      },
    });
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    const md = result!.contents[0] as vscode.MarkdownString;
    expect(md.value).not.toContain('Fix available');
  });

  it('includes documentation link when url present', () => {
    const diag = createDiagnostic({
      data: {
        fix: { range: { start: 0, end: 0 }, text: '' },
        url: 'https://docs.example.com/rules/test',
      },
    });
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    const md = result!.contents[0] as vscode.MarkdownString;
    expect(md.value).toContain('[View rule documentation](https://docs.example.com/rules/test)');
  });

  it('includes source footer', () => {
    const diag = createDiagnostic();
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    const md = result!.contents[0] as vscode.MarkdownString;
    expect(md.value).toContain(`*${DIAGNOSTIC_SOURCE}*`);
  });

  it('handles object code with value property', () => {
    const diag = createDiagnostic({
      code: { value: 'linked/rule', target: vscode.Uri.parse('https://example.com') },
    });
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    const md = result!.contents[0] as vscode.MarkdownString;
    expect(md.value).toContain('**linked/rule**');
  });

  it('renders multiple diagnostics at same position', () => {
    const diag1 = createDiagnostic({ code: 'rule-a', message: 'First issue' });
    const diag2 = createDiagnostic({ code: 'rule-b', message: 'Second issue' });
    collection.set(doc.uri, [diag1, diag2]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    expect(result).toBeDefined();
    expect(result!.contents.length).toBe(2);
  });

  it('strips appended example from message before rendering', () => {
    const diag = createDiagnostic({
      message: 'Missing param\n\nExample:\n/** @param {string} x */',
      data: {
        fix: { range: { start: 0, end: 0 }, text: '' },
        example: '/** @param {string} x */',
      },
    });
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    const md = result!.contents[0] as vscode.MarkdownString;
    // Message section should only have the base message, not the appended example
    const messageSection: string = md.value.split('```')[0] ?? '';
    expect(messageSection).not.toContain('Example:\n/** @param');
    // Example should be in fenced code block
    expect(md.value).toContain('```ts\n/** @param {string} x */\n```');
  });
});
