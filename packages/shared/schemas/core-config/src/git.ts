/**
 * Git Schema
 *
 * Schema for Git configuration.
 *
 * @module
 */

import * as v from 'valibot';

// =============================================================================
// Git
// =============================================================================

/**
 * Valid git branch name characters (letters, numbers, dots, underscores, hyphens, slashes).
 */
const GitBranchSchema = v.pipe(
  v.string(),
  v.regex(/^[a-zA-Z0-9._/-]+$/, 'Must be a valid git branch name'),
);

/**
 * Valibot schema for the top-level `git` section of the root config.
 * Controls default branch name and the branch used for npm publishing.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(GitSchema, {
 *   branch: 'main',
 *   npm_publish_branch: 'main',
 * });
 * ```
 */
export const GitSchema = v.strictObject({
  /** Default branch name (e.g., "main") */
  branch: v.optional(GitBranchSchema, 'main'),
  /** Branch for publishing */
  npm_publish_branch: v.optional(GitBranchSchema, 'main'),
});

/** Inferred output type of {@link GitSchema}. */
export type Git = v.InferOutput<typeof GitSchema>;
