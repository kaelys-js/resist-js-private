/**
 * Core Config Schema
 *
 * The main schema for {root}.config.ts - combines all sub-schemas.
 *
 * @module
 */

import * as v from 'valibot';

import { BusinessObjectSchema } from '@/schemas/core-config/business';
import { EnvironmentNameSchema } from '@/schemas/core-config/environment';
import { FormatSchema } from '@/schemas/core-config/format';
import { GitSchema } from '@/schemas/core-config/git';
import { RepoSchema } from '@/schemas/core-config/repo';
import { ToolingSchema } from '@/schemas/core-config/tooling';
import { VersionsSchema } from '@/schemas/core-config/versions';

// =============================================================================
// Core Config
// =============================================================================

/**
 * Valibot schema for the complete `{root}.config.ts` file.
 *
 * Combines all sub-schemas into a single strict object:
 * - **Business**: `company`, `products`, `locales`, `defaultLocale` (from {@link BusinessSchema})
 * - **Tooling**: `tooling` — dev proxy, formatting, paths, onboarding, package manager (from {@link ToolingSchema})
 * - **Repository**: `repo` — description, keywords, URLs (from {@link RepoSchema})
 * - **Versions**: `versions` — Node.js and package manager versions (from {@link VersionsSchema})
 * - **Format**: `format` — EditorConfig-style formatting (from {@link FormatSchema})
 * - **Git**: `git` — default branch, publish branch (from {@link GitSchema})
 * - **Environment**: `environment` — default environment name (from {@link EnvironmentNameSchema})
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 * import { CoreConfigSchema } from '@/schemas/core-config';
 *
 * const result = safeParse(CoreConfigSchema, {
 *   company: { name: 'Acme', domain: 'acme.com', supportEmail: 'hi@acme.com' },
 *   products: [{ id: 'app', name: 'Acme App' }],
 *   locales: ['en'],
 *   defaultLocale: 'en',
 * });
 * ```
 */
export const CoreConfigObjectSchema = v.strictObject({
  // -------------------------------------------------------------------------
  // Business Configuration
  // -------------------------------------------------------------------------

  /** Company information */
  company: BusinessObjectSchema.entries.company,
  /** List of products */
  products: BusinessObjectSchema.entries.products,
  /** Supported locales */
  locales: BusinessObjectSchema.entries.locales,
  /** Default locale */
  defaultLocale: BusinessObjectSchema.entries.defaultLocale,

  // -------------------------------------------------------------------------
  // Tooling Configuration
  // -------------------------------------------------------------------------

  /** Tooling configuration (dev proxy, formatting, paths, onboarding) */
  tooling: v.optional(ToolingSchema, {}),

  // -------------------------------------------------------------------------
  // Repository Configuration
  // -------------------------------------------------------------------------

  /** Repository metadata (description, keywords, URLs) */
  repo: v.optional(RepoSchema, {}),

  // -------------------------------------------------------------------------
  // Version Configuration
  // -------------------------------------------------------------------------

  /** Runtime versions (Node.js, package manager) */
  versions: v.optional(VersionsSchema, {}),

  // -------------------------------------------------------------------------
  // Format Configuration
  // -------------------------------------------------------------------------

  /** Code formatting settings (indent, line length) */
  format: v.optional(FormatSchema, {}),

  // -------------------------------------------------------------------------
  // Git Configuration
  // -------------------------------------------------------------------------

  /** Git settings (branch names) */
  git: v.optional(GitSchema, {}),

  // -------------------------------------------------------------------------
  // Environment Configuration
  // -------------------------------------------------------------------------

  /** Default environment for CLI tools */
  environment: v.optional(EnvironmentNameSchema, 'development'),
});

export const CoreConfigSchema = v.pipe(
  CoreConfigObjectSchema,
  v.check(
    (input: v.InferOutput<typeof CoreConfigObjectSchema>) =>
      input.locales.includes(input.defaultLocale),
    'defaultLocale must be included in the locales array',
  ),
);

/**
 * The primary configuration type for the entire monorepo.
 * Inferred output type of {@link CoreConfigSchema}.
 *
 * This is the type returned by `loadConfig()` and accepted by `defineConfig()`.
 */
export type CoreConfig = v.InferOutput<typeof CoreConfigSchema>;

/** Input type for {@link CoreConfigSchema} — accepts partial objects that `safeParse` fills with defaults. */
export type CoreConfigInput = v.InferInput<typeof CoreConfigObjectSchema>;
