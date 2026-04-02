/**
 * Shared Type Definitions
 *
 * Types used across all extension modules. DiagnosticEntry mirrors the
 * LintResult shape from @/lint/framework/types.ts so JSON output can be
 * parsed directly without transformation.
 *
 * @module
 */

// =============================================================================
// CLI Process Runner
// =============================================================================

/** Successful result from spawning a CLI tool. */
type RunSuccess<T> = {
  readonly ok: true;
  readonly data: T;
  readonly stderr: string;
  readonly elapsed: number;
};

/** Failed result from spawning a CLI tool. */
type RunFailure = {
  readonly ok: false;
  readonly error: string;
  readonly stderr: string;
  readonly code: number | null;
};

/** Result from spawning a CLI tool — either success with parsed data or failure with error info. */
export type RunResult<T> = RunSuccess<T> | RunFailure;

/** Options for spawning a CLI tool. */
export type RunOptions = {
  /** Binary name or path to execute. */
  readonly command: string;
  /** Arguments to pass to the command. */
  readonly args: readonly string[];
  /** Working directory for the child process. */
  readonly cwd: string;
  /** Additional environment variables (merged with process.env). */
  readonly env?: Readonly<Record<string, string>>;
  /** Content to write to the child process stdin (for --stdin-filename mode). */
  readonly stdin?: string;
  /** Timeout in milliseconds (default: 30000). */
  readonly timeout?: number;
};

// =============================================================================
// Diagnostic Entry (mirrors LintResult from @/lint/framework/types.ts)
// =============================================================================

/** Structured auto-fix from the linter. Byte offsets into the source file. */
export type DiagnosticFix = {
  /** Byte offset range in the source to replace. */
  readonly range: {
    /** Start byte offset (inclusive). */
    readonly start: number;
    /** End byte offset (exclusive). */
    readonly end: number;
  };
  /** Replacement text (empty string = deletion). */
  readonly text: string;
};

/**
 * A single diagnostic entry from resist-lint JSON output.
 *
 * This type mirrors `LintResult` from `@/lint/framework/types.ts` exactly
 * so that `JSON.parse(stdout)` produces an array of these directly.
 */
export type DiagnosticEntry = {
  /** Absolute file path. */
  readonly file: string;
  /** 1-based line number. */
  readonly line: number;
  /** 1-based column number. */
  readonly column: number;
  /** End line (optional, for range highlighting). */
  readonly endLine?: number;
  /** End column (optional, for range highlighting). */
  readonly endColumn?: number;
  /** Severity level. */
  readonly severity: 'error' | 'warning' | 'info';
  /** Human-readable diagnostic message. */
  readonly message: string;
  /** Rule ID that produced this diagnostic (e.g. 'jsdoc/require-param'). */
  readonly ruleId: string;
  /** Short suggestion for fixing the issue. */
  readonly tip?: string;
  /** Code example showing the correct form. */
  readonly example?: string;
  /** Source code line that triggered the diagnostic. */
  readonly source?: string;
  /** Link to documentation for the rule. */
  readonly url?: string;
  /** Structured auto-fix. */
  readonly fix: DiagnosticFix;
};

// =============================================================================
// Extension State
// =============================================================================

/** Current state of the extension for status bar display. */
export type ExtensionState = 'ready' | 'linting' | 'error' | 'disabled';

/** Cached workspace info for a workspace folder. */
export type WorkspaceInfo = {
  /** Absolute path to the monorepo root (where pnpm-workspace.yaml lives). */
  readonly rootPath: string;
  /** Absolute path to the resist-lint binary, or undefined if not found. */
  readonly binPath: string | undefined;
};
