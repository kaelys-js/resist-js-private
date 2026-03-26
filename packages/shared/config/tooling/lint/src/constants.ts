/**
 * resist-lint — Shared Constants
 *
 * Single source of truth for linter branding and filenames.
 * All references to the linter name and config files import from here.
 *
 * @module
 */

// =============================================================================
// Branding
// =============================================================================

/** The linter's display name. */
export const LINTER_NAME: string = 'resist-lint';

/** Configuration file name (JSONC — JSON with comments). */
export const CONFIG_FILENAME: string = '.resist-lint.jsonc';

/** JSON Schema file name for IDE autocomplete. */
export const SCHEMA_FILENAME: string = '.resist-lint.schema.json';
