/**
 * Repo Schema
 *
 * Schema for repository metadata configuration.
 *
 * @module
 */

import * as v from 'valibot';

import { UrlStringSchema } from '@/schemas/common';

// =============================================================================
// Repository URLs
// =============================================================================

/**
 * Valibot schema for repository-related URLs.
 * Populates `package.json` fields like `repository`, `bugs`, and `funding`.
 */
export const RepoUrlsSchema = v.strictObject({
  /** Git repository URL */
  repo: v.optional(UrlStringSchema),
  /** Bug tracker URL */
  bugs: v.optional(UrlStringSchema),
  /** Funding/sponsorship URL */
  funding: v.optional(UrlStringSchema),
});

/** Inferred output type of {@link RepoUrlsSchema}. */
export type RepoUrls = v.InferOutput<typeof RepoUrlsSchema>;

// =============================================================================
// Repository
// =============================================================================

/**
 * Valibot schema for the top-level `repo` section of the root config.
 * Holds project description, keywords, and repository URLs.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(RepoSchema, {
 *   description: 'Multi-product SaaS monorepo',
 *   keywords: ['saas', 'monorepo'],
 *   urls: { repo: 'https://github.com/acme/monorepo' },
 * });
 * ```
 */
export const RepoSchema = v.strictObject({
  /** Project description (max 500 characters) */
  description: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(500)), ''),
  /** keywords for discoverability (max 30 keywords, each 1-50 characters) */
  keywords: v.optional(
    v.pipe(
      v.array(v.pipe(v.string(), v.trim(), v.toLowerCase(), v.minLength(1), v.maxLength(50))),
      v.maxLength(30),
    ),
    [],
  ),
  /** Repository URLs */
  urls: v.optional(RepoUrlsSchema, {}),
});

/** Inferred output type of {@link RepoSchema}. */
export type Repo = v.InferOutput<typeof RepoSchema>;
