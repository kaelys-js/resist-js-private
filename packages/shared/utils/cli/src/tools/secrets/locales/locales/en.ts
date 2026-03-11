/**
 * Secrets English Strings
 *
 * @module
 */

import type { SecretsStrings } from '@/cli/tools/secrets/locales/schema';

/** English strings for secrets. */
export const en: SecretsStrings = {
  name: 'secrets',
  description: 'Manage Infisical secrets: show, get, set, delete, validate, and more',

  flags: {
    product: 'Show secrets for a specific product (or "all" for all products)',
    env: 'Target environment (development, staging, production, feature/<branch>)',
    json: 'Output raw JSON (no formatting)',
    key: 'Secret key name for get/set/delete actions',
    value: 'Secret value for set action',
    path: 'Infisical folder path (default: /)',
    dryRun: 'Preview changes without applying them',
    force: 'Skip confirmation prompts',
    category: 'Secret category for rotation (jwt, api, database, all)',
    verbose: 'Show detailed output',
    backup: 'Create backup before destructive operations',
  },

  examples: [
    { command: '{pmTool} secrets', description: 'Show global secrets for local environment' },
    {
      command: '{pmTool} secrets --env=production',
      description: 'Show global secrets for production',
    },
    { command: '{pmTool} secrets --product=myapp', description: 'Show product-specific secrets' },
    {
      command: '{pmTool} secrets get --key=API_SECRET_KEY',
      description: 'Get a single secret value',
    },
    {
      command: '{pmTool} secrets set --key=API_KEY --value=abc123',
      description: 'Set a secret value',
    },
    { command: '{pmTool} secrets delete --key=OLD_KEY', description: 'Delete a secret' },
    {
      command: '{pmTool} secrets validate --env=production',
      description: 'Validate secrets against schemas',
    },
    { command: '{pmTool} secrets doctor', description: 'Run diagnostic checks' },
    {
      command: '{pmTool} secrets migrate --dry-run',
      description: 'Preview .env migration to Infisical',
    },
    { command: '{pmTool} secrets rotate --category=jwt', description: 'Rotate JWT secrets' },
  ],

  exitCodes: [
    { code: 0, description: 'Secrets operation completed successfully' },
    { code: 1, description: 'Secret not found or validation failed' },
    { code: 2, description: 'Invalid command usage or arguments' },
    { code: 3, description: 'Unexpected fatal error' },
    { code: 130, description: 'Operation interrupted by user (Ctrl+C)' },
  ],

  // Show
  header: 'Secrets',
  headerProduct: 'Secrets: {name}',
  fetchingSecrets: 'Fetching secrets for environment: {env}',
  fetchingProductSecrets: 'Fetching secrets for {name} ({env})',
  noProductsFound: 'No products found in {productsDir}/',

  // Get
  getHeader: 'Secret: {key}',
  getKeyNotFound: 'Secret "{key}" not found at path {path}',
  getKeyRequired: '--key flag is required for the get action',

  // Set
  setSuccess: 'Set {key} at {path} ({env})',
  setKeyRequired: '--key flag is required for the set action',
  setValueRequired: '--value flag is required for the set action',
  setDryRun: '[dry-run] Would set {key} at {path} ({env})',

  // Delete
  deleteSuccess: 'Deleted {key} from {path} ({env})',
  deleteKeyRequired: '--key flag is required for the delete action',
  deleteDryRun: '[dry-run] Would delete {key} from {path} ({env})',

  // List
  listHeader: 'Secrets at {path} ({env})',
  listKey: '  {key} = {value}',
  listCount: '{count} secrets found',
  listEmpty: 'No secrets found at {path}',

  // Search
  searchHeader: 'Search results for "{query}"',
  searchResult: '  {key}  →  {path} ({project})',
  searchNoResults: 'No secrets matching "{query}"',
  searchQueryRequired: 'Search query is required (pass as second argument)',

  // Doctor
  doctorHeader: 'Infisical Health Check',
  doctorCheckPassed: '  ✓ {name}',
  doctorCheckFailed: '  ✗ {name} — fix: {fix}',
  doctorCheckSkipped: '  ○ {name} (skipped)',
  doctorSummary: '{passed}/{total} checks passed ({failed} failed)',

  // Migrate
  migrateHeader: 'Migrate .env files to Infisical',
  migrateFound: 'Found {count} .env files',
  migrateFile: '  {file} → environment: {env}',
  migrateUploading: '  Uploading {key} to {path}',
  migrateComplete: 'Migrated {count} secrets',
  migrateNoFiles: 'No .env files found in workspace root',
  migrateDryRun: '[dry-run] No changes applied',
  migrateBackupCreated: '  Backup created: {path}',

  // Rotate
  rotateHeader: 'Rotating {category} secrets',
  rotateGenerating: '  Generating new value for {key}',
  rotateSuccess: '  ✓ Rotated {key}',
  rotateComplete: 'Rotated {count} secrets',
  rotateDryRun: '[dry-run] Would rotate {key} (category: {category})',
  rotateCategoryRequired:
    '--category flag is required for the rotate action (jwt, api, database, all)',

  // Sync
  syncHeader: 'Syncing secrets to Cloudflare Workers ({env})',
  syncUploading: '  Pushing {key} to {worker}',
  syncComplete: 'Synced {count} secrets to Workers',
  syncDryRun: '[dry-run] No secrets pushed',

  // Login/Logout/Whoami
  loginHeader: 'Log in to Infisical',
  loginSuccess: 'Logged in successfully',
  logoutHeader: 'Log out of Infisical',
  logoutSuccess: 'Logged out successfully',
  whoamiHeader: 'Current Infisical user',
  whoamiUser: 'Logged in as {email}',
  whoamiNotLoggedIn: 'Not logged in — run: pnpm tool secrets login',

  // Validate
  validateHeader: 'Validating secrets ({env})',
  validatePassed: '  ✓ {path}',
  validateFailed: '  ✗ {path} — {count} issues',
  validateMissing: '    Missing: {key} at {path}',
  validateSummary: '{passed} passed, {failed} failed',

  // Infisical CLI errors
  infisicalNotFound: 'Infisical CLI not found — run: pnpm tool secrets-setup',

  // Action validation
  unknownAction:
    'Unknown action: {action}. Valid actions: show, get, set, delete, list, search, doctor, migrate, rotate, sync, login, logout, whoami, validate',
};
