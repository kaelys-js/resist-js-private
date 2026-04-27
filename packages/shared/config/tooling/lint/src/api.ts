/**
 * resist-lint — Programmatic API
 *
 * Provides `lint()` and `lintSource()` functions for programmatic
 * consumption without going through the CLI entry point.
 *
 * @module
 */

import * as v from 'valibot';
import { type LintConfig, loadConfig } from '@/lint/config/schema.ts';
import {
  type CliArgs,
  type CliOutput,
  type LintCoreResult,
  _runLintCore,
} from '@/lint/cli-helpers.ts';
import { runTypeScriptRules } from '@/lint/framework/oxc-runner.ts';
import { loadAllRules } from '@/lint/framework/rule-loader.ts';
import type { LintResult, TypeScriptRule, Stage } from '@/lint/framework/types.ts';
import { resolveLocale } from '@/lint/locale/registry.ts';

// =============================================================================
// Schemas
// =============================================================================

/** Schema for an in-memory source to lint (no disk I/O). */
export const LintSourceSchema = v.strictObject({
  /** Virtual file path (used for rule pattern matching). */
  filePath: v.string(),
  /** Source code content to lint. */
  content: v.string(),
});

/** An in-memory source to lint. See {@link LintSourceSchema}. */
export type LintSource = v.InferOutput<typeof LintSourceSchema>;

/** Schema for programmatic lint options. */
export const LintOptionsSchema = v.strictObject({
  /** Working directory (defaults to process.cwd()). */
  cwd: v.optional(v.string()),
  /** Custom config file path. */
  configPath: v.optional(v.string()),
  /** File/directory paths to lint from disk. */
  paths: v.optional(v.array(v.string())),
  /** Workspace package names to lint (e.g. `['@/lint', '@storylyne/editor']`). */
  packageNames: v.optional(v.array(v.string())),
  /** In-memory sources to lint (no disk I/O). */
  sources: v.optional(v.array(LintSourceSchema)),
  /** Rule IDs to run (empty = all). */
  ruleIds: v.optional(v.array(v.string())),
  /** Categories to filter by. */
  categories: v.optional(v.array(v.string())),
  /** Pipeline stage to filter by. */
  stage: v.optional(v.string()),
  /** Auto-apply fixes to disk files. */
  fix: v.optional(v.boolean()),
  /** Enable file hash caching. */
  cache: v.optional(v.boolean()),
  /** Number of worker threads. */
  jobs: v.optional(v.number()),
  /** Override all result severities. */
  severityOverride: v.optional(v.picklist(['error', 'warn', 'off'])),
  /** Locale code for messages. */
  locale: v.optional(v.string()),
  /** Run external tools (shellcheck, hadolint, etc.). */
  tools: v.optional(v.boolean()),
});

/** Programmatic lint options. See {@link LintOptionsSchema}. */
export type LintOptions = v.InferOutput<typeof LintOptionsSchema>;

/** Schema for the lint result summary returned by `lint()`. */
export const LintResultSummarySchema = v.strictObject({
  /** All lint diagnostics. */
  results: v.array(v.any()),
  /** Exit code (0 = clean, 1 = errors). */
  exitCode: v.number(),
  /** Number of files linted. */
  filesLinted: v.number(),
  /** Number of files that had fixes applied. */
  fixesApplied: v.number(),
});

/** Lint result summary. See {@link LintResultSummarySchema}. */
export type LintResultSummary = {
  readonly results: readonly LintResult[];
  readonly exitCode: number;
  readonly filesLinted: number;
  readonly fixesApplied: number;
};

// =============================================================================
// Result Types (lightweight — bridges to @/schemas/result when lint → @/cli)
// =============================================================================

/** Success result. */
type Ok<T> = { readonly ok: true; readonly data: T };

/** Error result. */
type Err = { readonly ok: false; readonly error: string };

/** Discriminated union result type. */
export type LintApiResult<T> = Ok<T> | Err;

// =============================================================================
// Silent Output Sink
// =============================================================================

/** No-op output sink for programmatic usage (suppresses all CLI output). */
const SILENT_OUTPUT: CliOutput = {
  stderr: (): void => {
    /* programmatic-API: silence stderr */
  },
  stdout: (): void => {
    /* programmatic-API: silence stdout */
  },
};

// =============================================================================
// Public API
// =============================================================================

/**
 * Lint files and/or in-memory sources programmatically.
 *
 * Supports three modes:
 * 1. **File-based**: provide `paths` to lint files from disk
 * 2. **Source-based**: provide `sources` to lint in-memory strings
 * 3. **Mixed**: both `paths` and `sources` — results are merged
 *
 * When neither `paths` nor `sources` is provided, falls back to
 * config `include` paths (same as CLI without positional args).
 *
 * @param {LintOptions} [options] - Lint configuration options
 * @returns {Promise<LintApiResult<LintResultSummary>>} Result with diagnostics or error
 *
 * @example
 * ```typescript
 * import { lint } from '@/lint/api.ts';
 *
 * const result = await lint({ paths: ['src/'] });
 * if (result.ok) {
 *   console.log(`Found ${result.data.results.length} issues`);
 * }
 * ```
 */
export async function lint(options?: LintOptions): Promise<LintApiResult<LintResultSummary>> {
  const opts: LintOptions = options ?? {};

  /* Resolve locale */
  const localeResult = resolveLocale(opts.locale);
  if (!localeResult.ok) {
    return { ok: false, error: localeResult.error };
  }
  const { strings } = localeResult;

  const cwd: string = opts.cwd ?? process.cwd();

  /* Load config */
  let config: LintConfig;
  try {
    config = loadConfig(cwd, opts.configPath, strings);
  } catch (error: unknown) {
    return { ok: false, error: String(error) };
  }

  /* Load rules */
  const loaded = await loadAllRules(strings);

  /* Build CliArgs from options (zero CLI-specific defaults) */
  const cliArgs: CliArgs = {
    bail: false,
    cache: opts.cache ?? false,
    categories: opts.categories ?? [],
    configPath: opts.configPath,
    debug: false,
    diff: undefined,
    fix: opts.fix ?? false,
    format: undefined,
    help: false,
    ignore: [],
    jobs: opts.jobs,
    json: false,
    listRules: false,
    locale: opts.locale,
    packageNames: opts.packageNames ?? [],
    paths: opts.paths ?? [],
    quiet: false,
    ruleIds: opts.ruleIds ?? [],
    severityOverride: opts.severityOverride,
    stage: opts.stage,
    tools: opts.tools ?? false,
    warnOnly: false,
  };

  /* Run core lint pipeline on file paths */
  let fileResults: LintResult[] = [];
  let filesLinted: number = 0;
  let fixesApplied: number = 0;

  const hasPaths: boolean = opts.paths !== undefined && opts.paths.length > 0;
  const hasExplicitInputs: boolean = opts.paths !== undefined || opts.sources !== undefined;

  /* Run file-based linting when paths are given, or when no explicit inputs and config has includes */
  if (hasPaths || (!hasExplicitInputs && config.include.length > 0)) {
    const core: LintCoreResult = await _runLintCore(
      cliArgs,
      SILENT_OUTPUT,
      strings,
      config,
      loaded,
      cwd,
    );
    fileResults = [...core.results];
    ({ filesLinted } = core);
    ({ fixesApplied } = core);
  }

  /* Run in-memory source linting */
  const sourceResults: LintResult[] = [];
  if (opts.sources && opts.sources.length > 0) {
    let tsRules: TypeScriptRule[] = [...loaded.typescript];

    /* Filter by ruleIds */
    if (cliArgs.ruleIds.length > 0) {
      const ruleIdSet: ReadonlySet<string> = new Set(cliArgs.ruleIds);
      tsRules = tsRules.filter((r: TypeScriptRule): boolean => ruleIdSet.has(r.id));
    }

    /* Filter by categories */
    if (cliArgs.categories.length > 0) {
      tsRules = tsRules.filter((r: TypeScriptRule): boolean =>
        (r.categories ?? []).some((c: string): boolean => cliArgs.categories.includes(c)),
      );
    }

    /* Filter by stage */
    if (cliArgs.stage) {
      const stageFilter: string = cliArgs.stage;
      tsRules = tsRules.filter((r: TypeScriptRule): boolean =>
        (r.stages ?? ['lint']).includes(stageFilter as Stage),
      );
    }

    /* Filter out disabled rules */
    tsRules = tsRules.filter(
      (r: TypeScriptRule): boolean => (config.rules[r.id] ?? 'error') !== 'off',
    );

    for (const source of opts.sources) {
      /* Filter rules by file pattern */
      const applicableRules: TypeScriptRule[] = tsRules.filter((rule: TypeScriptRule): boolean =>
        rule.patterns.some((pattern: string): boolean => {
          if (pattern.startsWith('**/*.')) {
            const ext: string = pattern.slice(4);
            return source.filePath.endsWith(ext);
          }
          return source.filePath.includes(pattern);
        }),
      );

      if (applicableRules.length > 0) {
        const results: LintResult[] = await runTypeScriptRules(
          source.filePath,
          source.content,
          applicableRules,
          config.ruleOptions,
        );
        sourceResults.push(...results);
      }
    }

    filesLinted += opts.sources.length;
  }

  /* Merge results */
  const allResults: readonly LintResult[] = [...fileResults, ...sourceResults];
  const hasErrors: boolean = allResults.some((r: LintResult): boolean => r.severity === 'error');

  return {
    ok: true,
    data: {
      exitCode: hasErrors ? 1 : 0,
      filesLinted,
      fixesApplied,
      results: allResults,
    },
  };
}

/**
 * Lint a single in-memory source string.
 *
 * Convenience wrapper around {@link lint} for linting one source
 * without disk I/O. Useful for editor integrations and testing.
 *
 * @param {LintSource} source - Source to lint (filePath + content)
 * @param {Pick<LintOptions, 'ruleIds' | 'categories' | 'locale'>} [options] - Optional filters
 * @returns {Promise<LintApiResult<readonly LintResult[]>>} Lint results or error
 *
 * @example
 * ```typescript
 * import { lintSource } from '@/lint/api.ts';
 *
 * const result = await lintSource({
 *   filePath: 'virtual.ts',
 *   content: 'export const x = 1;',
 * });
 * if (result.ok) {
 *   console.log(`Found ${result.data.length} issues`);
 * }
 * ```
 */
export async function lintSource(
  source: LintSource,
  options?: Pick<LintOptions, 'ruleIds' | 'categories' | 'locale'>,
): Promise<LintApiResult<readonly LintResult[]>> {
  const result = await lint({
    ...options,
    paths: [],
    sources: [source],
  });

  if (!result.ok) {
    return result;
  }

  return { ok: true, data: result.data.results };
}
