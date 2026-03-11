/**
 * Sync English Strings
 *
 * @module
 */

import type { SyncStrings } from '@/cli/tools/sync/locales/schema';

/** English strings for sync. */
export const en: SyncStrings = {
  name: 'sync',
  description: 'Sync templates across the monorepo based on config',

  flags: {},

  examples: [
    {
      command: '{pmTool} sync',
      description: 'Sync all templates with current config',
    },
    {
      command: '{pmTool} sync --dry-run',
      description: 'Preview what would be synced without making changes',
    },
  ],

  exitCodes: [
    { code: 0, description: 'Sync completed successfully' },
    { code: 1, description: 'Sync failed or validation error' },
    { code: 2, description: 'Invalid command usage or arguments' },
    { code: 3, description: 'Unexpected fatal error' },
    { code: 130, description: 'Operation interrupted by user (Ctrl+C)' },
  ],

  // Config
  configNotFound: '{configFilename} not found, will create from defaults',
  creatingConfig: 'Creating {configFilename}...',
  configCreated: 'Created {configFilename} with default values',
  loadingConfig: 'Loading {configFilename}...',
  configLoaded: 'Config loaded successfully',

  // Dry-run
  dryRunPrefix: '[dry-run]',
  dryRunWouldSync: 'Would sync templates based on config',
  dryRunWouldCreateConfig: 'Would create {configFilename} from defaults',
  dryRunTemplateCount: '{count, plural, one {# template} other {# templates}} would be processed',

  // Progress
  syncing: 'Syncing templates...',

  // Success
  success: 'Sync completed successfully!',
  templatesProcessed: '{count, plural, one {# template} other {# templates}} processed',

  // Package manager switch — detection
  warnPmSwitchDetected: 'Package manager set to "{newPm}", but old lock files detected.',
  warnPmSwitchOldLockfile: 'Found: {lockfile}',

  // Package manager switch — auto-cleanup
  pmSwitchDeletingLockfile: 'Deleting stale lock file: {lockfile}',
  pmSwitchDeletedLockfile: 'Deleted: {lockfile}',
  pmSwitchDryRunDeleteLockfile: 'Would delete stale lock file: {lockfile}',
  pmSwitchDeletingWorkspaceFile: 'Deleting stale pnpm-workspace.yaml (no longer using pnpm)',
  pmSwitchDeletedWorkspaceFile: 'Deleted: pnpm-workspace.yaml',
  pmSwitchDryRunDeleteWorkspaceFile: 'Would delete stale pnpm-workspace.yaml',
  warnPmSwitchNodeModules: 'Delete node_modules/ directories and reinstall:',
  warnPmSwitchNodeModulesHint:
    '    find . -name node_modules -type d -prune -exec rm -rf {{}} +  &&  {pm} install',
  warnPmSwitchDevcontainer: 'If using devcontainers, rebuild to pick up the new package manager.',
  warnPmSwitchCoder: 'If using Coder workspaces, reprovision to pick up the new package manager.',
  pmSwitchCleanupComplete: '{count, plural, one {# stale file} other {# stale files}} cleaned up',

  // Stale conditional output cleanup
  staleConditionalDeleted: 'Deleted stale conditional output: {path}',
  staleConditionalDryRunDelete: 'Would delete stale conditional output: {path}',

  // Locale validation
  localeValidationHeader: 'Validating locale files...',
  localeValidationPassed: 'All locale files match configured locales',
  localeMissing: 'Missing locale file: {locale}.ts in {directory}',
  localeOrphaned: 'Orphaned locale file: {locale}.ts in {directory} (not in config.locales)',

  // Mise post-render
  miseVersionUpdated: 'mise updated to v{version}',
  runningMiseInstall: 'Running ./bin/mise install to apply tool version changes',
  miseInstallFailed: 'mise install failed — run ./bin/mise install manually',
  dryRunMiseInstall: 'Would run ./bin/mise install',
};
