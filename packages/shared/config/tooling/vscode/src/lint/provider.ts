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
import { en } from '../locale/en';
import { format } from '../locale/schema';
import { BINARY_NAME, CONFIG_SECTION, DIAGNOSTIC_SOURCE } from '../shared/brand';

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
  const binPath: string | undefined = getBinaryPath(BINARY_NAME, document.uri);
  if (!binPath) {
    log(channel, format(en.messages.skipBinaryNotFound, { file: filePath }));
    return;
  }

  const cwd: string | undefined = getWorkspaceRoot(document.uri);
  if (!cwd) {
    log(channel, format(en.messages.skipWorkspaceNotFound, { file: filePath }));
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

  // Append config-driven CLI flags
  appendConfigArgs(args);

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
    logError(channel, format(en.messages.lintFailed, { file: filePath, error: result.error }));
    updateStatusBar(statusBarItem, 'error');
    return;
  }

  // Log timing
  logTiming(channel, format(en.messages.lintedFile, { file: filePath }), result.elapsed);

  // Read max problems setting
  const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const maxProblems: number = config.get<number>('lint.maxProblems', 100);

  // Map entries to diagnostics (skip malformed entries instead of crashing)
  const entries: DiagnosticEntry[] = result.data.slice(0, maxProblems);
  const diagnostics: vscode.Diagnostic[] = [];
  for (const entry of entries) {
    try {
      diagnostics.push(mapEntryToDiagnostic(entry, document));
    } catch (err: unknown) {
      logError(
        channel,
        format(en.messages.diagnosticMapFailed, {
          rule: entry.ruleId,
          location: `${entry.file}:${entry.line}`,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }

  // Set diagnostics on the collection
  collection.set(document.uri, diagnostics);

  // Update status bar with counts
  const counts = getFileDiagnosticCounts(collection, document.uri);
  updateStatusBar(statusBarItem, 'ready', counts);

  if (result.stderr.trim()) {
    log(channel, format(en.messages.stderrOutput, { output: result.stderr.trim() }));
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
  const binPath: string | undefined = getBinaryPath(BINARY_NAME, rootUri);
  if (!binPath) {
    logError(channel, en.messages.binaryNotFoundShort);
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
  appendConfigArgs(args);
  if (options.extraArgs) {
    args.push(...options.extraArgs);
  }
  args.push('.');

  updateStatusBar(statusBarItem, 'linting');
  logCommand(channel, binPath, args);
  progress.report({ message: en.messages.runningLinter });

  const result: RunResult<DiagnosticEntry[]> = await runToolJson<DiagnosticEntry[]>({
    command: binPath,
    args,
    cwd,
    timeout: 120000, // 2 min for workspace-wide lint
  });

  if (!result.ok) {
    logError(channel, format(en.messages.workspaceLintFailed, { error: result.error }));
    updateStatusBar(statusBarItem, 'error');
    return;
  }

  logTiming(channel, en.messages.workspaceLintTiming, result.elapsed);
  log(channel, format(en.messages.foundDiagnostics, { count: result.data.length }));

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
  const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const maxProblems: number = config.get<number>('lint.maxProblems', 100);
  let processed = 0;
  const total: number = byFile.size;

  for (const [filePath, entries] of byFile) {
    const uri: vscode.Uri = vscode.Uri.file(filePath);
    // We need the document to map positions; for files not open, use basic range
    const doc: vscode.TextDocument | undefined = vscode.workspace.textDocuments.find(
      (d) => d.uri.fsPath === filePath,
    );
    const diagnostics: vscode.Diagnostic[] = [];
    for (const entry of entries.slice(0, maxProblems)) {
      try {
        diagnostics.push(doc ? mapEntryToDiagnostic(entry, doc) : mapEntryToDiagnosticBasic(entry));
      } catch {
        // Skip malformed entries during workspace lint (too noisy to log each one)
      }
    }
    collection.set(uri, diagnostics);
    processed++;
    progress.report({
      message: format(en.messages.progressFiles, { processed, total }),
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
// Config-Driven CLI Args
// =============================================================================

/**
 * Appends CLI flags derived from resist.lint.* settings to the args array.
 *
 * Reads cache, quiet, debug, severityOverride, rule, ignorePatterns,
 * jobs, tools, locale, and bail settings.
 */
function appendConfigArgs(args: string[]): void {
  const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(CONFIG_SECTION);

  if (config.get<boolean>('lint.cache', true) === false) {
    args.push('--no-cache');
  }
  if (config.get<boolean>('lint.quiet', false)) {
    args.push('--quiet');
  }
  if (config.get<boolean>('lint.debug', false)) {
    args.push('--debug');
  }
  const severityOverride: string = config.get<string>('lint.severityOverride', '');
  if (severityOverride) {
    args.push(`--severity=${severityOverride}`);
  }
  const rule: string = config.get<string>('lint.rule', '');
  if (rule) {
    args.push(`--rule=${rule}`);
  }
  const ignorePatterns: string[] = config.get<string[]>('lint.ignorePatterns', []);
  for (const pattern of ignorePatterns) {
    args.push(`--ignore=${pattern}`);
  }
  const jobs: number = config.get<number>('lint.jobs', 0);
  if (jobs > 0) {
    args.push(`--jobs=${jobs}`);
  }
  if (config.get<boolean>('lint.tools', false)) {
    args.push('--tools');
  }
  const locale: string = config.get<string>('lint.locale', '');
  if (locale) {
    args.push(`--locale=${locale}`);
  }
  if (config.get<boolean>('lint.bail', false)) {
    args.push('--bail');
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
export function mapEntryToDiagnostic(
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

  // Append example to message when present so it's visible in the Problems panel
  let message: string = entry.message;
  if (entry.example) {
    message += `\n\nExample:\n${entry.example}`;
  }

  const diagnostic = new vscode.Diagnostic(range, message, severity);
  diagnostic.source = DIAGNOSTIC_SOURCE;

  // When url is present, make rule ID clickable in the Problems panel
  if (entry.url) {
    diagnostic.code = { value: entry.ruleId, target: vscode.Uri.parse(entry.url) };
  } else {
    diagnostic.code = entry.ruleId;
  }

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

  // Append example to message when present
  let message: string = entry.message;
  if (entry.example) {
    message += `\n\nExample:\n${entry.example}`;
  }

  const diagnostic = new vscode.Diagnostic(range, message, severity);
  diagnostic.source = DIAGNOSTIC_SOURCE;

  // When url is present, make rule ID clickable
  if (entry.url) {
    diagnostic.code = { value: entry.ruleId, target: vscode.Uri.parse(entry.url) };
  } else {
    diagnostic.code = entry.ruleId;
  }

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
