/**
 * Locale Validator
 *
 * Validates that locale files on disk match the locales declared
 * in resist.config.ts. Reports missing and orphaned locale files.
 *
 * @module
 */

import { globSync } from 'glob';
import * as v from 'valibot';

import type { BuiltSyncStrings } from '@/cli/tools/sync/locales/schema';
import {
  PathArraySchema,
  PathSchema,
  StrArraySchema,
  type Bool,
  type Path,
  type PathArray,
  type Str,
  type StrArray,
} from '@/schemas/common';
import { ERRORS, type Result, err, ok, okUnchecked } from '@/schemas/result/result';
import { readDir } from '@/utils/core/fs';
import { getBasename, joinPath, pathExists } from '@/utils/core/path';
import { fromUnknownError, safeParse } from '@/utils/result/safe';

// =============================================================================
// Schemas
// =============================================================================

/** Schema for a single locale discrepancy (missing or orphaned). */
const LocaleDiscrepancySchema = v.strictObject({
  /** The locale code (e.g., 'es', 'fr'). */
  locale: v.string(),
  /** The directory where the discrepancy was found. */
  directory: v.string(),
});

/** A single locale discrepancy (missing or orphaned). */
type LocaleDiscrepancy = v.InferOutput<typeof LocaleDiscrepancySchema>;

/** Schema for the locale validation result. */
const LocaleValidationResultSchema = v.strictObject({
  /** Locales declared in config but missing locale files on disk. */
  missing: v.array(LocaleDiscrepancySchema),
  /** Locale files on disk not declared in config. */
  orphaned: v.array(LocaleDiscrepancySchema),
});

/** Result of locale validation. */
export type LocaleValidationResult = v.InferOutput<typeof LocaleValidationResultSchema>;

// =============================================================================
// Core Logic
// =============================================================================

/**
 * List locale codes from .ts files in a directory.
 * Strips the .ts extension to get locale codes (e.g., 'en.ts' → 'en').
 *
 * @param directory - Absolute path to the locale directory.
 * @returns `Result<StrArray>` — locale codes found in the directory, or an error.
 */
function listLocaleCodes(directory: Path): Result<StrArray> {
  const existsResult: Result<Bool> = pathExists(directory);
  if (!existsResult.ok) return existsResult;

  if (!existsResult.data) {
    return ok(StrArraySchema, []);
  }

  const entriesResult: Result<StrArray> = readDir(directory);
  if (!entriesResult.ok) return entriesResult;

  const codes: StrArray = entriesResult.data
    .filter((file: Str) => file.endsWith('.ts') && !file.startsWith('_'))
    .map((file: Str) => {
      const filePathResult: Result<Path> = safeParse(PathSchema, file);
      const baseResult: Result<Str> = filePathResult.ok
        ? getBasename(filePathResult.data)
        : okUnchecked(file);
      const base: Str = baseResult.ok ? baseResult.data : file;
      return base.endsWith('.ts') ? base.slice(0, -3) : base;
    });

  return ok(StrArraySchema, codes);
}

/**
 * Discover all locale directories under the CLI source tree.
 * Finds `locale/locales/` (framework) and ...
 * directories containing translatable locale files.
 *
 * @param cliSrcRoot - Absolute path to the CLI src/ directory.
 * @param strings - Locale strings for error messages.
 * @returns — absolute paths to locale directories, or an error.
 */
function discoverLocaleDirectories(cliSrcRoot: Path, strings: BuiltSyncStrings): Result<PathArray> {
  const directories: PathArray = [];

  // CLI framework locales
  const frameworkDirResult: Result<Path> = joinPath([cliSrcRoot, 'locale/locales']);
  if (!frameworkDirResult.ok) return frameworkDirResult;

  const frameworkExistsResult: Result<Bool> = pathExists(frameworkDirResult.data);
  if (!frameworkExistsResult.ok) return frameworkExistsResult;

  if (frameworkExistsResult.data) {
    directories.push(frameworkDirResult.data);
  }

  // Tool locales — glob for tools/*/locales/locales/
  let toolDirs: PathArray;
  try {
    toolDirs = globSync('tools/*/locales/locales', { cwd: cliSrcRoot });
  } catch (e: unknown) {
    return err(ERRORS.IO.READDIR_FAILED, {
      meta: { operation: 'glob_locale_dirs' },
      cause: fromUnknownError(e),
    });
  }

  for (const dir of toolDirs) {
    const absoluteResult: Result<Path> = joinPath([cliSrcRoot, dir]);
    if (!absoluteResult.ok) return absoluteResult;
    directories.push(absoluteResult.data);
  }

  return ok(PathArraySchema, directories);
}

/**
 * Validate locale files against the configured locales.
 *
 * @param configLocales - Locales declared in resist.config.ts (e.g., ['en', 'es']).
 * @param cliSrcRoot - Absolute path to the CLI src/ directory.
 * @param strings - Locale strings for error messages.
 * @returns — missing and orphaned locale discrepancies, or an error.
 */
export function validateLocaleFiles(
  configLocales: readonly Str[],
  cliSrcRoot: Path,
  strings: BuiltSyncStrings,
): Result<LocaleValidationResult> {
  const directoriesResult: Result<PathArray> = discoverLocaleDirectories(cliSrcRoot, strings);
  if (!directoriesResult.ok) return directoriesResult;
  const directories: PathArray = directoriesResult.data;

  const configSet: Set<Str> = new Set<Str>(configLocales);

  const missing: LocaleDiscrepancy[] = [];
  const orphaned: LocaleDiscrepancy[] = [];

  for (const directory of directories) {
    const fileCodesResult: Result<StrArray> = listLocaleCodes(directory);
    if (!fileCodesResult.ok) return fileCodesResult;
    const fileCodes: StrArray = fileCodesResult.data;
    const fileSet: Set<Str> = new Set<Str>(fileCodes);

    // Missing: in config but no file on disk
    for (const locale of configLocales) {
      if (!fileSet.has(locale)) {
        missing.push({ locale, directory });
      }
    }

    // Orphaned: file on disk but not in config
    for (const locale of fileCodes) {
      if (!configSet.has(locale)) {
        orphaned.push({ locale, directory });
      }
    }
  }

  return okUnchecked<LocaleValidationResult>({ missing, orphaned });
}
