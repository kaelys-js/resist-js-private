/**
 * Environment Detection
 *
 * Git branch → StandardEnvironment detection and environment hierarchy
 * for Infisical secret inheritance. Uses the existing `StandardEnvironmentSchema`
 * from `@/schemas/core-config/environment`.
 *
 * Hierarchy: production → staging → development
 * Secrets flow down — development inherits from staging, staging from production.
 *
 * Adapted from `_INTEGRATE/env-management/config/environments.ts`.
 * Aligned with existing `StandardEnvironmentSchema` — uses `'development'`,
 * `'staging'`, `'production'` (not _INTEGRATE's `'local'`/`'feature'`/`'prod'`).
 *
 * @module
 */

import type { Bool, Str } from '@/schemas/common';
import {
  StandardEnvironmentSchema,
  type StandardEnvironment,
} from '@/schemas/core-config/environment';
import { ERRORS, err, okUnchecked, type Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Constants
// =============================================================================

/**
 * Environment hierarchy (for secret inheritance).
 * Secrets flow down: production → staging → development.
 * Index 0 = most restricted, higher index = less restricted.
 */
export const ENVIRONMENT_HIERARCHY: readonly StandardEnvironment[] = [
  'production',
  'staging',
  'development',
];

/**
 * Default git branch → environment mapping.
 * Used when `resist.config.ts` `tooling.infisical.environments.branchMapping`
 * does not cover a branch.
 *
 * Adapted from `_INTEGRATE/env-management/config/environments.ts`.
 * Aligned with `StandardEnvironmentSchema` — all values are
 * `'development' | 'staging' | 'production'`.
 */
const DEFAULT_BRANCH_MAPPING: Readonly<Record<string, StandardEnvironment>> = {
  // Exact matches
  main: 'production',
  master: 'production',
  staging: 'staging',
  develop: 'staging',
  // Pattern prefixes (checked via startsWith)
  'release/*': 'staging',
  'feature/*': 'development',
  'fix/*': 'development',
  'chore/*': 'development',
  'refactor/*': 'development',
  'docs/*': 'development',
  'test/*': 'development',
};

// =============================================================================
// Functions
// =============================================================================

/**
 * Get environment from git branch name.
 * Checks exact matches first, then pattern matches (prefix/*).
 *
 * @param branch - Git branch name.
 * @returns The matching `StandardEnvironment` (defaults to `'development'`).
 */
export function getEnvironmentFromBranch(branch: Str): StandardEnvironment {
  // Check exact matches first
  if (branch in DEFAULT_BRANCH_MAPPING) {
    return DEFAULT_BRANCH_MAPPING[branch]!;
  }

  // Check pattern matches (prefix/*)
  for (const [pattern, env] of Object.entries(DEFAULT_BRANCH_MAPPING)) {
    if (pattern.endsWith('/*')) {
      const prefix: Str = pattern.slice(0, -2);
      if (branch.startsWith(`${prefix}/`)) {
        return env;
      }
    }
  }

  // Default to development
  return 'development';
}

/**
 * Get parent environment for secret inheritance.
 * production has no parent, staging inherits from production,
 * development inherits from staging.
 *
 * @param env - Current environment.
 * @returns Parent `StandardEnvironment`, or `undefined` for production.
 */
export function getParentEnvironment(env: StandardEnvironment): StandardEnvironment | undefined {
  const idx: number = ENVIRONMENT_HIERARCHY.indexOf(env);
  if (idx <= 0) return undefined;
  return ENVIRONMENT_HIERARCHY[idx - 1];
}

/**
 * Get child environments that inherit from a given environment.
 *
 * @param env - Parent environment.
 * @returns Array of child `StandardEnvironment` values.
 */
export function getChildEnvironments(env: StandardEnvironment): readonly StandardEnvironment[] {
  const idx: number = ENVIRONMENT_HIERARCHY.indexOf(env);
  if (idx === -1 || idx >= ENVIRONMENT_HIERARCHY.length - 1) return [];
  return [ENVIRONMENT_HIERARCHY[idx + 1]!];
}

/**
 * Check if an environment can access another's secrets (for inheritance).
 * An environment can access secrets from the same level or higher
 * (more restricted) in the hierarchy.
 *
 * @param requestingEnv - Environment requesting access.
 * @param targetEnv - Environment whose secrets are being accessed.
 * @returns `Result<Bool>` — true if access is allowed.
 */
export function canAccessEnvironment(
  requestingEnv: StandardEnvironment,
  targetEnv: StandardEnvironment,
): Result<Bool> {
  const requestingIdx: number = ENVIRONMENT_HIERARCHY.indexOf(requestingEnv);
  const targetIdx: number = ENVIRONMENT_HIERARCHY.indexOf(targetEnv);

  if (requestingIdx === -1 || targetIdx === -1) {
    return err(ERRORS.VALIDATION.INVALID_TYPE, {
      meta: { requestingEnv, targetEnv, message: 'Invalid environment' },
    });
  }

  // Higher index = less restricted. Can access same or more restricted (lower index).
  return okUnchecked(requestingIdx >= targetIdx);
}

/**
 * Detect the current environment from env vars and git branch.
 * Adapted from `_INTEGRATE/env-management/config/environments.ts`.
 *
 * Priority:
 * 1. `INFISICAL_ENV` env var (if valid `StandardEnvironment`)
 * 2. `NODE_ENV` env var (if valid `StandardEnvironment`)
 * 3. CI branch detection (`GITHUB_REF_NAME`, `GITHUB_HEAD_REF`, `CI_COMMIT_BRANCH`)
 * 4. Default: `'development'`
 *
 * @returns The detected `StandardEnvironment`.
 */
export function detectEnvironment(): StandardEnvironment {
  // Explicit environment variable takes precedence
  const infisicalEnv: Str = process.env.INFISICAL_ENV ?? '';
  const infisicalResult: Result<StandardEnvironment> = safeParse(
    StandardEnvironmentSchema,
    infisicalEnv,
  );
  if (infisicalResult.ok) {
    return infisicalResult.data;
  }

  const nodeEnv: Str = process.env.NODE_ENV ?? '';
  const nodeResult: Result<StandardEnvironment> = safeParse(StandardEnvironmentSchema, nodeEnv);
  if (nodeResult.ok) {
    return nodeResult.data;
  }

  // Check for CI environment — detect from branch
  if (process.env.CI === 'true') {
    const branch: Str =
      process.env.GITHUB_REF_NAME ??
      process.env.GITHUB_HEAD_REF ??
      process.env.CI_COMMIT_BRANCH ??
      '';
    if (branch) {
      return getEnvironmentFromBranch(branch);
    }
    return 'staging'; // Default CI to staging
  }

  // Default to development for local
  return 'development';
}

/**
 * Validate an environment string against `StandardEnvironmentSchema`.
 *
 * @param env - String to validate.
 * @returns `Result<StandardEnvironment>` — validated environment or error.
 */
export function validateEnvironment(env: Str): Result<StandardEnvironment> {
  return safeParse(StandardEnvironmentSchema, env);
}
