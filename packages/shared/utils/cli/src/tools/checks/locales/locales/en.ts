/**
 * Checks Tool English Strings
 *
 * @module
 */

import type { ChecksStrings } from '@/cli/tools/checks/locales/schema';

/** English strings for the checks tool. */
export const en: ChecksStrings = {
  name: 'checks',
  description:
    'Validate version consistency across config, lockfile, templates, schemas, and installed tools',

  flags: {
    fix: 'Attempt auto-remediation of detected mismatches',
  },

  examples: [
    { command: '{pmTool} checks', description: 'Run all consistency checks' },
    { command: '{pmTool} checks --fix', description: 'Run checks and auto-fix mismatches' },
    { command: '{pmTool} checks --verbose', description: 'Run checks with detailed output' },
  ],

  exitCodes: [
    { code: 0, description: 'All checks passed (warnings do not affect exit code)' },
    { code: 1, description: 'One or more checks failed' },
    { code: 2, description: 'Invalid command usage or arguments' },
    { code: 3, description: 'Unexpected fatal error' },
    { code: 130, description: 'Operation interrupted by user (Ctrl+C)' },
  ],

  // Headers
  headerSummary: 'Consistency Checks',

  // Pass labels
  passNodeLockfile: 'Config vs. lockfile (node tools)',
  passNodeDevDeps: 'Config vs. package.json devDependencies',
  passMiseToml: 'Config vs. mise.toml (system tools)',
  passInstalledTools: 'Config vs. installed system tools',
  passSchemaVersionCheck: 'Schema version drift',
  passSchemaFreshness: 'Schema metadata freshness',
  passInternalConsistency: 'Internal consistency',

  // Results
  resultPass: '{symbol:success} [pass] {name}: {detail}',
  resultFail: '{symbol:error} [fail] {name}: {detail}',
  resultWarn: '{symbol:warning} [warn] {name}: {detail}',
  resultSkip: '{dim}[skip] {name}: {detail}{/}',

  // Detail messages
  detailVersionMatch: 'v{version}',
  detailVersionMismatch: 'config={expected}, actual={actual}',
  detailMissing: '{what} not found',
  detailPresent: 'ok',
  detailNotInstalled: 'not installed',
  detailSchemaDrift: 'schema for v{schemaVersion}, installed v{installedVersion}',
  detailSchemaStale: 'fetched {daysSince}d ago ({fetchedAt})',
  detailSchemaFresh: 'fresh',
  detailNoVolta: 'no volta block',
  detailVoltaFound: 'volta block still present — run sync to remove',
  detailFileNotFound: '{path} not found',
  detailNodeVersionMatch: 'v{version}',
  detailPackageManagerMatch: '{pm}@{version}',
  detailMiseTomlExists: 'mise.toml present',
  detailMiseBootstrapExists: './bin/mise present',
  detailMiseVersionMatch: 'v{version}',
  detailGitignoreHasMise: '.mise/ in .gitignore',

  // Summary
  infoSummary: '{passed} passed, {failed} failed, {warnings} warnings, {skipped} skipped',

  // Fix mode
  fixRunningInstall: 'Running pnpm install to sync lockfile',
  fixRunningSync: 'Running pnpm tool sync to regenerate templates',
  fixRunningMiseInstall: 'Running ./bin/mise install {tool}@{version}',
  fixRunningSchemaUpdater: 'Running pnpm tool schema-updater',
  fixSuccess: '{symbol:success} Fixed: {action}',
  fixFailed: '{symbol:error} Fix failed: {action} — {error}',
  fixSkippedDryRun: '{dim}Would fix: {action}{/}',

  // Errors
  errorConfigLoad: 'Failed to load resist.config.ts',
  errorLockfileRead: 'Failed to read lockfile at {path}',
  errorPackageJsonRead: 'Failed to read package.json at {path}',
  errorMiseTomlRead: 'Failed to read mise.toml at {path}',
};
