/**
 * Environment Detection
 *
 * Git branch to StandardEnvironment detection and environment
 * hierarchy for Infisical secret inheritance.
 *
 * Hierarchy: production -> staging -> development.
 * Secrets flow down the hierarchy.
 *
 * @module
 */

import {
  BoolSchema,
  NumSchema,
  StrSchema,
  type Bool,
  type Num,
  type Str,
} from '@/schemas/common';
import {
  StandardEnvironmentSchema,
  type StandardEnvironment,
} from '@/schemas/core-config/environment';
import { ERRORS, err, ok, okUnchecked, type Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Constants
// =============================================================================

/**
 * Environment hierarchy (for secret inheritance).
 * Secrets flow down: production -> staging -> development.
 * Index 0 = most restricted, higher index = less restricted.
 */
export const ENVIRONMENT_HIERARCHY: readonly StandardEnvironment[] = [
  'production',
  'staging',
  'development',
];

/**
 * Default git branch to environment mapping.
 * Used when resist.config.ts tooling.infisical.environments.branchMapping
 * does not cover a branch.
 */
const DEFAULT_BRANCH_MAPPING: Readonly<Record<Str, StandardEnvironment>> = {
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
 * @param {Str} branch - Git branch name.
 * @returns {Result<StandardEnvironment>} The matching `StandardEnvironment` (defaults to `'development'`).
 *
 * @example
 * ```typescript
 * import { getEnvironmentFromBranch } from '@/secrets/infisical/environments';
 *
 * const result = getEnvironmentFromBranch('main');
 * if (result.ok) {
 *   console.log(result.data); // 'production'
 * }
 * ```
 */
export function getEnvironmentFromBranch(branch: Str): Result<StandardEnvironment> {
  const branchResult: Result<Str> = safeParse(StrSchema, branch);

  if (!branchResult.ok) return branchResult;

  // Check exact matches first
  if (branchResult.data in DEFAULT_BRANCH_MAPPING) {
    return ok(StandardEnvironmentSchema, DEFAULT_BRANCH_MAPPING[branchResult.data]!);
  }

  // Check pattern matches (prefix/*)
  for (const [pattern, env] of Object.entries(DEFAULT_BRANCH_MAPPING)) {
    if (pattern.endsWith('/*')) {
      const prefix: Str = pattern.slice(0, -2);

      if (branchResult.data.startsWith(`${prefix}/`)) {
        return ok(StandardEnvironmentSchema, env);
      }
    }
  }

  // Default to development
  return ok(StandardEnvironmentSchema, 'development');
}

/**
 * Get parent environment for secret inheritance.
 * production has no parent, staging inherits from production,
 * development inherits from staging.
 *
 * @param {StandardEnvironment} env - Current environment.
 * @returns {Result<StandardEnvironment | undefined>} Parent `StandardEnvironment`, or `undefined` for production.
 *
 * @example
 * ```typescript
 * import { getParentEnvironment } from '@/secrets/infisical/environments';
 *
 * const result = getParentEnvironment('development');
 * if (result.ok) {
 *   console.log(result.data); // 'staging'
 * }
 * ```
 */
export function getParentEnvironment(
  env: StandardEnvironment,
): Result<StandardEnvironment | undefined> {
  const envResult: Result<StandardEnvironment> = safeParse(StandardEnvironmentSchema, env);

  if (!envResult.ok) return envResult;

  const idx: Num = ENVIRONMENT_HIERARCHY.indexOf(envResult.data);

  if (idx <= 0) return okUnchecked(undefined);

  return okUnchecked(ENVIRONMENT_HIERARCHY[idx - 1]);
}

/**
 * Get child environments that inherit from a given environment.
 *
 * @param {StandardEnvironment} env - Parent environment.
 * @returns {Result<readonly StandardEnvironment[]>} Array of child `StandardEnvironment` values.
 *
 * @example
 * ```typescript
 * import { getChildEnvironments } from '@/secrets/infisical/environments';
 *
 * const result = getChildEnvironments('staging');
 * if (result.ok) {
 *   console.log(result.data); // ['development']
 * }
 * ```
 */
export function getChildEnvironments(
  env: StandardEnvironment,
): Result<readonly StandardEnvironment[]> {
  const envResult: Result<StandardEnvironment> = safeParse(StandardEnvironmentSchema, env);

  if (!envResult.ok) return envResult;

  const idx: Num = ENVIRONMENT_HIERARCHY.indexOf(envResult.data);

  if (idx === -1 || idx >= ENVIRONMENT_HIERARCHY.length - 1) {
    return okUnchecked([]);
  }

  return okUnchecked([ENVIRONMENT_HIERARCHY[idx + 1]!]);
}

/**
 * Check if an environment can access another's secrets (for inheritance).
 * An environment can access secrets from the same level or higher
 * (more restricted) in the hierarchy.
 *
 * @param {StandardEnvironment} requestingEnv - Environment requesting access.
 * @param {StandardEnvironment} targetEnv - Environment whose secrets are being accessed.
 * @returns {Result<Bool>} true if access is allowed.
 *
 * @example
 * ```typescript
 * import { canAccessEnvironment } from '@/secrets/infisical/environments';
 *
 * const result = canAccessEnvironment('development', 'staging');
 * if (result.ok) {
 *   console.log(result.data); // true
 * }
 * ```
 */
export function canAccessEnvironment(
  requestingEnv: StandardEnvironment,
  targetEnv: StandardEnvironment,
): Result<Bool> {
  const requestingEnvResult: Result<StandardEnvironment> = safeParse(
    StandardEnvironmentSchema,
    requestingEnv,
  );

  if (!requestingEnvResult.ok) return requestingEnvResult;

  const targetEnvResult: Result<StandardEnvironment> = safeParse(
    StandardEnvironmentSchema,
    targetEnv,
  );

  if (!targetEnvResult.ok) return targetEnvResult;

  const requestingIdx: Num = ENVIRONMENT_HIERARCHY.indexOf(requestingEnvResult.data);
  const targetIdx: Num = ENVIRONMENT_HIERARCHY.indexOf(targetEnvResult.data);

  if (requestingIdx === -1 || targetIdx === -1) {
    return err(ERRORS.VALIDATION.INVALID_TYPE, {
      meta: { requestingEnv, targetEnv, message: 'Invalid environment' },
    });
  }

  // Higher index = less restricted. Can access same or more restricted (lower index).
  return ok(BoolSchema, requestingIdx >= targetIdx);
}

/**
 * Detect the current environment from env vars and git branch.
 *
 * Priority:
 * 1. `INFISICAL_ENV` env var (if valid `StandardEnvironment`)
 * 2. `NODE_ENV` env var (if valid `StandardEnvironment`)
 * 3. CI branch detection (`GITHUB_REF_NAME`, `GITHUB_HEAD_REF`, `CI_COMMIT_BRANCH`)
 * 4. Default: `'development'`
 *
 * @returns {Result<StandardEnvironment>} The detected `StandardEnvironment`.
 *
 * @example
 * ```typescript
 * import { detectEnvironment } from '@/secrets/infisical/environments';
 *
 * const result = detectEnvironment();
 * if (result.ok) {
 *   console.log(result.data); // 'development'
 * }
 * ```
 */
export function detectEnvironment(): Result<StandardEnvironment> {
  // Explicit environment variable takes precedence
  const infisicalEnv: Str = process.env.INFISICAL_ENV ?? '';
  const infisicalResult: Result<StandardEnvironment> = safeParse(
    StandardEnvironmentSchema,
    infisicalEnv,
  );

  if (infisicalResult.ok) {
    return infisicalResult;
  }

  const nodeEnv: Str = process.env.NODE_ENV ?? '';
  const nodeResult: Result<StandardEnvironment> = safeParse(StandardEnvironmentSchema, nodeEnv);

  if (nodeResult.ok) {
    return nodeResult;
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

    return ok(StandardEnvironmentSchema, 'staging'); // Default CI to staging
  }

  // Default to development for local
  return ok(StandardEnvironmentSchema, 'development');
}

/**
 * Validate an environment string against `StandardEnvironmentSchema`.
 *
 * @param {Str} env - String to validate.
 * @returns {Result<StandardEnvironment>} Validated environment or error.
 *
 * @example
 * ```typescript
 * import { validateEnvironment } from '@/secrets/infisical/environments';
 *
 * const result = validateEnvironment('staging');
 * if (result.ok) {
 *   console.log(result.data); // 'staging'
 * }
 * ```
 */
export function validateEnvironment(env: Str): Result<StandardEnvironment> {
  return ok(StandardEnvironmentSchema, env);
}
