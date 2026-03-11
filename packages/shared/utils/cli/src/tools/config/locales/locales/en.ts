/**
 * Config English Strings
 *
 * @module
 */

import type { ConfigStrings } from '@/cli/tools/config/locales/schema';

/** English strings for config. */
export const en: ConfigStrings = {
  name: 'config',
  description: 'Display, inspect, validate, and manage configuration',

  flags: {
    product: 'Show config for a specific product (or "all" for all products)',
    json: 'Output results in JSON format for scripting',
    key: 'Dot-notation key path (e.g. "tooling.ci.enabled")',
  },

  examples: [
    { command: '{pmTool} config', description: 'Show full global configuration' },
    { command: '{pmTool} config show --product=myapp', description: 'Show product config' },
    { command: '{pmTool} config get -k tooling.ci.enabled', description: 'Get a specific value' },
    { command: '{pmTool} config validate', description: 'Validate config against schema' },
    { command: '{pmTool} config list', description: 'List all top-level keys' },
    { command: '{pmTool} config schema -k tooling', description: 'Show schema for section' },
    { command: '{pmTool} config path', description: 'Show resolved config path' },
    { command: '{pmTool} config init', description: 'Create config from template' },
  ],

  exitCodes: [
    { code: 0, description: 'Completed successfully' },
    { code: 1, description: 'Configuration not found or validation failed' },
    { code: 2, description: 'Invalid command usage or arguments' },
    { code: 3, description: 'Unexpected fatal error' },
    { code: 130, description: 'Operation interrupted by user (Ctrl+C)' },
  ],

  // Show
  header: 'Global Configuration',
  headerProduct: 'Product Configuration: {name}',
  configPath: 'Source: {path}',
  noProductsFound: 'No products found in {productsDir}/',

  // Get
  getHeader: 'Config value: {key}',
  getKeyNotFound: 'Key "{key}" not found in configuration',
  getKeyRequired: '--key is required for the get action',
  getProductKeyNotFound: 'Key "{key}" not found in product "{product}" configuration',

  // Validate
  validateHeader: 'Validating configuration...',
  validatePassed: 'Configuration is valid',
  validateFailed: 'Configuration has {count} validation error(s)',
  validateIssue: '  {path}: {message}',
  validateProductHeader: 'Validating product: {name}',
  validateProductPassed: 'Product "{name}" config is valid',
  validateProductFailed: 'Product "{name}" config failed: {reason}',
  validateProductLoadError: 'Product "{name}" config failed to load (module import error)',
  validateProductExportError:
    'Product "{name}" config has no valid export (.config, .default, or module object)',
  validateAllHeader: 'Validating all product configurations...',
  validateSummary: 'Validation complete: {passed} passed, {failed} failed ({total} total)',

  // List
  listHeader: 'Configuration Keys',
  listKey: '  {key} ({type})',
  listProductHeader: 'Product Keys: {name}',
  listCount: '{count} key(s) found',

  // Schema
  schemaHeader: 'Configuration Schema',
  schemaKeyHeader: 'Schema for: {key}',
  schemaEntry: '  {key} ({type}) required={required}',
  schemaKeyNotFound: 'Key "{key}" not found in schema',

  // Path
  pathHeader: 'Configuration Paths',
  pathGlobal: 'Global: {path}',
  pathProduct: 'Product "{name}": {path}',
  pathNotFound: 'Config file not found at workspace root',

  // Init
  initHeader: 'Initializing configuration...',
  initCreated: 'Created {path}',
  initAlreadyExists: 'Config file already exists at {path}',

  // Action validation
  unknownAction:
    'Unknown action: {action}. Expected: show, get, validate, list, schema, path, init',
};
