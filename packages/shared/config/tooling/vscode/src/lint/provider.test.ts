/**
 * Tests for Lint Provider — Diagnostic Mapping & stdin integration
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-55.md TASK 16
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mapEntryToDiagnostic, lintDocument, type DiagnosticWithData } from './provider';
import * as vscode from 'vscode';
import type { DiagnosticEntry, RunOptions } from '../shared/types';
import { DIAGNOSTIC_SOURCE } from '../shared/brand';

function createMockDocument(
  lines: string[] = ['const x = 1;', 'const y = 2;'],
): vscode.TextDocument {
  const text = lines.join('\n');

  return {
    uri: vscode.Uri.file('/test.ts'),
    getText: () => text,
    lineCount: lines.length,
    lineAt: (line: number) => ({
      text: lines[line] ?? '',
      range: new vscode.Range(line, 0, line, (lines[line] ?? '').length),
    }),
    positionAt: (offset: number) => {
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
    getWordRangeAtPosition: (pos: vscode.Position) => {
      const lineText = lines[pos.line] ?? '';

      if (lineText.length === 0) {
        return;
      }

      // Simple word range: from position to next whitespace
      let end = pos.character;

      while (end < lineText.length && lineText[end] !== ' ') {
        end++;
      }
      if (end === pos.character) {
        return;
      }
      return new vscode.Range(pos.line, pos.character, pos.line, end);
    },
    isUntitled: false,
  } as unknown as vscode.TextDocument;
}

function createEntry(overrides: Partial<DiagnosticEntry> = {}): DiagnosticEntry {
  return {
    file: '/test.ts',
    line: 1,
    column: 1,
    severity: 'error',
    message: 'Test error',
    ruleId: 'test/rule',
    fix: { range: { start: 0, end: 0 }, text: '' },
    ...overrides,
  };
}

describe('mapEntryToDiagnostic', () => {
  let doc: vscode.TextDocument;

  beforeEach(() => {
    vi.clearAllMocks();
    doc = createMockDocument();
  });

  it('maps error severity correctly', () => {
    const diag = mapEntryToDiagnostic(createEntry({ severity: 'error' }), doc);
    expect(diag.severity).toBe(vscode.DiagnosticSeverity.Error);
  });

  it('maps warning severity correctly', () => {
    const diag = mapEntryToDiagnostic(createEntry({ severity: 'warning' }), doc);
    expect(diag.severity).toBe(vscode.DiagnosticSeverity.Warning);
  });

  it('maps info severity correctly', () => {
    const diag = mapEntryToDiagnostic(createEntry({ severity: 'info' }), doc);
    expect(diag.severity).toBe(vscode.DiagnosticSeverity.Information);
  });

  it('uses endLine/endColumn for precise range when present', () => {
    const diag = mapEntryToDiagnostic(
      createEntry({ line: 1, column: 7, endLine: 1, endColumn: 8 }),
      doc,
    );
    expect(diag.range.start.line).toBe(0);
    expect(diag.range.start.character).toBe(6);
    expect(diag.range.end.line).toBe(0);
    expect(diag.range.end.character).toBe(7);
  });

  it('falls back to word/line range when endLine/endColumn absent', () => {
    const diag = mapEntryToDiagnostic(createEntry({ line: 1, column: 7 }), doc);
    expect(diag.range.start.line).toBe(0);
    // Should use word range or line range
    expect(diag.range.start.character).toBeGreaterThanOrEqual(0);
  });

  it('sets source to resist-linter', () => {
    const diag = mapEntryToDiagnostic(createEntry(), doc);
    expect(diag.source).toBe(DIAGNOSTIC_SOURCE);
  });

  it('sets code to ruleId', () => {
    const diag = mapEntryToDiagnostic(createEntry({ ruleId: 'jsdoc/require-param' }), doc);
    expect(diag.code).toBe('jsdoc/require-param');
  });

  it('stores fix data on diagnostic.data', () => {
    const fix = { range: { start: 5, end: 10 }, text: 'replacement' };
    const diag = mapEntryToDiagnostic(createEntry({ fix }), doc);
    const { data } = diag as DiagnosticWithData;
    expect(data.fix.range.start).toBe(5);
    expect(data.fix.range.end).toBe(10);
    expect(data.fix.text).toBe('replacement');
  });

  it('stores tip on diagnostic.data', () => {
    const diag = mapEntryToDiagnostic(createEntry({ tip: 'Add JSDoc' }), doc);
    const { data } = diag as DiagnosticWithData;
    expect(data.tip).toBe('Add JSDoc');
  });

  it('stores example on diagnostic.data', () => {
    const diag = mapEntryToDiagnostic(createEntry({ example: '/** @param {string} name */' }), doc);
    const { data } = diag as DiagnosticWithData;
    expect(data.example).toBe('/** @param {string} name */');
  });

  it('stores url on diagnostic.data', () => {
    const diag = mapEntryToDiagnostic(createEntry({ url: 'https://docs.example.com/rule' }), doc);
    const { data } = diag as DiagnosticWithData;
    expect(data.url).toBe('https://docs.example.com/rule');
  });

  it('converts 1-based line/column to 0-based', () => {
    const diag = mapEntryToDiagnostic(
      createEntry({ line: 2, column: 3, endLine: 2, endColumn: 5 }),
      doc,
    );
    expect(diag.range.start.line).toBe(1); // 2-1
    expect(diag.range.start.character).toBe(2); // 3-1
  });

  it('clamps line to valid range', () => {
    const diag = mapEntryToDiagnostic(
      createEntry({ line: 999, column: 1, endLine: 999, endColumn: 1 }),
      doc,
    );
    // Should clamp to last line (index 1 for 2-line doc)
    expect(diag.range.start.line).toBe(1);
  });

  it('handles line 0 gracefully', () => {
    const diag = mapEntryToDiagnostic(createEntry({ line: 0, column: 1 }), doc);
    expect(diag.range.start.line).toBe(0);
  });

  it('sets message from entry', () => {
    const diag = mapEntryToDiagnostic(createEntry({ message: 'Missing return type' }), doc);
    expect(diag.message).toBe('Missing return type');
  });
});

// =============================================================================
// lintDocument — stdin integration
// =============================================================================

// Mock workspace module to provide binary path and workspace root
vi.mock('../shared/workspace', () => ({
  getBinaryPath: vi.fn(() => '/usr/local/bin/resist-lint'),
  getWorkspaceRoot: vi.fn(() => '/workspace'),
}));

// Mock runner to capture args
const mockRunToolJson = vi.fn();
vi.mock('../shared/runner', () => ({
  runToolJson: (...args: unknown[]) => mockRunToolJson(...args),
}));

// Mock per-folder options (pass-through)
vi.mock('./per-folder', () => ({
  getPerFolderLintOptions: (_uri: unknown, opts: unknown) => opts,
}));

// Mock output functions
vi.mock('../shared/output', () => ({
  log: vi.fn(),
  logError: vi.fn(),
  logCommand: vi.fn(),
  logTiming: vi.fn(),
}));

describe('lintDocument — stdin mode', () => {
  let mockDocument: vscode.TextDocument;
  let mockCollection: vscode.DiagnosticCollection;
  let mockChannel: vscode.OutputChannel;
  let mockStateManager: { setState: ReturnType<typeof vi.fn>; getState: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDocument = {
      uri: vscode.Uri.file('/workspace/src/test.ts'),
      getText: () => 'export const x: number = 42;',
      lineCount: 1,
      lineAt: () => ({ text: 'export const x: number = 42;', range: new vscode.Range(0, 0, 0, 28) }),
      isUntitled: false,
    } as unknown as vscode.TextDocument;

    mockCollection = {
      set: vi.fn(),
      delete: vi.fn(),
    } as unknown as vscode.DiagnosticCollection;

    mockChannel = {
      appendLine: vi.fn(),
    } as unknown as vscode.OutputChannel;

    mockStateManager = {
      setState: vi.fn(),
      getState: vi.fn(() => 'ready'),
    };

    mockRunToolJson.mockResolvedValue({
      ok: true,
      data: [],
      stderr: '',
      elapsed: 50,
    });
  });

  it('passes --stdin-filename in CLI args', async () => {
    await lintDocument(
      mockDocument,
      mockCollection,
      mockChannel,
      mockStateManager as never,
      {},
    );

    expect(mockRunToolJson).toHaveBeenCalledTimes(1);
    const options: RunOptions = mockRunToolJson.mock.calls[0]![0] as RunOptions;
    const hasStdinFilename: boolean = options.args.some(
      (a: string): boolean => a.startsWith('--stdin-filename='),
    );
    expect(hasStdinFilename).toBe(true);
  });

  it('passes document text content as stdin', async () => {
    await lintDocument(
      mockDocument,
      mockCollection,
      mockChannel,
      mockStateManager as never,
      {},
    );

    const options: RunOptions = mockRunToolJson.mock.calls[0]![0] as RunOptions;
    expect(options.stdin).toBe('export const x: number = 42;');
  });

  it('does not pass file path as positional arg when using stdin', async () => {
    await lintDocument(
      mockDocument,
      mockCollection,
      mockChannel,
      mockStateManager as never,
      {},
    );

    const options: RunOptions = mockRunToolJson.mock.calls[0]![0] as RunOptions;
    // File path should be in --stdin-filename, not as a bare positional arg
    const positionalPaths: string[] = options.args.filter(
      (a: string): boolean => !a.startsWith('--') && a.includes('/'),
    );
    expect(positionalPaths.length).toBe(0);
  });

  it('--stdin-filename value matches document file path', async () => {
    await lintDocument(
      mockDocument,
      mockCollection,
      mockChannel,
      mockStateManager as never,
      {},
    );

    const options: RunOptions = mockRunToolJson.mock.calls[0]![0] as RunOptions;
    const stdinFlag: string | undefined = options.args.find(
      (a: string): boolean => a.startsWith('--stdin-filename='),
    );
    expect(stdinFlag).toBe(`--stdin-filename=${mockDocument.uri.fsPath}`);
  });

  it('includes --format=json in args alongside --stdin-filename', async () => {
    await lintDocument(
      mockDocument,
      mockCollection,
      mockChannel,
      mockStateManager as never,
      {},
    );

    const options: RunOptions = mockRunToolJson.mock.calls[0]![0] as RunOptions;
    expect(options.args).toContain('--format=json');
  });

  it('skips untitled documents', async () => {
    const untitledDoc = {
      ...mockDocument,
      isUntitled: true,
      uri: { ...mockDocument.uri, scheme: 'file' },
    } as unknown as vscode.TextDocument;

    await lintDocument(
      untitledDoc,
      mockCollection,
      mockChannel,
      mockStateManager as never,
      {},
    );

    expect(mockRunToolJson).not.toHaveBeenCalled();
  });

  it('skips non-file scheme documents', async () => {
    const virtualDoc = {
      ...mockDocument,
      uri: { ...mockDocument.uri, scheme: 'untitled', fsPath: '/test.ts' },
      isUntitled: false,
    } as unknown as vscode.TextDocument;

    await lintDocument(
      virtualDoc,
      mockCollection,
      mockChannel,
      mockStateManager as never,
      {},
    );

    expect(mockRunToolJson).not.toHaveBeenCalled();
  });
});
