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
}
