/**
 * Path Utilities
 *
 * Pure utilities for path manipulation and filesystem checks.
 * No CLI dependencies — suitable for use in any context.
 *
 * All functions return `Result<T>` — input is validated via
 * `safeParse`, Node API errors are caught and returned as structured results.
 * All type annotations use Valibot-inferred types from `@/schemas/common`.
 *
 * @module
 */

import {
  BoolSchema,
  PathArraySchema,
  PathSchema,
  StrSchema,
  UrlStringSchema,
  type Bool,
  type Path,
  type PathArray,
  type Str,
  type OptionalNodeProcess,
  type UrlString,
} from '@/schemas/common';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';
import { getProcess, requireRuntime } from '@/utils/core/environment';
import {
  type OptionalNodeFs,
  type OptionalNodeOs,
  type OptionalNodePath,
  type OptionalNodeUrl,
  nodeFs,
  nodeOs,
  nodePath,
  nodeUrl,
} from '@/utils/core/node-imports';
import { fromUnknownError, safeParse } from '@/utils/result/safe';

// =============================================================================
// Path Construction
// =============================================================================

/**
 * Get the current working directory.
 *
 * Wraps `process.cwd()` in a Result. Can fail if the working directory
 * has been deleted or is otherwise inaccessible.
 *
 * @returns {Result<Path>} `Result<Path>` — the current working directory path, or
 *          `IO.READ_FAILED` if the cwd is inaccessible.
 *
 * @example
 * ```typescript
 * const dir = cwd();
 * if (!dir.ok) return dir;
 * dir.data; // '/Users/coleb/project'
 * ```
 */
export function cwd(): Result<Path> {
  try {
    const proc: OptionalNodeProcess = getProcess();

    if (!proc || typeof proc.cwd !== 'function') {
      return requireRuntime('cwd', 'node');
    }
    return ok(PathSchema, proc.cwd());
  } catch (error: unknown) {
    return err(ERRORS.IO.READ_FAILED, {
      meta: { path: 'cwd' },
      cause: fromUnknownError(error),
    });
  }
}

/**
 * Join path segments into a single normalized path.
 *
 * Validates the segments array via `safeParse`, then delegates
 * to `path.join()`. Empty segments are valid and ignored by `path.join`.
 *
 * @param {PathArray} segments - Array of path segments to join.
 * @returns {Result<Path>} `Result<Path>` — the joined path, or
 *          `VALIDATION.SCHEMA_FAILED` on invalid input.
 *
 * @example
 * ```typescript
 * const full = joinPath(['/app', 'src', 'index.ts']);
 * if (!full.ok) return full;
 * full.data; // '/app/src/index.ts'
 * ```
 */
export function joinPath(segments: PathArray): Result<Path> {
  const path: OptionalNodePath = nodePath;

  if (!path) {
    return requireRuntime('joinPath', 'node');
  }

  const segmentsResult: Result<PathArray> = safeParse(PathArraySchema, segments);

  if (!segmentsResult.ok) {
    return segmentsResult;
  }

  return ok(PathSchema, path.join(...segmentsResult.data));
}

// =============================================================================
// Filesystem Checks
// =============================================================================

/**
 * Check if a path exists on the filesystem.
 *
 * Returns `ok(false)` when the path does not exist — this is expected
 * behavior, not an error. Only schema validation failure returns an
 * error Result.
 *
 * @param {Path} path - Path to check (must be non-empty).
 * @returns {Result<Bool>} `Result<Bool>` — `true` if the path exists, `false` otherwise,
 *          or `VALIDATION.SCHEMA_FAILED` on invalid input.
 *
 * @example
 * ```typescript
 * const exists = pathExists('/app/config.json');
 * if (!exists.ok) return exists;
 * if (exists.data) { // file exists }
 * ```
 */
export function pathExists(path: Path): Result<Bool> {
  const fs: OptionalNodeFs = nodeFs;

  if (!fs) {
    return requireRuntime('pathExists', 'node');
  }

  const pathResult: Result<Path> = safeParse(PathSchema, path);

  if (!pathResult.ok) {
    return pathResult;
  }

  return ok(BoolSchema, fs.existsSync(pathResult.data as unknown as string));
}

// =============================================================================
// URL / Module Resolution
// =============================================================================

/**
 * Get directory path from `import.meta.url` (ES module `__dirname` equivalent).
 *
 * Converts a `file://` URL to a filesystem path, then returns
 * the parent directory. Can fail if the URL is not a valid `file://` URL.
 *
 * @param {UrlString} importMetaUrl - The `import.meta.url` value (a `file://` URL).
 * @returns {Result<Path>} `Result<Path>` — the directory containing the module, or
 *          `VALIDATION.SCHEMA_FAILED` on invalid input, or
 *          `IO.READ_FAILED` if URL-to-path conversion fails.
 *
 * @example
 * ```typescript
 * const dir = getDirFromImportMeta(import.meta.url);
 * if (!dir.ok) return dir;
 * dir.data; // '/app/src'
 * ```
 */
export function getDirFromImportMeta(importMetaUrl: UrlString): Result<Path> {
  const pathMod: OptionalNodePath = nodePath;
  const url: OptionalNodeUrl = nodeUrl;

  if (!pathMod || !url) {
    return requireRuntime('getDirFromImportMeta', 'node');
  }

  const urlResult: Result<UrlString> = safeParse(UrlStringSchema, importMetaUrl);

  if (!urlResult.ok) {
    return urlResult;
  }

  try {
    return ok(PathSchema, pathMod.dirname(url.fileURLToPath(urlResult.data as unknown as string)));
  } catch (error: unknown) {
    return err(ERRORS.IO.READ_FAILED, {
      meta: { path: importMetaUrl },
      cause: fromUnknownError(error),
    });
  }
}

/**
 * Convert a file path to a `file://` URL string.
 *
 * @param {Path} path - File path to convert (must be non-empty).
 * @returns {Result<UrlString>} `Result<UrlString>` — the `file://` URL, or
 *          `VALIDATION.SCHEMA_FAILED` on invalid input.
 *
 * @example
 * ```typescript
 * const url = getFileUrl('/app/src/index.ts');
 * if (!url.ok) return url;
 * url.data; // 'file:///app/src/index.ts'
 * ```
 */
export function getFileUrl(path: Path): Result<UrlString> {
  const pathResult: Result<Path> = safeParse(PathSchema, path);

  if (!pathResult.ok) {
    return pathResult;
  }

  return ok(UrlStringSchema, `file://${pathResult.data}`);
}

// =============================================================================
// Path Conversion
// =============================================================================

/**
 * Convert an absolute path to a relative path from the current working directory.
 *
 * If the relative path would escape cwd (starts with `..`), returns the
 * original absolute path unchanged. Can fail if the cwd is inaccessible.
 *
 * @param {Path} absolutePath - Absolute file path (must be non-empty).
 * @returns {Result<Path>} `Result<Path>` — relative path from cwd, or the original absolute
 *          path if outside cwd, or `VALIDATION.SCHEMA_FAILED` on invalid input,
 *          or `IO.READ_FAILED` if cwd is inaccessible.
 *
 * @example
 * ```typescript
 * // cwd is '/app'
 * const rel = toRelativePath('/app/src/index.ts');
 * if (!rel.ok) return rel;
 * rel.data; // 'src/index.ts'
 * ```
 */
export function toRelativePath(absolutePath: Path): Result<Path> {
  const pathMod: OptionalNodePath = nodePath;

  if (!pathMod) {
    return requireRuntime('toRelativePath', 'node');
  }

  const pathResult: Result<Path> = safeParse(PathSchema, absolutePath);

  if (!pathResult.ok) {
    return pathResult;
  }

  const cwdResult: Result<Path> = cwd();

  if (!cwdResult.ok) {
    return cwdResult;
  }

  const relativeStr: Str = pathMod.relative(
    cwdResult.data as unknown as string,
    pathResult.data as unknown as string,
  );

  if (relativeStr.startsWith('..')) {
    return ok(PathSchema, pathResult.data as unknown as string);
  }

  if (!relativeStr) {
    return ok(PathSchema, pathResult.data as unknown as string);
  }

  const relativeResult: Result<Path> = safeParse(PathSchema, relativeStr as unknown as string);

  if (!relativeResult.ok) {
    return relativeResult;
  }

  return ok(PathSchema, relativeResult.data as unknown as string);
}

// =============================================================================
// Path Resolution
// =============================================================================

/**
 * Resolve path segments into an absolute path.
 *
 * Validates the segments array via `safeParse`, then delegates
 * to `path.resolve()`. If no segments are provided, resolves to cwd.
 *
 * @param {PathArray} segments - Array of path segments to resolve.
 * @returns {Result<Path>} `Result<Path>` — the resolved absolute path, or
 *          `VALIDATION.SCHEMA_FAILED` on invalid input.
 *
 * @example
 * ```typescript
 * const abs = resolvePath(['/app', 'src', 'index.ts']);
 * if (!abs.ok) return abs;
 * abs.data; // '/app/src/index.ts'
 * ```
 */
export function resolvePath(segments: PathArray): Result<Path> {
  const pathMod: OptionalNodePath = nodePath;

  if (!pathMod) {
    return requireRuntime('resolvePath', 'node');
  }

  const segmentsResult: Result<PathArray> = safeParse(PathArraySchema, segments);

  if (!segmentsResult.ok) {
    return segmentsResult;
  }

  return ok(PathSchema, pathMod.resolve(...segmentsResult.data));
}

// =============================================================================
// Path Extraction
// =============================================================================

/**
 * Get the file extension from a path (including the leading dot).
 *
 * Returns an empty string if the path has no extension.
 *
 * @param {Path} path - File path to extract the extension from (must be non-empty).
 * @returns {Result<Str>} `Result<Str>` — extension string (e.g., `'.ts'`), or empty string if none.
 *
 * @example
 * ```typescript
 * const ext = getFileExtension('/app/src/index.ts');
 * if (!ext.ok) return ext;
 * ext.data; // '.ts'
 * ```
 */
export function getFileExtension(path: Path): Result<Str> {
  const pathMod: OptionalNodePath = nodePath;

  if (!pathMod) {
    return requireRuntime('getFileExtension', 'node');
  }

  const pathResult: Result<Path> = safeParse(PathSchema, path);

  if (!pathResult.ok) {
    return pathResult;
  }

  return ok(StrSchema, pathMod.extname(pathResult.data as unknown as string));
}

/**
 * Get the basename (filename) of a path.
 *
 * Optionally strips a trailing extension suffix.
 *
 * @param {Path} path - File path to extract the basename from (must be non-empty).
 * @param {Str} ext - Optional extension to strip (e.g., `'.ts'`).
 * @returns {Result<Str>} `Result<Str>` — the basename, or `VALIDATION.SCHEMA_FAILED` on invalid input.
 *
 * @example
 * ```typescript
 * const name = getBasename('/app/src/index.ts' as Path);
 * if (!name.ok) return name;
 * name.data; // 'index.ts'
 *
 * const noExt = getBasename('/app/src/index.ts' as Path, '.ts' as Str);
 * if (!noExt.ok) return noExt;
 * noExt.data; // 'index'
 * ```
 */
export function getBasename(path: Path, ext?: Str): Result<Str> {
  const pathMod: OptionalNodePath = nodePath;

  if (!pathMod) {
    return requireRuntime('getBasename', 'node');
  }

  const pathResult: Result<Path> = safeParse(PathSchema, path);

  if (!pathResult.ok) {
    return pathResult;
  }

  if (ext !== undefined) {
    const extResult: Result<Str> = safeParse(StrSchema, ext);

    if (!extResult.ok) {
      return extResult;
    }
    return ok(
      StrSchema,
      pathMod.basename(pathResult.data as unknown as string, extResult.data as unknown as string),
    );
  }

  return ok(StrSchema, pathMod.basename(pathResult.data as unknown as string));
}

/**
 * Get the directory name of a path.
 *
 * @param {Path} path - File path to extract the directory from (must be non-empty).
 * @returns {Result<Path>} `Result<Path>` — the parent directory path, or
 *          `VALIDATION.SCHEMA_FAILED` on invalid input.
 *
 * @example
 * ```typescript
 * const dir = getDirname('/app/src/index.ts' as Path);
 * if (!dir.ok) return dir;
 * dir.data; // '/app/src'
 * ```
 */
export function getDirname(path: Path): Result<Path> {
  const pathMod: OptionalNodePath = nodePath;

  if (!pathMod) {
    return requireRuntime('getDirname', 'node');
  }

  const pathResult: Result<Path> = safeParse(PathSchema, path);

  if (!pathResult.ok) {
    return pathResult;
  }

  return ok(PathSchema, pathMod.dirname(pathResult.data as unknown as string));
}

// =============================================================================
// Temporary Directory & Home Directory
// =============================================================================

/**
 * Get the system temporary directory path.
 *
 * Wraps `os.tmpdir()` in a Result. Can fail if the temp directory
 * is inaccessible.
 *
 * @returns {Result<Path>} `Result<Path>` — the system temp directory path, or
 *          `IO.READ_FAILED` if the temp directory is inaccessible.
 *
 * @example
 * ```typescript
 * const tmp = getTempDir();
 * if (!tmp.ok) return tmp;
 * tmp.data; // '/tmp'
 * ```
 */
export function getTempDir(): Result<Path> {
  const os: OptionalNodeOs = nodeOs;

  if (!os) {
    return requireRuntime('getTempDir', 'node');
  }
  try {
    return ok(PathSchema, os.tmpdir());
  } catch (error: unknown) {
    return err(ERRORS.IO.READ_FAILED, {
      meta: { path: 'tmpdir' },
      cause: fromUnknownError(error),
    });
  }
}

/**
 * Get the current user's home directory.
 *
 * Wraps `os.homedir()` in a Result. Returns an error in non-Node
 * environments where the home directory is inaccessible.
 *
 * @returns {Result<Path>} `Result<Path>` — the home directory path, or
 *          `IO.READ_FAILED` if unavailable.
 *
 * @example
 * ```typescript
 * const home = getHomedir();
 * if (!home.ok) return home;
 * home.data; // '/Users/coleb'
 * ```
 */
export function getHomedir(): Result<Path> {
  const os: OptionalNodeOs = nodeOs;

  if (!os) {
    return requireRuntime('getHomedir', 'node');
  }
  try {
    return ok(PathSchema, os.homedir());
  } catch (error: unknown) {
    return err(ERRORS.IO.READ_FAILED, {
      meta: { path: 'homedir' },
      cause: fromUnknownError(error),
    });
  }
}
