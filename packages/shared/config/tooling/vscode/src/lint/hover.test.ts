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
      getText: () => 'const hello = world;',
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

  it('returns undefined when diagnostic has no extra data', () => {
    const diag = createDiagnostic();
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    expect(result).toBeUndefined();
  });

  it('returns undefined when diagnostic has only a no-op fix', () => {
    const diag = createDiagnostic({
      data: { fix: { range: { start: 0, end: 0 }, text: '' } },
    });
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    expect(result).toBeUndefined();
  });

  it('shows tip as blockquote with lightbulb icon', () => {
    const diag = createDiagnostic({
      data: {
        fix: { range: { start: 0, end: 0 }, text: '' },
        tip: 'Add a JSDoc @param tag',
      },
    });
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    expect(result).toBeDefined();

    const md = result!.contents[0] as vscode.MarkdownString;
    expect(md.value).toContain('$(lightbulb) **Tip:** Add a JSDoc @param tag');
  });

  it('shows example as fenced code block with label', () => {
    const diag = createDiagnostic({
      data: {
        fix: { range: { start: 0, end: 0 }, text: '' },
        example: '/** @param {string} name */',
      },
    });
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    const md = result!.contents[0] as vscode.MarkdownString;
    expect(md.value).toContain('**Example:**');
    expect(md.value).toContain('````typescript\n/** @param {string} name */\n````');
  });

  it('shows fix diff preview for real fixes', () => {
    const diag = createDiagnostic({
      data: { fix: { range: { start: 6, end: 11 }, text: 'world' } },
    });
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    const md = result!.contents[0] as vscode.MarkdownString;
    expect(md.value).toContain('Auto-fix preview');
    expect(md.value).toContain('```diff');
    expect(md.value).toContain('- hello');
    expect(md.value).toContain('+ world');
  });

  it('shows documentation link', () => {
    const diag = createDiagnostic({
      data: {
        fix: { range: { start: 0, end: 0 }, text: '' },
        url: 'https://docs.example.com/rules/test',
      },
    });
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    const md = result!.contents[0] as vscode.MarkdownString;
    expect(md.value).toContain(
      '[$(link-external) View rule documentation](https://docs.example.com/rules/test)',
    );
  });

  it('separates fix preview and docs link with horizontal rule', () => {
    const diag = createDiagnostic({
      data: {
        fix: { range: { start: 5, end: 10 }, text: 'x' },
        url: 'https://example.com',
      },
    });
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    const md = result!.contents[0] as vscode.MarkdownString;
    expect(md.value).toContain('Auto-fix preview');
    expect(md.value).toContain('---');
    expect(md.value).toContain('View rule documentation');
  });

  it('does not repeat message but shows rule ID', () => {
    const diag = createDiagnostic({
      message: 'Missing return type',
      code: 'ts/return-type',
      data: { fix: { range: { start: 0, end: 0 }, text: '' }, tip: 'Add type' },
    });
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    const md = result!.contents[0] as vscode.MarkdownString;
    // Should NOT contain the message (VS Code already shows it)
    expect(md.value).not.toContain('Missing return type');
    // Should contain the rule ID in a Rule section
    expect(md.value).toContain('`ts/return-type`');
  });

  it('does not include source footer', () => {
    const diag = createDiagnostic({
      data: { fix: { range: { start: 0, end: 0 }, text: '' }, tip: 'Fix it' },
    });
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    const md = result!.contents[0] as vscode.MarkdownString;
    expect(md.value).not.toContain(DIAGNOSTIC_SOURCE);
  });

  it('enables theme icons on MarkdownString', () => {
    const diag = createDiagnostic({
      data: { fix: { range: { start: 0, end: 0 }, text: '' }, tip: 'Fix it' },
    });
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    const md = result!.contents[0] as vscode.MarkdownString;
    expect(md.supportThemeIcons).toBe(true);
  });

  it('renders multiple diagnostics with extra data', () => {
    const diag1 = createDiagnostic({
      code: 'rule-a',
      data: { fix: { range: { start: 0, end: 0 }, text: '' }, tip: 'Tip A' },
    });
    const diag2 = createDiagnostic({
      code: 'rule-b',
      data: { fix: { range: { start: 0, end: 0 }, text: '' }, tip: 'Tip B' },
    });
    collection.set(doc.uri, [diag1, diag2]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    expect(result).toBeDefined();
    expect(result!.contents.length).toBe(2);
  });

  it('shows all sections together: tip + example + fix + docs', () => {
    const diag = createDiagnostic({
      data: {
        fix: { range: { start: 5, end: 10 }, text: 'x' },
        tip: 'Use const',
        example: 'const x = 1;',
        url: 'https://example.com/rule',
      },
    });
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    const md = result!.contents[0] as vscode.MarkdownString;
    expect(md.value).toContain('`test/rule`');
    expect(md.value).toContain('**Tip:** Use const');
    expect(md.value).toContain('**Example:**');
    expect(md.value).toContain('````typescript\nconst x = 1;\n````');
    expect(md.value).toContain('Auto-fix preview');
    expect(md.value).toContain('```diff');
    expect(md.value).toContain('View rule documentation');
  });

  it('shows insertion-only diff when fix range is empty', () => {
    const diag = createDiagnostic({
      data: { fix: { range: { start: 5, end: 5 }, text: 'inserted' } },
    });
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    const md = result!.contents[0] as vscode.MarkdownString;
    expect(md.value).toContain('+ inserted');
    expect(md.value).not.toContain('- ');
  });

  it('shows deletion-only diff when fix text is empty', () => {
    const diag = createDiagnostic({
      data: { fix: { range: { start: 0, end: 5 }, text: '' } },
    });
    collection.set(doc.uri, [diag]);

    const result = provider.provideHover(doc, new vscode.Position(0, 5));
    const md = result!.contents[0] as vscode.MarkdownString;
    expect(md.value).toContain('- const');
    expect(md.value).not.toContain('+ ');
  });
});
