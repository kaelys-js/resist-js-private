/**
 * VSCode Extension — English Locale
 *
 * Default locale for all user-facing strings.
 * Parameterized strings use `{placeholder}` syntax.
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-57.md TASK 2
 *
 * @module
 */

import type { VscodeStrings } from './schema';
import { BRAND_NAME, BINARY_NAME } from '../shared/brand';

/**
 * English locale strings for the VSCode extension.
 *
 * All brand references use constants from brand.ts so the extension
 * can be white-labelled by changing only that file.
 */
export const en: VscodeStrings = {
  output: {
    channelName: BRAND_NAME,
    errorPrefix: 'ERROR',
    activated: `${BRAND_NAME} extension activated`,
  },

  statusBar: {
    tooltip: `${BRAND_NAME} Linter — Click to show output`,
    tooltipPrefix: `${BRAND_NAME} —`,
    ready: `$(check) ${BRAND_NAME}`,
    linting: '$(sync~spin) Linting...',
    error: `$(error) ${BRAND_NAME}`,
    disabled: `$(circle-slash) ${BRAND_NAME}`,
  },

  messages: {
    binaryNotFound: `${BRAND_NAME}: ${BINARY_NAME} not found in node_modules/.bin. Linting is disabled.`,
    binaryNotFoundLog: `${BINARY_NAME} not found in node_modules/.bin. Install @/lint to enable linting.`,
    noWorkspaceFolder: 'No workspace folder open',
    binaryNotInNodeModules: `${BINARY_NAME} not found in node_modules/.bin`,
    noFixableProblems: 'No auto-fixable problems found',
    fixRejected: `${BRAND_NAME}: Failed to apply auto-fixes`,
    fixRejectedLog: 'Failed to apply auto-fixes — workspace edit rejected',
    diagnosticsCleared: 'Diagnostics cleared',
    linterRestarted: 'Linter restarted — cache cleared, re-linting open files',
    fixesApplied: 'Applied {count} auto-fix(es)',
    skipBinaryNotFound: `Skipping lint: ${BINARY_NAME} binary not found for {file}`,
    skipWorkspaceNotFound: 'Skipping lint: workspace root not found for {file}',
    lintFailed: 'Lint failed for {file}: {error}',
    binaryNotFoundShort: `${BINARY_NAME} binary not found`,
    foundDiagnostics: 'Found {count} diagnostics',
    runningLinter: `Running ${BINARY_NAME}...`,
    progressFiles: '{processed}/{total} files',
    availableRulesHeader: '=== Available Rules ===',
    lintedFile: 'Linted {file}',
    diagnosticMapFailed: 'Failed to map diagnostic for {rule} at {location}: {error}',
    stderrOutput: 'stderr: {output}',
    workspaceLintFailed: 'Workspace lint failed: {error}',
    workspaceLintTiming: 'Workspace lint',
    timingReportFailed: 'Timing report failed: {error}',
    outputCleared: 'Output channel cleared',
    linterPaused: 'Linter paused',
    linterResumed: 'Linter resumed',
  },

  progress: {
    workspace: `${BRAND_NAME}: Linting workspace`,
    staged: `${BRAND_NAME}: Linting staged changes`,
    uncommitted: `${BRAND_NAME}: Linting uncommitted changes`,
    restart: `${BRAND_NAME}: Re-linting open files`,
    activation: `${BRAND_NAME}: Linting open files`,
  },

  codeActions: {
    fix: 'Fix: {rule}',
    fixWithTip: 'Fix: {rule} — {tip}',
    fixAll: 'Fix all auto-fixable problems ({count})',
    disableLine: 'Disable {rule} for this line',
    disableFile: 'Disable {rule} for this file',
    actionFailed: 'Code action failed for {rule}: {error}',
    fixAllFailed: 'Fix-all action failed: {error}',
    disableFailed: 'Disable action failed for {rule}: {error}',
  },

  documentFilter: {
    iterationError: 'Document iteration failed for {file}: {error}',
  },

  notifications: {
    suppressed: 'Notification suppressed (already shown): {key}',
  },

  config: {
    changeDetected: 'Configuration change detected for section: {section}',
    refreshed: 'Configuration cache refreshed',
  },

  lifecycle: {
    disposing: 'Disposing: {name}',
    disposed: 'Disposed {count} resources',
    disposalError: 'Disposal failed for {name}: {error}',
  },

  watcher: {
    configChanged: 'Config file changed: {pattern}',
    batchFired: 'Batched file changes fired: {count} URIs',
    relintError: 'Re-lint failed for {file}: {error}',
  },

  progressHelper: {
    processing: 'Processing {file}',
    cancelled: 'Operation cancelled',
    fileError: 'Error processing {file}: {error}',
  },

  state: {
    transitioned: '{tool} state: {from} → {to}',
    observerError: 'Observer error for {tool}: {error}',
  },

  diagnosticManager: {
    maxProblemsReached: 'Max problems limit reached ({max}), remaining diagnostics truncated',
    invalidEntry: 'Invalid diagnostic entry skipped: {reason}',
    invalidReason: 'missing message or invalid line: {line}',
    skippedEntries: 'Skipped {count} malformed diagnostic entries for {file}',
  },

  runner: {
    timeout: 'Process timed out after {ms}ms',
    spawnFailed: 'Failed to spawn process: {error}',
    exitCode: 'Process exited with code {code}',
    jsonParseFailed: 'Failed to parse JSON output ({error}): {preview}',
  },

  errorBoundary: {
    errorLog: '{label}: {message}',
  },

  plurals: {
    error: '# error',
    errors: '# errors',
    warning: '# warning',
    warnings: '# warnings',
  },

  events: {
    handlerError: 'Event handler error ({tool}/{event}): {error}',
  },

  fixOnSave: {
    applied: 'Auto-fixed {count} problems on save',
    loopGuard: 'Skipping auto-fix: recently fixed (loop guard)',
    skippedNoFixes: 'No auto-fixable problems on save',
  },

  codeLens: {
    issueCount: '{rule} ({count} issues)',
  },

  diffPreview: {
    title: `${BRAND_NAME}: Fix Preview ↔ {file}`,
    noFixes: 'No auto-fixable problems to preview',
  },

  formatting: {
    applied: 'Formatting applied {count} lint fixes',
    noEdits: 'No lint fixes available for formatting',
  },

  profiling: {
    header: '=== Performance Timing ===',
    ruleTime: '  {rule}: {ms}ms',
    total: 'Total: {ms}ms ({count} rules)',
    noData: 'No timing data available. Run lint with --timing flag.',
  },

  filter: {
    selectCategories: 'Select categories to show',
    filterApplied: 'Diagnostic filter applied: {categories}',
    filterCleared: 'Diagnostic filter cleared',
    noCategories: 'No categories found in current diagnostics',
  },

  perFolder: {
    resolved: 'Per-folder config resolved for {folder}',
    fallbackGlobal: 'No folder config found, using global settings',
  },

  staleCleanup: {
    cleared: 'Cleared stale diagnostics for {count} files',
    skippedVisible: 'Skipped stale cleanup for visible editor: {file}',
  },

  imports: {
    removedCount: 'Removed {count} unused imports',
    noUnused: 'No unused import diagnostics found',
  },

  stageIndicator: {
    currentStage: `$(check) ${BRAND_NAME} [{stage}]`,
    selectStage: 'Select lint stage',
    stageChanged: 'Lint stage changed to: {stage}',
  },
};
