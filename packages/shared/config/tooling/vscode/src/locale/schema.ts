/**
 * VSCode Extension — Locale String Schema
 *
 * Defines the shape of all user-facing strings in the extension.
 * Parameterized strings use `{placeholder}` syntax and are rendered
 * via {@link format}.
 *
 * Mirrors the @/lint locale pattern but uses plain TypeScript interfaces
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
 * @param template - Template string with `{key}` placeholders
 * @param params - Key-value pairs to substitute
 * @returns Rendered string
 */
export function format(template: string, params: Record<string, string | number>): string {
  let result: string = template;
  for (const [key, value] of Object.entries(params)) {
    result = result.replaceAll(`{${key}}`, String(value));
  }
  return result;
}

/**
 * Select singular or plural form based on count.
 *
 * Uses `Intl.PluralRules` when available, falls back to simple count === 1 check.
 *
 * @param count - The number to determine plural form for
 * @param forms - Object with `one` (singular) and `other` (plural) forms
 * @param locale - Optional locale code (defaults to 'en')
 * @returns The appropriate form string with `#` replaced by the count
 */
export function formatPlural(
  count: number,
  forms: { readonly one: string; readonly other: string },
  locale: string = 'en',
): string {
  let rule: string;
  try {
    const rules = new Intl.PluralRules(locale);
    rule = rules.select(count);
  } catch {
    rule = count === 1 ? 'one' : 'other';
  }
  const form: string = rule === 'one' ? forms.one : forms.other;
  return form.replaceAll('#', String(count));
}

/**
 * Format a number with locale-aware separators.
 *
 * Uses `Intl.NumberFormat` when available, falls back to `String(value)`.
 *
 * @param value - The number to format
 * @param locale - Optional locale code (defaults to 'en')
 * @returns Formatted number string
 */
export function formatNumber(value: number, locale: string = 'en'): string {
  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch {
    return String(value);
  }
}

// =============================================================================
// String Group Interfaces
// =============================================================================

/** Strings for the output channel. */
export interface OutputStrings {
  /** Output channel name shown in the dropdown. */
  readonly channelName: string;
  /** Prefix for error log lines. */
  readonly errorPrefix: string;
  /** Log message when extension activates. */
  readonly activated: string;
}

/** Strings for the status bar item. */
export interface StatusBarStrings {
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
}

/** Strings for user-facing error/info messages. */
export interface MessageStrings {
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
}

/** Strings for progress bar titles. */
export interface ProgressStrings {
  /** Progress title for workspace lint. */
  readonly workspace: string;
  /** Progress title for staged changes lint. */
  readonly staged: string;
  /** Progress title for uncommitted changes lint. */
  readonly uncommitted: string;
}

/** Strings for code action titles. */
export interface CodeActionStrings {
  /** Individual fix title. */
  readonly fix: string;
  /** Individual fix title with tip. */
  readonly fixWithTip: string;
  /** Fix all title. */
  readonly fixAll: string;
}

/** Strings for document filter operations. */
export interface DocumentFilterStrings {
  /** Error message when iteration fails for a document. */
  readonly iterationError: string;
}

/** Strings for notification manager. */
export interface NotificationStrings {
  /** Log message when a notification is suppressed. */
  readonly suppressed: string;
}

/** Strings for configuration manager. */
export interface ConfigStrings {
  /** Log when config change detected for a section. */
  readonly changeDetected: string;
  /** Log when config cache is refreshed. */
  readonly refreshed: string;
}

/** Strings for command registration. */
export interface CommandStrings {
  /** Debug log when a command is registered. */
  readonly registered: string;
  /** Error log when command execution fails. */
  readonly executionFailed: string;
}

/** Strings for lifecycle manager. */
export interface LifecycleStrings {
  /** Debug log when disposing a named resource. */
  readonly disposing: string;
  /** Debug log after successful disposal. */
  readonly disposed: string;
  /** Error log when disposal fails. */
  readonly disposalError: string;
}

/** Strings for file watcher. */
export interface WatcherStrings {
  /** Log when a config file change is detected. */
  readonly configChanged: string;
}

/** Strings for progress reporting. */
export interface ProgressHelperStrings {
  /** Progress message while processing files. */
  readonly processing: string;
  /** Log when progress operation is cancelled. */
  readonly cancelled: string;
  /** Error log for per-file processing failure. */
  readonly fileError: string;
}

/** Strings for state manager. */
export interface StateStrings {
  /** Debug log when tool state transitions. */
  readonly transitioned: string;
}

/** Strings for diagnostics manager. */
export interface DiagnosticManagerStrings {
  /** Warning when max problems limit is reached. */
  readonly maxProblemsReached: string;
  /** Warning when an invalid diagnostic entry is skipped. */
  readonly invalidEntry: string;
}

/** Strings for tool runner. */
export interface RunnerStrings {
  /** Error log for timeout. */
  readonly timeout: string;
  /** Error log for spawn failure. */
  readonly spawnFailed: string;
}

/** Strings for plural formatting. */
export interface PluralStrings {
  /** Singular form for "error". */
  readonly error: string;
  /** Plural form for "errors". */
  readonly errors: string;
  /** Singular form for "warning". */
  readonly warning: string;
  /** Plural form for "warnings". */
  readonly warnings: string;
  /** Singular form for "file". */
  readonly file: string;
  /** Plural form for "files". */
  readonly files: string;
}

// =============================================================================
// Combined Type
// =============================================================================

/** Complete set of extension strings. */
export interface VscodeStrings {
  readonly output: OutputStrings;
  readonly statusBar: StatusBarStrings;
  readonly messages: MessageStrings;
  readonly progress: ProgressStrings;
  readonly codeActions: CodeActionStrings;
  readonly documentFilter: DocumentFilterStrings;
  readonly notifications: NotificationStrings;
  readonly config: ConfigStrings;
  readonly commands: CommandStrings;
  readonly lifecycle: LifecycleStrings;
  readonly watcher: WatcherStrings;
  readonly progressHelper: ProgressHelperStrings;
  readonly state: StateStrings;
  readonly diagnosticManager: DiagnosticManagerStrings;
  readonly runner: RunnerStrings;
  readonly plurals: PluralStrings;
}
