/**
 * Lint Provider
 *
 * Core linting module. Spawns the resist-lint CLI with --format=json,
 * parses the structured LintResult output, and maps each diagnostic to
 * a vscode.Diagnostic with proper severity, range, code, and fix data.
 *
 * @module
 */

import * as vscode from 'vscode';
import { runToolJson } from '../shared/runner';
import { getBinaryPath, getWorkspaceRoot } from '../shared/workspace';
import { updateStatusBar, getFileDiagnosticCounts } from '../shared/status-bar';
import { log, logError, logCommand, logTiming } from '../shared/output';
import type { DiagnosticEntry, RunResult } from '../shared/types';

// =============================================================================
// Types
// =============================================================================

/** Options controlling what gets linted and how. */
export interface LintOptions {
  readonly stage?: string;
  readonly categories?: readonly string[];
  readonly extraArgs?: readonly string[];
}

// =============================================================================
// Lint Document
// =============================================================================

/**
 * Lints a single document by spawning resist-lint with --format=json.
 *
 * Skips non-file schemes, untitled documents, and documents outside a workspace.
 * Maps each DiagnosticEntry from the CLI output to a vscode.Diagnostic and sets
 * them on the diagnostic collection. Updates the status bar with counts.
 *
 * @param document - The document to lint
 * @param collection - The diagnostic collection to update
 * @param channel - Output channel for logging
 * @param statusBarItem - Status bar item to update
 * @param options - Lint options (stage, categories, extra args)
 */
export async function lintDocument(
  document: vscode.TextDocument,
  collection: vscode.DiagnosticCollection,
  channel: vscode.OutputChannel,
  statusBarItem: vscode.StatusBarItem,
  options: LintOptions,
): Promise<void> {
  // Skip non-file schemes and untitled documents
  if (document.uri.scheme !== 'file' || document.isUntitled) {
    return;
  }

  const filePath: string = document.uri.fsPath;

  // Find resist-lint binary
  const binPath: string | undefined = getBinaryPath('resist-lint', document.uri);
  if (!binPath) {
    return; // Binary not found — warning shown on activation
  }

  const cwd: string | undefined = getWorkspaceRoot(document.uri);
  if (!cwd) {
    return;
  }

  // Build CLI args
  const args: string[] = ['--format=json'];
  if (options.stage) {
    args.push(`--stage=${options.stage}`);
  }
  if (options.categories && options.categories.length > 0) {
    args.push(`--category=${options.categories.join(',')}`);
  }
  if (options.extraArgs) {
    args.push(...options.extraArgs);
  }
  args.push(filePath);

  // Update status bar
  updateStatusBar(statusBarItem, 'linting');

  // Log the command for debugging
  logCommand(channel, binPath, args);

  // Spawn resist-lint
  const result: RunResult<DiagnosticEntry[]> = await runToolJson<DiagnosticEntry[]>({
    command: binPath,
    args,
    cwd,
  });

  if (!result.ok) {
    logError(channel, `Lint failed for ${filePath}: ${result.error}`);
    updateStatusBar(statusBarItem, 'error');
    return;
  }

  // Log timing
  logTiming(channel, `Linted ${filePath}`, result.elapsed);

  // Read max problems setting
  const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('resist');
  const maxProblems: number = config.get<number>('lint.maxProblems', 100);

  // Map entries to diagnostics
  const entries: DiagnosticEntry[] = result.data.slice(0, maxProblems);
  const diagnostics: vscode.Diagnostic[] = entries.map((entry) =>
    mapEntryToDiagnostic(entry, document),
  );

  // Set diagnostics on the collection
  collection.set(document.uri, diagnostics);

  // Update status bar with counts
  const counts = getFileDiagnosticCounts(collection, document.uri);
  updateStatusBar(statusBarItem, 'ready', counts);

  if (result.stderr.trim()) {
    log(channel, `stderr: ${result.stderr.trim()}`);
  }
}

/**
 * Lints all files in the workspace with a progress indicator.
 *
 * Spawns resist-lint on the workspace root directory and maps results
 * grouped by file URI.
 *
 * @param collection - The diagnostic collection to update
 * @param channel - Output channel for logging
 * @param statusBarItem - Status bar item to update
 * @param options - Lint options
 * @param progress - Progress reporter for the progress bar
 */
export async function lintWorkspace(
  collection: vscode.DiagnosticCollection,
  channel: vscode.OutputChannel,
  statusBarItem: vscode.StatusBarItem,
  options: LintOptions,
  progress: vscode.Progress<{ message?: string; increment?: number }>,
): Promise<void> {
  const folders: readonly vscode.WorkspaceFolder[] | undefined = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return;
  }

  const rootUri: vscode.Uri = folders[0].uri;
  const binPath: string | undefined = getBinaryPath('resist-lint', rootUri);
  if (!binPath) {
    logError(channel, 'resist-lint binary not found');
    return;
  }

  const cwd: string | undefined = getWorkspaceRoot(rootUri);
  if (!cwd) {
    return;
  }

  // Build CLI args for workspace-wide lint
  const args: string[] = ['--format=json'];
  if (options.stage) {
    args.push(`--stage=${options.stage}`);
  }
  if (options.categories && options.categories.length > 0) {
    args.push(`--category=${options.categories.join(',')}`);
  }
  if (options.extraArgs) {
    args.push(...options.extraArgs);
  }
  args.push('.');

  updateStatusBar(statusBarItem, 'linting');
  logCommand(channel, binPath, args);
  progress.report({ message: 'Running resist-lint...' });

  const result: RunResult<DiagnosticEntry[]> = await runToolJson<DiagnosticEntry[]>({
    command: binPath,
    args,
    cwd,
    timeout: 120000, // 2 min for workspace-wide lint
  });

  if (!result.ok) {
    logError(channel, `Workspace lint failed: ${result.error}`);
    updateStatusBar(statusBarItem, 'error');
    return;
  }

  logTiming(channel, 'Workspace lint', result.elapsed);
  log(channel, `Found ${result.data.length} diagnostics`);

  // Group results by file
  const byFile = new Map<string, DiagnosticEntry[]>();
  for (const entry of result.data) {
    const existing: DiagnosticEntry[] | undefined = byFile.get(entry.file);
    if (existing) {
      existing.push(entry);
    } else {
      byFile.set(entry.file, [entry]);
    }
  }

  // Clear existing diagnostics
  collection.clear();

  // Set diagnostics per file
  const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('resist');
  const maxProblems: number = config.get<number>('lint.maxProblems', 100);
  let processed = 0;
  const total: number = byFile.size;

  for (const [filePath, entries] of byFile) {
    const uri: vscode.Uri = vscode.Uri.file(filePath);
    // We need the document to map positions; for files not open, use basic range
    const doc: vscode.TextDocument | undefined = vscode.workspace.textDocuments.find(
      (d) => d.uri.fsPath === filePath,
    );
    const diagnostics: vscode.Diagnostic[] = entries
      .slice(0, maxProblems)
      .map((entry) => (doc ? mapEntryToDiagnostic(entry, doc) : mapEntryToDiagnosticBasic(entry)));
    collection.set(uri, diagnostics);
    processed++;
    progress.report({
      message: `${processed}/${total} files`,
      increment: (1 / total) * 100,
    });
  }

  // Update status bar for active editor
  const activeUri: vscode.Uri | undefined = vscode.window.activeTextEditor?.document.uri;
  if (activeUri) {
    const counts = getFileDiagnosticCounts(collection, activeUri);
    updateStatusBar(statusBarItem, 'ready', counts);
  } else {
    updateStatusBar(statusBarItem, 'ready');
  }
}

// =============================================================================
// Diagnostic Mapping
// =============================================================================

/**
 * Maps a DiagnosticEntry to a vscode.Diagnostic with full document context.
 *
 * Uses endLine/endColumn for precise range highlighting when available.
 * Falls back to word range at position, then cursor-to-EOL.
 * Stores fix data, tip, example, and url on diagnostic.data for the
 * CodeActionProvider to consume.
 */
function mapEntryToDiagnostic(
  entry: DiagnosticEntry,
  document: vscode.TextDocument,
): vscode.Diagnostic {
  const line: number = Math.max(0, Math.min(entry.line - 1, document.lineCount - 1));
  const column: number = Math.max(0, entry.column - 1);

  let range: vscode.Range;

  if (entry.endLine !== undefined && entry.endColumn !== undefined) {
    // Precise range from linter
    const endLine: number = Math.max(0, Math.min(entry.endLine - 1, document.lineCount - 1));
    const endColumn: number = Math.max(0, entry.endColumn - 1);
    range = new vscode.Range(line, column, endLine, endColumn);
  } else {
    // Try word range for token highlighting
    const lineText: string = document.lineAt(line).text;
    const startCol: number = Math.min(column, lineText.length);
    const wordRange: vscode.Range | undefined = document.getWordRangeAtPosition(
      new vscode.Position(line, startCol),
    );
    range = wordRange ?? new vscode.Range(line, startCol, line, lineText.length);
  }

  const severity: vscode.DiagnosticSeverity = mapSeverity(entry.severity);
  const diagnostic = new vscode.Diagnostic(range, entry.message, severity);
  diagnostic.source = 'resist-linter';
  diagnostic.code = entry.ruleId;

  // Store fix data and metadata for CodeActionProvider
  (diagnostic as DiagnosticWithData).data = {
    fix: entry.fix,
    tip: entry.tip,
    example: entry.example,
    url: entry.url,
  };

  return diagnostic;
}

/**
 * Maps a DiagnosticEntry to a vscode.Diagnostic without document context.
 *
 * Used for files that are not currently open in the editor. Creates a
 * single-line range based on line/column info.
 */
function mapEntryToDiagnosticBasic(entry: DiagnosticEntry): vscode.Diagnostic {
  const line: number = Math.max(0, entry.line - 1);
  const column: number = Math.max(0, entry.column - 1);
  const endLine: number = entry.endLine !== undefined ? Math.max(0, entry.endLine - 1) : line;
  const endColumn: number =
    entry.endColumn !== undefined ? Math.max(0, entry.endColumn - 1) : column + 1;

  const range = new vscode.Range(line, column, endLine, endColumn);
  const severity: vscode.DiagnosticSeverity = mapSeverity(entry.severity);
  const diagnostic = new vscode.Diagnostic(range, entry.message, severity);
  diagnostic.source = 'resist-linter';
  diagnostic.code = entry.ruleId;

  (diagnostic as DiagnosticWithData).data = {
    fix: entry.fix,
    tip: entry.tip,
    example: entry.example,
    url: entry.url,
  };

  return diagnostic;
}

/** Maps severity string to vscode.DiagnosticSeverity. */
function mapSeverity(severity: string): vscode.DiagnosticSeverity {
  switch (severity) {
    case 'error':
      return vscode.DiagnosticSeverity.Error;
    case 'warning':
      return vscode.DiagnosticSeverity.Warning;
    case 'info':
      return vscode.DiagnosticSeverity.Information;
    default:
      return vscode.DiagnosticSeverity.Warning;
  }
}

// =============================================================================
// Diagnostic Data Extension
// =============================================================================

/** Extended diagnostic with fix data attached. */
export interface DiagnosticData {
  readonly fix: {
    readonly range: { readonly start: number; readonly end: number };
    readonly text: string;
  };
  readonly tip?: string;
  readonly example?: string;
  readonly url?: string;
}

/** A vscode.Diagnostic with additional data for the CodeActionProvider. */
export interface DiagnosticWithData extends vscode.Diagnostic {
  data: DiagnosticData;
}
