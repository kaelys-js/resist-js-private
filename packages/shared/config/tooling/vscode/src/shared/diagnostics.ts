/**
 * Diagnostics Manager
 *
 * Consistent diagnostic creation with typed metadata, severity mapping,
 * and source attribution. Centralizes logic from provider.ts.
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-60.md TASK 13
 *
 * @module
 */

import * as vscode from 'vscode';
import { log } from './output';
import { format } from '../locale/schema';
import { en } from '../locale/en';
import type { DiagnosticEntry } from './types';

/**
 * Maps a severity string to a VS Code DiagnosticSeverity.
 *
 * @param {string} severity - Severity string from the linter ('error', 'warn', 'info', 'off')
 * @returns {vscode.DiagnosticSeverity} VS Code DiagnosticSeverity
 *
 * @example
 * ```typescript
 * const severity = mapSeverity('warn');
 * // severity === vscode.DiagnosticSeverity.Warning
 * ```
 */
export function mapSeverity(severity: string): vscode.DiagnosticSeverity {
  switch (severity) {
    case 'error': {
      return vscode.DiagnosticSeverity.Error;
    }
    case 'warn':
    case 'warning': {
      return vscode.DiagnosticSeverity.Warning;
    }
    case 'info': {
      return vscode.DiagnosticSeverity.Information;
    }
    default: {
      return vscode.DiagnosticSeverity.Hint;
    }
  }
}

/**
 * Applies the max problems limit to an array of diagnostics.
 *
 * Logs a warning when diagnostics are truncated.
 *
 * @param {vscode.Diagnostic[]} diagnostics - Array of diagnostics to limit
 * @param {number} max - Maximum number of diagnostics to keep
 * @param {vscode.OutputChannel} [channel] - Optional output channel for logging
 * @returns {vscode.Diagnostic[]} Truncated array of diagnostics
 *
 * @example
 * ```typescript
 * const allDiagnostics = [diag1, diag2, diag3, diag4, diag5];
 * const limited = applyMaxProblems(allDiagnostics, 3, outputChannel);
 * // limited.length === 3
 * ```
 */
export function applyMaxProblems(
  diagnostics: vscode.Diagnostic[],
  max: number,
  channel?: vscode.OutputChannel,
): vscode.Diagnostic[] {
  if (diagnostics.length <= max) {
    return diagnostics;
  }

  if (channel) {
    log(channel, format(en.diagnosticManager.maxProblemsReached, { max }));
  }

  return diagnostics.slice(0, max);
}

/**
 * Creates a VS Code Diagnostic from a linter DiagnosticEntry.
 *
 * Invalid entries are logged and result in undefined return.
 *
 * @param {DiagnosticEntry} entry - The linter diagnostic entry
 * @param {string} source - Source attribution string (e.g. 'resist-linter')
 * @param {vscode.OutputChannel} [channel] - Optional output channel for logging
 * @returns {vscode.Diagnostic | undefined} The created diagnostic, or undefined if the entry is invalid
 *
 * @example
 * ```typescript
 * const entry: DiagnosticEntry = {
 *   file: '/src/app.ts',
 *   line: 10,
 *   column: 5,
 *   severity: 'error',
 *   message: 'Missing return type',
 *   ruleId: 'jsdoc/require-returns',
 * };
 * const diagnostic = createDiagnosticFromEntry(entry, 'resist-linter', outputChannel);
 * if (diagnostic) {
 *   diagnostics.push(diagnostic);
 * }
 * ```
 */
export function createDiagnosticFromEntry(
  entry: DiagnosticEntry,
  source: string,
  channel?: vscode.OutputChannel,
): vscode.Diagnostic | undefined {
  if (!entry.message || entry.line === undefined || entry.line < 1) {
    if (channel) {
      log(
        channel,
        format(en.diagnosticManager.invalidEntry, {
          reason: format(en.diagnosticManager.invalidReason, { line: String(entry.line) }),
        }),
      );
    }
    return undefined;
  }

  const line: number = entry.line - 1; // VS Code uses 0-based lines
  const col: number = (entry.column ?? 1) - 1;
  const endLine: number = entry.endLine === undefined ? line : entry.endLine - 1;
  const endCol: number = entry.endColumn === undefined ? col : entry.endColumn - 1;

  const range = new vscode.Range(line, col, endLine, endCol);
  const severity: vscode.DiagnosticSeverity = mapSeverity(entry.severity ?? 'error');

  const diagnostic = new vscode.Diagnostic(range, entry.message, severity);
  diagnostic.source = source;

  if (entry.ruleId) {
    diagnostic.code = entry.ruleId;
  }

  if (entry.fix || entry.tip || entry.example || entry.description || entry.url) {
    (diagnostic as { data?: unknown }).data = {
      fix: entry.fix,
      tip: entry.tip,
      example: entry.example,
      description: entry.description,
      url: entry.url,
    };
  }

  return diagnostic;
}
