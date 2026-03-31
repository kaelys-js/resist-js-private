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

/**
 * English locale strings for the Resist VSCode extension.
 */
export const en: VscodeStrings = {
  output: {
    channelName: 'Resist',
    errorPrefix: 'ERROR',
    activated: 'Resist extension activated',
  },

  statusBar: {
    tooltip: 'Resist Linter — Click to show output',
    tooltipPrefix: 'Resist —',
    ready: '$(check) Resist',
    linting: '$(sync~spin) Linting...',
    error: '$(error) Resist',
    disabled: '$(circle-slash) Resist',
  },

  messages: {
    binaryNotFound: 'Resist: resist-lint not found in node_modules/.bin. Linting is disabled.',
    binaryNotFoundLog:
      'resist-lint not found in node_modules/.bin. Install @/lint to enable linting.',
    noWorkspaceFolder: 'No workspace folder open',
    binaryNotInNodeModules: 'resist-lint not found in node_modules/.bin',
    noFixableProblems: 'No auto-fixable problems found',
    fixRejected: 'Resist: Failed to apply auto-fixes',
    fixRejectedLog: 'Failed to apply auto-fixes — workspace edit rejected',
    diagnosticsCleared: 'Diagnostics cleared',
    linterRestarted: 'Linter restarted — cache cleared, re-linting open files',
    fixesApplied: 'Applied {count} auto-fix(es)',
    skipBinaryNotFound: 'Skipping lint: resist-lint binary not found for {file}',
    skipWorkspaceNotFound: 'Skipping lint: workspace root not found for {file}',
    lintFailed: 'Lint failed for {file}: {error}',
    binaryNotFoundShort: 'resist-lint binary not found',
    foundDiagnostics: 'Found {count} diagnostics',
    runningLinter: 'Running resist-lint...',
    progressFiles: '{processed}/{total} files',
    availableRulesHeader: '=== Available Rules ===',
  },

  progress: {
    workspace: 'Resist: Linting workspace',
    staged: 'Resist: Linting staged changes',
    uncommitted: 'Resist: Linting uncommitted changes',
  },

  codeActions: {
    fix: 'Fix: {rule}',
    fixWithTip: 'Fix: {rule} — {tip}',
    fixAll: 'Fix all auto-fixable problems ({count})',
    disableLine: 'Disable {rule} for this line',
    disableFile: 'Disable {rule} for this file',
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

  commands: {
    registered: 'Command registered: {id}',
    executionFailed: 'Command execution failed: {id}',
  },

  lifecycle: {
    disposing: 'Disposing: {name}',
    disposed: 'Disposed {count} resources',
    disposalError: 'Disposal failed for {name}: {error}',
  },

  watcher: {
    configChanged: 'Config file changed: {pattern}',
    batchFired: 'Batched file changes fired: {count} URIs',
  },

  progressHelper: {
    processing: 'Processing {file}',
    cancelled: 'Operation cancelled',
    fileError: 'Error processing {file}: {error}',
  },

  state: {
    transitioned: '{tool} state: {from} → {to}',
  },

  diagnosticManager: {
    maxProblemsReached: 'Max problems limit reached ({max}), remaining diagnostics truncated',
    invalidEntry: 'Invalid diagnostic entry skipped: {reason}',
  },

  runner: {
    timeout: 'Process timed out after {ms}ms',
    spawnFailed: 'Failed to spawn process: {error}',
  },

  plurals: {
    error: 'error',
    errors: 'errors',
    warning: 'warning',
    warnings: 'warnings',
    file: 'file',
    files: 'files',
  },

  events: {
    registered: 'Event handler registered: {tool} → {event}',
    dispatched: 'Event dispatched: {event} → {count} handlers',
    handlerError: 'Event handler error ({tool}/{event}): {error}',
  },

  fixOnSave: {
    applied: 'Auto-fixed {count} problems on save',
    loopGuard: 'Skipping auto-fix: recently fixed (loop guard)',
    skippedNoFixes: 'No auto-fixable problems on save',
  },

  codeLens: {
    issueCount: '{rule} ({count} issues)',
    openDocs: 'Open documentation for {rule}',
  },

  diffPreview: {
    title: 'Resist: Fix Preview ↔ {file}',
    noFixes: 'No auto-fixable problems to preview',
    scheme: 'resist-fix-preview',
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
    trackingFile: 'Tracking file activity: {file}',
    skippedVisible: 'Skipped stale cleanup for visible editor: {file}',
  },

  imports: {
    removedCount: 'Removed {count} unused imports',
    noUnused: 'No unused import diagnostics found',
    commandTitle: 'Lint: Remove Unused Imports',
  },

  inlineOverrides: {
    decorationTooltip: 'Resist lint override: {directive}',
    foundOverrides: 'Found {count} inline override comments',
  },

  stageIndicator: {
    currentStage: '$(check) Resist [{stage}]',
    selectStage: 'Select lint stage',
    stageChanged: 'Lint stage changed to: {stage}',
  },
};
