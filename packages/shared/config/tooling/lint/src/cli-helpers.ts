/**
 * resist-lint — CLI Helper Functions
 *
 * Pure, testable helper functions extracted from the CLI entry point.
 * These handle argument parsing, file discovery, fix application,
 * schema generation, and the main linter orchestration loop.
 *
 * @module
 */

import { execSync } from 'node:child_process';
import { type Dirent, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

import * as v from 'valibot';
import {
  generateJsonSchema,
  type LintConfig,
  loadConfig,
  resolveRuleSeverity,
  isRuleEnabledAnywhere,
  validateConfig,
  type ConfigWarning,
} from '@/lint/config/schema.ts';
import { CONFIG_FILENAME, LINTER_NAME, SCHEMA_FILENAME } from '@/lint/constants.ts';
import { CACHE_FILENAME, computeRuleHash, LintCache } from '@/lint/framework/cache.ts';
import { fingerprintFiles } from '@/lint/framework/file-fingerprint.ts';
import { formatResults, type OutputFormat } from '@/lint/framework/formatters.ts';
import { runTypeScriptRules, EMBEDDED_CODE_EXTENSIONS } from '@/lint/framework/oxc-runner.ts';
import { createWorkspaceContext } from '@/lint/framework/rule-context.ts';
import { loadAllRules } from '@/lint/framework/rule-loader.ts';
import {
  findWorkspaceRoot,
  ToolRegistry,
  type WorkspaceTool,
} from '@/lint/framework/tool-orchestrator.ts';
import type {
  LintFix,
  LintResult,
  OptionsSchema,
  PackageJson,
  PackageJsonContext,
  PackageJsonRule,
  Stage,
  TypeScriptRule,
  WorkspaceRule,
} from '@/lint/framework/types.ts';
import { WorkerPool, type WorkerResult, type WorkerTask } from '@/lint/framework/worker-pool.ts';
import { format, type LintStrings } from '@/lint/locale/schema.ts';
import { ALL_TOOLS, ALL_WORKSPACE_TOOLS } from '@/lint/tools/registry.ts';
import { runSvelteCheckAllPackages } from '@/lint/tools/svelte-check.ts';
import { runTsgoAllPackages } from '@/lint/tools/tsgo.ts';

// =============================================================================
// Types
// =============================================================================

/** Schema for parsed CLI arguments. */
export const CliArgsSchema = v.strictObject({
  /** Whether to stop on first error (bail early). */
  bail: v.boolean(),
  /** Whether to use file hash caching for incremental runs. */
  cache: v.boolean(),
  /** Categories to filter by (empty = all categories). */
  categories: v.array(v.string()),
  /** Custom config file path (overrides default .resist-lint.jsonc). */
  configPath: v.optional(v.string()),
  /** Whether to enable verbose debug logging to stderr. */
  debug: v.boolean(),
  /** Diff mode: only lint changed files ('head' = uncommitted, 'staged' = staged). */
  diff: v.optional(v.picklist(['head', 'staged'])),
  /** Whether to auto-apply fixes to source files. */
  fix: v.boolean(),
  /** Output format. Undefined defaults to text (or json if --json). */
  format: v.optional(v.picklist(['text', 'json', 'sarif', 'github', 'junit', 'compact'])),
  /** Whether to show help and exit. */
  help: v.boolean(),
  /** Additional ignore patterns from CLI (merged with config exclude). */
  ignore: v.array(v.string()),
  /** Number of worker threads for parallel lint (undefined = os.cpus().length, 1 = single-threaded). */
  jobs: v.optional(v.number()),
  /** Whether to output results as JSON. */
  json: v.boolean(),
  /** Whether to list all rules and exit. */
  listRules: v.boolean(),
  /** Locale code for user-facing messages (e.g., 'en'). Undefined = default ('en'). */
  locale: v.optional(v.string()),
  /** Package-name shorthand resolved to absolute paths via `--package <name>` flag. */
  packageNames: v.array(v.string()),
  /** Positional path arguments (includes paths resolved from `--package` flags). */
  paths: v.array(v.string()),
  /** Whether to suppress warning-level output (show errors only). */
  quiet: v.boolean(),
  /** Rule IDs to filter by (empty = all rules). */
  ruleIds: v.array(v.string()),
  /** Global severity override (overrides all result severities). */
  severityOverride: v.optional(v.picklist(['error', 'warn', 'off'])),
  /** Pipeline stage to filter by (undefined = no stage filter). */
  stage: v.optional(v.string()),
  /** Filename to use when reading source from stdin instead of disk. */
  stdinFilename: v.optional(v.string()),
  /** Whether to run external tools (shellcheck, hadolint, etc.) alongside custom rules. */
  tools: v.boolean(),
  /** Whether to exit 0 even if errors are found. */
  warnOnly: v.boolean(),
});

/** Parsed CLI arguments. See {@link CliArgsSchema}. */
export type CliArgs = v.InferOutput<typeof CliArgsSchema>;

/** Schema for output sink for CLI messages (allows testing without stdout/stderr). */
export const CliOutputSchema = v.strictObject({
  /** Write to stderr. */
  stderr: v.custom<(msg: string) => void>((val: unknown): boolean => typeof val === 'function'),
  /** Write to stdout. */
  stdout: v.custom<(msg: string) => void>((val: unknown): boolean => typeof val === 'function'),
});

/** Output sink for CLI messages (allows testing without stdout/stderr). See {@link CliOutputSchema}. */
export type CliOutput = v.InferOutput<typeof CliOutputSchema>;

// =============================================================================
// Argument Parsing
// =============================================================================

/**
 * Parse raw CLI arguments into a structured format.
 *
 * @param {string[]} argv - Raw arguments (typically process.argv.slice(2))
 * @returns {CliArgs} Parsed CLI arguments
 */
export function parseCliArgs(argv: string[]): CliArgs {
  /* Extract --package <name> (space-form) and --package=<name> (eq-form) flags
   * before the simple flag/positional split, since space-form consumes the next
   * argv entry which would otherwise be misclassified as a positional path. */
  const packageNames: string[] = [];
  const consumed: Set<number> = new Set<number>();
  for (let i: number = 0; i < argv.length; i++) {
    const a: string = argv[i] ?? '';
    if (a === '--package' && i + 1 < argv.length) {
      packageNames.push(argv[i + 1] ?? '');
      consumed.add(i);
      consumed.add(i + 1);
    } else if (a.startsWith('--package=')) {
      packageNames.push(a.slice('--package='.length));
      consumed.add(i);
    }
  }
  const filteredArgv: string[] = argv.filter((_: string, i: number): boolean => !consumed.has(i));
  const flags: string[] = filteredArgv.filter((a: string): boolean => a.startsWith('-'));
  const paths: string[] = filteredArgv.filter((a: string): boolean => !a.startsWith('-'));

  /* Resolve --package names to absolute paths and append to paths.
   * Errors with the list of valid package names if a name doesn't resolve. */
  if (packageNames.length > 0) {
    const root: string = findWorkspaceRoot(process.cwd()) ?? process.cwd();
    const pkgMap: ReadonlyMap<string, string> = getPackageMap(root);
    for (const name of packageNames) {
      const dir: string | undefined = pkgMap.get(name);
      if (dir === undefined) {
        const valid: string = [...pkgMap.keys()].toSorted().join(', ');
        throw new Error(`Unknown --package: ${name}. Valid packages: ${valid}`);
      }
      paths.push(dir);
    }
  }

  const ruleFlag: string | undefined = flags.find((f: string): boolean => f.startsWith('--rule='));
  const ruleIds: string[] = ruleFlag ? (ruleFlag.split('=')[1] ?? '').split(',') : [];

  const categoryFlag: string | undefined = flags.find((f: string): boolean =>
    f.startsWith('--category='),
  );
  const categories: string[] = categoryFlag ? (categoryFlag.split('=')[1] ?? '').split(',') : [];

  const stageFlag: string | undefined = flags.find((f: string): boolean =>
    f.startsWith('--stage='),
  );
  const stage: string | undefined = stageFlag ? (stageFlag.split('=')[1] ?? '') : undefined;

  const ignoreFlag: string | undefined = flags.find((f: string): boolean =>
    f.startsWith('--ignore='),
  );
  const ignore: string[] = ignoreFlag ? (ignoreFlag.split('=')[1] ?? '').split(',') : [];

  const configFlag: string | undefined = flags.find((f: string): boolean =>
    f.startsWith('--config='),
  );
  const configPath: string | undefined = configFlag ? (configFlag.split('=')[1] ?? '') : undefined;

  const localeFlag: string | undefined = flags.find((f: string): boolean =>
    f.startsWith('--locale='),
  );
  const locale: string | undefined = localeFlag ? (localeFlag.split('=')[1] ?? '') : undefined;

  const severityFlag: string | undefined = flags.find((f: string): boolean =>
    f.startsWith('--severity='),
  );
  const severityOverride: 'error' | 'warn' | 'off' | undefined = severityFlag
    ? ((severityFlag.split('=')[1] ?? '') as 'error' | 'warn' | 'off')
    : undefined;

  const diffFlag: string | undefined = flags.find(
    (f: string): boolean => f === '--diff' || f.startsWith('--diff='),
  );
  let diff: 'head' | 'staged' | undefined;
  if (diffFlag) {
    const diffValue: string = diffFlag.includes('=') ? (diffFlag.split('=')[1] ?? 'head') : 'head';
    diff = diffValue === 'staged' ? 'staged' : 'head';
  }

  const jobsFlag: string | undefined = flags.find((f: string): boolean => f.startsWith('--jobs='));
  const jobs: number | undefined = jobsFlag
    ? Number.parseInt(jobsFlag.split('=')[1] ?? '', 10) || undefined
    : undefined;

  const stdinFilenameFlag: string | undefined = flags.find((f: string): boolean =>
    f.startsWith('--stdin-filename='),
  );
  const stdinFilename: string | undefined = stdinFilenameFlag
    ? (stdinFilenameFlag.split('=')[1] ?? '')
    : undefined;

  return {
    bail: flags.includes('--bail'),
    cache: !flags.includes('--no-cache'),
    categories,
    configPath,
    debug: flags.includes('--debug'),
    diff,
    fix: flags.includes('--fix'),
    format: parseFormatFlag(flags),
    help: flags.includes('--help') || flags.includes('-h'),
    ignore,
    jobs,
    json: flags.includes('--json'),
    listRules: flags.includes('--list-rules'),
    locale,
    packageNames,
    paths,
    quiet: flags.includes('--quiet'),
    ruleIds,
    severityOverride,
    stage,
    stdinFilename,
    tools: flags.includes('--tools'),
    warnOnly: flags.includes('--warn-only'),
  };
}

/**
 * Parse the --format= flag from CLI flags.
 *
 * @param flags - Array of flag strings
 * @returns Output format or undefined
 */
function parseFormatFlag(
  flags: string[],
): 'text' | 'json' | 'sarif' | 'github' | 'junit' | 'compact' | undefined {
  const formatFlag: string | undefined = flags.find((f: string): boolean =>
    f.startsWith('--format='),
  );
  if (!formatFlag) {
    return undefined;
  }
  const value: string = formatFlag.split('=')[1] ?? 'text';
  const validFormats: ReadonlySet<string> = new Set([
    'text',
    'json',
    'sarif',
    'github',
    'junit',
    'compact',
  ]);
  if (validFormats.has(value)) {
    return value as 'text' | 'json' | 'sarif' | 'github' | 'junit' | 'compact';
  }
  return 'text';
}

// =============================================================================
// Package Resolution (--package <name>)
// =============================================================================

/** Process-level cache mapping workspace root → package-name → absolute dir. */
const _packageMapCache: Map<string, Map<string, string>> = new Map<string, Map<string, string>>();

/**
 * Build (and cache) a map from workspace package names to their absolute
 * directories by walking `<root>/packages/**` and reading each `package.json`'s
 * `name` field. Walks pnpm-style monorepo layout. Skips `node_modules` and dot dirs.
 *
 * @param workspaceRoot - Absolute path to the workspace root (where pnpm-workspace.yaml lives)
 * @returns Map of package name → absolute directory containing that package's package.json
 */
export function getPackageMap(workspaceRoot: string): ReadonlyMap<string, string> {
  const cached: Map<string, string> | undefined = _packageMapCache.get(workspaceRoot);
  if (cached !== undefined) {
    return cached;
  }
  const map: Map<string, string> = new Map<string, string>();
  const walk = (dir: string): void => {
    let entries: Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
          continue;
        }
        walk(join(dir, entry.name));
      } else if (entry.name === 'package.json') {
        try {
          const content: string = readFileSync(join(dir, 'package.json'), 'utf8');
          const pkg: { name?: string } = JSON.parse(content) as { name?: string };
          if (typeof pkg.name === 'string' && pkg.name.length > 0) {
            map.set(pkg.name, dir);
          }
        } catch {
          /* skip unreadable / unparseable */
        }
      }
    }
  };
  walk(join(workspaceRoot, 'packages'));
  _packageMapCache.set(workspaceRoot, map);
  return map;
}

// =============================================================================
// Path / Domain Scoping
// =============================================================================

/**
 * Map from workspace-rule ID prefix to the path-domain that rule scans.
 * Only workspace rules with an entry here are eligible for path-scoped skipping;
 * rules without a declared domain are treated as truly global and run always.
 *
 * Domains are repo-relative directory prefixes (no leading `./`, no trailing `/`).
 */
const WORKSPACE_RULE_DOMAINS: ReadonlyArray<{ prefix: string; domain: string }> = [
  { prefix: 'plans/', domain: 'docs/plans' },
];

/**
 * Look up the declared domain for a workspace-rule ID, or null if the rule
 * has no declared domain (truly global, runs unconditionally).
 *
 * @param ruleId - Workspace-rule ID (e.g. `plans/no-incomplete-tasks`)
 * @returns Repo-relative domain prefix, or `null` if global
 */
function ruleDomainFor(ruleId: string): string | null {
  for (const entry of WORKSPACE_RULE_DOMAINS) {
    if (ruleId.startsWith(entry.prefix)) {
      return entry.domain;
    }
  }
  return null;
}

/**
 * Determine whether at least one of the user-passed paths intersects a
 * rule's declared domain. Intersection is a two-way prefix check: either the
 * path is inside the domain (e.g. path=`docs/plans/foo.md`, domain=`docs/plans`),
 * or the domain is inside the path (e.g. path=`docs`, domain=`docs/plans`).
 *
 * Path normalization: leading `./` is stripped; trailing `/` is stripped.
 *
 * @param paths - User-passed positional paths (repo-relative or absolute)
 * @param domain - Repo-relative domain prefix
 * @returns `true` if any path intersects the domain
 */
export function pathsIntersectDomain(paths: readonly string[], domain: string): boolean {
  const normDomain: string = domain.replace(/^\.\//, '').replace(/\/+$/, '');
  for (const raw of paths) {
    const norm: string = raw.replace(/^\.\//, '').replace(/\/+$/, '');
    if (norm === normDomain) {
      return true;
    }
    if (norm.startsWith(`${normDomain}/`)) {
      return true;
    }
    if (normDomain.startsWith(`${norm}/`)) {
      return true;
    }
  }
  return false;
}

/**
 * Decide whether a workspace rule should run given the user's path scope.
 * Returns `true` always when no paths were passed (full-workspace mode).
 *
 * @param ruleId - Workspace-rule ID
 * @param paths - User-passed positional paths
 * @returns `true` if the rule should run, `false` if it should be skipped
 */
export function shouldRunWorkspaceRule(ruleId: string, paths: readonly string[]): boolean {
  if (paths.length === 0) {
    return true;
  }
  const domain: string | null = ruleDomainFor(ruleId);
  if (domain === null) {
    return true;
  }
  return pathsIntersectDomain(paths, domain);
}

// =============================================================================
// Binary Detection
// =============================================================================

/** Known binary file extensions that should never be linted. */
const BINARY_EXTENSIONS: ReadonlySet<string> = new Set([
  /* Images */
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.webp',
  '.avif',
  '.svg',
  '.bmp',
  '.tiff',
  /* Fonts */
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  /* Archives */
  '.zip',
  '.tar',
  '.gz',
  '.bz2',
  '.7z',
  '.rar',
  /* Documents */
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  /* Executables / Libraries */
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  /* Media */
  '.mp3',
  '.mp4',
  '.wav',
  '.ogg',
  '.webm',
  '.avi',
  '.mov',
  '.flac',
  /* Databases */
  '.sqlite',
  '.db',
  /* Source maps */
  '.map',
  /* WebAssembly */
  '.wasm',
]);

/**
 * Check if a file is likely binary based on its extension.
 *
 * Binary files should never be linted — they are not text and cannot
 * be meaningfully parsed by AST-based or text-based rules.
 *
 * @param {string} filePath - File path to check
 * @returns {boolean} Whether the file is likely binary
 */
export function isBinaryFile(filePath: string): boolean {
  const dot: number = filePath.lastIndexOf('.');
  if (dot < 0) {
    return false;
  }
  const ext: string = filePath.slice(dot).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

// =============================================================================
// Git Diff Integration
// =============================================================================

/**
 * Get the set of changed file paths from git.
 *
 * @param {'head' | 'staged'} mode - Which changes to query:
 *   - `'head'`: uncommitted changes vs HEAD (`git diff --name-only HEAD`)
 *   - `'staged'`: staged changes (`git diff --cached --name-only`)
 * @returns {Set<string>} Absolute paths of changed files
 */
export function getGitChangedFiles(mode: 'head' | 'staged'): Set<string> {
  const cmd: string =
    mode === 'staged' ? 'git diff --cached --name-only' : 'git diff --name-only HEAD';

  let output: string;
  try {
    output = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch {
    /* git not available or not a git repo — return empty set */
    return new Set();
  }

  const cwd: string = process.cwd();
  const files: Set<string> = new Set<string>();

  for (const line of output.split('\n')) {
    const trimmed: string = line.trim();
    if (trimmed.length > 0) {
      files.add(resolve(cwd, trimmed));
    }
  }

  return files;
}

// =============================================================================
// File Discovery
// =============================================================================

/**
 * Check if a file path should be linted based on config.
 *
 * Binary files are rejected first. Then excluded patterns (e.g. `*.test.ts`,
 * `*.d.ts`) are checked. Finally the file extension must match one from
 * `config.extensions`.
 *
 * @param {string} filePath - File path to check
 * @param {LintConfig} config - Linter configuration
 * @returns {boolean} Whether the file should be linted
 */
export function shouldLint(filePath: string, config: LintConfig): boolean {
  /* Always reject binary files */
  if (isBinaryFile(filePath)) {
    return false;
  }

  /* Check exclude patterns */
  for (const pattern of config.exclude) {
    if (pattern.startsWith('*.') && filePath.endsWith(pattern.slice(1))) {
      return false;
    }
  }

  const ext: string = extname(filePath);
  return config.extensions.includes(ext);
}

/**
 * Check whether a directory should be excluded from file collection.
 *
 * Supports two matching modes:
 * - Name-based: exclude entries without `/` match against the directory name only
 *   (e.g., `node_modules` matches any `node_modules/` at any depth)
 * - Path-prefix: exclude entries containing `/` match against the full relative
 *   path from the workspace root (e.g., `packages/shared/utils/cli` matches
 *   only that specific directory)
 *
 * @param {string} entryName - The directory entry name (basename)
 * @param {string} dirFullPath - The absolute path to the directory
 * @param {string} rootDir - The workspace root directory (for computing relative paths)
 * @param {ReadonlySet<string>} excludeNames - Exclude entries without `/` (name-based)
 * @param {readonly string[]} excludePaths - Exclude entries with `/` (path-prefix)
 * @returns {boolean} True if the directory should be excluded
 */
export function shouldExcludeDir(
  entryName: string,
  dirFullPath: string,
  rootDir: string,
  excludeNames: ReadonlySet<string>,
  excludePaths: readonly string[],
): boolean {
  if (excludeNames.has(entryName)) {
    return true;
  }

  if (excludePaths.length === 0) {
    return false;
  }

  const relPath: string = relative(rootDir, dirFullPath);
  return excludePaths.some((p: string): boolean => relPath === p || relPath.startsWith(`${p}/`));
}

/**
 * Split config.exclude into name-based and path-based entries.
 *
 * @param {readonly string[]} exclude - The exclude array from config
 * @returns {{ excludeNames: ReadonlySet<string>; excludePaths: readonly string[] }} Split result
 */
function splitExcludes(exclude: readonly string[]): {
  excludeNames: ReadonlySet<string>;
  excludePaths: readonly string[];
} {
  const names: string[] = [];
  const paths: string[] = [];

  for (const entry of exclude) {
    if (entry.includes('/')) {
      paths.push(entry);
    } else {
      names.push(entry);
    }
  }

  return { excludeNames: new Set(names), excludePaths: paths };
}

/**
 * Recursively collect all lintable files from a directory.
 *
 * @param {string} dir - Directory to scan
 * @param {LintConfig} config - Linter configuration (provides exclude list)
 * @param {string} [rootDir] - Workspace root for path-prefix exclusion (defaults to dir)
 * @returns {Promise<string[]>} Array of absolute file paths
 */
export async function collectFiles(
  dir: string,
  config: LintConfig,
  rootDir?: string,
): Promise<string[]> {
  const root: string = rootDir ?? dir;
  const files: string[] = [];
  const { excludeNames, excludePaths } = splitExcludes(config.exclude);

  let entries: Dirent[];
  try {
    entries = (await readdir(dir, { withFileTypes: true })) as Dirent[];
  } catch {
    /* Directory not readable — skip */
    return files;
  }

  const subdirPromises: Array<Promise<string[]>> = [];

  for (const entry of entries) {
    const fullPath: string = join(dir, entry.name as string);

    if (entry.isDirectory()) {
      if (shouldExcludeDir(entry.name as string, fullPath, root, excludeNames, excludePaths)) {
        continue;
      }
      subdirPromises.push(collectFiles(fullPath, config, root));
    } else if (entry.isFile() && shouldLint(fullPath, config)) {
      files.push(fullPath);
    }
  }

  if (subdirPromises.length > 0) {
    const subdirResults: string[][] = await Promise.all(subdirPromises);
    for (const subFiles of subdirResults) {
      files.push(...subFiles);
    }
  }

  return files;
}

/**
 * Recursively collect all package.json files from a directory.
 *
 * @param {string} dir - Directory to scan
 * @param {LintConfig} config - Linter configuration (provides exclude list)
 * @param {string} [rootDir] - Workspace root for path-prefix exclusion (defaults to dir)
 * @returns {Promise<string[]>} Array of absolute file paths
 */
export async function collectPackageJsonFiles(
  dir: string,
  config: LintConfig,
  rootDir?: string,
): Promise<string[]> {
  const root: string = rootDir ?? dir;
  const files: string[] = [];
  const { excludeNames, excludePaths } = splitExcludes(config.exclude);

  let entries: Dirent[];
  try {
    entries = (await readdir(dir, { withFileTypes: true })) as Dirent[];
  } catch {
    return files;
  }

  const subdirPromises: Array<Promise<string[]>> = [];

  for (const entry of entries) {
    const fullPath: string = join(dir, entry.name as string);
    if (entry.isDirectory()) {
      if (shouldExcludeDir(entry.name as string, fullPath, root, excludeNames, excludePaths)) {
        continue;
      }
      subdirPromises.push(collectPackageJsonFiles(fullPath, config, root));
    } else if (entry.isFile() && (entry.name as string) === 'package.json') {
      files.push(fullPath);
    }
  }

  if (subdirPromises.length > 0) {
    const subdirResults: string[][] = await Promise.all(subdirPromises);
    for (const subFiles of subdirResults) {
      files.push(...subFiles);
    }
  }

  return files;
}

// =============================================================================
// Package.json Rules
// =============================================================================

/**
 * Run package.json rules on a single package.json file.
 *
 * @param {string} filePath - Absolute path to package.json
 * @param {PackageJson} pkg - Parsed package.json content
 * @param {boolean} isRoot - Whether this is the workspace root package.json
 * @param {PackageJsonRule[]} rules - Package.json rules to run
 * @param {Record<string, Record<string, unknown>>} allRuleOptions - Per-rule config options
 * @returns {LintResult[]} Array of lint results
 */
export function runPkgRules(
  filePath: string,
  pkg: PackageJson,
  isRoot: boolean,
  rules: PackageJsonRule[],
  allRuleOptions?: Record<string, Record<string, unknown>>,
): LintResult[] {
  const results: LintResult[] = [];
  for (const rule of rules) {
    const ruleOpts: Record<string, unknown> | undefined = allRuleOptions?.[rule.id];
    const context: PackageJsonContext = { file: filePath, isRoot, pkg, ruleOptions: ruleOpts };
    results.push(...rule.check(context));
  }
  return results;
}

// =============================================================================
// Rule Options Overrides
// =============================================================================

/**
 * Apply config-based category/stage overrides from ruleOptions.
 *
 * If `ruleOptions[ruleId]` contains `categories` or `stages`,
 * they replace the rule's declared values.
 *
 * @param {Array<TypeScriptRule | PackageJsonRule>} rules - Rules to update (mutated)
 * @param {Record<string, Record<string, unknown>>} ruleOptions - Config ruleOptions map
 */
function applyRuleOptionsOverrides(
  rules: Array<TypeScriptRule | PackageJsonRule>,
  ruleOptions: Record<string, Record<string, unknown>>,
): void {
  for (const rule of rules) {
    const opts: Record<string, unknown> | undefined = ruleOptions[rule.id];
    if (!opts) {
      continue;
    }

    if (Array.isArray(opts.categories)) {
      rule.categories = opts.categories as string[];
    }

    if (Array.isArray(opts.stages)) {
      rule.stages = opts.stages as Stage[];
    }
  }
}

// =============================================================================
// Auto-fix
// =============================================================================

/**
 * Apply fixes to a file, returning the updated content.
 * Fixes are applied in reverse offset order to preserve byte positions.
 *
 * @param {string} content - Original file content
 * @param {LintFix[]} fixes - Array of fixes to apply
 * @returns {string} Updated file content
 */
export function applyFixes(content: string, fixes: LintFix[]): string {
  const sorted: LintFix[] = [...fixes].toSorted(
    (a: LintFix, b: LintFix): number => b.range.start - a.range.start,
  );

  let result: string = content;
  for (const fix of sorted) {
    result = result.slice(0, fix.range.start) + fix.text + result.slice(fix.range.end);
  }
  return result;
}

// =============================================================================
// JSON Schema
// =============================================================================

/**
 * Auto-generate the JSON Schema file for IDE autocomplete.
 *
 * Writes the schema to the workspace root alongside the config file.
 * Runs silently — errors are swallowed since schema generation is optional.
 *
 * @param {TypeScriptRule[]} tsRules - All TypeScript rules
 * @param {PackageJsonRule[]} pkgRules - All package.json rules
 * @param {LintStrings} strings - Locale strings for schema descriptions
 */
/** Track whether the JSON schema has already been written this process. */
let schemaWritten: boolean = false;

export function writeJsonSchema(
  tsRules: TypeScriptRule[],
  pkgRules: PackageJsonRule[],
  strings: LintStrings,
  wsRules: WorkspaceRule[] = [],
  cwd: string = process.cwd(),
): void {
  if (schemaWritten) {
    return;
  }
  schemaWritten = true;

  const allRuleIds: string[] = [
    ...tsRules.map((r: TypeScriptRule): string => r.id),
    ...pkgRules.map((r: PackageJsonRule): string => r.id),
    ...wsRules.map((r: WorkspaceRule): string => r.id),
  ];
  const descriptions: Map<string, string> = new Map();
  for (const r of tsRules) {
    descriptions.set(r.id, r.description);
  }
  for (const r of pkgRules) {
    descriptions.set(r.id, r.description);
  }
  for (const r of wsRules) {
    descriptions.set(r.id, r.description);
  }
  const ruleOptSchemas: Map<string, OptionsSchema> = new Map();
  for (const r of tsRules) {
    if (r.optionsSchema) {
      ruleOptSchemas.set(r.id, r.optionsSchema);
    }
  }
  for (const r of pkgRules) {
    if (r.optionsSchema) {
      ruleOptSchemas.set(r.id, r.optionsSchema);
    }
  }
  for (const r of wsRules) {
    if (r.optionsSchema) {
      ruleOptSchemas.set(r.id, r.optionsSchema);
    }
  }
  const schema: Record<string, unknown> = generateJsonSchema(
    allRuleIds,
    descriptions,
    strings,
    ruleOptSchemas,
  );
  const outPath: string = resolve(cwd, SCHEMA_FILENAME);
  try {
    const raw: string = JSON.stringify(schema, null, 2);
    writeFileSync(outPath, `${collapseShortJsonArrays(raw, 100)}\n`, 'utf8');
  } catch {
    /* Schema write failed — non-critical, continue */
  }
}

/**
 * Collapse short JSON arrays onto a single line when they fit within a max width.
 *
 * `JSON.stringify` with indent always expands arrays to multiple lines.
 * Biome's formatter collapses short arrays to single lines when they fit.
 * This function matches biome's behavior to prevent perpetual format diffs.
 *
 * @param {string} json - Pretty-printed JSON string (2-space indent)
 * @param {number} maxWidth - Maximum line width (default 100, matching biome)
 * @returns {string} JSON with short arrays collapsed to single lines
 *
 * @example
 * ```typescript
 * const input = '{\n  "arr": [\n    "a",\n    "b"\n  ]\n}';
 * const result = collapseShortJsonArrays(input, 100);
 * // '{\n  "arr": ["a", "b"]\n}'
 * ```
 */
export function collapseShortJsonArrays(json: string, maxWidth: number): string {
  const lines: string[] = json.split('\n');
  const result: string[] = [];

  for (let i: number = 0; i < lines.length; i++) {
    const line: string = lines[i] ?? '';

    /* Look for array-opening lines like `  "key": [` */
    if (line.trimEnd().endsWith('[')) {
      /* Find the matching close bracket at the same indent level */
      const indent: string = line.slice(0, line.length - line.trimStart().length);
      let closeLine: number = -1;
      let allSimple: boolean = true;
      const elements: string[] = [];

      for (let k: number = i + 1; k < lines.length; k++) {
        const raw: string = lines[k] ?? '';
        const elem: string = raw.trim();

        /* Check if this is the closing bracket at the same indent */
        if (raw.startsWith(indent) && (elem === ']' || elem === '],')) {
          closeLine = k;
          break;
        }

        /* If any element contains nested structures, skip collapsing */
        if (elem.includes('{') || elem.includes('}') || elem.includes('[') || elem.includes(']')) {
          allSimple = false;
          break;
        }

        /* Remove trailing comma */
        const cleaned: string = elem.endsWith(',') ? elem.slice(0, -1) : elem;
        elements.push(cleaned);
      }

      if (allSimple && closeLine >= 0 && elements.length > 0) {
        /* Build the collapsed line */
        const prefix: string = line.trimEnd().slice(0, -1);
        const closeTrimmed: string = (lines[closeLine] ?? '').trim();
        const suffix: string = closeTrimmed.startsWith(']') ? closeTrimmed.slice(1) : '';
        const collapsed: string = `${prefix}[${elements.join(', ')}]${suffix}`;

        if (collapsed.length <= maxWidth) {
          result.push(collapsed);
          i = closeLine;
          continue;
        }
      }
    }

    result.push(line);
  }

  return result.join('\n');
}

// =============================================================================
// Help Text
// =============================================================================

/**
 * Build the formatted CLI help text from locale strings.
 *
 * @param {string} linterName - The linter display name
 * @param {string} configFilename - The config file name
 * @param {string} schemaFilename - The JSON Schema file name
 * @param {LintStrings} strings - Locale strings
 * @returns {string} Help text string
 */
export function buildHelpText(
  linterName: string,
  configFilename: string,
  schemaFilename: string,
  strings: LintStrings,
): string {
  const t = strings;
  const n: Record<string, string> = { name: linterName };

  return `
${format(t.cli.title, n)}

${t.cli.usageHeader}
${format(t.cli.usageLine, n)}
${format(t.cli.usageListRules, n)}

${t.cli.optionsHeader}
  ${t.flags.paths}
  --package <name>          Lint only the named workspace package (e.g. --package @/lint). Repeatable.
  ${t.flags.rule}
  ${t.flags.category}
  ${t.flags.stage}
  ${t.flags.fix}
  ${t.flags.json}
  ${t.flags.listRules}
  ${t.flags.quiet}
  ${t.flags.bail}
  ${t.flags.ignore}
  ${t.flags.config}
  ${t.flags.severity}
  ${t.flags.diff}
  ${t.flags.format}
  ${t.flags.jobs}
  ${t.flags.tools}
  ${t.flags.cache}
  ${t.flags.noCache}
  ${t.flags.locale}
  ${t.flags.debug}
  ${t.flags.warnOnly}
  ${t.flags.help}

${format(t.cli.configSection, { configFilename, schemaFilename })}

${t.cli.stagesSection}

${t.cli.examplesHeader}
  ${linterName} packages/shared/schemas
  ${linterName} --rule=jsdoc/require-param packages/shared/schemas
  ${linterName} --category=typescript packages/shared/schemas
  ${linterName} --stage=pre-commit packages/shared/schemas
  ${linterName} --fix packages/shared/schemas
  ${linterName} --list-rules

`;
}

// =============================================================================
// Core Lint Result
// =============================================================================

/** Result of the core lint pipeline (before formatting/output). */
export type LintCoreResult = {
  readonly results: LintResult[];
  readonly filesLinted: number;
  readonly fixesApplied: number;
  readonly ruleDescs: Map<string, string>;
};

// =============================================================================
// Main Linter Loop
// =============================================================================

/**
 * Process lint tasks sequentially, stopping on the first error (bail mode).
 *
 * @param tasks - File tasks to process
 * @param ruleOptions - Per-rule config options
 * @returns Results collected before bail, and whether bail triggered
 */
function processBailTasks(
  tasks: Array<{ filePath: string; content: string; applicableRules: TypeScriptRule[] }>,
  ruleOptions: Record<string, Record<string, unknown>>,
): Promise<{ results: LintResult[]; bailed: boolean }> {
  const accumulated: LintResult[] = [];

  /**
   * Process a single task and recurse.
   *
   * @param index - Current task index
   * @returns Accumulated results and bail status
   */
  async function processNext(index: number): Promise<{ results: LintResult[]; bailed: boolean }> {
    if (index >= tasks.length) {
      return { bailed: false, results: accumulated };
    }
    const task = tasks[index]!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
    const taskResults: LintResult[] = await runTypeScriptRules(
      task.filePath,
      task.content,
      task.applicableRules,
      ruleOptions,
    );
    accumulated.push(...taskResults);
    if (taskResults.some((r: LintResult): boolean => r.severity === 'error')) {
      return { bailed: true, results: accumulated };
    }
    return processNext(index + 1);
  }

  return processNext(0);
}

/**
 * Run the core lint pipeline (file collection through fix application).
 *
 * Separated from {@link runLinter} so the programmatic API can call this
 * directly without CLI-specific I/O (help text, formatting, exit codes).
 *
 * @param {CliArgs} cliArgs - Parsed CLI arguments (or synthesized from API options)
 * @param {CliOutput} output - Output sink for messages
 * @param {LintStrings} strings - Locale strings for user-facing messages
 * @param {LintConfig} config - Loaded and merged config
 * @param {Awaited<ReturnType<typeof loadAllRules>>} loaded - All discovered rules
 * @param {string} cwd - Working directory
 * @returns {Promise<LintCoreResult>} Lint results, file count, and fix count
 */
export async function _runLintCore(
  cliArgs: CliArgs,
  output: CliOutput,
  strings: LintStrings,
  config: LintConfig,
  loaded: Awaited<ReturnType<typeof loadAllRules>>,
  cwd: string,
  stdinContent?: string,
): Promise<LintCoreResult> {
  const dbg = (msg: string): void => {
    if (cliArgs.debug) {
      output.stderr(`${strings.listRulesFormat.debugPrefix} ${msg}\n`);
    }
  };

  /* Filter rules (make copies to avoid mutating caller's arrays) */
  let allTsRules: TypeScriptRule[] = [...loaded.typescript];
  let allPkgRules: PackageJsonRule[] = [...loaded.packageJson];

  /* Resolve paths from CLI or config */
  const paths: string[] = cliArgs.paths.length > 0 ? cliArgs.paths : [...config.include];

  if (paths.length === 0) {
    output.stderr(
      `${format(strings.errors.usageError, { name: LINTER_NAME })}\n` +
        `${format(strings.errors.usageErrorConfig, { configFilename: CONFIG_FILENAME })}\n`,
    );
    return { filesLinted: 0, fixesApplied: 0, results: [], ruleDescs: new Map() };
  }

  /* Filter rules by --rule= flag if specified (O(1) lookup via byId) */
  if (cliArgs.ruleIds.length > 0) {
    const ruleIdSet: ReadonlySet<string> = new Set(cliArgs.ruleIds);
    allTsRules = allTsRules.filter((r: TypeScriptRule): boolean => ruleIdSet.has(r.id));
    allPkgRules = allPkgRules.filter((r: PackageJsonRule): boolean => ruleIdSet.has(r.id));
    dbg(
      format(strings.debug.afterRuleFilter, {
        pkgCount: allPkgRules.length,
        tsCount: allTsRules.length,
      }),
    );
  }

  /* Apply config-based category/stage overrides from ruleOptions */
  applyRuleOptionsOverrides(allTsRules, config.ruleOptions);
  applyRuleOptionsOverrides(allPkgRules, config.ruleOptions);

  /* Filter rules by --category= flag if specified */
  if (cliArgs.categories.length > 0) {
    allTsRules = allTsRules.filter((r: TypeScriptRule): boolean =>
      (r.categories ?? []).some((c: string): boolean => cliArgs.categories.includes(c)),
    );
    allPkgRules = allPkgRules.filter((r: PackageJsonRule): boolean =>
      (r.categories ?? []).some((c: string): boolean => cliArgs.categories.includes(c)),
    );
    dbg(
      format(strings.debug.afterCategoryFilter, {
        categories: cliArgs.categories.join(','),
        pkgCount: allPkgRules.length,
        tsCount: allTsRules.length,
      }),
    );
  }

  /* Filter rules by --stage= flag if specified */
  if (cliArgs.stage) {
    const stageFilter: string = cliArgs.stage;
    allTsRules = allTsRules.filter((r: TypeScriptRule): boolean =>
      (r.stages ?? ['lint']).includes(stageFilter as Stage),
    );
    allPkgRules = allPkgRules.filter((r: PackageJsonRule): boolean =>
      (r.stages ?? ['lint']).includes(stageFilter as Stage),
    );
  }

  /* Filter out disabled rules — respects overrides that re-enable globally-off rules.
   * Skip when --rule= explicitly selects rules. */
  if (cliArgs.ruleIds.length === 0) {
    allTsRules = allTsRules.filter((r: TypeScriptRule): boolean =>
      isRuleEnabledAnywhere(config, r.id),
    );
    allPkgRules = allPkgRules.filter((r: PackageJsonRule): boolean =>
      isRuleEnabledAnywhere(config, r.id),
    );
  }

  /* Collect files — when --stdin-filename is set, use that as the sole file */
  const allFiles: string[] = [];
  if (cliArgs.stdinFilename && stdinContent !== undefined) {
    const resolved: string = resolve(cliArgs.stdinFilename);
    allFiles.push(resolved);
    dbg(`stdin-filename: using "${resolved}" with ${stdinContent.length} bytes from stdin`);
  } else {
    for (const p of paths) {
      const resolved: string = resolve(p);
      try {
        const s: Awaited<ReturnType<typeof stat>> = await stat(resolved);
        if (s.isDirectory()) {
          allFiles.push(...(await collectFiles(resolved, config, cwd)));
        } else if (s.isFile() && shouldLint(resolved, config)) {
          allFiles.push(resolved);
        }
      } catch {
        output.stderr(`${format(strings.errors.pathNotFound, { path: p })}\n`);
      }
    }
  }

  dbg(format(strings.debug.filesFound, { fileCount: allFiles.length, pathCount: paths.length }));

  /* When --diff is set, intersect with git-changed files */
  if (cliArgs.diff) {
    const changedFiles: Set<string> = getGitChangedFiles(cliArgs.diff);
    const beforeCount: number = allFiles.length;

    /* Remove files not in the diff set (filter in place) */
    for (let i: number = allFiles.length - 1; i >= 0; i--) {
      if (!changedFiles.has(allFiles[i] ?? '')) {
        allFiles.splice(i, 1);
      }
    }

    if (!cliArgs.json && !cliArgs.quiet) {
      output.stderr(
        `${format(strings.output.diffStatus, { changed: allFiles.length, mode: cliArgs.diff, total: beforeCount })}\n`,
      );
    }
  }

  /* Build rule description map (needed for SARIF format and API consumers) */
  const ruleDescs: Map<string, string> = new Map<string, string>();
  for (const rule of loaded.typescript) {
    ruleDescs.set(rule.id, rule.description);
  }
  for (const rule of loaded.packageJson) {
    ruleDescs.set(rule.id, rule.description);
  }
  for (const rule of loaded.workspace) {
    ruleDescs.set(rule.id, rule.description);
  }

  if (allFiles.length === 0) {
    if (!cliArgs.json && cliArgs.format !== 'json') {
      output.stdout(`${strings.output.noFiles}\n`);
    }
    return { filesLinted: 0, fixesApplied: 0, results: [], ruleDescs };
  }

  /* Initialize cache when --cache is enabled */
  const cachePath: string = resolve(cwd, CACHE_FILENAME);
  const allRuleIds: string[] = [
    ...allTsRules.map((r: TypeScriptRule): string => r.id),
    ...allPkgRules.map((r: PackageJsonRule): string => r.id),
  ];
  const ruleHash: string = computeRuleHash(allRuleIds);
  let lintCache: LintCache | null = null;

  if (cliArgs.cache && !cliArgs.stdinFilename) {
    lintCache = LintCache.load(cachePath, ruleHash);
    dbg(format(strings.debug.cacheLoaded, { count: lintCache.getEntryCount() }));
  }

  /* Handle --no-cache: delete cache file before running */
  if (!cliArgs.cache && process.argv.includes('--no-cache')) {
    LintCache.delete(cachePath);
    dbg(strings.debug.cacheDeleted);
  }

  /* Identify rules with finalize() — these need check() on ALL files for cross-file state */
  const finalizeRuleIds: Set<string> = new Set();
  for (const rule of allTsRules) {
    if (rule.finalize) {
      finalizeRuleIds.add(rule.id);
    }
  }
  const hasFinalizeRules: boolean = finalizeRuleIds.size > 0;

  /* Run TypeScript rules on each file — read all files concurrently */
  type FileTask = { filePath: string; content: string; applicableRules: TypeScriptRule[] };
  const tasks: FileTask[] = [];
  const finalizeStateTasks: FileTask[] = [];
  const cachedResults: LintResult[] = [];

  const fileContents: Map<string, string> = new Map();

  /* When stdin content is provided, use it directly instead of reading from disk */
  if (cliArgs.stdinFilename && stdinContent !== undefined) {
    const resolved: string = resolve(cliArgs.stdinFilename);
    fileContents.set(resolved, stdinContent);
  } else {
    const readResults: Array<PromiseSettledResult<string>> = await Promise.allSettled(
      allFiles.map((filePath: string): Promise<string> => readFile(filePath, 'utf8')),
    );
    for (let i: number = 0; i < allFiles.length; i++) {
      const result: PromiseSettledResult<string> | undefined = readResults[i];
      if (result?.status === 'fulfilled') {
        fileContents.set(allFiles[i] ?? '', result.value);
      }
    }
  }

  /* Fire the entire tool phase concurrently with file-content / package.json /
   * workspace rule processing. They share no mutable state (each pushes into
   * separate result arrays merged at the end). The tool phase is the dominant
   * cost workspace-wide (svelte-check + tsgo + tool registry); overlapping
   * it with the per-file rule loop saves ~its own duration on multi-core. */
  const concurrentToolsPromise: Promise<LintResult[]> =
    cliArgs.tools && !cliArgs.bail ? runToolPhase() : Promise.resolve([]);

  async function runToolPhase(): Promise<LintResult[]> {
    const out: LintResult[] = [];
    dbg(strings.debug.toolLoading);
    const toolRegistry: ToolRegistry = new ToolRegistry(strings);
    for (const tool of ALL_TOOLS) {
      toolRegistry.register(tool);
    }
    dbg(
      format(strings.debug.toolRunning, {
        fileCount: allFiles.length,
        toolCount: toolRegistry.getAll().length,
      }),
    );
    const toolResults: LintResult[] = await toolRegistry.runAll(allFiles);
    out.push(...toolResults);
    dbg(format(strings.debug.toolResults, { count: toolResults.length }));

    /* Workspace-level tools (svelte-check, tsgo, others) */
    dbg(strings.debug.workspaceToolLoading);
    for (const wsTool of ALL_WORKSPACE_TOOLS) {
      toolRegistry.registerWorkspaceTool(wsTool);
    }
    dbg(
      format(strings.debug.workspaceToolRunning, {
        toolCount: toolRegistry.getAllWorkspaceTools().length,
      }),
    );

    /* Scope per-package workspace tools to owning packages when explicit
     * paths were passed; otherwise check every package. */
    const scopeFiles: string[] = cliArgs.paths.length > 0 ? allFiles : [];

    /* svelte-check + tsgo run concurrently, each parallel-per-package, each
     * with per-package result caching keyed by input fingerprint. */
    let wsResultCount: number = 0;
    const [svelteResults, tsgoResults]: [LintResult[], LintResult[]] = await Promise.all([
      runSvelteCheckAllPackages(process.cwd(), scopeFiles, lintCache),
      runTsgoAllPackages(process.cwd(), scopeFiles, lintCache),
    ]);
    out.push(...svelteResults);
    wsResultCount += svelteResults.length;
    out.push(...tsgoResults);
    wsResultCount += tsgoResults.length;

    /* Other workspace tools: parallel single-shot invocations. */
    const perPkgToolNames: ReadonlySet<string> = new Set(['svelte-check', 'tsgo']);
    const remainingWsTools: readonly WorkspaceTool[] = toolRegistry
      .getAllWorkspaceTools()
      .filter((t: WorkspaceTool): boolean => !perPkgToolNames.has(t.name));
    const remainingResults: LintResult[][] = await Promise.all(
      remainingWsTools.map(
        (wsTool: WorkspaceTool): Promise<LintResult[]> => toolRegistry.runWorkspaceTool(wsTool),
      ),
    );
    for (const wsToolResults of remainingResults) {
      out.push(...wsToolResults);
      wsResultCount += wsToolResults.length;
    }

    dbg(format(strings.debug.workspaceToolResults, { count: wsResultCount }));
    return out;
  }
  /* Workspace fingerprint short-circuit: if every input file has the same
   * (path, mtime, size) fingerprint as last run, we know none changed.
   * Use the cached aggregate results directly and skip the per-file
   * content-hash + rule-pattern iteration entirely. Saves ~500ms-1s
   * on warm runs across thousands of files.
   * Only applies when stdin isn't being used (stdin is one-shot). */
  const workspaceFingerprint: string =
    cliArgs.stdinFilename === undefined ? fingerprintFiles(allFiles) : '';
  const wsFingerprintMatch: boolean =
    cliArgs.stdinFilename === undefined &&
    lintCache !== null &&
    lintCache.getWorkspaceFingerprint() === workspaceFingerprint;

  if (wsFingerprintMatch && lintCache) {
    cachedResults.push(...lintCache.getAllByPath(allFiles));
    /* Tell the cache one workspace-level hit happened (informational). */
    dbg(format(strings.debug.cacheStats, { hits: 1, misses: 0 }));
  } else {
    for (const filePath of allFiles) {
      const content: string | undefined = fileContents.get(filePath);
      if (content === undefined) {
        /* File not readable — skip */
        continue;
      }

      /* Check cache first */
      let cacheHit: boolean = false;
      if (lintCache) {
        const cached: LintResult[] | null = lintCache.get(filePath, content);
        if (cached) {
          cachedResults.push(...cached);
          cacheHit = true;
        }
      }

      /* Filter rules by file pattern AND per-file severity (overrides may disable) */
      const applicableRules: TypeScriptRule[] = allTsRules.filter(
        (rule: TypeScriptRule): boolean => {
          /* Check file pattern match */
          const isEmbeddedFile: boolean = EMBEDDED_CODE_EXTENSIONS.some((ext: string): boolean =>
            filePath.endsWith(ext),
          );
          const patternMatch: boolean = rule.patterns.some((pattern: string): boolean => {
            if (pattern.startsWith('**/*.')) {
              const ext: string = pattern.slice(4);
              if (filePath.endsWith(ext)) {
                return true;
              }
              // Embedded-code files also match TS patterns — their code blocks are TypeScript
              if (isEmbeddedFile && (ext === '.ts' || ext === '.svelte.ts')) {
                return true;
              }
              return false;
            }
            return filePath.includes(pattern);
          });

          if (!patternMatch) {
            return false;
          }

          /* Check override severity — skip if "off" for this file */
          const severity: string = resolveRuleSeverity(config, rule.id, filePath);
          return severity !== 'off';
        },
      );

      if (applicableRules.length === 0) {
        continue;
      }

      if (cacheHit) {
        /* Cache hit — only finalize rules need check() to populate cross-file state.
         * Non-finalize check() results are already in cachedResults. */
        if (hasFinalizeRules) {
          const finalizeRules: TypeScriptRule[] = applicableRules.filter(
            (r: TypeScriptRule): boolean => r.finalize !== undefined,
          );
          if (finalizeRules.length > 0) {
            finalizeStateTasks.push({ applicableRules: finalizeRules, content, filePath });
          }
        }
      } else {
        tasks.push({ applicableRules, content, filePath });
      }
    }
  }

  let allResults: LintResult[];
  let bailed: boolean = false;

  /* Determine parallelism mode */
  const jobCount: number = cliArgs.jobs ?? 1;
  const useWorkerPool: boolean = jobCount > 1 && !cliArgs.bail && tasks.length > 1;

  if (cliArgs.bail) {
    /* --bail: process files sequentially, stop on first error */
    const bailResult = await processBailTasks(tasks, config.ruleOptions);
    ({ bailed } = bailResult);
    allResults = bailResult.results;
  } else if (useWorkerPool) {
    /* Worker thread parallelism — distribute tasks across workers */
    dbg(format(strings.debug.workerPoolSize, { files: tasks.length, threads: jobCount }));
    const pool: WorkerPool = new WorkerPool(jobCount, strings);

    try {
      await pool.waitForReady();

      const workerTasks: WorkerTask[] = tasks.map(
        (task: FileTask, idx: number): WorkerTask => ({
          content: task.content,
          filePath: task.filePath,
          ruleIds: task.applicableRules.map((r: TypeScriptRule): string => r.id),
          ruleOptions: config.ruleOptions,
          taskId: idx,
        }),
      );

      const workerResults: WorkerResult[] = await pool.executeAll(workerTasks);

      allResults = [];
      for (const wr of workerResults) {
        if (wr.error) {
          output.stderr(
            `${format(strings.errors.workerError, { error: wr.error, taskId: wr.taskId })}\n`,
          );
        }
        allResults.push(...wr.results);
      }

      dbg(format(strings.debug.workerPoolResults, { count: allResults.length }));
    } finally {
      await pool.shutdown();
    }
  } else {
    /* Default: process all files in parallel within single thread */
    const taskResults: LintResult[][] = await Promise.all(
      tasks.map(
        (task: FileTask): Promise<LintResult[]> =>
          runTypeScriptRules(task.filePath, task.content, task.applicableRules, config.ruleOptions),
      ),
    );
    allResults = taskResults.flat();
  }

  /* Populate finalize rule state for cached files — check() must run on ALL files
   * so finalize() has complete cross-file data. Results are discarded since
   * cached check() results are already in cachedResults. */
  if (finalizeStateTasks.length > 0) {
    await Promise.all(
      finalizeStateTasks.map(
        (task: FileTask): Promise<LintResult[]> =>
          runTypeScriptRules(task.filePath, task.content, task.applicableRules, config.ruleOptions),
      ),
    );
  }
  /* Run finalize() on rules that aggregate cross-file data */
  if (!bailed) {
    for (const rule of allTsRules) {
      if (rule.finalize) {
        allResults.push(...rule.finalize());
      }
    }
  }
  /* Update cache with newly-linted file results (exclude finalize results —
   * they are cross-file aggregations that can't be correctly cached per-file) */
  if (lintCache) {
    /* Group results by file for cache storage */
    const resultsByFile: Map<string, LintResult[]> = new Map();
    for (const result of allResults) {
      if (finalizeRuleIds.has(result.ruleId)) {
        continue;
      }
      const existing: LintResult[] = resultsByFile.get(result.file) ?? [];
      existing.push(result);
      resultsByFile.set(result.file, existing);
    }

    for (const task of tasks) {
      const fileResults: LintResult[] = resultsByFile.get(task.filePath) ?? [];
      lintCache.set(task.filePath, task.content, fileResults);
    }
  }

  /* Merge cached results into allResults */
  if (cachedResults.length > 0) {
    allResults.push(...cachedResults);
    dbg(
      format(strings.debug.cacheStats, {
        hits: lintCache?.getHitCount() ?? 0,
        misses: lintCache?.getMissCount() ?? 0,
      }),
    );
  }
  /* Run package.json rules (skip if bailed) */
  const pkgFiles: string[] = [];
  for (const p of paths) {
    const resolved: string = resolve(p);
    try {
      const s: Awaited<ReturnType<typeof stat>> = await stat(resolved);
      if (s.isDirectory()) {
        pkgFiles.push(...(await collectPackageJsonFiles(resolved, config, cwd)));
      }
    } catch {
      /* skip */
    }
  }

  const workspaceRootPkg: string = resolve('package.json');
  /* Read all package.json files concurrently */
  const pkgReadResults: Array<PromiseSettledResult<string>> = await Promise.allSettled(
    pkgFiles.map((pkgPath: string): Promise<string> => readFile(pkgPath, 'utf8')),
  );
  for (let i: number = 0; i < pkgFiles.length; i++) {
    const pkgPath: string = pkgFiles[i] ?? '';
    const pkgResult: PromiseSettledResult<string> | undefined = pkgReadResults[i];
    if (pkgResult?.status !== 'fulfilled') {
      continue;
    }
    try {
      const raw: string = pkgResult.value;

      /* Per-file content-hash cache for package.json rule results.
       * Same cache mechanism the TypeScript file rules use — keyed by
       * (path, content hash). Skips JSON.parse + rule execution on hit.
       * Push to allResults directly (cachedResults has already been merged). */
      if (lintCache) {
        const cached: LintResult[] | null = lintCache.get(pkgPath, raw);
        if (cached) {
          allResults.push(...cached);
          continue;
        }
      }

      const pkg: PackageJson = JSON.parse(raw) as PackageJson;
      const isRoot: boolean = resolve(pkgPath) === workspaceRootPkg;

      /* Filter package rules by severity for this file */
      const applicablePkgRules: PackageJsonRule[] = allPkgRules.filter(
        (rule: PackageJsonRule): boolean => resolveRuleSeverity(config, rule.id, pkgPath) !== 'off',
      );

      const pkgResults: LintResult[] = runPkgRules(
        pkgPath,
        pkg,
        isRoot,
        applicablePkgRules,
        config.ruleOptions,
      );
      allResults.push(...pkgResults);

      if (lintCache) {
        lintCache.set(pkgPath, raw, pkgResults);
      }
    } catch {
      /* skip unreadable */
    }
  }
  /* Run workspace rules (skip if bailed or if only individual files were provided).
   * Workspace rules scan the entire repo so they only make sense when linting
   * directories (e.g., `resist-lint packages/` or the default config include paths). */
  const dirChecks: boolean[] = await Promise.all(
    paths.map(async (p: string): Promise<boolean> => {
      try {
        return (await stat(resolve(p))).isDirectory();
      } catch {
        return false;
      }
    }),
  );
  const hasDirectoryPaths: boolean = dirChecks.some((v: boolean): boolean => v);

  if (!bailed && hasDirectoryPaths && !cliArgs.stdinFilename && loaded.workspace.length > 0) {
    let wsRules: WorkspaceRule[] = [...loaded.workspace];

    /* Filter workspace rules by --rule= */
    if (cliArgs.ruleIds.length > 0) {
      const ruleIdSet: ReadonlySet<string> = new Set(cliArgs.ruleIds);
      wsRules = wsRules.filter((r: WorkspaceRule): boolean => ruleIdSet.has(r.id));
    }

    /* Filter workspace rules by --category= */
    if (cliArgs.categories.length > 0) {
      wsRules = wsRules.filter((r: WorkspaceRule): boolean =>
        (r.categories ?? []).some((c: string): boolean => cliArgs.categories.includes(c)),
      );
    }

    /* Filter workspace rules by --stage= */
    if (cliArgs.stage) {
      const stageFilter: string = cliArgs.stage;
      wsRules = wsRules.filter((r: WorkspaceRule): boolean =>
        (r.stages ?? ['lint']).includes(stageFilter as Stage),
      );
    }

    /* Filter out disabled workspace rules — respects overrides that re-enable globally-off rules.
     * Skip when --rule= explicitly selects rules. */
    if (cliArgs.ruleIds.length === 0) {
      wsRules = wsRules.filter((r: WorkspaceRule): boolean => isRuleEnabledAnywhere(config, r.id));
    }

    /* Path-domain scoping: when the user passes explicit paths (e.g.
     * `qa:lint packages/shared/config/core`), skip workspace rules whose
     * domain doesn't intersect those paths. Each rule ID's domain is
     * declared in WORKSPACE_RULE_DOMAINS above. Rules without a declared
     * domain run unconditionally (they're treated as truly global). */
    wsRules = wsRules.filter((r: WorkspaceRule): boolean =>
      shouldRunWorkspaceRule(r.id, cliArgs.paths),
    );

    if (wsRules.length > 0) {
      dbg(format(strings.debug.workspaceRunning, { count: wsRules.length }));
      const wsContext: ReturnType<typeof createWorkspaceContext> = createWorkspaceContext(
        resolve(cwd),
        config.exclude,
      );

      /* Per-rule input-fingerprint cache. Rules that declare `inputs(ctx)` get
       * cached results when their declared file set hasn't changed. Rules
       * without `inputs` fall through to a normal check() call (unchanged
       * behavior). Cache key namespace: `workspace:<ruleId>` with synthetic
       * pkgDir '/' since workspace rules are not package-scoped.
       *
       * Many rules share the same input set (e.g. all rules over `allFiles()`).
       * Memoize fingerprint compute by paths-key so 243× redundant statSync
       * sweeps across the same file set collapse to a single sweep. */
      const fpMemo: Map<string, string> = new Map();
      const wsResults: LintResult[][] = await Promise.all(
        wsRules.map(async (rule: WorkspaceRule): Promise<LintResult[]> => {
          if (rule.inputs && lintCache) {
            const inputFiles: readonly string[] = await rule.inputs(wsContext);
            const pathsKey: string = [...inputFiles].toSorted().join('\n');
            let fp: string | undefined = fpMemo.get(pathsKey);
            if (fp === undefined) {
              fp = fingerprintFiles(inputFiles);
              fpMemo.set(pathsKey, fp);
            }
            const cached: LintResult[] | null = lintCache.getTool(`workspace:${rule.id}`, '/', fp);
            if (cached !== null) {
              return cached;
            }
            const results: LintResult[] = await rule.check(wsContext);
            lintCache.setTool(`workspace:${rule.id}`, '/', fp, results);
            return results;
          }
          return rule.check(wsContext);
        }),
      );

      /* Post-filter: strip results from excluded paths (defense in depth) */
      const { excludeNames: wsExcNames, excludePaths: wsExcPaths } = splitExcludes(config.exclude);
      const cwdResolved: string = resolve(cwd);
      for (const results of wsResults) {
        for (const r of results) {
          const relFile: string = relative(cwdResolved, r.file);
          const parts: string[] = relFile.split('/');
          const nameExcluded: boolean = parts.some((p: string): boolean => wsExcNames.has(p));
          const pathExcluded: boolean = wsExcPaths.some(
            (ep: string): boolean => relFile === ep || relFile.startsWith(`${ep}/`),
          );
          if (!nameExcluded && !pathExcluded) {
            allResults.push(r);
          }
        }
      }

      dbg(format(strings.debug.workspaceResults, { count: wsResults.flat().length }));
    }
  }

  /* Run external tools when --tools is enabled.
   * In normal mode, tools were fired concurrently with file/pkg/workspace
   * rule processing via concurrentToolsPromise — just await + merge here.
   * In --bail mode we run them now (we couldn't pre-fire because bail can
   * short-circuit the whole pipeline before tool work would be useful). */
  if (cliArgs.tools && !bailed) {
    const toolPhaseResults: LintResult[] = cliArgs.bail
      ? await runToolPhase()
      : await concurrentToolsPromise;
    allResults.push(...toolPhaseResults);
  }

  /* Apply per-file severity from overrides (convert error to warning based on config) */
  allResults = allResults.map((result: LintResult): LintResult => {
    const severity: string = resolveRuleSeverity(config, result.ruleId, result.file);
    if (severity === 'warn' && result.severity === 'error') {
      return { ...result, severity: 'warning' };
    }
    return result;
  });

  /* Apply global --severity= override */
  if (cliArgs.severityOverride === 'off') {
    allResults = [];
  } else if (cliArgs.severityOverride === 'warn') {
    allResults = allResults.map((r: LintResult): LintResult => ({ ...r, severity: 'warning' }));
  } else if (cliArgs.severityOverride === 'error') {
    allResults = allResults.map((r: LintResult): LintResult => ({ ...r, severity: 'error' }));
  }

  /* Apply fixes if --fix */
  let fixesApplied: number = 0;
  if (cliArgs.fix && allResults.length > 0) {
    const fixesByFile: Map<string, LintFix[]> = new Map();
    for (const result of allResults) {
      if (!result.fix) {
        continue;
      }
      const existing: LintFix[] = fixesByFile.get(result.file) ?? [];
      existing.push(result.fix);
      fixesByFile.set(result.file, existing);
    }

    const fixEntries: Array<[string, LintFix[]]> = [...fixesByFile.entries()];
    const fixReads: Array<PromiseSettledResult<string>> = await Promise.allSettled(
      fixEntries.map(([fp]: [string, LintFix[]]): Promise<string> => readFile(fp, 'utf8')),
    );
    for (let i: number = 0; i < fixEntries.length; i++) {
      const [filePath, fixes] = fixEntries[i] ?? ['', []];
      const fixRead: PromiseSettledResult<string> | undefined = fixReads[i];
      if (fixRead?.status !== 'fulfilled') {
        output.stderr(`${format(strings.errors.fixFailed, { filePath })}\n`);
        continue;
      }
      try {
        const original: string = fixRead.value;
        const fixed: string = applyFixes(original, fixes);
        if (fixed !== original) {
          writeFileSync(filePath, fixed, 'utf8');
          fixesApplied++;
        }
      } catch {
        /* File write failed — skip */
        output.stderr(`${format(strings.errors.fixFailed, { filePath })}\n`);
      }
    }

    if (!cliArgs.json) {
      output.stdout(`${format(strings.errors.fixApplied, { count: fixesApplied })}\n`);
    }
  }

  /* Save cache to disk. Persist the current workspace fingerprint so the
   * next invocation can short-circuit the per-file loop when no inputs
   * have changed. Only set on full runs (not stdin one-shots). */
  if (lintCache) {
    if (cliArgs.stdinFilename === undefined && workspaceFingerprint !== '') {
      lintCache.setWorkspaceFingerprint(workspaceFingerprint);
    }
    lintCache.save(cachePath);
    dbg(
      format(strings.debug.cacheSaved, {
        entries: lintCache.getEntryCount(),
        hits: lintCache.getHitCount(),
        misses: lintCache.getMissCount(),
      }),
    );
  }

  // Populate rule description on each result from the ruleDescs map
  for (const result of allResults) {
    const desc: string | undefined = ruleDescs.get(result.ruleId);

    if (desc) {
      result.description = desc;
    }
  }

  return { filesLinted: allFiles.length, fixesApplied, results: allResults, ruleDescs };
}

/**
 * Run the full linter pipeline.
 *
 * Loads config, discovers rules, collects files, runs rules,
 * applies fixes, and outputs results. Returns an exit code.
 *
 * @param {CliArgs} cliArgs - Parsed CLI arguments
 * @param {CliOutput} output - Output sink for messages
 * @param {LintStrings} strings - Locale strings for user-facing messages
 * @returns {Promise<number>} Exit code (0 = clean, 1 = errors, 2 = crash)
 */
export async function runLinter(
  cliArgs: CliArgs,
  output: CliOutput,
  strings: LintStrings,
  stdinContent?: string,
): Promise<number> {
  /* --help flag */
  if (cliArgs.help) {
    output.stdout(buildHelpText(LINTER_NAME, CONFIG_FILENAME, SCHEMA_FILENAME, strings));
    return 0;
  }

  /**
   * Write debug message to stderr when --debug is active.
   *
   * @param msg - Debug message to output
   */
  const dbg = (msg: string): void => {
    if (cliArgs.debug) {
      output.stderr(`${strings.listRulesFormat.debugPrefix} ${msg}\n`);
    }
  };

  const lintStartTime: number = Date.now();
  const cwd: string = process.cwd();

  /* Load config */
  const config: LintConfig = loadConfig(cwd, cliArgs.configPath, strings);
  dbg(format(strings.debug.configLoaded, { path: cliArgs.configPath ?? CONFIG_FILENAME }));

  /* Merge CLI --ignore patterns into config excludes */
  if (cliArgs.ignore.length > 0) {
    config.exclude = [...config.exclude, ...cliArgs.ignore];
    dbg(format(strings.debug.ignorePatternsMerged, { count: cliArgs.ignore.length }));
  }

  /* Auto-discover all rules */
  const loaded: Awaited<ReturnType<typeof loadAllRules>> = await loadAllRules(strings);
  dbg(
    format(strings.debug.rulesLoaded, {
      pkgCount: loaded.packageJson.length,
      tsCount: loaded.typescript.length,
    }),
  );

  /* Validate config against known rule IDs — emit warnings for suspect entries */
  const knownRuleIds: Set<string> = new Set<string>();
  const optionsSchemas: Map<string, OptionsSchema> = new Map();
  for (const r of loaded.typescript) {
    knownRuleIds.add(r.id);
    if (r.optionsSchema) {
      optionsSchemas.set(r.id, r.optionsSchema);
    }
  }
  for (const r of loaded.packageJson) {
    knownRuleIds.add(r.id);
    if (r.optionsSchema) {
      optionsSchemas.set(r.id, r.optionsSchema);
    }
  }
  for (const r of loaded.workspace) {
    knownRuleIds.add(r.id);
    if (r.optionsSchema) {
      optionsSchemas.set(r.id, r.optionsSchema);
    }
  }
  const configWarnings: ConfigWarning[] = validateConfig(config, knownRuleIds, optionsSchemas);
  for (const w of configWarnings) {
    output.stderr(`[error] ${w.path}: ${w.message}\n`);
  }
  if (configWarnings.length > 0) {
    output.stderr(
      `[error] ${configWarnings.length} config validation error(s) — fix ${CONFIG_FILENAME}\n`,
    );
    return 1;
  }

  /* Auto-generate JSON Schema for IDE autocomplete */
  writeJsonSchema(loaded.typescript, loaded.packageJson, strings, loaded.workspace, cwd);

  /* List rules mode */
  if (cliArgs.listRules) {
    output.stdout(`${strings.listRules.typescriptHeader}\n\n`);
    for (const rule of loaded.typescript) {
      const severity: string = config.rules[rule.id] ?? 'error';
      const fixable: string = rule.fixable ? strings.listRules.fixable : '';
      const cats: string = (rule.categories ?? []).join(', ');
      const stgs: string = (rule.stages ?? ['lint']).join(', ');
      output.stdout(`  ${rule.id} (${severity})${fixable}\n`);
      output.stdout(`    ${rule.description}\n`);
      output.stdout(`    ${strings.listRulesFormat.patternsLabel} ${rule.patterns.join(', ')}\n`);
      output.stdout(
        `    ${strings.listRulesFormat.categoriesLabel} ${cats}  ${strings.listRulesFormat.stagesLabel} ${stgs}\n\n`,
      );
    }
    output.stdout(`${strings.listRules.packageJsonHeader}\n\n`);
    for (const rule of loaded.packageJson) {
      const severity: string = config.rules[rule.id] ?? 'error';
      const fixable: string = rule.fixable ? strings.listRules.fixable : '';
      const cats: string = (rule.categories ?? []).join(', ');
      const stgs: string = (rule.stages ?? ['lint']).join(', ');
      output.stdout(`  ${rule.id} (${severity})${fixable}\n`);
      output.stdout(`    ${rule.description}\n`);
      output.stdout(
        `    ${strings.listRulesFormat.categoriesLabel} ${cats}  ${strings.listRulesFormat.stagesLabel} ${stgs}\n\n`,
      );
    }
    if (loaded.workspace.length > 0) {
      output.stdout(`${strings.listRules.workspaceHeader}\n\n`);
      for (const rule of loaded.workspace) {
        const severity: string = config.rules[rule.id] ?? 'error';
        const fixable: string = rule.fixable ? strings.listRules.fixable : '';
        const cats: string = (rule.categories ?? []).join(', ');
        const stgs: string = (rule.stages ?? ['lint']).join(', ');
        output.stdout(`  ${rule.id} (${severity})${fixable}\n`);
        output.stdout(`    ${rule.description}\n`);
        output.stdout(
          `    ${strings.listRulesFormat.categoriesLabel} ${cats}  ${strings.listRulesFormat.stagesLabel} ${stgs}\n\n`,
        );
      }
    }
    return 0;
  }

  /* Run core lint pipeline */
  const core: LintCoreResult = await _runLintCore(
    cliArgs,
    output,
    strings,
    config,
    loaded,
    cwd,
    stdinContent,
  );

  /* When --quiet, only display errors (but still count warnings for summary) */
  const displayResults: LintResult[] = cliArgs.quiet
    ? core.results.filter((r: LintResult): boolean => r.severity === 'error')
    : core.results;

  /* Resolve output format: --format= takes priority, --json is alias for --format=json */
  const outputFormat: OutputFormat = cliArgs.format ?? (cliArgs.json ? 'json' : 'text');

  /* Format and output results */
  const formatted: string = formatResults(
    displayResults,
    outputFormat,
    core.filesLinted,
    core.ruleDescs,
    strings,
  );
  if (formatted.length > 0) {
    output.stdout(formatted);
  }

  dbg(format(strings.debug.totalTime, { ms: Date.now() - lintStartTime }));

  /* Exit with error if any errors found (unless --warn-only) */
  const hasErrors: boolean = core.results.some((r: LintResult): boolean => r.severity === 'error');
  if (cliArgs.warnOnly) {
    return 0;
  }
  return hasErrors ? 1 : 0;
}
