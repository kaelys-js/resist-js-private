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
 * @param severity - Severity string from the linter ('error', 'warn', 'info', 'off')
 * @returns VS Code DiagnosticSeverity
 */
export function mapSeverity(severity: string): vscode.DiagnosticSeverity {
  switch (severity) {
    case 'error':
      return vscode.DiagnosticSeverity.Error;
    case 'warn':
    case 'warning':
      return vscode.DiagnosticSeverity.Warning;
    case 'info':
      return vscode.DiagnosticSeverity.Information;
    default:
      return vscode.DiagnosticSeverity.Hint;
  }
}

/**
 * Applies the max problems limit to an array of diagnostics.
 *
 * Logs a warning when diagnostics are truncated.
 *
 * @param diagnostics - Array of diagnostics to limit
 * @param max - Maximum number of diagnostics to keep
 * @param channel - Optional output channel for logging
 * @returns Truncated array of diagnostics
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
 * @param entry - The linter diagnostic entry
 * @param source - Source attribution string (e.g. 'resist-linter')
 * @param channel - Optional output channel for logging
 * @returns The created diagnostic, or undefined if the entry is invalid
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
  const endLine: number = entry.endLine !== undefined ? entry.endLine - 1 : line;
  const endCol: number = entry.endColumn !== undefined ? entry.endColumn - 1 : col;

  const range = new vscode.Range(line, col, endLine, endCol);
  const severity: vscode.DiagnosticSeverity = mapSeverity(entry.severity ?? 'error');

  const diagnostic = new vscode.Diagnostic(range, entry.message, severity);
  diagnostic.source = source;

  if (entry.ruleId) {
    diagnostic.code = entry.ruleId;
  }

  if (entry.fix || entry.tip || entry.example || entry.url) {
    (diagnostic as { data?: unknown }).data = {
      fix: entry.fix,
      tip: entry.tip,
      example: entry.example,
      url: entry.url,
    };
  }

  return diagnostic;
}
