/**
 * File System Utilities
 *
 * General-purpose file system manipulation utilities.
 * No CLI dependencies — suitable for use in any context.
 *
 * All functions return `Result<T>` — input is validated via
 * `safeParse`, I/O errors are caught and returned as structured errors.
 * All type annotations use Valibot-inferred types from `@/schemas/common`.
 *
 * @module
 */

import {
  BoolSchema,
  NonNegativeNumberSchema,
  PathSchema,
  StrArraySchema,
  VoidSchema,
  type Bool,
  type NonNegativeNumber,
  type Path,
  type Str,
  type StrArray,
  type Void,
} from '@/schemas/common';
import { ERRORS, err, ok, okUnchecked, type Result } from '@/schemas/result/result';
import { requireRuntime } from '@/utils/core/environment';
import {
  type OptionalNodeFs,
  type OptionalNodePath,
  nodeFs,
  nodePath,
} from '@/utils/core/node-imports';
import { fromUnknownError, safeParse } from '@/utils/result/safe';

import {
  DEFAULT_FILE_ENCODING,
  FileContentSchema,
  FileEncodingSchema,
  type FileContent,
  type FileEncoding,
} from './fs.schemas';

// =============================================================================
// File I/O
// =============================================================================

/**
 * Read file contents as a string.
 *
 * Validates the path and encoding via `safeParse`, then reads the file
 * with `fs.readFileSync`.
 *
 * @param path - Absolute or relative file path (must be non-empty).
 * @param encoding - File encoding. Defaults to `'utf-8'`.
 * @returns `Result<FileContent>` — file contents on success, or `VALIDATION.SCHEMA_FAILED` / `IO.READ_FAILED` on error.
 *
 * @example
 * ```typescript
 * const file = readFile('/app/config.json');
 * if (!file.ok) return file;
 * file.data;
 * ```
 */
export function readFile(
  path: Path,
  encoding: FileEncoding = DEFAULT_FILE_ENCODING,
): Result<FileContent> {
  const fs: OptionalNodeFs = nodeFs;
  if (!fs) return requireRuntime('readFile', 'node');
  const pathResult: Result<Path> = safeParse(PathSchema, path);
  if (!pathResult.ok) return pathResult;

  const encResult: Result<FileEncoding> = safeParse(FileEncodingSchema, encoding);
  if (!encResult.ok) return encResult;

  try {
    const content: FileContent = fs.readFileSync(pathResult.data, { encoding });
    return ok(FileContentSchema, content);
  } catch (e: unknown) {
    return err(ERRORS.IO.READ_FAILED, {
      meta: { path },
      cause: fromUnknownError(e),
    });
  }
}

/**
 * Write content to a file.
 *
 * Validates the path, content, and encoding via `safeParse`, then writes
 * with `fs.writeFileSync`.
 *
 * @param path - Absolute or relative file path (must be non-empty).
 * @param content - String content to write.
 * @param encoding - File encoding. Defaults to `'utf-8'`.
 * @returns `Result<Void>` — success, or `VALIDATION.SCHEMA_FAILED` / `IO.WRITE_FAILED` on error.
 *
 * @example
 * ```typescript
 * const written = writeFile('/app/output.json', JSON.stringify(data));
 * if (!written.ok) return written;
 * ```
 */
export function writeFile(
  path: Path,
  content: FileContent,
  encoding: FileEncoding = DEFAULT_FILE_ENCODING,
): Result<Void> {
  const fs: OptionalNodeFs = nodeFs;
  if (!fs) return requireRuntime('writeFile', 'node');
  const pathResult: Result<Path> = safeParse(PathSchema, path);
  if (!pathResult.ok) return pathResult;

  const contentResult: Result<FileContent> = safeParse(FileContentSchema, content);
  if (!contentResult.ok) return contentResult;

  const encResult: Result<FileEncoding> = safeParse(FileEncodingSchema, encoding);
  if (!encResult.ok) return encResult;

  try {
    fs.writeFileSync(pathResult.data, contentResult.data, { encoding });
    return ok(VoidSchema, undefined);
  } catch (e: unknown) {
    return err(ERRORS.IO.WRITE_FAILED, {
      meta: { path },
      cause: fromUnknownError(e),
    });
  }
}

/**
 * Delete a file from the filesystem.
 *
 * Validates the path via `safeParse`, then deletes with `fs.unlinkSync`.
 * Returns `ok(undefined)` on success, even if the file didn't exist
 * (idempotent delete). Only returns an error for actual I/O failures.
 *
 * @param path - Absolute or relative file path (must be non-empty).
 * @returns `Result<Void>` — success, or `VALIDATION.SCHEMA_FAILED` / `IO.DELETE_FAILED` on error.
 *
 * @example
 * ```typescript
 * const deleted = deleteFile('/app/temp/output.json');
 * if (!deleted.ok) return deleted;
 * ```
 */
export function deleteFile(path: Path): Result<Void> {
  const fs: OptionalNodeFs = nodeFs;
  if (!fs) return requireRuntime('deleteFile', 'node');
  const pathResult: Result<Path> = safeParse(PathSchema, path);
  if (!pathResult.ok) return pathResult;

  try {
    fs.unlinkSync(pathResult.data);
    return ok(VoidSchema, undefined);
  } catch (e: unknown) {
    // ENOENT = file doesn't exist — idempotent, not an error
    if (e instanceof Error && 'code' in e && e.code === 'ENOENT') {
      return ok(VoidSchema, undefined);
    }
    return err(ERRORS.IO.DELETE_FAILED, {
      meta: { path },
      cause: fromUnknownError(e),
    });
  }
}

// =============================================================================
// Directories
// =============================================================================

/**
 * Create a directory and all parent directories.
 *
 * @param path - Directory path to create (must be non-empty).
 * @returns `Result<Void>` — success, or `VALIDATION.SCHEMA_FAILED` / `IO.MKDIR_FAILED` on error.
 *
 * @example
 * ```typescript
 * const dir = mkdirRecursive('/app/data/cache');
 * if (!dir.ok) return dir;
 * ```
 */
export function mkdirRecursive(path: Path): Result<Void> {
  const fs: OptionalNodeFs = nodeFs;
  if (!fs) return requireRuntime('mkdirRecursive', 'node');
  const pathResult: Result<Path> = safeParse(PathSchema, path);
  if (!pathResult.ok) return pathResult;

  try {
    fs.mkdirSync(pathResult.data, { recursive: true });
    return ok(VoidSchema, undefined);
  } catch (e: unknown) {
    return err(ERRORS.IO.MKDIR_FAILED, {
      meta: { path },
      cause: fromUnknownError(e),
    });
  }
}

/**
 * Ensure a directory exists, creating it if necessary.
 * If the path looks like a file (has an extension), creates the parent directory.
 *
 * @param path - Directory or file path (must be non-empty).
 * @returns `Result<Void>` — success, or `VALIDATION.SCHEMA_FAILED` / `IO.MKDIR_FAILED` on error.
 *
 * @example
 * ```typescript
 * const dir = ensureDir('/app/data/output.json');
 * if (!dir.ok) return dir;
 * // Created /app/data/ (parent of file path)
 * ```
 */
export function ensureDir(path: Path): Result<Void> {
  const fs: OptionalNodeFs = nodeFs;
  const pathMod: OptionalNodePath = nodePath;
  if (!fs || !pathMod) return requireRuntime('ensureDir', 'node');
  const pathResult: Result<Path> = safeParse(PathSchema, path);
  if (!pathResult.ok) return pathResult;

  const isLikelyFile: Bool = /\.[^/\\]+$/.test(pathResult.data);

  let dirPath: Path;
  if (isLikelyFile) {
    const dirResult: Result<Path> = safeParse(PathSchema, pathMod.dirname(pathResult.data));
    if (!dirResult.ok) return dirResult;
    dirPath = dirResult.data;
  } else {
    dirPath = pathResult.data;
  }

  try {
    fs.mkdirSync(dirPath, { recursive: true });
    return ok(VoidSchema, undefined);
  } catch (e: unknown) {
    return err(ERRORS.IO.MKDIR_FAILED, {
      meta: { path: dirPath, originalPath: path },
      cause: fromUnknownError(e),
    });
  }
}

/**
 * Copy a directory recursively.
 *
 * @param src - Source directory path (must be non-empty).
 * @param dest - Destination directory path (must be non-empty).
 * @returns `Result<Void>` — success, or `VALIDATION.SCHEMA_FAILED` / `IO.COPY_FAILED` on error.
 *
 * @example
 * ```typescript
 * const copied = copyDir('/app/template', '/app/new-project');
 * if (!copied.ok) return copied;
 * ```
 */
export function copyDir(src: Path, dest: Path): Result<Void> {
  const fs: OptionalNodeFs = nodeFs;
  if (!fs) return requireRuntime('copyDir', 'node');
  const srcResult: Result<Path> = safeParse(PathSchema, src);
  if (!srcResult.ok) return srcResult;

  const destResult: Result<Path> = safeParse(PathSchema, dest);
  if (!destResult.ok) return destResult;

  try {
    fs.cpSync(srcResult.data, destResult.data, { recursive: true });
    return ok(VoidSchema, undefined);
  } catch (e: unknown) {
    return err(ERRORS.IO.COPY_FAILED, {
      meta: { src, dest },
      cause: fromUnknownError(e),
    });
  }
}

/**
 * Read directory contents.
 *
 * @param path - Directory path to read (must be non-empty).
 * @returns `Result<StrArray>` — array of filenames, or `VALIDATION.SCHEMA_FAILED` / `IO.READDIR_FAILED` on error.
 *
 * @example
 * ```typescript
 * const entries = readDir('/app/src');
 * if (!entries.ok) return entries;
 * for (const name of entries.data) { ... }
 * ```
 */
export function readDir(path: Path): Result<StrArray> {
  const fs: OptionalNodeFs = nodeFs;
  if (!fs) return requireRuntime('readDir', 'node');
  const pathResult: Result<Path> = safeParse(PathSchema, path);
  if (!pathResult.ok) return pathResult;

  try {
    const entries: StrArray = fs.readdirSync(pathResult.data, { encoding: 'utf-8' });
    const entriesResult: Result<StrArray> = safeParse(StrArraySchema, entries);
    if (!entriesResult.ok) return entriesResult;
    return entriesResult;
  } catch (e: unknown) {
    return err(ERRORS.IO.READDIR_FAILED, {
      meta: { path },
      cause: fromUnknownError(e),
    });
  }
}

/**
 * Check if a path is a directory.
 *
 * Returns `ok(false)` when the path does not exist or is not a directory —
 * this is expected behavior, not an error. Only schema validation failure
 * returns an error Result.
 *
 * @param path - Path to check (must be non-empty).
 * @returns `Result<Bool>` — `true` if directory, `false` otherwise.
 *
 * @example
 * ```typescript
 * const check = isDirectory('/app/src');
 * if (!check.ok) return check;
 * if (check.data) { ... }
 * ```
 */
export function isDirectory(path: Path): Result<Bool> {
  const fs: OptionalNodeFs = nodeFs;
  if (!fs) return requireRuntime('isDirectory', 'node');
  const pathResult: Result<Path> = safeParse(PathSchema, path);
  if (!pathResult.ok) return pathResult;

  try {
    const result: Bool = fs.statSync(pathResult.data).isDirectory();
    return ok(BoolSchema, result);
  } catch {
    // File doesn't exist or isn't accessible — treat as "not a directory"
    return ok(BoolSchema, false);
  }
}

/**
 * Get a file's last modification time in milliseconds.
 *
 * Returns `Result<NonNegativeNumber>` with the `mtimeMs` value.
 * If the file doesn't exist or is inaccessible, returns an error Result.
 *
 * @param path - Absolute or relative file path (must be non-empty).
 * @returns `Result<NonNegativeNumber>` — modification timestamp in ms.
 *
 * @example
 * ```typescript
 * const mtime = getFileMtimeMs('/app/src/file.ts');
 * if (!mtime.ok) return mtime;
 * mtime.data; // 1707782400000
 * ```
 */
export function getFileMtimeMs(path: Path): Result<NonNegativeNumber> {
  const fs: OptionalNodeFs = nodeFs;
  if (!fs) return requireRuntime('getFileMtimeMs', 'node');
  const pathResult: Result<Path> = safeParse(PathSchema, path);
  if (!pathResult.ok) return pathResult;

  try {
    const mtimeMs: number = fs.statSync(pathResult.data).mtimeMs;
    const result: Result<NonNegativeNumber> = safeParse(NonNegativeNumberSchema, mtimeMs);
    if (!result.ok) return result;
    return ok(NonNegativeNumberSchema, result.data);
  } catch (error: unknown) {
    return err(ERRORS.IO.READ_FAILED, {
      meta: { path: pathResult.data },
      cause: fromUnknownError(error),
    });
  }
}

// =============================================================================
// JSON
// =============================================================================

/**
 * Parse JSON content that may contain `//` comments.
 * Removes single-line comments before parsing.
 *
 * @param content - JSON string with optional single-line comments.
 * @returns `Result<T>` — parsed value, or `VALIDATION.SCHEMA_FAILED` / `VALIDATION.INVALID_FORMAT` on error.
 *
 * @example
 * ```typescript
 * const parsed = parseJsonWithComments<Config>(rawContent);
 * if (!parsed.ok) return parsed;
 * parsed.data.name;
 * ```
 */
export function parseJsonWithComments<T = unknown>(content: FileContent): Result<T> {
  const contentResult: Result<FileContent> = safeParse(FileContentSchema, content);
  if (!contentResult.ok) return contentResult;

  const cleaned: Str = contentResult.data.replace(/^\s*\/\/.*$/gm, '');

  try {
    const parsed: unknown = JSON.parse(cleaned);
    // Generic T has no schema — caller is responsible for validating the parsed value
    return okUnchecked<T>(parsed as T);
  } catch (e: unknown) {
    return err(ERRORS.VALIDATION.INVALID_FORMAT, {
      meta: { format: 'JSONC' },
      cause: fromUnknownError(e),
    });
  }
}
