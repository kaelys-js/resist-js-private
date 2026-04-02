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
import { readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { runToolJson } from '../shared/runner';
import { getBinaryPath, getWorkspaceRoot } from '../shared/workspace';
import type { ToolStateManager } from '../shared/state';
import { mapSeverity, applyMaxProblems, createDiagnosticFromEntry } from '../shared/diagnostics';
import { extractMessage } from '../shared/errors';
import {
  log,
  logError,
  logCommand,
  logTiming,
  logSummary,
  logDiagnosticList,
} from '../shared/output';
import type { DiagnosticEntry, RunResult } from '../shared/types';
import { en } from '../locale/en';
import { format } from '../locale/schema';
import { BINARY_NAME, CONFIG_SECTION, DIAGNOSTIC_SOURCE } from '../shared/brand';
import { getPerFolderLintOptions } from './per-folder';

// =============================================================================
// Types
// =============================================================================

/** Options controlling what gets linted and how. */
export type LintOptions = {
  readonly stage?: string;
  readonly categories?: readonly string[];
  readonly extraArgs?: readonly string[];
};

/** Progress reporter type for workspace lint. */
export type LintProgress = vscode.Progress<{ message?: string; increment?: number }>;

// =============================================================================
// Exclude Check
// =============================================================================

/** Cached exclude directory names from .resist-lint.jsonc. */
let excludeNamesCache: ReadonlySet<string> | undefined;

/**
 * Checks if a file path passes through an excluded directory.
 *
 * Reads the workspace's `.resist-lint.jsonc` exclude patterns (cached)
 * and checks each path segment against the name-based exclusions.
 *
 * @param {string} filePath - Absolute file path to check
 * @param {string} cwd - Workspace root for resolving config
 * @returns {boolean} True if the file is inside an excluded directory
 *
 * @example
 * ```typescript
 * isExcludedPath('/workspace/_INTEGRATE/foo.ts', '/workspace'); // true
 * isExcludedPath('/workspace/src/app.ts', '/workspace');        // false
 * ```
 */
export function isExcludedPath(filePath: string, cwd: string): boolean {
  if (!excludeNamesCache) {
    excludeNamesCache = loadExcludeNames(cwd);
  }

  if (excludeNamesCache.size === 0) {
    return false;
  }

  const rel: string = relative(cwd, filePath);
  const segments: string[] = rel.split(sep);

  for (const segment of segments) {
    if (excludeNamesCache.has(segment)) {
      return true;
    }
  }

  return false;
}

/**
 * Reads exclude patterns from .resist-lint.jsonc in the workspace root.
 *
 * Only returns name-based excludes (no `/`), since those match directory
 * names at any depth.
 *
 * @param {string} cwd - Workspace root
 * @returns {ReadonlySet<string>} Set of excluded directory names
 */
function loadExcludeNames(cwd: string): ReadonlySet<string> {
  try {
    const configPath: string = join(cwd, '.resist-lint.jsonc');
    const raw: string = readFileSync(configPath, 'utf8');
    // Strip JSONC comments (// and /* */) for JSON.parse
    const stripped: string = raw.replaceAll(/\/\/.*$/gm, '').replaceAll(/\/\*[\s\S]*?\*\//g, '');
    const parsed = JSON.parse(stripped) as { exclude?: string[] };
    const names: string[] = (parsed.exclude ?? []).filter(
      (e: string): boolean => !e.includes('/') && !e.startsWith('*'),
    );

    return new Set(names);
  } catch {
    return new Set();
  }
}

/**
 * Clears the cached exclude names. Call on config file changes.
 *
 * @example
 * ```typescript
 * // Listen for config file changes and invalidate the cache
 * watcher.onDidChange(() => clearExcludeCache());
 * ```
 */
export function clearExcludeCache(): void {
  excludeNamesCache = undefined;
}

// =============================================================================
// Untitled Document Support
// =============================================================================

/** Map of VS Code language IDs to file extensions for untitled documents. */
const LANGUAGE_EXTENSIONS: ReadonlyMap<string, string> = new Map([
  ['typescript', '.ts'],
  ['typescriptreact', '.tsx'],
  ['javascript', '.js'],
  ['javascriptreact', '.jsx'],
  ['svelte', '.svelte'],
  ['astro', '.astro'],
  ['html', '.html'],
  ['vue', '.vue'],
  ['markdown', '.md'],
  ['mdx', '.mdx'],
]);

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
 * @param {vscode.TextDocument} document - The document to lint
 * @param {vscode.DiagnosticCollection} collection - The diagnostic collection to update
 * @param {vscode.OutputChannel} channel - Output channel for logging
 * @param {ToolStateManager} stateManager - Tool state manager for status updates
 * @param {LintOptions} options - Lint options (stage, categories, extra args)
 *
 * @example
 * ```typescript
 * const options: LintOptions = { stage: 'lint', categories: ['style'], extraArgs: [] };
 * await lintDocument(editor.document, diagnosticCollection, outputChannel, stateManager, options);
 * ```
 */
export async function lintDocument(
  document: vscode.TextDocument,
  collection: vscode.DiagnosticCollection,
  channel: vscode.OutputChannel,
  stateManager: ToolStateManager,
  options: LintOptions,
): Promise<void> {
  // Determine file path — for untitled docs, generate synthetic filename
  let filePath: string;
  const isUntitled: boolean = document.isUntitled || document.uri.scheme !== 'file';

  if (isUntitled) {
    const ext: string | undefined = LANGUAGE_EXTENSIONS.get(document.languageId);

    if (!ext) {
      return; // Unsupported language for linting
    }
    filePath = `untitled${ext}`;
  } else {
    filePath = document.uri.fsPath;
  }

  // For untitled docs, use the first workspace folder for binary/workspace resolution
  // since untitled:// URIs can't be resolved by getWorkspaceFolder()
  const resolveUri: vscode.Uri = isUntitled
    ? (vscode.workspace.workspaceFolders?.[0]?.uri ?? document.uri)
    : document.uri;

  // Resolve per-folder options for multi-root workspaces
  const resolvedOptions: LintOptions = isUntitled
    ? options
    : getPerFolderLintOptions(document.uri, options, channel);

  // Find resist-lint binary
  const binPath: string | undefined = getBinaryPath(BINARY_NAME, resolveUri);

  if (!binPath) {
    log(channel, format(en.messages.skipBinaryNotFound, { file: filePath }));
    return;
  }

  const cwd: string | undefined = getWorkspaceRoot(resolveUri);

  if (!cwd) {
    log(channel, format(en.messages.skipWorkspaceNotFound, { file: filePath }));
    return;
  }

  // Skip files in excluded directories (e.g. _INTEGRATE, node_modules)
  if (!isUntitled && isExcludedPath(filePath, cwd)) {
    return;
  }

  // Build CLI args — always use --stdin-filename so the CLI reads the editor buffer
  const args: string[] = ['--format=json', `--stdin-filename=${filePath}`];

  if (resolvedOptions.stage) {
    args.push(`--stage=${resolvedOptions.stage}`);
  }
  if (resolvedOptions.categories && resolvedOptions.categories.length > 0) {
    args.push(`--category=${resolvedOptions.categories.join(',')}`);
  }

  // Append config-driven CLI flags — skip --tools for stdin mode (too slow for on-type)
  appendConfigArgs(args, { skipTools: true });

  if (resolvedOptions.extraArgs) {
    args.push(...resolvedOptions.extraArgs);
  }

  // Update state
  stateManager.setState('lint', 'running');

  // Log the command for debugging
  logCommand(channel, binPath, args);

  // Spawn resist-lint — pipe the current editor buffer via stdin
  // Use a shorter timeout for on-type lint (10s vs 30s default)
  const result: RunResult<DiagnosticEntry[]> = await runToolJson<DiagnosticEntry[]>({
    command: binPath,
    args,
    cwd,
    stdin: document.getText(),
    timeout: 10_000,
  });

  if (!result.ok) {
    logError(channel, format(en.messages.lintFailed, { file: filePath, error: result.error }));
    stateManager.setState('lint', 'error');
    return;
  }

  // Log timing
  logTiming(channel, format(en.messages.lintedFile, { file: filePath }), result.elapsed);

  // Map entries to diagnostics (skip malformed entries instead of crashing)
  const diagnostics: vscode.Diagnostic[] = [];

  for (const entry of result.data) {
    try {
      diagnostics.push(mapEntryToDiagnostic(entry, document));
    } catch (error: unknown) {
      logError(
        channel,
        format(en.messages.diagnosticMapFailed, {
          rule: entry.ruleId,
          location: `${entry.file}:${entry.line}`,
          error: extractMessage(error),
        }),
      );
    }
  }

  // Apply max problems limit
  const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const maxProblems: number = config.get<number>('lint.maxProblems', 100);

  const limited: vscode.Diagnostic[] = applyMaxProblems(diagnostics, maxProblems, channel);
  collection.set(document.uri, limited);

  // Log summary
  const errorCount: number = limited.filter(
    (d) => d.severity === vscode.DiagnosticSeverity.Error,
  ).length;
  const warnCount: number = limited.filter(
    (d) => d.severity === vscode.DiagnosticSeverity.Warning,
  ).length;
  logSummary(channel, errorCount, warnCount);

  if (limited.length > 0) {
    logDiagnosticList(channel, limited, filePath);
  }

  // State observer handles status bar counts
  stateManager.setState('lint', 'ready');

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
 * @param {vscode.DiagnosticCollection} collection - The diagnostic collection to update
 * @param {vscode.OutputChannel} channel - Output channel for logging
 * @param {ToolStateManager} stateManager - Tool state manager for status updates
 * @param {LintOptions} options - Lint options
 * @param {LintProgress} progress - Progress reporter for the progress bar
 *
 * @example
 * ```typescript
 * await vscode.window.withProgress(
 *   { location: vscode.ProgressLocation.Notification, title: 'Linting workspace' },
 *   (progress) => lintWorkspace(diagnosticCollection, outputChannel, stateManager, options, progress),
 * );
 * ```
 */
export async function lintWorkspace(
  collection: vscode.DiagnosticCollection,
  channel: vscode.OutputChannel,
  stateManager: ToolStateManager,
  options: LintOptions,
  progress: LintProgress,
): Promise<void> {
  const folders: readonly vscode.WorkspaceFolder[] | undefined = vscode.workspace.workspaceFolders;
  const [firstFolder] = folders ?? [];

  if (!firstFolder) {
    return;
  }

  const { uri: rootUri } = firstFolder;
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

  stateManager.setState('lint', 'running');

  logCommand(channel, binPath, args);
  progress.report({ message: en.messages.runningLinter });

  const result: RunResult<DiagnosticEntry[]> = await runToolJson<DiagnosticEntry[]>({
    command: binPath,
    args,
    cwd,
    timeout: 120_000, // 2 min for workspace-wide lint
  });

  if (!result.ok) {
    logError(channel, format(en.messages.workspaceLintFailed, { error: result.error }));
    stateManager.setState('lint', 'error');
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
    let skipped = 0;

    for (const entry of entries) {
      try {
        diagnostics.push(doc ? mapEntryToDiagnostic(entry, doc) : mapEntryToDiagnosticBasic(entry));
      } catch (error: unknown) {
        const msg: string = extractMessage(error);
        logError(
          channel,
          format(en.messages.diagnosticMapFailed, {
            rule: entry.ruleId ?? 'unknown',
            location: `${entry.line ?? '?'}:${entry.column ?? '?'}`,
            error: msg,
          }),
        );
        skipped++;
      }
    }
    if (skipped > 0) {
      logError(
        channel,
        format(en.diagnosticManager.skippedEntries, { count: skipped, file: filePath }),
      );
    }
    collection.set(uri, applyMaxProblems(diagnostics, maxProblems, channel));
    processed++;
    progress.report({
      message: format(en.messages.progressFiles, { processed, total }),
      increment: (1 / total) * 100,
    });
  }

  // State observer handles status bar counts
  stateManager.setState('lint', 'ready');
}

// =============================================================================
// Config-Driven CLI Args
// =============================================================================

/** Options for appendConfigArgs. */
type AppendConfigOptions = {
  /** Skip --tools flag (used for on-type stdin lint where external tools are too slow). */
  readonly skipTools?: boolean;
};

/**
 * Appends CLI flags derived from resist.lint.* settings to the args array.
 *
 * Reads cache, quiet, debug, severityOverride, rule, ignorePatterns,
 * jobs, tools, locale, and bail settings.
 *
 * @param {string[]} args - The args array to append flags to
 * @param {AppendConfigOptions} options - Optional flags to control which args are appended
 */
function appendConfigArgs(args: string[], options: AppendConfigOptions = {}): void {
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

  if (!options.skipTools && config.get<boolean>('lint.tools', false)) {
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
 *
 * @internal
 * @param {DiagnosticEntry} entry - The linter diagnostic entry
 * @param {vscode.TextDocument} document - The VS Code document for position resolution
 * @returns {vscode.Diagnostic} The mapped VS Code diagnostic
 *
 * @example
 * ```typescript
 * const entry: DiagnosticEntry = {
 *   file: '/src/index.ts',
 *   line: 10,
 *   column: 5,
 *   message: 'Unused variable',
 *   severity: 'warning',
 *   ruleId: 'no-unused-vars',
 * };
 * const diagnostic = mapEntryToDiagnostic(entry, editor.document);
 * ```
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

  const diagnostic = new vscode.Diagnostic(range, entry.message, severity);
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
    description: entry.description,
    url: entry.url,
  };

  return diagnostic;
}

/**
 * Maps a DiagnosticEntry to a vscode.Diagnostic without document context.
 *
 * Uses the shared `createDiagnosticFromEntry` for basic range/severity/data
 * mapping, then enhances with example appending and clickable URLs.
 *
 * @param entry - The linter diagnostic entry
 * @returns The mapped VS Code diagnostic
 */
function mapEntryToDiagnosticBasic(entry: DiagnosticEntry): vscode.Diagnostic {
  const diagnostic: vscode.Diagnostic | undefined = createDiagnosticFromEntry(
    entry,
    DIAGNOSTIC_SOURCE,
  );

  if (!diagnostic) {
    // Fallback for invalid entries — createDiagnosticFromEntry returns undefined
    return new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 0),
      entry.message || 'Unknown diagnostic',
      vscode.DiagnosticSeverity.Warning,
    );
  }

  // Enhance: make rule ID clickable when url is present
  if (entry.url) {
    diagnostic.code = { value: entry.ruleId, target: vscode.Uri.parse(entry.url) };
  }

  return diagnostic;
}

// =============================================================================
// Diagnostic Data Extension
// =============================================================================

/** Extended diagnostic with fix data attached. */
export type DiagnosticData = {
  readonly fix: {
    readonly range: { readonly start: number; readonly end: number };
    readonly text: string;
  };
  readonly tip?: string;
  readonly example?: string;
  readonly description?: string;
  readonly url?: string;
};

/** A vscode.Diagnostic with additional data for the CodeActionProvider. */
export type DiagnosticWithData = vscode.Diagnostic & {
  data: DiagnosticData;
};
