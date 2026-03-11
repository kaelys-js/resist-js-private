/**
 * VS Code Setup English Strings
 *
 * @module
 */

import type { VscodeSetupStrings } from '@/cli/tools/vscode-setup/locales/schema';

/** English strings for VS Code setup. */
export const en: VscodeSetupStrings = {
  name: 'vscode-setup',
  description:
    'Configure VS Code extensions: install recommended, remove conflicting, audit status',

  flags: {
    list: 'Display installed extensions with status annotations',
    filter: 'Only process extensions matching this substring',
    diff: 'Show comparison between installed and configured extensions',
    force: 'Force reinstall already-installed extensions',
    json: 'Output results in JSON format for scripting',
  },

  examples: [
    { command: '{pmTool} vscode-setup', description: 'Install and configure VS Code extensions' },
    {
      command: '{pmTool} vscode-setup --dry-run',
      description: 'Preview changes without installing',
    },
    {
      command: '{pmTool} vscode-setup --list',
      description: 'List installed extensions with status',
    },
    {
      command: '{pmTool} vscode-setup --diff',
      description: 'Show missing, extra, and unwanted extensions',
    },
    {
      command: '{pmTool} vscode-setup --filter=svelte',
      description: 'Only process Svelte-related extensions',
    },
    {
      command: '{pmTool} vscode-setup --force',
      description: 'Reinstall all recommended extensions',
    },
    { command: '{pmTool} vscode-setup --json', description: 'Output results as JSON' },
    {
      command: '{pmTool} vscode-setup --diff --json',
      description: 'Audit extensions with JSON output',
    },
  ],

  exitCodes: [
    { code: 0, description: 'Extensions configured successfully' },
    { code: 1, description: 'One or more extensions failed to install' },
    {
      code: 2,
      description: 'VS Code CLI not found, extensions.json missing/invalid, or workspace error',
    },
    { code: 3, description: 'Unexpected fatal error' },
    { code: 130, description: 'Operation interrupted by user (Ctrl+C)' },
  ],

  // Headers
  headerRemoving: 'Removing conflicting extensions',
  headerInstalling: 'Installing recommended extensions',
  headerSummary: 'Summary:',

  // Info messages
  infoNoConflicting: 'No conflicting extensions found.',
  infoAllInstalled: 'All recommended extensions already installed.',
  infoRestart: `To apply extension changes, reload your editor:
  Cmd+Shift+P (Mac) or Ctrl+Shift+P → "Developer: Reload Window"`,
  infoRemoving: '  Removing {ext}... ',
  infoInstalling: '  Installing {ext}... ',
  infoDone: 'done',
  infoFailed: 'failed',

  // Summary
  summaryInstalled: '  Installed: {count}',
  summaryAlreadyInstalled: '  Already installed: {count}',
  summaryUninstalled: '  Uninstalled: {count}',
  summaryFailed: '  Failed: {count}',

  // Dry-run mode
  dryRunPrefix: '[DRY RUN] ',
  dryRunWouldInstall: 'Would install {ext}',
  dryRunWouldUninstall: 'Would uninstall {ext}',
  dryRunSummary: 'No changes made (dry run)',

  // Filter mode
  infoFilterActive: 'Filter "{filter}" matched {matched}/{total} extensions',

  // List mode
  listHeader: 'Installed Extensions',
  listEntry: '  {ext} [{status}]',
  listEntryWithVersion: '  {ext}@{version} [{status}]',
  listCategoryHeader: '\n  {category}',
  listSummary:
    '  Total: {installed} installed, {recommended} recommended, {unwanted} unwanted, {extra} extra',

  // Diff/audit mode
  diffHeader: 'Extension Audit',
  diffMissing: '  {ext}',
  diffExtra: '  {ext}',
  diffUnwanted: '  {ext}',
  diffOk: '  {ext}',
  diffSummary: '  Missing: {missing}, Extra: {extra}, Unwanted: {unwanted}, OK: {ok}',

  // Force mode
  infoForceReinstalling: '  Reinstalling {ext}... ',

  // Category grouping
  categoryUncategorized: 'Uncategorized',

  // Health warnings
  warnInstallFailed: 'Failed to install {ext}: {error}',

  // Partial failure
  errorPartialFailure: '{failed, plural, one {# extension} other {# extensions}} failed to install',
};
