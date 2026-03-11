/**
 * Schema Updater English Strings
 *
 * @module
 */

import type { SchemaUpdaterStrings } from '@/cli/tools/schema-updater/locales/schema';

/** English strings for schema updater. */
export const en: SchemaUpdaterStrings = {
  name: 'schema-updater',
  description:
    'Download and cache JSON schemas from remote URLs, local packages, and custom sources',

  flags: {
    filter: 'Only update schemas whose name contains this substring',
    concurrency: 'Maximum concurrent HTTP requests (default: 6)',
    list: 'Display schema status table without updating',
    force: 'Override dirty tree check and force re-download',
  },

  examples: [
    { command: '{pmTool} schema-updater', description: 'Update all configured schemas' },
    { command: '{pmTool} schema-updater --verbose', description: 'Show detailed progress' },
    { command: '{pmTool} schema-updater --dry-run', description: 'Show what would be done' },
    { command: '{pmTool} schema-updater --filter=biome', description: 'Update only biome schema' },
    {
      command: '{pmTool} schema-updater --filter=github',
      description: 'Update all GitHub-related schemas',
    },
    { command: '{pmTool} schema-updater --list', description: 'Show status of all schemas' },
    {
      command: '{pmTool} schema-updater --concurrency=2',
      description: 'Limit to 2 parallel downloads',
    },
    { command: '{pmTool} schema-updater --force', description: 'Force re-download ignoring cache' },
  ],

  exitCodes: [
    { code: 0, description: 'All schemas updated successfully' },
    { code: 1, description: 'One or more schemas failed with no fallback' },
    { code: 2, description: 'Invalid command usage or arguments' },
    { code: 3, description: 'Unexpected fatal error' },
    { code: 130, description: 'Operation interrupted by user (Ctrl+C)' },
  ],

  // Headers
  headerSummary: 'Summary',

  // Info messages
  infoWorkspaceRoot: 'Workspace root: {path}',
  infoSchemaCount: 'Found {count, plural, one {# schema} other {# schemas}} to sync',
  infoFetching: 'Fetching {name} from {url}',
  infoCopying: 'Copying {name} from {path}',
  infoUpdated: 'Updated {name}',
  infoUnchanged: 'Unchanged {name}',
  infoSummaryUpdated: 'Updated: {success}/{total}',
  infoSummaryFailed: 'Failed: {failed}/{total}',
  infoSummaryUnchanged: 'Unchanged: {unchanged}/{total}',
  infoVersionDetected: 'Detected {name} version: {version}',
  infoFilterActive: 'Filter "{filter}" matched {matched}/{total} schemas',
  infoVscodeSettingsWritten: 'Wrote VS Code schema associations to {path}',

  // List mode
  listHeader: 'Configured Schemas',
  listEntry: '  {name} ({type}) — {source}',
  listEntryWithDate: '  {name} ({type}) — {source} [fetched: {fetchedAt}]',

  // Warnings
  warnNoSchemas: 'No schemas configured in schemas.json',
  warnSomeNotUpdated: 'Some schemas could not be updated but existing versions were kept',
  warnUpdateFailed: 'Failed to update {name}: {error}. Keeping existing version',
  warnVersionNotFound:
    'Could not detect version for {name} (package: {packageName}). Using URL as-is',
  warnVersionDrift:
    '[{name}] schema was written for {tool} v{schemaVersion} but v{installedVersion} is now installed — verify schema is still accurate',
  warnDirtyTree:
    'Working tree has uncommitted changes in the schemas directory — use --force to override',

  // Errors
  errorInvalidJson: 'Response is not valid JSON',
  errorMaxRetries: 'Max retries exceeded',
  errorFetchFailed: 'Failed to fetch {name}: {error}',
  errorCopyFailed: 'Failed to copy {name}: {error}',
  errorHttpStatus: 'HTTP {status} {statusText}',
  errorLocalSchemaNotFound: 'Local schema not found for {name}: {path}',
  errorCustomSchemaNotFound: 'Custom schema not found for {name}: {path}',
  errorCriticalFailures:
    '{count, plural, one {# schema} other {# schemas}} failed with no existing fallback',
  errorDirtyTree:
    'Schemas directory has uncommitted changes. Commit or stash changes first, or use --force',

  // Retry
  retryAttempt: 'Attempt {attempt}/{max} failed: {error}. Retrying in {delayMs}ms',
};
