/**
 * Git Metadata Utilities
 *
 * Type-safe, Result-safe wrappers around git commands for build-time metadata.
 * No CLI dependencies — suitable for use in any context.
 *
 * All functions return `Result<T>` — input is validated via
 * `safeParse`, command errors are caught and returned as structured errors.
 * All type annotations use Valibot-inferred types from `@/schemas/common`.
 *
 * @module
 *
 * @example
 * ```typescript
 * import { getGitInfo } from '@/utils/core/git';
 * const result = getGitInfo();
 * if (result.ok) console.log(result.data.commit);
 * ```
 */

import * as v from 'valibot';
import { PathSchema, type Str, type Bool, type Path, type Command } from '@/schemas/common';
import { ok, err, ERRORS, type Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';
import { execSyncSafe } from '@/utils/core/shell';
import { readFile, parseJsonWithComments } from '@/utils/core/fs';
import { joinPath } from '@/utils/core/path';

// =============================================================================
// Individual Git Queries
// =============================================================================

/**
 * Get the short git commit hash (7 characters).
 *
 * Runs `git rev-parse --short HEAD` and validates the output length.
 *
 * @returns {Result<Str>} 7-character commit hash, or an error if the
 *          command or validation fails.
 *
 * @example
 * ```typescript
 * const result = getGitCommitShort();
 * if (result.ok) result.data; // 'a1b2c3d'
 * ```
 */
export function getGitCommitShort(): Result<Str> {
  // cast safe: string literal is a valid non-empty command
  const result: Result<Str> = execSyncSafe('git rev-parse --short HEAD' as Command);
  if (!result.ok) return result;
  return ok(v.pipe(v.string(), v.minLength(7), v.maxLength(12)), result.data.trim());
}

/**
 * Get the full git commit hash (40 characters).
 *
 * Runs `git rev-parse HEAD` and validates the output length.
 *
 * @returns {Result<Str>} 40-character commit hash, or an error if the
 *          command or validation fails.
 *
 * @example
 * ```typescript
 * const result = getGitCommitFull();
 * if (result.ok) result.data; // 'abc1234def5678901234567890abcdef12345678'
 * ```
 */
export function getGitCommitFull(): Result<Str> {
  // cast safe: string literal is a valid non-empty command
  const result: Result<Str> = execSyncSafe('git rev-parse HEAD' as Command);
  if (!result.ok) return result;
  return ok(v.pipe(v.string(), v.length(40)), result.data.trim());
}

/**
 * Get the current git branch name.
 *
 * Runs `git rev-parse --abbrev-ref HEAD` and validates the output
 * is a non-empty string.
 *
 * @returns {Result<Str>} Branch name (e.g. `'main'`), or an error if
 *          the command or validation fails.
 *
 * @example
 * ```typescript
 * const result = getGitBranch();
 * if (result.ok) result.data; // 'main'
 * ```
 */
export function getGitBranch(): Result<Str> {
  // cast safe: string literal is a valid non-empty command
  const result: Result<Str> = execSyncSafe('git rev-parse --abbrev-ref HEAD' as Command);
  if (!result.ok) return result;
  return ok(v.pipe(v.string(), v.minLength(1), v.maxLength(255)), result.data.trim());
}

/**
 * Check if the git working tree has uncommitted changes.
 *
 * Runs `git status --porcelain` — empty output means clean, non-empty means dirty.
 *
 * @returns {Result<Bool>} `true` if dirty (uncommitted changes), `false` if clean,
 *          or an error if the command fails.
 *
 * @example
 * ```typescript
 * const result = getGitDirty();
 * if (result.ok && result.data) console.log('Working tree is dirty');
 * ```
 */
export function getGitDirty(): Result<Bool> {
  // cast safe: string literal is a valid non-empty command
  const result: Result<Str> = execSyncSafe('git status --porcelain' as Command);
  if (!result.ok) return result;
  const isDirty: Bool = result.data.trim().length > 0;
  return ok(v.boolean(), isDirty);
}

// =============================================================================
// Combined Git Info
// =============================================================================

/** Schema for git metadata used in build-time injection. */
export const GitInfoSchema = v.strictObject({
  /** Short commit hash (7 characters). */
  commit: v.pipe(v.string(), v.length(7)),
  /** Full commit hash (40 characters). */
  commitFull: v.pipe(v.string(), v.length(40)),
  /** Current branch name. */
  branch: v.pipe(v.string(), v.minLength(1), v.maxLength(255)),
  /** Whether the working tree has uncommitted changes. */
  dirty: v.boolean(),
});

/** Git metadata for build-time injection. See {@link GitInfoSchema}. */
export type GitInfo = v.InferOutput<typeof GitInfoSchema>;

/**
 * Reads all git metadata for build-time injection.
 *
 * Calls {@link getGitCommitShort}, {@link getGitCommitFull},
 * {@link getGitBranch}, and {@link getGitDirty}, then validates the
 * combined result against {@link GitInfoSchema}.
 *
 * @returns {Result<GitInfo>} Commit (short + full), branch name, and dirty flag,
 *          or the first error encountered.
 *
 * @example
 * ```typescript
 * const result = getGitInfo();
 * if (!result.ok) return result;
 * console.log(result.data.commit);  // 'a1b2c3d'
 * console.log(result.data.branch);  // 'main'
 * console.log(result.data.dirty);   // false
 * ```
 */
export function getGitInfo(): Result<GitInfo> {
  const commitResult: Result<Str> = getGitCommitShort();
  if (!commitResult.ok) return commitResult;

  const fullResult: Result<Str> = getGitCommitFull();
  if (!fullResult.ok) return fullResult;

  const branchResult: Result<Str> = getGitBranch();
  if (!branchResult.ok) return branchResult;

  const dirtyResult: Result<Bool> = getGitDirty();
  if (!dirtyResult.ok) return dirtyResult;

  return ok(GitInfoSchema, {
    commit: commitResult.data,
    commitFull: fullResult.data,
    branch: branchResult.data,
    dirty: dirtyResult.data,
  });
}

// =============================================================================
// Package Version
// =============================================================================

/**
 * Reads the package version from a `package.json` file.
 *
 * Reads the file via {@link readFile}, parses it with
 * {@link parseJsonWithComments}, and extracts the `version` field.
 *
 * @param {Path} packageJsonPath - Absolute or relative path to `package.json`.
 * @returns {Result<Str>} The version string, or an error if the file
 *          cannot be read, parsed, or has no valid version field.
 *
 * @example
 * ```typescript
 * const result = getPackageVersion('./package.json' as Path);
 * if (result.ok) result.data; // '1.2.3'
 * ```
 */
export function getPackageVersion(packageJsonPath: Path): Result<Str> {
  const pathResult: Result<Path> = safeParse(PathSchema, packageJsonPath);
  if (!pathResult.ok) return pathResult;

  const fileResult: Result<Str> = readFile(pathResult.data);
  if (!fileResult.ok) return fileResult;

  const parsed: Result<Record<Str, unknown>> = parseJsonWithComments<Record<Str, unknown>>(
    fileResult.data,
  );
  if (!parsed.ok) return parsed;

  const { version }: Record<Str, unknown> = parsed.data;
  if (typeof version !== 'string' || version.length === 0) {
    return err(ERRORS.CONFIG.INVALID, { meta: { field: 'version', file: pathResult.data } });
  }
  return ok(v.string(), version);
}
