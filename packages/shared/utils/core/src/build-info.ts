/**
 * Build-time metadata accessor.
 *
 * Reads Vite `define` constants injected at compile time and validates
 * them against the BuildInfo schema. Returns `Result<BuildInfo>`.
 *
 * @module
 */

import { safeParse } from '@/utils/result/safe';
import { BuildInfoSchema, type BuildInfo } from './build-info-schema';
import type { Result } from '@/schemas/result/result';

/**
 * Returns validated build-time metadata from Vite `define` constants.
 *
 * @returns Result containing build version, git commit, branch, dirty flag, and build timestamp
 *
 * @example
 * ```typescript
 * import { getBuildInfo } from '@/utils/core/build-info';
 *
 * const result = getBuildInfo();
 * if (result.ok) {
 *   console.log(result.data.version); // '0.0.0'
 *   console.log(result.data.commit);  // 'abc1234'
 * }
 * ```
 */
export function getBuildInfo(): Result<BuildInfo> {
  return safeParse(BuildInfoSchema, {
    version: __APP_VERSION__,
    commit: __GIT_COMMIT__,
    commitFull: __GIT_COMMIT_FULL__,
    branch: __GIT_BRANCH__,
    dirty: __GIT_DIRTY__,
    buildTimestamp: __BUILD_TIMESTAMP__,
  });
}
