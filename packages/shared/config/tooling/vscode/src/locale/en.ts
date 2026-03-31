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
};
