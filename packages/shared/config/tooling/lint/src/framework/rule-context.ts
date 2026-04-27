/**
 * Custom Linter — Rule Context Utilities
 *
 * Provides workspace context utilities for workspace-scoped rules:
 * file discovery, reading, existence checks, workspace package discovery,
 * and content searching.
 *
 * @module
 */

import type { Dirent } from 'node:fs';
import { readFile as fsReadFile, readdir, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

import * as v from 'valibot';

// =============================================================================
// Types
// =============================================================================

/** Schema for a search match found by the content search utility. */
export const SearchMatchSchema = v.strictObject({
  /** Absolute file path containing the match. */
  file: v.string(),
  /** 1-based line number. */
  line: v.number(),
  /** 1-based column number. */
  column: v.number(),
  /** The full line text containing the match. */
  text: v.string(),
  /** The matched substring. */
  match: v.string(),
});

/** A search match found by the content search utility. See {@link SearchMatchSchema}. */
export type SearchMatch = v.InferOutput<typeof SearchMatchSchema>;

/** Schema for a workspace package discovered from pnpm-workspace.yaml. */
export const WorkspacePackageSchema = v.strictObject({
  /** Absolute path to the package.json file. */
  path: v.string(),
  /** Absolute path to the package directory. */
  dir: v.string(),
  /** Parsed package.json content. */
  packageJson: v.record(v.string(), v.unknown()),
  /** Package name (from package.json "name" field). */
  name: v.optional(v.string()),
});

/** A workspace package discovered from pnpm-workspace.yaml. See {@link WorkspacePackageSchema}. */
export type WorkspacePackage = v.InferOutput<typeof WorkspacePackageSchema>;

/** Workspace context passed to workspace-scoped rules. */
export type WorkspaceContext = {
  /** Root directory of the workspace. */
  rootDir: string;
  /** All files in the workspace (skips ignored dirs). Cached after first call. */
  allFiles: () => Promise<readonly string[]>;
  /** Files matching one or more extensions (e.g. '.ts', '.json'). Cached per extension set. */
  filesByExtension: (...exts: string[]) => Promise<readonly string[]>;
  /** Read a file's contents. */
  readFile: (path: string) => Promise<string>;
  /** Check if a file exists. */
  fileExists: (path: string) => Promise<boolean>;
  /** Check if a directory exists. */
  dirExists: (path: string) => Promise<boolean>;
  /** Get all workspace packages from pnpm-workspace.yaml. */
  getWorkspacePackages: () => Promise<WorkspacePackage[]>;
};

// =============================================================================
// Constants
// =============================================================================

/** Directories to always skip during recursive file discovery. */
const SKIP_DIRS: ReadonlySet<string> = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.svelte-kit',
  '.next',
  '.turbo',
  '.cache',
]);

/** Parsed exclude configuration for workspace file discovery. */
export type ExcludeConfig = {
  /** Directory/file names to skip (entries without `/`). */
  readonly names: ReadonlySet<string>;
  /** Relative path prefixes to skip (entries with `/`). */
  readonly paths: readonly string[];
};

// =============================================================================
// File Discovery
// =============================================================================

/**
 * Check whether a directory should be excluded by path-prefix matching.
 *
 * @param {string} dirFullPath - Absolute path of the directory
 * @param {string} rootDir - Workspace root for computing relative paths
 * @param {readonly string[]} excludePaths - Relative path prefixes to exclude
 * @returns {boolean} True if the directory should be excluded
 */
function shouldExcludeByPath(
  dirFullPath: string,
  rootDir: string,
  excludePaths: readonly string[],
): boolean {
  if (excludePaths.length === 0) {
    return false;
  }
  const relPath: string = relative(rootDir, dirFullPath);
  return excludePaths.some((p: string): boolean => relPath === p || relPath.startsWith(`${p}/`));
}

/**
 * Recursively discover all files in a directory, skipping ignored directories.
 *
 * Respects both the hardcoded {@link SKIP_DIRS} set and the optional
 * config-driven exclude list (name-based and path-prefix-based).
 *
 * @param {string} dir - Directory to scan
 * @param {ExcludeConfig} [excludes] - Optional config-driven excludes
 * @param {string} [rootDir] - Workspace root for path-prefix exclusion (defaults to dir)
 * @yields {string} Absolute file paths
 * @returns {AsyncIterable<string>} Async iterable of file paths
 */
export async function* getAllFiles(
  dir: string,
  excludes?: ExcludeConfig,
  rootDir?: string,
): AsyncIterable<string> {
  const root: string = rootDir ?? dir;
  let entries: Dirent[];
  try {
    entries = (await readdir(dir, { withFileTypes: true })) as Dirent[];
  } catch {
    return;
  }

  for (const entry of entries) {
    const name: string = entry.name as string;
    const fullPath: string = join(dir, name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(name)) {
        continue;
      }
      if (excludes && excludes.names.has(name)) {
        continue;
      }
      if (excludes && shouldExcludeByPath(fullPath, root, excludes.paths)) {
        continue;
      }
      yield* getAllFiles(fullPath, excludes, root);
      continue;
    }

    if (entry.isFile()) {
      yield fullPath;
    }
  }
}

// =============================================================================
// File I/O
// =============================================================================

/**
 * Read a file's contents as UTF-8.
 *
 * @param {string} path - Absolute file path
 * @returns {Promise<string>} File contents
 * @throws If the file cannot be read
 */
export function readFileContent(path: string): Promise<string> {
  return fsReadFile(path, 'utf8');
}

/**
 * Check if a file exists.
 *
 * @param {string} path - Absolute file path
 * @returns {Promise<boolean>} True if the file exists and is a file
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    const s: Awaited<ReturnType<typeof stat>> = await stat(path);
    return s.isFile();
  } catch {
    return false;
  }
}

/**
 * Check if a directory exists.
 *
 * @param {string} path - Absolute directory path
 * @returns {Promise<boolean>} True if the path exists and is a directory
 */
export async function dirExists(path: string): Promise<boolean> {
  try {
    const s: Awaited<ReturnType<typeof stat>> = await stat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
}

// =============================================================================
// Workspace Packages
// =============================================================================

/**
 * Discover workspace packages from pnpm-workspace.yaml.
 *
 * Reads `pnpm-workspace.yaml` in the root directory, expands glob patterns,
 * and returns metadata for each package that has a `package.json`.
 *
 * @param {string} rootDir - Workspace root directory
 * @returns {Promise<WorkspacePackage[]>} Array of workspace packages
 */
export async function getWorkspacePackages(rootDir: string): Promise<WorkspacePackage[]> {
  const workspaceYamlPath: string = join(rootDir, 'pnpm-workspace.yaml');
  const packages: WorkspacePackage[] = [];

  let yamlContent: string;
  try {
    yamlContent = await fsReadFile(workspaceYamlPath, 'utf8');
  } catch {
    return packages;
  }

  /* Simple YAML parser — extract packages list from pnpm-workspace.yaml */
  const patterns: string[] = parseWorkspaceYaml(yamlContent);

  /* Expand each glob pattern to find directories with package.json */
  await Promise.all(
    patterns.map((pattern: string): Promise<void> => {
      const isRecursive: boolean = pattern.includes('**');
      const baseDir: string = pattern.replace(/\/\*\*?$/, '');
      const searchDir: string = resolve(rootDir, baseDir);
      return findPackagesInDir(searchDir, packages, isRecursive);
    }),
  );

  return packages;
}

/**
 * Recursively find packages (directories with package.json) in a directory.
 *
 * @param dir - Directory to scan
 * @param packages - Accumulator array (mutated)
 * @param recursive - Whether to recurse into subdirectories
 */
async function findPackagesInDir(
  dir: string,
  packages: WorkspacePackage[],
  recursive: boolean,
): Promise<void> {
  let entries: Dirent[];
  try {
    entries = (await readdir(dir, { withFileTypes: true })) as Dirent[];
  } catch {
    return;
  }

  const dirs: string[] = entries
    .filter((entry: Dirent): boolean => {
      if (!entry.isDirectory()) {
        return false;
      }
      const name: string = entry.name as string;
      return name !== 'node_modules' && name !== '.git' && name !== 'dist';
    })
    .map((entry: Dirent): string => join(dir, entry.name as string));

  await Promise.all(
    dirs.map(async (pkgDir: string): Promise<void> => {
      const pkgJsonPath: string = join(pkgDir, 'package.json');

      try {
        const pkgContent: string = await fsReadFile(pkgJsonPath, 'utf8');
        const pkgJson: Record<string, unknown> = JSON.parse(pkgContent) as Record<string, unknown>;
        packages.push({
          path: pkgJsonPath,
          dir: pkgDir,
          packageJson: pkgJson,
          name: typeof pkgJson.name === 'string' ? pkgJson.name : undefined,
        });
      } catch {
        /* No package.json — if recursive, keep scanning deeper */
      }

      /* Recurse into subdirectories for ** patterns */
      if (recursive) {
        await findPackagesInDir(pkgDir, packages, true);
      }
    }),
  );
}

/**
 * Parse pnpm-workspace.yaml to extract package glob patterns.
 *
 * Simple line-based parser that handles the common format:
 * ```yaml
 * packages:
 *   - 'packages/*'
 *   - 'apps/*'
 * ```
 *
 * @param {string} content - YAML file content
 * @returns {string[]} Array of glob patterns
 */
function parseWorkspaceYaml(content: string): string[] {
  const patterns: string[] = [];
  const lines: string[] = content.split('\n');
  let inPackages: boolean = false;

  for (const line of lines) {
    const trimmed: string = line.trim();

    if (trimmed === 'packages:') {
      inPackages = true;
      continue;
    }

    if (inPackages) {
      /* Stop at next top-level key */
      if (trimmed.length > 0 && !trimmed.startsWith('-') && !trimmed.startsWith('#')) {
        break;
      }

      if (trimmed.startsWith('- ')) {
        const pattern: string = trimmed.slice(2).trim().replace(/^['"]/, '').replace(/['"]$/, '');
        if (pattern.length > 0) {
          patterns.push(pattern);
        }
      }
    }
  }

  return patterns;
}

// =============================================================================
// Content Search
// =============================================================================

/**
 * Search for a regex pattern across files, yielding matches.
 *
 * @param {RegExp} pattern - Regular expression to search for
 * @param {AsyncIterable<string>} files - File paths to search
 * @param {(path: string) => Promise<string>} reader - File reader function
 * @yields {SearchMatch} Matches found in files
 * @returns {AsyncGenerator<SearchMatch>} Description
 */
export async function* search(
  pattern: RegExp,
  files: AsyncIterable<string>,
  reader: (path: string) => Promise<string> = readFileContent,
): AsyncGenerator<SearchMatch> {
  for await (const filePath of files) {
    let content: string;
    try {
      content = await reader(filePath);
    } catch {
      continue;
    }

    const lines: string[] = content.split('\n');
    for (let i: number = 0; i < lines.length; i++) {
      const lineText: string = lines[i] ?? '';
      /* Reset lastIndex for global patterns */
      const re: RegExp = new RegExp(pattern.source, pattern.flags.replace('g', ''));
      const m: RegExpMatchArray | null = lineText.match(re);
      if (m) {
        yield {
          file: filePath,
          line: i + 1,
          column: (m.index ?? 0) + 1,
          text: lineText,
          match: m[0] ?? '',
        };
      }
    }
  }
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Parse a config exclude array into name-based and path-based entries.
 *
 * @param {readonly string[]} exclude - The exclude array from config
 * @returns {ExcludeConfig} Parsed exclude configuration
 */
export function parseExcludes(exclude: readonly string[]): ExcludeConfig {
  const names: string[] = [];
  const paths: string[] = [];

  for (const entry of exclude) {
    if (entry.includes('/')) {
      paths.push(entry);
    } else {
      names.push(entry);
    }
  }

  return { names: new Set(names), paths };
}

/**
 * Collect all files from an async generator into an array.
 *
 * @param {string} rootDir - Directory to scan
 * @param {ExcludeConfig} [excludes] - Optional exclude config
 * @returns {Promise<readonly string[]>} All file paths
 */
async function collectAllFiles(
  rootDir: string,
  excludes?: ExcludeConfig,
): Promise<readonly string[]> {
  const files: string[] = [];
  for await (const file of getAllFiles(rootDir, excludes)) {
    files.push(file);
  }
  return files;
}

/**
 * Create a workspace context for workspace-scoped rules.
 *
 * The `allFiles()` result is cached after the first traversal so that
 * multiple workspace rules sharing the same context only trigger a single
 * filesystem walk. Concurrent callers share the same promise.
 *
 * @param {string} rootDir - Workspace root directory
 * @param {readonly string[]} [exclude] - Config exclude patterns
 * @returns {WorkspaceContext} Workspace context object
 */
export function createWorkspaceContext(
  rootDir: string,
  exclude?: readonly string[],
): WorkspaceContext {
  const excludes: ExcludeConfig | undefined = exclude ? parseExcludes(exclude) : undefined;

  /** Lazily populated file cache — first call triggers traversal; subsequent calls reuse. */
  let fileCache: Promise<readonly string[]> | undefined;

  function getFileCache(): Promise<readonly string[]> {
    if (fileCache === undefined) {
      fileCache = collectAllFiles(rootDir, excludes);
    }
    return fileCache;
  }

  /** Per-path readFile cache — deduplicates concurrent and repeated reads of the same file. */
  const readCache: Map<string, Promise<string>> = new Map();

  function cachedReadFile(path: string): Promise<string> {
    let cached: Promise<string> | undefined = readCache.get(path);
    if (cached === undefined) {
      cached = readFileContent(path);
      readCache.set(path, cached);
    }
    return cached;
  }

  /** Per-path fileExists cache. */
  const existsCache: Map<string, Promise<boolean>> = new Map();

  function cachedFileExists(path: string): Promise<boolean> {
    let cached: Promise<boolean> | undefined = existsCache.get(path);
    if (cached === undefined) {
      cached = fileExists(path);
      existsCache.set(path, cached);
    }
    return cached;
  }

  /** Per-path dirExists cache. */
  const dirExistsCache: Map<string, Promise<boolean>> = new Map();

  function cachedDirExists(path: string): Promise<boolean> {
    let cached: Promise<boolean> | undefined = dirExistsCache.get(path);
    if (cached === undefined) {
      cached = dirExists(path);
      dirExistsCache.set(path, cached);
    }
    return cached;
  }

  /** Extension-filtered file cache — keyed by sorted comma-joined extensions. */
  const extCache: Map<string, Promise<readonly string[]>> = new Map();

  async function cachedFilesByExtension(...exts: string[]): Promise<readonly string[]> {
    const key: string = [...exts].toSorted().join(',');
    let cached: Promise<readonly string[]> | undefined = extCache.get(key);
    if (cached === undefined) {
      cached = (async (): Promise<readonly string[]> => {
        const files: readonly string[] = await getFileCache();
        return files.filter((f: string): boolean =>
          exts.some((ext: string): boolean => f.endsWith(ext)),
        );
      })();
      extCache.set(key, cached);
    }
    return cached;
  }

  return {
    rootDir,
    allFiles: (): Promise<readonly string[]> => getFileCache(),
    filesByExtension: cachedFilesByExtension,
    readFile: cachedReadFile,
    fileExists: cachedFileExists,
    dirExists: cachedDirExists,
    getWorkspacePackages: (): Promise<WorkspacePackage[]> => getWorkspacePackages(rootDir),
  };
}
