/**
 * Sync Config
 *
 * Tool-specific configuration colocated with the command.
 *
 * @module
 */

/** Configuration for sync command. */
export const CONFIG = {
  /** Directory containing the Handlebars templates (mirrors workspace root structure). */
  templatesDir: 'packages/shared/utils/cli/src/tools/sync/template/packages',
} as const;
