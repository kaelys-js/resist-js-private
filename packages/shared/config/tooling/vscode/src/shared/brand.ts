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
// resist-lint-allow: hygiene/no-orphaned-exports -- white-label API
export const COMMAND_PREFIX = 'resist';

// =============================================================================
// Command IDs
// =============================================================================

/** All command identifiers registered by the extension, derived from COMMAND_PREFIX. */
export const COMMANDS = {
  lintFile: `${COMMAND_PREFIX}.lint.file`,
  lintWorkspace: `${COMMAND_PREFIX}.lint.workspace`,
  lintFix: `${COMMAND_PREFIX}.lint.fix`,
  lintClear: `${COMMAND_PREFIX}.lint.clear`,
  listRules: `${COMMAND_PREFIX}.lint.listRules`,
  restart: `${COMMAND_PREFIX}.lint.restart`,
  showOutput: `${COMMAND_PREFIX}.lint.showOutput`,
  lintStaged: `${COMMAND_PREFIX}.lint.staged`,
  lintUncommitted: `${COMMAND_PREFIX}.lint.uncommitted`,
  previewFixes: `${COMMAND_PREFIX}.lint.previewFixes`,
  showTiming: `${COMMAND_PREFIX}.lint.showTiming`,
  filterByCategory: `${COMMAND_PREFIX}.lint.filterByCategory`,
  clearFilter: `${COMMAND_PREFIX}.lint.clearFilter`,
  removeUnusedImports: `${COMMAND_PREFIX}.lint.removeUnusedImports`,
  changeStage: `${COMMAND_PREFIX}.lint.changeStage`,
  clearOutput: `${COMMAND_PREFIX}.lint.clearOutput`,
  toggleEnable: `${COMMAND_PREFIX}.lint.toggleEnable`,
  statusBarMenu: `${COMMAND_PREFIX}.lint.statusBarMenu`,
  panelRefresh: `${COMMAND_PREFIX}.panel.refresh`,
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
 * Derived from DISABLE_FILE_PREFIX so the pattern stays in sync.
 * Groups: full match, optional rule list after colon.
 */
export const DISABLE_PATTERN = new RegExp(
  `\\/\\/\\s*${DISABLE_FILE_PREFIX}(?:-next-line)?(?:\\s*:\\s*(.+))?`,
  'g',
);

// =============================================================================
// Virtual Document Schemes
// =============================================================================

/** URI scheme for fix-preview virtual documents. */
export const PREVIEW_SCHEME = 'resist-fix-preview';

// =============================================================================
// Panel Identifiers
// =============================================================================

/** Activity bar view container ID for the sidebar panel. */
export const PANEL_CONTAINER_ID = 'resist';

/** TreeView ID for the main sidebar panel. */
export const PANEL_VIEW_ID = 'resist.panel';
