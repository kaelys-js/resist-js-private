/**
 * Tests for Diagnostics Manager
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-60.md TASK 13
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { mapSeverity, applyMaxProblems, createDiagnosticFromEntry } from './diagnostics';
import type { DiagnosticEntry, DiagnosticFix } from './types';
import * as output from './output';
import { DIAGNOSTIC_SOURCE } from './brand';

vi.mock('./output', () => ({
  log: vi.fn(),
}));

vi.mock('../locale/schema', () => ({
  format: vi.fn((template: string, params: Record<string, string | number>) => {
    let result: string = template;

    for (const [key, value] of Object.entries(params)) {
      result = result.replaceAll(`{${key}}`, String(value));
    }
    return result;
  }),
}));

vi.mock('../locale/en', () => ({
  en: {
    diagnosticManager: {
      maxProblemsReached: 'Max problems limit reached ({max}), remaining diagnostics truncated',
      invalidEntry: 'Invalid diagnostic entry skipped: {reason}',
      invalidReason: 'missing message or invalid line: {line}',
    },
  },
}));

function createEntry(overrides: Partial<DiagnosticEntry> = {}): DiagnosticEntry {
  return {
    file: '/test/file.ts',
    line: 1,
    column: 1,
    severity: 'error',
    message: 'Test error',
    ruleId: 'test-rule',
    fix: { range: { start: 0, end: 5 }, text: 'fix' },
    ...overrides,
  };
}

describe('Diagnostics Manager', () => {
  const mockChannel = { appendLine: vi.fn() } as unknown as vscode.OutputChannel;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mapSeverity', () => {
    it('maps "error" to DiagnosticSeverity.Error', () => {
      expect(mapSeverity('error')).toBe(vscode.DiagnosticSeverity.Error);
    });

    it('maps "warn" to DiagnosticSeverity.Warning', () => {
      expect(mapSeverity('warn')).toBe(vscode.DiagnosticSeverity.Warning);
    });

    it('maps "warning" to DiagnosticSeverity.Warning', () => {
      expect(mapSeverity('warning')).toBe(vscode.DiagnosticSeverity.Warning);
    });

    it('maps "info" to DiagnosticSeverity.Information', () => {
      expect(mapSeverity('info')).toBe(vscode.DiagnosticSeverity.Information);
    });

    it('maps unknown severity to DiagnosticSeverity.Hint', () => {
      expect(mapSeverity('unknown')).toBe(vscode.DiagnosticSeverity.Hint);
    });

    it('maps empty string to DiagnosticSeverity.Hint', () => {
      expect(mapSeverity('')).toBe(vscode.DiagnosticSeverity.Hint);
    });
  });

  describe('applyMaxProblems', () => {
    it('returns all diagnostics when under limit', () => {
      const range = new vscode.Range(0, 0, 0, 1);
      const diags = [
        new vscode.Diagnostic(range, 'a', vscode.DiagnosticSeverity.Error),
        new vscode.Diagnostic(range, 'b', vscode.DiagnosticSeverity.Warning),
      ];

      const result = applyMaxProblems(diags, 10, mockChannel);
      expect(result).toHaveLength(2);
      expect(result).toBe(diags); // Same reference, not truncated
    });

    it('truncates when over limit', () => {
      const range = new vscode.Range(0, 0, 0, 1);
      const diags = [
        new vscode.Diagnostic(range, 'a', vscode.DiagnosticSeverity.Error),
        new vscode.Diagnostic(range, 'b', vscode.DiagnosticSeverity.Warning),
        new vscode.Diagnostic(range, 'c', vscode.DiagnosticSeverity.Information),
      ];

      const result = applyMaxProblems(diags, 2, mockChannel);
      expect(result).toHaveLength(2);
      expect(result[0]!.message).toBe('a');
      expect(result[1]!.message).toBe('b');
    });

    it('logs truncation to channel', () => {
      const range = new vscode.Range(0, 0, 0, 1);
      const diags = [
        new vscode.Diagnostic(range, 'a', vscode.DiagnosticSeverity.Error),
        new vscode.Diagnostic(range, 'b', vscode.DiagnosticSeverity.Warning),
      ];

      applyMaxProblems(diags, 1, mockChannel);
      expect(output.log).toHaveBeenCalledWith(
        mockChannel,
        'Max problems limit reached (1), remaining diagnostics truncated',
      );
    });

    it('does not log when under limit', () => {
      const range = new vscode.Range(0, 0, 0, 1);
      const diags = [new vscode.Diagnostic(range, 'a', vscode.DiagnosticSeverity.Error)];

      applyMaxProblems(diags, 10, mockChannel);
      expect(output.log).not.toHaveBeenCalled();
    });

    it('does not log when no channel provided', () => {
      const range = new vscode.Range(0, 0, 0, 1);
      const diags = [
        new vscode.Diagnostic(range, 'a', vscode.DiagnosticSeverity.Error),
        new vscode.Diagnostic(range, 'b', vscode.DiagnosticSeverity.Warning),
      ];

      applyMaxProblems(diags, 1);
      expect(output.log).not.toHaveBeenCalled();
    });
  });

  describe('createDiagnosticFromEntry', () => {
    it('creates diagnostic with correct range', () => {
      const entry = createEntry({ line: 10, column: 5 });
      const diag = createDiagnosticFromEntry(entry, DIAGNOSTIC_SOURCE, mockChannel);

      expect(diag).toBeDefined();
      expect(diag!.range.start.line).toBe(9); // 0-based
      expect(diag!.range.start.character).toBe(4); // 0-based
    });

    it('creates diagnostic with correct severity', () => {
      const errorEntry = createEntry({ severity: 'error' });
      const warnEntry = createEntry({ severity: 'warning' });

      const errorDiag = createDiagnosticFromEntry(errorEntry, DIAGNOSTIC_SOURCE);
      const warnDiag = createDiagnosticFromEntry(warnEntry, DIAGNOSTIC_SOURCE);

      expect(errorDiag!.severity).toBe(vscode.DiagnosticSeverity.Error);
      expect(warnDiag!.severity).toBe(vscode.DiagnosticSeverity.Warning);
    });

    it('creates diagnostic with correct source', () => {
      const entry = createEntry();
      const diag = createDiagnosticFromEntry(entry, DIAGNOSTIC_SOURCE);

      expect(diag!.source).toBe(DIAGNOSTIC_SOURCE);
    });

    it('creates diagnostic with correct code (ruleId)', () => {
      const entry = createEntry({ ruleId: 'no-unused-vars' });
      const diag = createDiagnosticFromEntry(entry, DIAGNOSTIC_SOURCE);

      expect(diag!.code).toBe('no-unused-vars');
    });

    it('handles fix/tip/url data', () => {
      const entry = createEntry({
        fix: { range: { start: 0, end: 10 }, text: 'replacement' },
        tip: 'Use const instead',
        url: 'https://example.com/rule',
      });

      const diag = createDiagnosticFromEntry(entry, DIAGNOSTIC_SOURCE);
      const { data } = diag as unknown as { data: Record<string, unknown> };

      expect(data).toBeDefined();
      expect(data.fix).toEqual({ range: { start: 0, end: 10 }, text: 'replacement' });
      expect(data.tip).toBe('Use const instead');
      expect(data.url).toBe('https://example.com/rule');
    });

    it('returns undefined for invalid entry (missing message)', () => {
      const entry = createEntry({ message: '' });
      const diag = createDiagnosticFromEntry(entry, DIAGNOSTIC_SOURCE, mockChannel);

      expect(diag).toBeUndefined();
    });

    it('returns undefined for invalid entry (line < 1)', () => {
      const entry = createEntry({ line: 0 });
      const diag = createDiagnosticFromEntry(entry, DIAGNOSTIC_SOURCE, mockChannel);

      expect(diag).toBeUndefined();
    });

    it('returns undefined for invalid entry (line undefined)', () => {
      const entry = createEntry({ line: undefined as unknown as number });
      const diag = createDiagnosticFromEntry(entry, DIAGNOSTIC_SOURCE, mockChannel);

      expect(diag).toBeUndefined();
    });

    it('logs invalid entry when channel provided', () => {
      const entry = createEntry({ message: '', line: 0 });
      createDiagnosticFromEntry(entry, DIAGNOSTIC_SOURCE, mockChannel);

      expect(output.log).toHaveBeenCalledWith(
        mockChannel,
        expect.stringContaining('Invalid diagnostic entry skipped'),
      );
    });

    it('handles endLine and endColumn', () => {
      const entry = createEntry({ line: 5, column: 1, endLine: 7, endColumn: 10 });
      const diag = createDiagnosticFromEntry(entry, DIAGNOSTIC_SOURCE);

      expect(diag!.range.start.line).toBe(4);
      expect(diag!.range.start.character).toBe(0);
      expect(diag!.range.end.line).toBe(6);
      expect(diag!.range.end.character).toBe(9);
    });

    it('defaults endLine/endColumn to start line/col when not provided', () => {
      const entry = createEntry({ line: 3, column: 2 });
      const diag = createDiagnosticFromEntry(entry, DIAGNOSTIC_SOURCE);

      expect(diag!.range.start.line).toBe(2);
      expect(diag!.range.start.character).toBe(1);
      expect(diag!.range.end.line).toBe(2);
      expect(diag!.range.end.character).toBe(1);
    });

    it('omits data when no fix/tip/example/url', () => {
      const entry: DiagnosticEntry = {
        file: '/test.ts',
        line: 1,
        column: 1,
        severity: 'error',
        message: 'Test',
        ruleId: 'test',
        fix: undefined as unknown as DiagnosticFix,
      };

      const diag = createDiagnosticFromEntry(entry, DIAGNOSTIC_SOURCE);
      expect((diag as unknown as { data: unknown }).data).toBeUndefined();
    });

    it('returns undefined for invalid entry with channel logging (line 113-121)', () => {
      const entry = createEntry({ message: '', line: 0 });
      const diag = createDiagnosticFromEntry(entry, DIAGNOSTIC_SOURCE, mockChannel);
      expect(diag).toBeUndefined();
      expect(output.log).toHaveBeenCalled();
    });

    it('returns undefined for invalid entry without channel (line 112)', () => {
      const entry = createEntry({ message: '', line: 0 });
      const diag = createDiagnosticFromEntry(entry, DIAGNOSTIC_SOURCE);
      expect(diag).toBeUndefined();
    });

    it('uses default severity when severity not provided (line 130)', () => {
      const entry = createEntry({ severity: undefined as unknown as string });
      const diag = createDiagnosticFromEntry(entry, DIAGNOSTIC_SOURCE);
      expect(diag).toBeDefined();
      expect(diag!.severity).toBe(vscode.DiagnosticSeverity.Error);
    });
  });
});
