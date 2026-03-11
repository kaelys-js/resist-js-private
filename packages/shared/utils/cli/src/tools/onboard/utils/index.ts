/**
 * Onboarding Utilities
 *
 * Marker file management and onboarding state detection.
 * Used by the onboard tool and by other tools to gate on onboarding completion.
 *
 * All functions return `Result<T>`. No function throws.
 *
 * @module
 */

import * as v from 'valibot';

import { OnboardingMarkerSchema, type OnboardingMarker } from '@/cli/schemas';
import type { BuiltOnboardStrings } from '@/cli/tools/onboard/locales/schema';
import { getConfig } from '@/config/loader';
import {
  BoolSchema,
  PathSchema,
  SemverSchema,
  StrArraySchema,
  StrSchema,
  VoidSchema,
  type Bool,
  type OptionalStr,
  type Path,
  type Semver,
  type Str,
  type StrArray,
  type Void,
} from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import { ERRORS, type Result, err, ok, okUnchecked } from '@/schemas/result/result';
import { mkdirRecursive, parseJsonWithComments, readFile, writeFile } from '@/utils/core/fs';
import { safeStringify, type DeepReadonly } from '@/utils/core/object';
import { joinPath, pathExists } from '@/utils/core/path';
import { getEnvVar } from '@/utils/core/process';
import { findWorkspaceRoot } from '@/utils/core/workspace';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Local Type Aliases
// =============================================================================

/** Schema for nullable onboarding marker. */
const NullableOnboardingMarkerSchema = v.nullable(OnboardingMarkerSchema);

/** @see {@link NullableOnboardingMarkerSchema} */
type NullableOnboardingMarker = v.InferOutput<typeof NullableOnboardingMarkerSchema>;

const MARKER_FILE = '.onboarded';

/**
 * Get the marker directory from config or use default.
 *
 * @returns `Result<Str>` — marker directory name, or a config error.
 */
function getMarkerDir(): Result<Str> {
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;
  // Schema has v.optional(v.string(), '.resist') — default always applied after validation
  const dir: Path = configResult.data.tooling.paths.markerDir;
  return ok(StrSchema, dir);
}

/** Environment variable set during onboarding to allow nested tool calls. */
export const ONBOARDING_ENV_VAR = 'RESIST_ONBOARDING';

/**
 * Get the path to the onboarding marker file.
 *
 * @returns `Result<Path>` — absolute path to `{markerDir}/.onboarded`, or an error.
 */
export function getMarkerPath(): Result<Path> {
  const rootResult: Result<Path> = findWorkspaceRoot();
  if (!rootResult.ok) return rootResult;
  const markerDirResult: Result<Str> = getMarkerDir();
  if (!markerDirResult.ok) return markerDirResult;
  const pathResult: Result<Path> = joinPath([rootResult.data, markerDirResult.data, MARKER_FILE]);
  if (!pathResult.ok) return pathResult;
  return ok(PathSchema, pathResult.data);
}

/**
 * Check if onboarding has been completed.
 *
 * @returns `Result<Bool>` — `true` if the marker file exists, or an error.
 */
export function isOnboarded(): Result<Bool> {
  const markerPathResult: Result<Path> = getMarkerPath();
  if (!markerPathResult.ok) return markerPathResult;
  const existsResult: Result<Bool> = pathExists(markerPathResult.data);
  if (!existsResult.ok) return existsResult;
  return ok(BoolSchema, existsResult.data);
}

/**
 * Check if onboarding is currently in progress.
 *
 * This is determined by the `RESIST_ONBOARDING` environment variable,
 * which is set by the onboard tool when running steps.
 *
 * @returns `Result<Bool>` — `true` if running as part of onboarding, or a validation error.
 */
export function isOnboardingInProgress(): Result<Bool> {
  const envResult: Result<OptionalStr> = getEnvVar(ONBOARDING_ENV_VAR);
  if (!envResult.ok) return envResult;
  return ok(BoolSchema, envResult.data === '1');
}

/**
 * Write the onboarding marker file after successful completion.
 *
 * @param steps - The steps that were executed during onboarding.
 * @param version - The CLI version that ran onboarding.
 * @returns `Result<Void>` — success, or an error if writing fails.
 */
export function writeOnboardingMarker(steps: StrArray, version: Semver): Result<Void> {
  const stepsResult: Result<StrArray> = safeParse(StrArraySchema, steps);
  if (!stepsResult.ok) return stepsResult;
  const versionResult: Result<Semver> = safeParse(SemverSchema, version);
  if (!versionResult.ok) return versionResult;

  const rootResult: Result<Path> = findWorkspaceRoot();
  if (!rootResult.ok) return rootResult;

  const markerDirResult: Result<Str> = getMarkerDir();
  if (!markerDirResult.ok) return markerDirResult;

  const markerDirPath: Result<Path> = joinPath([rootResult.data, markerDirResult.data]);
  if (!markerDirPath.ok) return markerDirPath;

  const existsResult: Result<Bool> = pathExists(markerDirPath.data);
  if (!existsResult.ok) return existsResult;
  if (!existsResult.data) {
    const mkdirResult: Result<Void> = mkdirRecursive(markerDirPath.data);
    if (!mkdirResult.ok) return mkdirResult;
  }

  const marker: OnboardingMarker = {
    completedAt: new Date().toISOString(),
    version: versionResult.data,
    steps: stepsResult.data,
  };

  const markerPathResult: Result<Path> = getMarkerPath();
  if (!markerPathResult.ok) return markerPathResult;

  const markerJson: Result<Str> = safeStringify(marker, '\t');
  if (!markerJson.ok) return markerJson;
  const writeResult: Result<Void> = writeFile(markerPathResult.data, markerJson.data);
  if (!writeResult.ok) return writeResult;

  return ok(VoidSchema, undefined);
}

/**
 * Read the onboarding marker file.
 *
 * @param strings - Locale strings for error messages.
 * @returns `Result<NullableOnboardingMarker>` — the marker data, or `null` if not found, or an error.
 */
export function readOnboardingMarker(
  strings: BuiltOnboardStrings,
): Result<NullableOnboardingMarker> {
  const markerPathResult: Result<Path> = getMarkerPath();
  if (!markerPathResult.ok) return markerPathResult;

  // File-not-found is legitimate (onboarding not completed) → return null
  const existsResult: Result<Bool> = pathExists(markerPathResult.data);
  if (!existsResult.ok) return existsResult;
  if (!existsResult.data) {
    return okUnchecked(null);
  }

  const contentResult: Result<Str> = readFile(markerPathResult.data);
  if (!contentResult.ok) return contentResult;

  const parsedResult: Result<unknown> = parseJsonWithComments(contentResult.data);
  if (!parsedResult.ok) {
    return err(ERRORS.VALIDATION.INVALID_FORMAT, {
      meta: { reason: 'Malformed onboarding marker file' },
      cause: parsedResult.error,
    });
  }

  const validateResult: Result<OnboardingMarker> = safeParse(
    OnboardingMarkerSchema,
    parsedResult.data,
  );
  if (!validateResult.ok) {
    return err(ERRORS.VALIDATION.SCHEMA_FAILED, {
      meta: { reason: 'Invalid onboarding marker schema' },
      cause: validateResult.error,
    });
  }

  return okUnchecked(validateResult.data);
}
