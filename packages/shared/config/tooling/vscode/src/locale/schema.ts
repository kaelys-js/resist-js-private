/**
 * VSCode Extension — Locale String Schema
 *
 * Defines the shape of all user-facing strings in the extension.
 * Parameterized strings use `{placeholder}` syntax and are rendered
 * via {@link format}.
 *
 * Mirrors the @/lint locale pattern but uses plain TypeScript types
 * (the extension targets CommonJS without a bundler, so Valibot is not
 * available at runtime).
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-57.md TASK 2
 *
 * @module
 */

// =============================================================================
// Template Formatting
// =============================================================================

/**
 * Replace `{placeholder}` tokens in a template string with values.
 *
 * @param {string} template - Template string with `{key}` placeholders
 * @param {Record<string, string | number>} params - Key-value pairs to substitute
 * @returns {string} Rendered string
 *
 * @example
 * ```typescript
 * const message = format('Found {count} issues in {file}', { count: 3, file: 'index.ts' });
 * // message = 'Found 3 issues in index.ts'
 * ```
 */
export function format(template: string, params: Record<string, string | number>): string {
  let result: string = template;

  for (const [key, value] of Object.entries(params)) {
    result = result.replaceAll(`{${key}}`, String(value));
  }
  return result;
}

/** Singular and plural form pair for {@link formatPlural}. */
export type PluralForms = { readonly one: string; readonly other: string };

/**
 * Select singular or plural form based on count.
 *
 * Uses `Intl.PluralRules` when available, falls back to simple count === 1 check.
 *
 * @param {number} count - The number to determine plural form for
 * @param {PluralForms} forms - Object with `one` (singular) and `other` (plural) forms
 * @param {string} locale - Optional locale code (defaults to 'en')
 * @returns {string} The appropriate form string with `#` replaced by the count
 *
 * @example
 * ```typescript
 * const label = formatPlural(3, { one: '# error', other: '# errors' });
 * // label = '3 errors'
 * const singular = formatPlural(1, { one: '# warning', other: '# warnings' }, 'en');
 * // singular = '1 warning'
 * ```
 */
export function formatPlural(count: number, forms: PluralForms, locale: string = 'en'): string {
  let rule: string;

  try {
    const rules = new Intl.PluralRules(locale);
    rule = rules.select(count);
    // resist-lint-disable-next-line: hygiene/no-bare-catch -- Intl API fallback
  } catch {
    rule = count === 1 ? 'one' : 'other';
  }

  const form: string = rule === 'one' ? forms.one : forms.other;

  return form.replaceAll('#', String(count));
}

// =============================================================================
// String Group Types
// =============================================================================

/** Strings for the output channel. */
export type OutputStrings = {
  /** Output channel name shown in the dropdown. */
  readonly channelName: string;
  /** Prefix for error log lines. */
  readonly errorPrefix: string;
  /** Log message when extension activates. */
  readonly activated: string;
};

/** Strings for the status bar item. */
export type StatusBarStrings = {
  /** Tooltip when hovering the status bar item. */
  readonly tooltip: string;
  /** Tooltip prefix for tool-specific status bar items. */
  readonly tooltipPrefix: string;
  /** Text shown in "ready" state with no diagnostics. */
  readonly ready: string;
  /** Text shown while linting is in progress. */
  readonly linting: string;
  /** Text shown in error state. */
  readonly error: string;
  /** Text shown when the linter is disabled. */
  readonly disabled: string;
};

/** Strings for user-facing error/info messages. */
export type MessageStrings = {
  /** Warning when resist-lint binary is not found (shown to user). */
  readonly binaryNotFound: string;
  /** Info message when resist-lint binary missing (for output channel). */
  readonly binaryNotFoundLog: string;
  /** Error when no workspace folder is open. */
  readonly noWorkspaceFolder: string;
  /** Error when resist-lint binary not in node_modules. */
  readonly binaryNotInNodeModules: string;
  /** Info message when no auto-fixable problems exist. */
  readonly noFixableProblems: string;
  /** Error when workspace edit is rejected (shown to user). */
  readonly fixRejected: string;
  /** Error for fix rejection (output channel). */
  readonly fixRejectedLog: string;
  /** Log message after clearing diagnostics. */
  readonly diagnosticsCleared: string;
  /** Log message after restarting linter. */
  readonly linterRestarted: string;
  /** Log message after applying fixes: "Applied {count} auto-fix(es)" */
  readonly fixesApplied: string;
  /** Skip log: binary not found for file. */
  readonly skipBinaryNotFound: string;
  /** Skip log: workspace not found for file. */
  readonly skipWorkspaceNotFound: string;
  /** Error log: lint failed for file. */
  readonly lintFailed: string;
  /** Binary not found (short, for workspace lint). */
  readonly binaryNotFoundShort: string;
  /** Found diagnostics count. */
  readonly foundDiagnostics: string;
  /** Progress message while linting. */
  readonly runningLinter: string;
  /** Progress message showing file count: "{processed}/{total} files". */
  readonly progressFiles: string;
  /** Section header for available rules output. */
  readonly availableRulesHeader: string;
  /** Log timing label for single file lint. */
  readonly lintedFile: string;
  /** Error mapping a diagnostic entry. */
  readonly diagnosticMapFailed: string;
  /** Log stderr output from CLI. */
  readonly stderrOutput: string;
  /** Error for workspace lint failure. */
  readonly workspaceLintFailed: string;
  /** Log timing label for workspace lint. */
  readonly workspaceLintTiming: string;
  /** Error for timing report failure. */
  readonly timingReportFailed: string;
};

/** Strings for progress bar titles. */
export type ProgressStrings = {
  /** Progress title for workspace lint. */
  readonly workspace: string;
  /** Progress title for staged changes lint. */
  readonly staged: string;
  /** Progress title for uncommitted changes lint. */
  readonly uncommitted: string;
  /** Progress title for restart re-lint. */
  readonly restart: string;
  /** Progress title for activation lint. */
  readonly activation: string;
};

/** Strings for code action titles. */
export type CodeActionStrings = {
  /** Individual fix title. */
  readonly fix: string;
  /** Individual fix title with tip. */
  readonly fixWithTip: string;
  /** Fix all title. */
  readonly fixAll: string;
  /** Disable rule for this line. */
  readonly disableLine: string;
  /** Disable rule for this file. */
  readonly disableFile: string;
  /** Error log when creating individual code action fails. */
  readonly actionFailed: string;
  /** Error log when fix-all action fails. */
  readonly fixAllFailed: string;
  /** Error log when creating disable action fails. */
  readonly disableFailed: string;
};

/** Strings for document filter operations. */
export type DocumentFilterStrings = {
  /** Error message when iteration fails for a document. */
  readonly iterationError: string;
};

/** Strings for notification manager. */
export type NotificationStrings = {
  /** Log message when a notification is suppressed. */
  readonly suppressed: string;
};

/** Strings for configuration manager. */
export type ConfigStrings = {
  /** Log when config change detected for a section. */
  readonly changeDetected: string;
  /** Log when config cache is refreshed. */
  readonly refreshed: string;
};

/** Strings for lifecycle manager. */
export type LifecycleStrings = {
  /** Debug log when disposing a named resource. */
  readonly disposing: string;
  /** Debug log after successful disposal. */
  readonly disposed: string;
  /** Error log when disposal fails. */
  readonly disposalError: string;
};

/** Strings for file watcher. */
export type WatcherStrings = {
  /** Log when a config file change is detected. */
  readonly configChanged: string;
  /** Log when batched file changes are fired. */
  readonly batchFired: string;
  /** Error log when re-lint fails for a file after config change. */
  readonly relintError: string;
};

/** Strings for progress reporting. */
export type ProgressHelperStrings = {
  /** Progress message while processing files. */
  readonly processing: string;
  /** Log when progress operation is cancelled. */
  readonly cancelled: string;
  /** Error log for per-file processing failure. */
  readonly fileError: string;
};

/** Strings for state manager. */
export type StateStrings = {
  /** Debug log when tool state transitions. */
  readonly transitioned: string;
  /** Error log when an observer callback throws. */
  readonly observerError: string;
};

/** Strings for diagnostics manager. */
export type DiagnosticManagerStrings = {
  /** Warning when max problems limit is reached. */
  readonly maxProblemsReached: string;
  /** Warning when an invalid diagnostic entry is skipped. */
  readonly invalidEntry: string;
  /** Reason detail for missing message or invalid line. */
  readonly invalidReason: string;
  /** Summary log when malformed entries are skipped during workspace lint. */
  readonly skippedEntries: string;
};

/** Strings for error boundaries. */
export type ErrorBoundaryStrings = {
  /** Error log format: "{label}: {message}". */
  readonly errorLog: string;
};

/** Strings for tool runner. */
export type RunnerStrings = {
  /** Error log for timeout. */
  readonly timeout: string;
  /** Error log for spawn failure. */
  readonly spawnFailed: string;
  /** Error log for non-zero exit. */
  readonly exitCode: string;
  /** Error log for JSON parse failure. */
  readonly jsonParseFailed: string;
};

/** Strings for plural formatting. */
export type PluralStrings = {
  /** Singular form for "error". */
  readonly error: string;
  /** Plural form for "errors". */
  readonly errors: string;
  /** Singular form for "warning". */
  readonly warning: string;
  /** Plural form for "warnings". */
  readonly warnings: string;
};

/** Strings for document event registry. */
export type EventsStrings = {
  /** Error log when a handler throws. */
  readonly handlerError: string;
};

/** Strings for auto-fix on save. */
export type FixOnSaveStrings = {
  /** Log when fixes are applied on save. */
  readonly applied: string;
  /** Log when loop guard prevents re-fix. */
  readonly loopGuard: string;
  /** Log when no fixable diagnostics found on save. */
  readonly skippedNoFixes: string;
};

/** Strings for code lens. */
export type CodeLensStrings = {
  /** Code lens label showing issue count for a rule. */
  readonly issueCount: string;
};

/** Strings for diff preview. */
export type DiffPreviewStrings = {
  /** Diff editor title. */
  readonly title: string;
  /** Message when no fixes are available. */
  readonly noFixes: string;
};

/** Strings for formatting provider. */
export type FormattingStrings = {
  /** Log when formatting edits are applied. */
  readonly applied: string;
  /** Log when no formatting edits found. */
  readonly noEdits: string;
};

/** Strings for performance profiling. */
export type ProfilingStrings = {
  /** Header for timing report output. */
  readonly header: string;
  /** Per-rule timing line: "{rule}: {ms}ms". */
  readonly ruleTime: string;
  /** Total timing summary. */
  readonly total: string;
  /** Message when no timing data available. */
  readonly noData: string;
};

/** Strings for diagnostic filtering. */
export type FilterStrings = {
  /** Quick pick title for category selection. */
  readonly selectCategories: string;
  /** Log when filter is applied. */
  readonly filterApplied: string;
  /** Log when filter is cleared. */
  readonly filterCleared: string;
  /** Message when no categories found in diagnostics. */
  readonly noCategories: string;
};

/** Strings for per-folder configuration. */
export type PerFolderStrings = {
  /** Log when per-folder config is resolved. */
  readonly resolved: string;
  /** Log when falling back to global config. */
  readonly fallbackGlobal: string;
};

/** Strings for stale diagnostic cleanup. */
export type StaleCleanupStrings = {
  /** Log when stale diagnostics are cleared. */
  readonly cleared: string;
  /** Log when a visible editor is skipped. */
  readonly skippedVisible: string;
};

/** Strings for import sorting integration. */
export type ImportsStrings = {
  /** Log showing count of removed imports. */
  readonly removedCount: string;
  /** Message when no unused imports found. */
  readonly noUnused: string;
};

/** Strings for build/stage visual feedback. */
export type StageIndicatorStrings = {
  /** Status bar text showing current stage. */
  readonly currentStage: string;
  /** Quick pick title for stage selection. */
  readonly selectStage: string;
  /** Log when stage is changed. */
  readonly stageChanged: string;
};

// =============================================================================
// Combined Type
// =============================================================================

/** Complete set of extension strings. */
export type VscodeStrings = {
  readonly output: OutputStrings;
  readonly statusBar: StatusBarStrings;
  readonly messages: MessageStrings;
  readonly progress: ProgressStrings;
  readonly codeActions: CodeActionStrings;
  readonly documentFilter: DocumentFilterStrings;
  readonly notifications: NotificationStrings;
  readonly config: ConfigStrings;
  readonly lifecycle: LifecycleStrings;
  readonly watcher: WatcherStrings;
  readonly progressHelper: ProgressHelperStrings;
  readonly state: StateStrings;
  readonly diagnosticManager: DiagnosticManagerStrings;
  readonly runner: RunnerStrings;
  readonly errorBoundary: ErrorBoundaryStrings;
  readonly plurals: PluralStrings;
  readonly events: EventsStrings;
  readonly fixOnSave: FixOnSaveStrings;
  readonly codeLens: CodeLensStrings;
  readonly diffPreview: DiffPreviewStrings;
  readonly formatting: FormattingStrings;
  readonly profiling: ProfilingStrings;
  readonly filter: FilterStrings;
  readonly perFolder: PerFolderStrings;
  readonly staleCleanup: StaleCleanupStrings;
  readonly imports: ImportsStrings;
  readonly stageIndicator: StageIndicatorStrings;
};
