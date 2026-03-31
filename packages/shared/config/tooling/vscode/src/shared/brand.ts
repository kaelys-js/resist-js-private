/**
 * Brand Constants
 *
 * All brand-specific identifiers used throughout the extension.
 * Centralised here so the extension can be white-labelled by
 * changing only this file (and the static package.json entries).
 *
 * @module
 */

// =============================================================================
// Core Brand
// =============================================================================

/** Human-readable brand name shown in UI, status bar, output channel. */
export const BRAND_NAME = 'Resist';

/** The CLI binary name resolved from node_modules/.bin. */
export const BINARY_NAME = 'resist-lint';

// =============================================================================
// VS Code Identifiers
// =============================================================================

/** Configuration section prefix used by all settings (e.g. 'resist.lint.enable'). */
export const CONFIG_SECTION = 'resist';

/** Sub-section within the config for lint settings. */
export const CONFIG_LINT_SECTION = 'resist.lint';

/** Source string stamped on every diagnostic for filtering. */
export const DIAGNOSTIC_SOURCE = 'resist-linter';

/** Name of the VS Code DiagnosticCollection. */
export const DIAGNOSTIC_COLLECTION_NAME = 'resist-linter';

/** Prefix for all registered command IDs (e.g. 'resist.lint.file'). */
export const COMMAND_PREFIX = 'resist';

// =============================================================================
// Command IDs
// =============================================================================

/** All command identifiers registered by the extension. */
export const COMMANDS = {
  lintFile: 'resist.lint.file',
  lintWorkspace: 'resist.lint.workspace',
  lintFix: 'resist.lint.fix',
  lintClear: 'resist.lint.clear',
  listRules: 'resist.lint.listRules',
  restart: 'resist.lint.restart',
  showOutput: 'resist.lint.showOutput',
  lintStaged: 'resist.lint.staged',
  lintUncommitted: 'resist.lint.uncommitted',
  previewFixes: 'resist.lint.previewFixes',
  showTiming: 'resist.lint.showTiming',
  filterByCategory: 'resist.lint.filterByCategory',
  clearFilter: 'resist.lint.clearFilter',
  removeUnusedImports: 'resist.lint.removeUnusedImports',
  changeStage: 'resist.lint.changeStage',
} as const;

// =============================================================================
// File Watching
// =============================================================================

/** Glob patterns for config files that trigger re-lint on change. */
export const CONFIG_FILE_PATTERNS = ['**/resist.config.ts', '**/.resist-lint.jsonc'] as const;

// =============================================================================
// Inline Disable Comments
// =============================================================================

/** Prefix for single-line disable comments. */
export const DISABLE_NEXT_LINE_PREFIX = 'resist-lint-disable-next-line';

/** Prefix for file-level disable comments. */
export const DISABLE_FILE_PREFIX = 'resist-lint-disable';

/**
 * Regex pattern matching all disable comment forms.
 * Groups: full match, optional rule list after colon.
 */
export const DISABLE_PATTERN = /\/\/\s*resist-lint-disable(?:-next-line)?(?:\s*:\s*(.+))?/g;

// =============================================================================
// Virtual Document Schemes
// =============================================================================

/** URI scheme for fix-preview virtual documents. */
export const PREVIEW_SCHEME = 'resist-fix-preview';
