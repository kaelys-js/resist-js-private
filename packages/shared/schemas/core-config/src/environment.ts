/**
 * Environment Schemas
 *
 * Valibot schemas for environment configuration.
 *
 * @module
 */

import * as v from 'valibot';

// =============================================================================
// Environment Name
// =============================================================================

/**
 * Standard environment names.
 */
export const StandardEnvironmentSchema = v.picklist(['development', 'staging', 'production']);

/** Inferred output type of {@link StandardEnvironmentSchema}. One of `'development' | 'staging' | 'production'`. */
export type StandardEnvironment = v.InferOutput<typeof StandardEnvironmentSchema>;

/**
 * Feature branch environment name.
 * Format: feature/branch-name (lowercase letters, numbers, hyphens)
 */
export const FeatureBranchSchema = v.pipe(
  v.string(),
  v.regex(/^feature\/[a-z0-9-]+$/, 'Feature branch format: feature/branch-name'),
);

/** Inferred output type of {@link FeatureBranchSchema}. A `feature/branch-name` string. */
export type FeatureBranch = v.InferOutput<typeof FeatureBranchSchema>;

/**
 * Environment name - either a standard environment or a feature branch.
 */
export const EnvironmentNameSchema = v.union([StandardEnvironmentSchema, FeatureBranchSchema]);

/** Inferred output type of {@link EnvironmentNameSchema}. A standard environment or feature branch string. */
export type EnvironmentName = v.InferOutput<typeof EnvironmentNameSchema>;

/**
 * Valibot schema for a full environment configuration object.
 * Used when environments need more than just a name (e.g., per-environment URLs).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(EnvironmentSchema, {
 *   name: 'staging',
 *   baseUrl: 'https://staging.acme.com',
 *   debug: true,
 * });
 * ```
 */
export const EnvironmentSchema = v.strictObject({
  /** Environment name */
  name: EnvironmentNameSchema,
  /** Base URL for this environment */
  baseUrl: v.optional(v.pipe(v.string(), v.url())),
  /** Enable debug mode */
  debug: v.optional(v.boolean(), false),
});

/** Inferred output type of {@link EnvironmentSchema}. */
export type Environment = v.InferOutput<typeof EnvironmentSchema>;
