#!/usr/bin/env tsx
/**
 * Schema Updater Tool
 *
 * Downloads, copies, and caches JSON schemas from remote URLs,
 * local `node_modules` paths, or custom project paths.
 * Reads a `schemas.json` configuration file, resolves version-templated
 * URLs from lockfiles, and writes validated JSON to the schemas directory.
 *
 * Usage: `<pm> tool schema-updater [--dry-run] [--verbose]`
 *
 * @module
 */

import * as v from 'valibot';

import type { CommandContext } from '@/cli/schemas';
import type { BuiltSchemaUpdaterStrings } from '@/cli/tools/schema-updater/locales/schema';
import { TOOL_FLAG_DEFS } from '@/cli/tools/schema-updater/flags';
import { createCommand } from '@/cli/utils/command';
import { requireOnboarding } from '@/cli/utils/core';
import { getConfig } from '@/config/loader';
import {
  BoolSchema,
  NullableStrSchema,
  NonNegativeIntegerSchema,
  PathSchema,
  PositiveIntegerSchema,
  StrSchema,
  VoidSchema,
  type Bool,
  type EnsureWorkspaceRootResult,
  type Filename,
  type NonNegativeInteger,
  type NullableRegExpMatchArray,
  type NullableStr,
  type OptionalStr,
  type Path,
  type PositiveInteger,
  type Str,
  type StrArray,
  type SupportedRuntimes,
  type UntypedJson,
  type Void,
} from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import {
  PinnedVersionSchema,
  type NodeToolVersions,
  type PinnedVersion,
  type SystemToolVersions,
} from '@/schemas/core-config/versions';
import { ERRORS, err, ok, okUnchecked, type Result } from '@/schemas/result/result';
import { mkdirRecursive, readFile, writeFile } from '@/utils/core/fs';
import type { DeepReadonly } from '@/utils/core/object';
import { getDirname, joinPath, pathExists } from '@/utils/core/path';
import { execSyncSafe } from '@/utils/core/shell';
import { log } from '@/utils/core/terminal';
import { ensureWorkspaceRoot } from '@/utils/core/workspace';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Local Type Aliases
// =============================================================================

/** Schema for optional string-to-string record. */
const OptionalStrRecordSchema = v.optional(v.record(StrSchema, StrSchema));

/** @see {@link OptionalStrRecordSchema} */
type OptionalStrRecord = v.InferOutput<typeof OptionalStrRecordSchema>;

// =============================================================================
// Static Config (internal implementation details)
// =============================================================================

/** Retry configuration for transient failures. */
const RETRY = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  backoffMultiplier: 2,
  timeoutMs: 15000,
} as const;

/** HTTP configuration. */
const HTTP = {
  clientErrorMin: 400,
  clientErrorMax: 499,
  userAgent: 'schema-updater/1.0',
  transientErrorPatterns: [
    'timeout',
    'network',
    'econnreset',
    'econnrefused',
    'etimedout',
    'fetch failed',
  ],
} as const;

// =============================================================================
// Schemas
// =============================================================================

/** Version source configuration for auto-detecting package versions. */
const VersionSourceSchema = v.strictObject({
  package: StrSchema,
});

/** Version drift detection for schemas. */
const VersionCheckSchema = v.strictObject({
  /** Tool binary or package name to check version of. */
  tool: StrSchema,
  /** The tool version this schema was written/fetched for. */
  schemaWrittenForVersion: PinnedVersionSchema,
});

/** Inferred type of {@link VersionCheckSchema}. */
type VersionCheck = v.InferOutput<typeof VersionCheckSchema>;

/** Schema for a single entry in schemas.meta.json. */
const SchemaMetaEntrySchema = v.strictObject({
  /** Source type (remote, local, custom). */
  type: StrSchema,
  /** Source URL or path. */
  source: StrSchema,
  /** ISO timestamp when this schema was fetched/copied. */
  fetchedAt: StrSchema,
  /** Tool version at time of fetch (if resolvable). */
  toolVersion: NullableStrSchema,
  /** HTTP ETag from last successful fetch (remote only). */
  etag: NullableStrSchema,
});

/** Inferred type of {@link SchemaMetaEntrySchema}. */
type SchemaMetaEntry = v.InferOutput<typeof SchemaMetaEntrySchema>;

/** Schema for the full schemas.meta.json output. */
const SchemaMetaSchema = v.record(StrSchema, SchemaMetaEntrySchema);

/** Inferred type of {@link SchemaMetaSchema}. */
type SchemaMeta = v.InferOutput<typeof SchemaMetaSchema>;

/** Remote schema configuration. */
const RemoteSchemaSchema = v.strictObject({
  type: v.literal('remote'),
  url: v.pipe(StrSchema, v.url()),
  fileMatch: v.array(StrSchema),
  versionSource: v.optional(VersionSourceSchema),
  versionCheck: v.optional(VersionCheckSchema),
});

/** Local schema configuration (from node_modules). */
const LocalSchemaSchema = v.strictObject({
  type: v.literal('local'),
  path: StrSchema,
  fileMatch: v.array(StrSchema),
  versionCheck: v.optional(VersionCheckSchema),
});

/** Custom schema configuration (our own schemas). */
const CustomSchemaSchema = v.strictObject({
  type: v.literal('custom'),
  path: StrSchema,
  fileMatch: v.array(StrSchema),
  versionCheck: v.optional(VersionCheckSchema),
});

/** Union of all schema types. */
const SchemaEntrySchema = v.variant('type', [
  RemoteSchemaSchema,
  LocalSchemaSchema,
  CustomSchemaSchema,
]);

/** Configuration file format. */
const SchemaConfigSchema = v.strictObject({
  $schema: v.optional(StrSchema),
  schemas: v.record(StrSchema, SchemaEntrySchema),
});

/** Schema for a single VS Code json.schemas entry. */
const VscodeSchemaEntrySchema = v.strictObject({
  /** Glob pattern for file matching. */
  fileMatch: v.array(StrSchema),
  /** Path to the schema file. */
  url: StrSchema,
});

/** Schema for the full schemas.vscode.json output. */
const VscodeSchemaConfigSchema = v.strictObject({
  'json.schemas': v.array(VscodeSchemaEntrySchema),
});

/** Successful outcome from processing a schema. */
const SchemaOutcomeSuccessSchema = v.strictObject({
  status: v.literal('success'),
  name: StrSchema,
  content: StrSchema,
  etag: v.optional(NullableStrSchema),
});

/** Failed outcome from processing a schema. */
const SchemaOutcomeFailureSchema = v.strictObject({
  status: v.literal('failure'),
  name: StrSchema,
  error: StrSchema,
  hasExisting: BoolSchema,
});

/** Discriminated union for schema processing outcome. */
const _SchemaOutcomeSchema = v.variant('status', [
  SchemaOutcomeSuccessSchema,
  SchemaOutcomeFailureSchema,
]);

// =============================================================================
// Types
// =============================================================================

/** Inferred output type of {@link RemoteSchemaSchema}. */
type RemoteSchema = v.InferOutput<typeof RemoteSchemaSchema>;
/** Inferred output type of {@link LocalSchemaSchema}. */
type LocalSchema = v.InferOutput<typeof LocalSchemaSchema>;
/** Inferred output type of {@link CustomSchemaSchema}. */
type CustomSchema = v.InferOutput<typeof CustomSchemaSchema>;
/** Inferred output type of {@link SchemaConfigSchema}. Configuration file format. */
type SchemaConfig = v.InferOutput<typeof SchemaConfigSchema>;
/** Inferred output type of {@link SchemaOutcomeSuccessSchema}. */
type SchemaOutcomeSuccess = v.InferOutput<typeof SchemaOutcomeSuccessSchema>;
/** Inferred output type of {@link SchemaOutcomeFailureSchema}. */
type SchemaOutcomeFailure = v.InferOutput<typeof SchemaOutcomeFailureSchema>;
/** Inferred output type of {@link _SchemaOutcomeSchema}. Success or failure outcome. */
type SchemaOutcome = v.InferOutput<typeof _SchemaOutcomeSchema>;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if an error is transient (network issues, timeouts).
 *
 * @param error - The caught error value.
 * @returns `Result<Bool>` — `true` if the error matches a known transient pattern, or an error Result.
 */
function isTransientError(error: unknown): Result<Bool> {
  const message: Str = String(error).toLowerCase();
  return ok(
    BoolSchema,
    HTTP.transientErrorPatterns.some((pattern: Str) => message.includes(pattern)),
  );
}

/**
 * Check if an HTTP status code is a client error (4xx).
 *
 * @param status - HTTP response status code.
 * @returns `Result<Bool>` — `true` if the status is in the 400–499 range, or an error Result.
 */
function isClientError(status: NonNegativeInteger): Result<Bool> {
  const statusResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, status);
  if (!statusResult.ok) return statusResult;
  return ok(
    BoolSchema,
    statusResult.data >= HTTP.clientErrorMin && statusResult.data <= HTTP.clientErrorMax,
  );
}

/**
 * Calculate exponential backoff delay for a given attempt.
 *
 * @param attempt - Zero-based attempt index.
 * @returns `Result<NonNegativeInteger>` — delay in milliseconds, or an error Result.
 */
function getBackoffDelay(attempt: NonNegativeInteger): Result<NonNegativeInteger> {
  const attemptResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, attempt);
  if (!attemptResult.ok) return attemptResult;
  return ok(
    NonNegativeIntegerSchema,
    RETRY.baseDelayMs * Math.pow(RETRY.backoffMultiplier, attemptResult.data),
  );
}

/**
 * Delay execution for a specified duration.
 *
 * @param ms - Milliseconds to wait.
 * @returns `Promise<Result<Void>>` — Ok after the delay, or an error Result.
 */
async function delay(ms: NonNegativeInteger): Promise<Result<Void>> {
  const msResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, ms);
  if (!msResult.ok) return msResult;
  await new Promise((resolve) => setTimeout(resolve, msResult.data));
  return ok(VoidSchema, undefined);
}

/**
 * Check if the schemas output directory has uncommitted git changes.
 *
 * Runs `git status --porcelain` scoped to the schemas directory.
 * Returns `true` if there are staged or unstaged changes.
 *
 * @param schemasDir - Absolute path to the schemas output directory.
 * @returns `Result<Bool>` — `true` if dirty, or an error Result.
 */
function isDirtyTree(schemasDir: Path): Result<Bool> {
  const schemasDirParsed: Result<Path> = safeParse(PathSchema, schemasDir);
  if (!schemasDirParsed.ok) return schemasDirParsed;
  const result: Result<Str> = execSyncSafe(`git status --porcelain -- ${schemasDirParsed.data}`);
  if (!result.ok) return ok(BoolSchema, false); // git not available or not a repo — not dirty
  return ok(BoolSchema, result.data.trim().length > 0);
}

/**
 * Check if new content differs from the existing file on disk.
 *
 * @param outputPath - Path to the existing schema file.
 * @param newContent - Newly fetched/copied content.
 * @returns `Result<Bool>` — `true` if content has changed, or an error Result.
 */
function hasContentChanged(outputPath: Path, newContent: Str): Result<Bool> {
  const outputPathParsed: Result<Path> = safeParse(PathSchema, outputPath);
  if (!outputPathParsed.ok) return outputPathParsed;
  const existsResult: Result<Bool> = pathExists(outputPathParsed.data);
  if (!existsResult.ok) return existsResult;
  if (!existsResult.data) return ok(BoolSchema, true); // No existing file — always changed
  const existingResult: Result<Str> = readFile(outputPathParsed.data);
  if (!existingResult.ok) return ok(BoolSchema, true); // Can't read — treat as changed
  return ok(BoolSchema, existingResult.data !== newContent);
}

/**
 * Run async tasks with a concurrency limit using a semaphore pattern.
 *
 * @param tasks - Array of async task functions.
 * @param limit - Maximum number of tasks running concurrently.
 * @returns `Promise<Result<T>[]>` — array of results in original order.
 */
async function runWithConcurrency<T>(
  tasks: (() => Promise<Result<T>>)[],
  limit: PositiveInteger,
): Promise<Result<T>[]> {
  const results: Result<T>[] = new Array(tasks.length);
  let nextIndex: NonNegativeInteger = 0;

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      const index: NonNegativeInteger = nextIndex;
      nextIndex++;
      results[index] = await tasks[index]();
    }
  }

  const workerCount: NonNegativeInteger = Math.min(limit, tasks.length);
  const workers: Promise<void>[] = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Write VS Code schema association file.
 *
 * Generates `schemas.vscode.json` mapping fileMatch patterns to schema paths,
 * suitable for inclusion in `.vscode/settings.json` via the sync template.
 *
 * @param outputDir - Schemas output directory.
 * @param config - Parsed schema config with fileMatch arrays.
 * @param schemasRelPath - Relative path from workspace root to schemas directory.
 * @param strings - Built locale strings for messages.
 * @returns `Result<Void>` — Ok on success, or an error Result.
 */
function writeVscodeSettings(
  outputDir: Path,
  config: SchemaConfig,
  schemasRelPath: Str,
  strings: BuiltSchemaUpdaterStrings,
): Result<Void> {
  const outputDirParsed: Result<Path> = safeParse(PathSchema, outputDir);
  if (!outputDirParsed.ok) return outputDirParsed;

  const jsonSchemas: v.InferOutput<typeof VscodeSchemaEntrySchema>[] = [];

  for (const [name, entry] of Object.entries(config.schemas)) {
    if (entry.fileMatch.length === 0) continue;
    jsonSchemas.push({
      fileMatch: entry.fileMatch,
      url: `./${schemasRelPath}/${name}.json`,
    });
  }

  const vscodeConfig: v.InferOutput<typeof VscodeSchemaConfigSchema> = {
    'json.schemas': jsonSchemas,
  };

  const outputPathResult: Result<Path> = joinPath([outputDirParsed.data, 'schemas.vscode.json']);
  if (!outputPathResult.ok) return outputPathResult;
  const content: Str = JSON.stringify(vscodeConfig, null, '\t');
  const writeResult: Result<Void> = writeFile(outputPathResult.data, `${content}\n`);
  if (!writeResult.ok) return writeResult;

  const msg: Result<Str> = strings.infoVscodeSettingsWritten({ path: outputPathResult.data });
  if (msg.ok) log.print(`{dim}${msg.data}{/}`);

  return ok(VoidSchema, undefined);
}

/**
 * Look up a tool version by name from a Valibot-typed tool versions record.
 * Handles dynamic key access without `as` casting.
 *
 * @param tools - Tool versions record (NodeToolVersions or SystemToolVersions).
 * @param name - Tool/package name to look up.
 * @returns The version string if found, otherwise `undefined`.
 */
function lookupToolVersion(
  tools: DeepReadonly<Record<Str, PinnedVersion>>,
  name: Str,
): OptionalStr {
  return Object.hasOwn(tools, name)
    ? (tools as Readonly<Record<Str, PinnedVersion>>)[name]
    : undefined;
}

/**
 * Detect a package version from config, lockfiles, or package.json.
 *
 * Checks `resist.config.ts` versions (nodeTools, systemTools) first,
 * then searches pnpm-lock.yaml, package-lock.json, yarn.lock, and
 * falls back to the root package.json dependencies.
 *
 * @param workspaceRoot - Workspace root path.
 * @param packageName - npm package name to look up.
 * @param strings - Built locale strings for messages.
 * @param verbose - Whether to log verbose output.
 * @returns `Result<NullableStr>` — detected version string, `null` if not found, or an error Result.
 */
function detectPackageVersion(
  workspaceRoot: Path,
  packageName: Str,
  strings: BuiltSchemaUpdaterStrings,
  verbose: Bool,
): Result<NullableStr> {
  const workspaceRootParsed: Result<Path> = safeParse(PathSchema, workspaceRoot);
  if (!workspaceRootParsed.ok) return workspaceRootParsed;
  const packageNameParsed: Result<Str> = safeParse(StrSchema, packageName);
  if (!packageNameParsed.ok) return packageNameParsed;
  const verboseParsed: Result<Bool> = safeParse(BoolSchema, verbose);
  if (!verboseParsed.ok) return verboseParsed;

  // Check config versions first (exact pinned versions from resist.config.ts)
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (configResult.ok) {
    const config: DeepReadonly<CoreConfig> = configResult.data;
    // Look up in nodeTools
    const nodeTools: DeepReadonly<NodeToolVersions> = config.versions.nodeTools;
    const nodeToolVersion: OptionalStr = lookupToolVersion(nodeTools, packageNameParsed.data);
    if (nodeToolVersion) {
      if (verboseParsed.data) {
        const msg: Result<Str> = strings.infoVersionDetected({
          name: packageNameParsed.data,
          version: nodeToolVersion,
        });
        if (!msg.ok) return msg;
        log.print(`{dim}${msg.data}{/}`);
      }
      return ok(NullableStrSchema, nodeToolVersion);
    }
    // Look up in systemTools
    const systemTools: DeepReadonly<SystemToolVersions> = config.versions.systemTools;
    const systemToolVersion: OptionalStr = lookupToolVersion(systemTools, packageNameParsed.data);
    if (systemToolVersion) {
      if (verboseParsed.data) {
        const msg: Result<Str> = strings.infoVersionDetected({
          name: packageNameParsed.data,
          version: systemToolVersion,
        });
        if (!msg.ok) return msg;
        log.print(`{dim}${msg.data}{/}`);
      }
      return ok(NullableStrSchema, systemToolVersion);
    }
  }

  // Lockfile patterns by package manager
  const lockfiles: { file: Filename; pattern: (name: Str) => RegExp }[] = [
    { file: 'pnpm-lock.yaml', pattern: (name: Str) => new RegExp(`[/'"]${name}@([^:'"/]+)`, 'm') },
    {
      file: 'package-lock.json',
      pattern: (name: Str) => new RegExp(`"${name}":\\s*\\{[^}]*"version":\\s*"([^"]+)"`, 'm'),
    },
    {
      file: 'yarn.lock',
      pattern: (name: Str) => new RegExp(`"?${name}@[^"]*"?:[\\s\\S]*?version "([^"]+)"`, 'm'),
    },
  ];

  const escapedName: Str = packageNameParsed.data.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  for (const { file, pattern } of lockfiles) {
    const lockfilePathResult: Result<Path> = joinPath([workspaceRootParsed.data, file]);
    if (!lockfilePathResult.ok) continue;
    const lockfilePath: Path = lockfilePathResult.data;
    const lockfileExistsResult: Result<Bool> = pathExists(lockfilePath);
    if (!lockfileExistsResult.ok) continue;
    if (lockfileExistsResult.data) {
      const contentResult: Result<Str> = readFile(lockfilePath);
      if (!contentResult.ok) continue;
      const match: NullableRegExpMatchArray = contentResult.data.match(pattern(escapedName));
      if (match?.[1]) {
        if (verboseParsed.data) {
          const msg: Result<Str> = strings.infoVersionDetected({
            name: packageNameParsed.data,
            version: match[1],
          });
          if (!msg.ok) return msg;
          log.print(`{dim}${msg.data}{/}`);
        }
        return okUnchecked<NullableStr>(match[1]);
      }
    }
  }

  // Fallback to root package.json
  const packageJsonPathResult: Result<Path> = joinPath([workspaceRootParsed.data, 'package.json']);
  if (!packageJsonPathResult.ok) return okUnchecked<NullableStr>(null);
  const packageJsonPath: Path = packageJsonPathResult.data;
  const packageJsonExistsResult: Result<Bool> = pathExists(packageJsonPath);
  if (!packageJsonExistsResult.ok) return okUnchecked<NullableStr>(null);
  if (packageJsonExistsResult.data) {
    const contentResult: Result<Str> = readFile(packageJsonPath);
    if (contentResult.ok) {
      try {
        const pkg: Record<Str, unknown> = JSON.parse(contentResult.data);
        const rawDeps: OptionalStrRecord =
          typeof pkg.dependencies === 'object' && pkg.dependencies !== null
            ? (pkg.dependencies as OptionalStrRecord)
            : undefined;
        const rawDevDeps: OptionalStrRecord =
          typeof pkg.devDependencies === 'object' && pkg.devDependencies !== null
            ? (pkg.devDependencies as OptionalStrRecord)
            : undefined;
        const deps: Record<Str, Str> = {
          ...rawDeps,
          ...rawDevDeps,
        };
        const version: OptionalStr = deps[packageNameParsed.data];
        if (version) {
          // Strip semver range prefixes
          const cleanVersion: Str = version.replace(/^[\^~>=<]+/, '');
          if (verboseParsed.data) {
            const msg: Result<Str> = strings.infoVersionDetected({
              name: packageNameParsed.data,
              version: cleanVersion,
            });
            if (!msg.ok) return msg;
            log.print(`{dim}${msg.data}{/}`);
          }
          return okUnchecked<NullableStr>(cleanVersion);
        }
      } catch {
        // JSON parse failed — fall through
      }
    }
  }

  return okUnchecked<NullableStr>(null);
}

/**
 * Resolve a remote schema URL, substituting version placeholders.
 *
 * If the schema has a `versionSource` and the URL contains `{version}`,
 * detects the installed package version and substitutes it.
 *
 * @param schema - Remote schema configuration.
 * @param workspaceRoot - Workspace root path.
 * @param strings - Built locale strings for messages.
 * @param verbose - Whether to log verbose output.
 * @returns `Result<Str>` — resolved URL string, or an error Result.
 */
function resolveUrl(
  schema: RemoteSchema,
  workspaceRoot: Path,
  strings: BuiltSchemaUpdaterStrings,
  verbose: Bool,
): Result<Str> {
  const workspaceRootParsed: Result<Path> = safeParse(PathSchema, workspaceRoot);
  if (!workspaceRootParsed.ok) return workspaceRootParsed;
  const verboseParsed: Result<Bool> = safeParse(BoolSchema, verbose);
  if (!verboseParsed.ok) return verboseParsed;

  let url: Str = schema.url;

  if (schema.versionSource && url.includes('{version}')) {
    const versionResult: Result<NullableStr> = detectPackageVersion(
      workspaceRootParsed.data,
      schema.versionSource.package,
      strings,
      verboseParsed.data,
    );
    if (!versionResult.ok) return versionResult;
    const version: NullableStr = versionResult.data;
    if (version) {
      url = url.replace('{version}', version);
    } else {
      const msg: Result<Str> = strings.warnVersionNotFound({
        name: schema.versionSource.package,
        packageName: schema.versionSource.package,
      });
      if (!msg.ok) return msg;
      log.warn(msg.data);
      // Remove version placeholder - will likely fail but at least we tried
      url = url.replace('{version}', 'latest');
    }
  }

  return ok(StrSchema, url);
}

/**
 * Fetch a remote schema with retry logic for transient failures.
 *
 * Retries on network errors and server errors (5xx) with
 * exponential backoff. Client errors (4xx) fail immediately.
 *
 * @param name - Schema name (for logging and result tracking).
 * @param schema - Remote schema configuration.
 * @param workspaceRoot - Workspace root path.
 * @param outputPath - Path where the schema would be written.
 * @param strings - Built locale strings for messages.
 * @param verbose - Whether to log verbose output.
 * @param etag - ETag from previous fetch (for conditional requests).
 * @param force - Whether to skip ETag conditional request.
 * @returns `Promise<Result<SchemaOutcome>>` — Ok with a schema outcome indicating success or failure, or an error Result.
 */
async function fetchRemoteSchema(
  name: Str,
  schema: RemoteSchema,
  workspaceRoot: Path,
  outputPath: Path,
  strings: BuiltSchemaUpdaterStrings,
  verbose: Bool,
  etag: NullableStr,
  force: Bool,
): Promise<Result<SchemaOutcome>> {
  const nameParsed: Result<Str> = safeParse(StrSchema, name);
  if (!nameParsed.ok) return nameParsed;
  const workspaceRootParsed: Result<Path> = safeParse(PathSchema, workspaceRoot);
  if (!workspaceRootParsed.ok) return workspaceRootParsed;
  const outputPathParsed: Result<Path> = safeParse(PathSchema, outputPath);
  if (!outputPathParsed.ok) return outputPathParsed;
  const verboseParsed: Result<Bool> = safeParse(BoolSchema, verbose);
  if (!verboseParsed.ok) return verboseParsed;

  const hasExistingResult: Result<Bool> = pathExists(outputPathParsed.data);
  if (!hasExistingResult.ok) {
    return okUnchecked<SchemaOutcome>({
      status: 'failure',
      name: nameParsed.data,
      error: hasExistingResult.error.message,
      hasExisting: false,
    });
  }
  const hasExisting: Bool = hasExistingResult.data;
  const urlResult: Result<Str> = resolveUrl(
    schema,
    workspaceRootParsed.data,
    strings,
    verboseParsed.data,
  );
  if (!urlResult.ok) {
    return okUnchecked<SchemaOutcome>({
      status: 'failure',
      name: nameParsed.data,
      error: urlResult.error.message,
      hasExisting,
    });
  }
  const url: Str = urlResult.data;

  if (verboseParsed.data) {
    const msg: Result<Str> = strings.infoFetching({ name: nameParsed.data, url });
    if (!msg.ok)
      return okUnchecked<SchemaOutcome>({
        status: 'failure',
        name: nameParsed.data,
        error: msg.error.message,
        hasExisting,
      });
    log.print(`{dim}${msg.data}{/}`);
  }

  for (let attempt: NonNegativeInteger = 0; attempt < RETRY.maxAttempts; attempt++) {
    try {
      const headers: Record<Str, Str> = { 'User-Agent': HTTP.userAgent };
      if (etag && !force) {
        headers['If-None-Match'] = etag;
      }

      const response: Response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(RETRY.timeoutMs),
      });

      // Handle 304 Not Modified
      if (response.status === 304) {
        return okUnchecked<SchemaOutcome>({
          status: 'success',
          name: nameParsed.data,
          content: '',
          etag,
        });
      }

      if (!response.ok) {
        const errorMsg: Result<Str> = strings.errorHttpStatus({
          status: response.status,
          statusText: response.statusText,
        });
        if (!errorMsg.ok)
          return okUnchecked<SchemaOutcome>({
            status: 'failure',
            name: nameParsed.data,
            error: errorMsg.error.message,
            hasExisting,
          });
        const error: Str = errorMsg.data;

        const isClientResult: Result<Bool> = isClientError(response.status);
        if (!isClientResult.ok)
          return okUnchecked<SchemaOutcome>({
            status: 'failure',
            name: nameParsed.data,
            error: isClientResult.error.message,
            hasExisting,
          });
        if (isClientResult.data) {
          return okUnchecked<SchemaOutcome>({
            status: 'failure',
            name: nameParsed.data,
            error,
            hasExisting,
          });
        }

        const isLastAttempt: Bool = attempt >= RETRY.maxAttempts - 1;

        if (!isLastAttempt) {
          const backoffResult: Result<NonNegativeInteger> = getBackoffDelay(attempt);
          if (!backoffResult.ok)
            return okUnchecked<SchemaOutcome>({
              status: 'failure',
              name: nameParsed.data,
              error: backoffResult.error.message,
              hasExisting,
            });
          const backoff: NonNegativeInteger = backoffResult.data;
          if (verboseParsed.data) {
            const retryMsg: Result<Str> = strings.retryAttempt({
              attempt: attempt + 1,
              max: RETRY.maxAttempts,
              error,
              delayMs: backoff,
            });
            if (!retryMsg.ok)
              return okUnchecked<SchemaOutcome>({
                status: 'failure',
                name: nameParsed.data,
                error: retryMsg.error.message,
                hasExisting,
              });
            log.print(`{dim}${retryMsg.data}{/}`);
          }
          const delayResult: Result<Void> = await delay(backoff);
          if (!delayResult.ok)
            return okUnchecked<SchemaOutcome>({
              status: 'failure',
              name: nameParsed.data,
              error: delayResult.error.message,
              hasExisting,
            });
          continue;
        }

        return okUnchecked<SchemaOutcome>({
          status: 'failure',
          name: nameParsed.data,
          error,
          hasExisting,
        });
      }

      const content: Str = await response.text();
      const responseEtag: NullableStr = response.headers.get('etag');

      // Validate JSON
      try {
        JSON.parse(content);
      } catch {
        const msg: Result<Str> = strings.errorInvalidJson();
        if (!msg.ok)
          return okUnchecked<SchemaOutcome>({
            status: 'failure',
            name: nameParsed.data,
            error: msg.error.message,
            hasExisting,
          });
        return okUnchecked<SchemaOutcome>({
          status: 'failure',
          name: nameParsed.data,
          error: msg.data,
          hasExisting,
        });
      }

      return okUnchecked<SchemaOutcome>({
        status: 'success',
        name: nameParsed.data,
        content,
        etag: responseEtag,
      });
    } catch (caught: unknown) {
      const message: Str = caught instanceof Error ? caught.message : String(caught);
      const isTransientResult: Result<Bool> = isTransientError(caught);
      if (!isTransientResult.ok)
        return okUnchecked<SchemaOutcome>({
          status: 'failure',
          name: nameParsed.data,
          error: isTransientResult.error.message,
          hasExisting,
        });
      const isTransient: Bool = isTransientResult.data;
      const isLastAttempt: Bool = attempt >= RETRY.maxAttempts - 1;

      if (isTransient && !isLastAttempt) {
        const backoffResult: Result<NonNegativeInteger> = getBackoffDelay(attempt);
        if (!backoffResult.ok)
          return okUnchecked<SchemaOutcome>({
            status: 'failure',
            name: nameParsed.data,
            error: backoffResult.error.message,
            hasExisting,
          });
        const backoff: NonNegativeInteger = backoffResult.data;
        if (verboseParsed.data) {
          const retryMsg: Result<Str> = strings.retryAttempt({
            attempt: attempt + 1,
            max: RETRY.maxAttempts,
            error: message,
            delayMs: backoff,
          });
          if (!retryMsg.ok)
            return okUnchecked<SchemaOutcome>({
              status: 'failure',
              name: nameParsed.data,
              error: retryMsg.error.message,
              hasExisting,
            });
          log.print(`{dim}${retryMsg.data}{/}`);
        }
        const delayResult: Result<Void> = await delay(backoff);
        if (!delayResult.ok)
          return okUnchecked<SchemaOutcome>({
            status: 'failure',
            name: nameParsed.data,
            error: delayResult.error.message,
            hasExisting,
          });
        continue;
      }

      return okUnchecked<SchemaOutcome>({
        status: 'failure',
        name: nameParsed.data,
        error: message,
        hasExisting,
      });
    }
  }

  const maxRetriesMsg: Result<Str> = strings.errorMaxRetries();
  if (!maxRetriesMsg.ok)
    return okUnchecked<SchemaOutcome>({
      status: 'failure',
      name: nameParsed.data,
      error: maxRetriesMsg.error.message,
      hasExisting,
    });
  return okUnchecked<SchemaOutcome>({
    status: 'failure',
    name: nameParsed.data,
    error: maxRetriesMsg.data,
    hasExisting,
  });
}

/**
 * Copy a local schema from node_modules.
 *
 * @param name - Schema name (for logging and result tracking).
 * @param schema - Local schema configuration.
 * @param workspaceRoot - Workspace root path.
 * @param outputPath - Path where the schema would be written.
 * @param strings - Built locale strings for messages.
 * @param verbose - Whether to log verbose output.
 * @returns `Result<SchemaOutcome>` — Ok with a schema outcome indicating success or failure, or an error Result.
 */
function copyLocalSchema(
  name: Str,
  schema: LocalSchema,
  workspaceRoot: Path,
  outputPath: Path,
  strings: BuiltSchemaUpdaterStrings,
  verbose: Bool,
): Result<SchemaOutcome> {
  const nameParsed: Result<Str> = safeParse(StrSchema, name);
  if (!nameParsed.ok) return nameParsed;
  const workspaceRootParsed: Result<Path> = safeParse(PathSchema, workspaceRoot);
  if (!workspaceRootParsed.ok) return workspaceRootParsed;
  const outputPathParsed: Result<Path> = safeParse(PathSchema, outputPath);
  if (!outputPathParsed.ok) return outputPathParsed;
  const verboseParsed: Result<Bool> = safeParse(BoolSchema, verbose);
  if (!verboseParsed.ok) return verboseParsed;

  const hasExistingResult: Result<Bool> = pathExists(outputPathParsed.data);
  if (!hasExistingResult.ok) {
    return okUnchecked<SchemaOutcome>({
      status: 'failure',
      name: nameParsed.data,
      error: hasExistingResult.error.message,
      hasExisting: false,
    });
  }
  const hasExisting: Bool = hasExistingResult.data;
  const sourcePathResult: Result<Path> = joinPath([workspaceRootParsed.data, schema.path]);
  if (!sourcePathResult.ok) {
    return okUnchecked<SchemaOutcome>({
      status: 'failure',
      name: nameParsed.data,
      error: sourcePathResult.error.message,
      hasExisting,
    });
  }
  const sourcePath: Path = sourcePathResult.data;

  if (verboseParsed.data) {
    const msg: Result<Str> = strings.infoCopying({ name: nameParsed.data, path: schema.path });
    if (!msg.ok)
      return okUnchecked<SchemaOutcome>({
        status: 'failure',
        name: nameParsed.data,
        error: msg.error.message,
        hasExisting,
      });
    log.print(`{dim}${msg.data}{/}`);
  }

  const sourceExistsResult: Result<Bool> = pathExists(sourcePath);
  if (!sourceExistsResult.ok) {
    return okUnchecked<SchemaOutcome>({
      status: 'failure',
      name: nameParsed.data,
      error: sourceExistsResult.error.message,
      hasExisting,
    });
  }
  if (!sourceExistsResult.data) {
    const msg: Result<Str> = strings.errorLocalSchemaNotFound({
      name: nameParsed.data,
      path: schema.path,
    });
    if (!msg.ok)
      return okUnchecked<SchemaOutcome>({
        status: 'failure',
        name: nameParsed.data,
        error: msg.error.message,
        hasExisting,
      });
    return okUnchecked<SchemaOutcome>({
      status: 'failure',
      name: nameParsed.data,
      error: msg.data,
      hasExisting,
    });
  }

  const contentResult: Result<Str> = readFile(sourcePath);
  if (!contentResult.ok) {
    const msg: Result<Str> = strings.errorCopyFailed({
      name: nameParsed.data,
      error: contentResult.error.message,
    });
    if (!msg.ok)
      return okUnchecked<SchemaOutcome>({
        status: 'failure',
        name: nameParsed.data,
        error: msg.error.message,
        hasExisting,
      });
    return okUnchecked<SchemaOutcome>({
      status: 'failure',
      name: nameParsed.data,
      error: msg.data,
      hasExisting,
    });
  }
  // Validate JSON
  try {
    JSON.parse(contentResult.data);
  } catch {
    const msg: Result<Str> = strings.errorInvalidJson();
    if (!msg.ok)
      return okUnchecked<SchemaOutcome>({
        status: 'failure',
        name: nameParsed.data,
        error: msg.error.message,
        hasExisting,
      });
    return okUnchecked<SchemaOutcome>({
      status: 'failure',
      name: nameParsed.data,
      error: msg.data,
      hasExisting,
    });
  }
  return okUnchecked<SchemaOutcome>({
    status: 'success',
    name: nameParsed.data,
    content: contentResult.data,
  });
}

/**
 * Copy a custom schema from the schemas/ directory.
 *
 * @param name - Schema name (for logging and result tracking).
 * @param schema - Custom schema configuration.
 * @param configDir - Directory containing the schema-updater config.
 * @param outputPath - Path where the schema would be written.
 * @param strings - Built locale strings for messages.
 * @param verbose - Whether to log verbose output.
 * @returns `Result<SchemaOutcome>` — Ok with a schema outcome indicating success or failure, or an error Result.
 */
function copyCustomSchema(
  name: Str,
  schema: CustomSchema,
  configDir: Path,
  outputPath: Path,
  strings: BuiltSchemaUpdaterStrings,
  verbose: Bool,
): Result<SchemaOutcome> {
  const nameParsed: Result<Str> = safeParse(StrSchema, name);
  if (!nameParsed.ok) return nameParsed;
  const configDirParsed: Result<Path> = safeParse(PathSchema, configDir);
  if (!configDirParsed.ok) return configDirParsed;
  const outputPathParsed: Result<Path> = safeParse(PathSchema, outputPath);
  if (!outputPathParsed.ok) return outputPathParsed;
  const verboseParsed: Result<Bool> = safeParse(BoolSchema, verbose);
  if (!verboseParsed.ok) return verboseParsed;

  const hasExistingResult: Result<Bool> = pathExists(outputPathParsed.data);
  if (!hasExistingResult.ok) {
    return okUnchecked<SchemaOutcome>({
      status: 'failure',
      name: nameParsed.data,
      error: hasExistingResult.error.message,
      hasExisting: false,
    });
  }
  const hasExisting: Bool = hasExistingResult.data;
  const sourcePathResult: Result<Path> = joinPath([configDirParsed.data, schema.path]);
  if (!sourcePathResult.ok) {
    return okUnchecked<SchemaOutcome>({
      status: 'failure',
      name: nameParsed.data,
      error: sourcePathResult.error.message,
      hasExisting,
    });
  }
  const sourcePath: Path = sourcePathResult.data;

  if (verboseParsed.data) {
    const msg: Result<Str> = strings.infoCopying({ name: nameParsed.data, path: schema.path });
    if (!msg.ok)
      return okUnchecked<SchemaOutcome>({
        status: 'failure',
        name: nameParsed.data,
        error: msg.error.message,
        hasExisting,
      });
    log.print(`{dim}${msg.data}{/}`);
  }

  const sourceExistsResult: Result<Bool> = pathExists(sourcePath);
  if (!sourceExistsResult.ok) {
    return okUnchecked<SchemaOutcome>({
      status: 'failure',
      name: nameParsed.data,
      error: sourceExistsResult.error.message,
      hasExisting,
    });
  }
  if (!sourceExistsResult.data) {
    const msg: Result<Str> = strings.errorCustomSchemaNotFound({
      name: nameParsed.data,
      path: schema.path,
    });
    if (!msg.ok)
      return okUnchecked<SchemaOutcome>({
        status: 'failure',
        name: nameParsed.data,
        error: msg.error.message,
        hasExisting,
      });
    return okUnchecked<SchemaOutcome>({
      status: 'failure',
      name: nameParsed.data,
      error: msg.data,
      hasExisting,
    });
  }

  const contentResult: Result<Str> = readFile(sourcePath);
  if (!contentResult.ok) {
    const msg: Result<Str> = strings.errorCopyFailed({
      name: nameParsed.data,
      error: contentResult.error.message,
    });
    if (!msg.ok)
      return okUnchecked<SchemaOutcome>({
        status: 'failure',
        name: nameParsed.data,
        error: msg.error.message,
        hasExisting,
      });
    return okUnchecked<SchemaOutcome>({
      status: 'failure',
      name: nameParsed.data,
      error: msg.data,
      hasExisting,
    });
  }
  // Validate JSON
  try {
    JSON.parse(contentResult.data);
  } catch {
    const msg: Result<Str> = strings.errorInvalidJson();
    if (!msg.ok)
      return okUnchecked<SchemaOutcome>({
        status: 'failure',
        name: nameParsed.data,
        error: msg.error.message,
        hasExisting,
      });
    return okUnchecked<SchemaOutcome>({
      status: 'failure',
      name: nameParsed.data,
      error: msg.data,
      hasExisting,
    });
  }
  return okUnchecked<SchemaOutcome>({
    status: 'success',
    name: nameParsed.data,
    content: contentResult.data,
  });
}

/**
 * Load and validate the schema configuration file.
 *
 * Reads `schemas.json`, parses its JSON content, and validates
 * the structure against the schema config Valibot schema.
 *
 * @param configPath - Path to the schemas.json file.
 * @param strings - Built locale strings for error messages.
 * @returns `Result<SchemaConfig>` — validated schema config, or an error Result.
 */
function loadConfig(configPath: Path, strings: BuiltSchemaUpdaterStrings): Result<SchemaConfig> {
  const configPathParsed: Result<Path> = safeParse(PathSchema, configPath);
  if (!configPathParsed.ok) return configPathParsed;

  const configExistsResult: Result<Bool> = pathExists(configPathParsed.data);
  if (!configExistsResult.ok) return configExistsResult;
  if (!configExistsResult.data) {
    return err(ERRORS.CONFIG.NOT_FOUND, { meta: { path: configPathParsed.data } });
  }

  const rawContentResult: Result<Str> = readFile(configPathParsed.data);
  if (!rawContentResult.ok) {
    return err(ERRORS.IO.READ_FAILED, {
      cause: rawContentResult.error,
      meta: { path: configPathParsed.data },
    });
  }
  const rawContent: Str = rawContentResult.data;

  let parsed: UntypedJson;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    return err(ERRORS.VALIDATION.INVALID_FORMAT, {
      meta: { reason: 'Configuration file contains invalid JSON' },
    });
  }

  const result: Result<SchemaConfig> = safeParse(SchemaConfigSchema, parsed);
  if (!result.ok) {
    return err(ERRORS.VALIDATION.SCHEMA_FAILED, { meta: { reason: result.error.message } });
  }

  return okUnchecked<SchemaConfig>(result.data);
}

// =============================================================================
// Command Definition
// =============================================================================

/** CLI command instance for the schema-updater tool. */
const command = createCommand<BuiltSchemaUpdaterStrings>({
  id: 'schema-updater',
  version: '2.0.0',
  runtimes: ['node-tty', 'node-pipe'],
  flagDefs: TOOL_FLAG_DEFS,
  handler: async (ctx: CommandContext<BuiltSchemaUpdaterStrings>): Promise<Result<Void>> => {
    const strings: BuiltSchemaUpdaterStrings = ctx.locale.command;

    // Check onboarding requirement
    const onboardResult: Result<Bool> = requireOnboarding();
    if (!onboardResult.ok) return onboardResult;
    if (!onboardResult.data) {
      return err(ERRORS.CONFIG.ONBOARDING_REQUIRED);
    }
    const options = ctx.options;

    // Enforce workspace root
    const ensureResult: Result<EnsureWorkspaceRootResult> = ensureWorkspaceRoot();
    if (!ensureResult.ok) return ensureResult;
    if (ensureResult.data.status !== 'ok') {
      return err(ERRORS.WORKSPACE.ROOT_NOT_FOUND, {
        meta: { status: ensureResult.data.status, root: ensureResult.data.root },
      });
    }
    const workspaceRoot: Path = ensureResult.data.root;
    const infoWorkspaceRootMsg: Result<Str> = strings.infoWorkspaceRoot({ path: workspaceRoot });
    if (!infoWorkspaceRootMsg.ok) return infoWorkspaceRootMsg;
    log.print(`{dim}${infoWorkspaceRootMsg.data}{/}`);

    // Get paths from root config
    const coreConfigResult: Result<DeepReadonly<CoreConfig>> = getConfig();
    if (!coreConfigResult.ok) return coreConfigResult;
    const cliToolsDir: Path = coreConfigResult.data.tooling.paths.cliToolsDir;
    const schemasDir: Path = coreConfigResult.data.tooling.paths.schemasDir;

    // Load schema config
    const configPathResult: Result<Path> = joinPath([
      workspaceRoot,
      cliToolsDir,
      'schema-updater',
      'schemas.json',
    ]);
    if (!configPathResult.ok) return configPathResult;
    const configPath: Path = configPathResult.data;
    const configDirResult: Result<Path> = getDirname(configPath);
    if (!configDirResult.ok) return configDirResult;
    const configDir: Path = configDirResult.data;
    const configResult: Result<SchemaConfig> = loadConfig(configPath, strings);
    if (!configResult.ok) return configResult;
    const config: SchemaConfig = configResult.data;

    const allEntries: [Str, v.InferOutput<typeof SchemaEntrySchema>][] = Object.entries(
      config.schemas,
    );
    const totalCount: NonNegativeInteger = allEntries.length;

    if (totalCount === 0) {
      const msg: Result<Str> = strings.warnNoSchemas();
      if (!msg.ok) return msg;
      log.warn(msg.data);
      return ok(VoidSchema, undefined);
    }

    // Read tool-specific flags
    const filterValue: OptionalStr =
      typeof options.filter === 'string' ? options.filter : undefined;
    const concurrencyValue: PositiveInteger =
      typeof options.concurrency === 'number' ? options.concurrency : 6;
    const listMode: Bool = options.list === true;
    const forceMode: Bool = options.force === true;

    // Ensure output directory exists
    const outputDirResult: Result<Path> = joinPath([workspaceRoot, schemasDir]);
    if (!outputDirResult.ok) return outputDirResult;
    const outputDir: Path = outputDirResult.data;
    const outputDirExistsResult: Result<Bool> = pathExists(outputDir);
    if (!outputDirExistsResult.ok) return outputDirExistsResult;
    if (!outputDirExistsResult.data && !options.dryRun && !listMode) {
      const mkdirResult: Result<Void> = mkdirRecursive(outputDir);
      if (!mkdirResult.ok) return mkdirResult;
    }

    // Load existing metadata (for ETag + list mode)
    let existingMeta: SchemaMeta = {};
    const metaPathResult: Result<Path> = joinPath([outputDir, 'schemas.meta.json']);
    if (metaPathResult.ok) {
      const metaContentResult: Result<Str> = readFile(metaPathResult.data);
      if (metaContentResult.ok) {
        try {
          const parsed: unknown = JSON.parse(metaContentResult.data);
          const metaResult: Result<SchemaMeta> = safeParse(SchemaMetaSchema, parsed);
          if (metaResult.ok) existingMeta = metaResult.data;
        } catch {
          // Invalid JSON — start fresh
        }
      }
    }

    // Apply filter
    let entries: [Str, v.InferOutput<typeof SchemaEntrySchema>][] = allEntries;
    if (filterValue) {
      entries = allEntries.filter(([name]: [Str, v.InferOutput<typeof SchemaEntrySchema>]) =>
        name.includes(filterValue),
      );
      const filterMsg: Result<Str> = strings.infoFilterActive({
        filter: filterValue,
        matched: entries.length,
        total: totalCount,
      });
      if (!filterMsg.ok) return filterMsg;
      log.print(`{dim}${filterMsg.data}{/}`);
    }
    const entryCount: NonNegativeInteger = entries.length;

    if (entryCount === 0) {
      const msg: Result<Str> = strings.warnNoSchemas();
      if (!msg.ok) return msg;
      log.warn(msg.data);
      return ok(VoidSchema, undefined);
    }

    const infoSchemaCountMsg: Result<Str> = strings.infoSchemaCount({ count: entryCount });
    if (!infoSchemaCountMsg.ok) return infoSchemaCountMsg;
    log.print(`{dim}${infoSchemaCountMsg.data}{/}`);

    // List mode — display status and exit early
    if (listMode) {
      log.print('');
      const listHeaderMsg: Result<Str> = strings.listHeader();
      if (!listHeaderMsg.ok) return listHeaderMsg;
      log.raw(`{bold}${listHeaderMsg.data}{/}`);
      log.print('');

      for (const [name, entry] of entries) {
        const source: Str = entry.type === 'remote' ? entry.url : entry.path;
        const metaEntry: SchemaMetaEntry | undefined = existingMeta[name];
        if (metaEntry?.fetchedAt) {
          const msg: Result<Str> = strings.listEntryWithDate({
            name,
            type: entry.type,
            source,
            fetchedAt: metaEntry.fetchedAt,
          });
          if (!msg.ok) return msg;
          log.print(msg.data);
        } else {
          const msg: Result<Str> = strings.listEntry({ name, type: entry.type, source });
          if (!msg.ok) return msg;
          log.print(msg.data);
        }
      }

      log.print('');
      return ok(VoidSchema, undefined);
    }

    // Dirty working tree check
    if (!options.dryRun && !forceMode) {
      const dirtyResult: Result<Bool> = isDirtyTree(outputDir);
      if (!dirtyResult.ok) return dirtyResult;
      if (dirtyResult.data) {
        const msg: Result<Str> = strings.errorDirtyTree();
        if (!msg.ok) return msg;
        log.error(msg.data);
        return err(ERRORS.VALIDATION.INVALID_STATE, {
          meta: { reason: 'Schemas directory has uncommitted changes' },
        });
      }
    }

    log.print('');

    // Process all schemas with concurrency limit
    const tasks: (() => Promise<Result<SchemaOutcome>>)[] = entries.map(
      ([name, schema]: [Str, v.InferOutput<typeof SchemaEntrySchema>]) => {
        return async (): Promise<Result<SchemaOutcome>> => {
          const outputPathResult: Result<Path> = joinPath([outputDir, `${name}.json`]);
          if (!outputPathResult.ok) {
            return okUnchecked<SchemaOutcome>({
              status: 'failure',
              name,
              error: outputPathResult.error.message,
              hasExisting: false,
            });
          }
          const outputPath: Path = outputPathResult.data;

          if (options.dryRun) {
            return okUnchecked<SchemaOutcome>({ status: 'success', name, content: '' });
          }

          const storedEtag: NullableStr = existingMeta[name]?.etag ?? null;

          switch (schema.type) {
            case 'remote':
              return fetchRemoteSchema(
                name,
                schema,
                workspaceRoot,
                outputPath,
                strings,
                options.verbose,
                storedEtag,
                forceMode,
              );
            case 'local':
              return copyLocalSchema(
                name,
                schema,
                workspaceRoot,
                outputPath,
                strings,
                options.verbose,
              );
            case 'custom':
              return copyCustomSchema(
                name,
                schema,
                configDir,
                outputPath,
                strings,
                options.verbose,
              );
          }
        };
      },
    );

    const rawResults: Result<SchemaOutcome>[] = await runWithConcurrency(tasks, concurrencyValue);
    const results: SchemaOutcome[] = [];
    for (const raw of rawResults) {
      if (!raw.ok) return raw;
      results.push(raw.data);
    }

    // Process results
    const successes: SchemaOutcomeSuccess[] = [];
    const failures: SchemaOutcomeFailure[] = [];

    for (const result of results) {
      if (result.status === 'success') {
        successes.push(result);
      } else {
        failures.push(result);
      }
    }

    // Write successful schemas (with content change detection)
    let unchangedCount: NonNegativeInteger = 0;
    for (const success of successes) {
      if (!options.dryRun && success.content) {
        const outputPathResult: Result<Path> = joinPath([outputDir, `${success.name}.json`]);
        if (!outputPathResult.ok) {
          const msg: Result<Str> = strings.errorFetchFailed({
            name: success.name,
            error: outputPathResult.error.message,
          });
          if (!msg.ok) return msg;
          log.error(msg.data);
          continue;
        }
        const outputPath: Path = outputPathResult.data;

        // Content change detection — skip writing unchanged schemas
        if (!forceMode) {
          const changedResult: Result<Bool> = hasContentChanged(outputPath, success.content);
          if (changedResult.ok && !changedResult.data) {
            unchangedCount++;
            if (options.verbose) {
              const msg: Result<Str> = strings.infoUnchanged({ name: success.name });
              if (!msg.ok) return msg;
              log.print(`  {dim}{symbol:success} ${msg.data}{/}`);
            }
            continue;
          }
        }

        const writeResult: Result<Void> = writeFile(outputPath, success.content);
        if (!writeResult.ok) {
          const msg: Result<Str> = strings.errorFetchFailed({
            name: success.name,
            error: writeResult.error.message,
          });
          if (!msg.ok) return msg;
          log.error(msg.data);
          continue;
        }
        const msg: Result<Str> = strings.infoUpdated({ name: success.name });
        if (!msg.ok) return msg;
        log.print(`  {green}{symbol:success}{/} ${msg.data}`);
      } else if (!options.dryRun && success.content === '') {
        // 304 Not Modified or dry-run — count as unchanged
        unchangedCount++;
        if (options.verbose) {
          const msg: Result<Str> = strings.infoUnchanged({ name: success.name });
          if (!msg.ok) return msg;
          log.print(`  {dim}{symbol:success} ${msg.data}{/}`);
        }
      } else {
        const msg: Result<Str> = strings.infoUpdated({ name: success.name });
        if (!msg.ok) return msg;
        log.print(`  {green}{symbol:success}{/} ${msg.data}`);
      }
    }

    // Log failures
    for (const failure of failures) {
      if (failure.hasExisting) {
        const msg: Result<Str> = strings.warnUpdateFailed({
          name: failure.name,
          error: failure.error,
        });
        if (!msg.ok) return msg;
        log.warn(msg.data);
      } else {
        const msg: Result<Str> = strings.errorFetchFailed({
          name: failure.name,
          error: failure.error,
        });
        if (!msg.ok) return msg;
        log.error(msg.data);
      }
    }

    // Version drift detection
    for (const [name, entry] of entries) {
      const versionCheck: VersionCheck | undefined =
        'versionCheck' in entry ? entry.versionCheck : undefined;
      if (!versionCheck) continue;

      const currentVersionResult: Result<NullableStr> = detectPackageVersion(
        workspaceRoot,
        versionCheck.tool,
        strings,
        options.verbose,
      );
      if (!currentVersionResult.ok) continue;
      const currentVersion: NullableStr = currentVersionResult.data;
      if (!currentVersion) continue;

      if (currentVersion !== versionCheck.schemaWrittenForVersion) {
        const msg: Result<Str> = strings.warnVersionDrift({
          name,
          tool: versionCheck.tool,
          schemaVersion: versionCheck.schemaWrittenForVersion,
          installedVersion: currentVersion,
        });
        if (!msg.ok) return msg;
        log.warn(msg.data);
      }
    }

    // Write schemas.meta.json — records tool version + ETag at time of schema fetch
    if (!options.dryRun) {
      const meta: SchemaMeta = { ...existingMeta };
      const nowIso: Str = new Date().toISOString();

      for (const [name, entry] of entries) {
        const source: Str = entry.type === 'remote' ? entry.url : entry.path;

        // Detect tool version for entries with versionSource or versionCheck
        let toolVersion: NullableStr = null;
        if (entry.type === 'remote' && entry.versionSource) {
          const vr: Result<NullableStr> = detectPackageVersion(
            workspaceRoot,
            entry.versionSource.package,
            strings,
            false,
          );
          if (vr.ok) toolVersion = vr.data;
        }
        const versionCheck: VersionCheck | undefined =
          'versionCheck' in entry ? entry.versionCheck : undefined;
        if (!toolVersion && versionCheck) {
          const vr: Result<NullableStr> = detectPackageVersion(
            workspaceRoot,
            versionCheck.tool,
            strings,
            false,
          );
          if (vr.ok) toolVersion = vr.data;
        }

        // Get ETag from successful fetch result
        const matchingSuccess: SchemaOutcomeSuccess | undefined = successes.find(
          (s: SchemaOutcomeSuccess) => s.name === name,
        );
        const newEtag: NullableStr = matchingSuccess?.etag ?? existingMeta[name]?.etag ?? null;

        meta[name] = {
          type: entry.type,
          source,
          fetchedAt: nowIso,
          toolVersion,
          etag: newEtag,
        };
      }

      if (metaPathResult.ok) {
        const metaContent: Str = JSON.stringify(meta, null, '\t');
        const writeMetaResult: Result<Void> = writeFile(metaPathResult.data, `${metaContent}\n`);
        if (!writeMetaResult.ok) {
          log.warn('Failed to write schemas.meta.json');
        }
      }
    }

    // Write VS Code schema association file
    if (!options.dryRun) {
      const vscodeResult: Result<Void> = writeVscodeSettings(
        outputDir,
        config,
        schemasDir,
        strings,
      );
      if (!vscodeResult.ok && options.verbose) {
        log.warn('Failed to write schemas.vscode.json');
      }
    }

    // Summary
    log.print('');
    const headerSummaryMsg: Result<Str> = strings.headerSummary();
    if (!headerSummaryMsg.ok) return headerSummaryMsg;
    log.print('');
    log.raw(`{bold}${headerSummaryMsg.data}{/}`);
    log.print('');
    const updatedCount: NonNegativeInteger = successes.length - unchangedCount;
    const infoSummaryUpdatedMsg: Result<Str> = strings.infoSummaryUpdated({
      success: updatedCount,
      total: entryCount,
    });
    if (!infoSummaryUpdatedMsg.ok) return infoSummaryUpdatedMsg;
    log.print(`{dim}${infoSummaryUpdatedMsg.data}{/}`);

    if (unchangedCount > 0) {
      const msg: Result<Str> = strings.infoSummaryUnchanged({
        unchanged: unchangedCount,
        total: entryCount,
      });
      if (!msg.ok) return msg;
      log.print(`{dim}${msg.data}{/}`);
    }

    if (failures.length > 0) {
      const msg: Result<Str> = strings.infoSummaryFailed({
        failed: failures.length,
        total: entryCount,
      });
      if (!msg.ok) return msg;
      log.print(`{dim}${msg.data}{/}`);
    }

    // Check for critical failures (no fallback)
    const criticalFailures: SchemaOutcomeFailure[] = failures.filter(
      (f: SchemaOutcomeFailure) => !f.hasExisting,
    );

    if (criticalFailures.length > 0) {
      log.print('');
      const critMsg: Result<Str> = strings.errorCriticalFailures({
        count: criticalFailures.length,
      });
      if (!critMsg.ok) return critMsg;
      log.error(critMsg.data);

      for (const failure of criticalFailures) {
        log.print(`{dim}  - ${failure.name}{/}`);
      }

      return err(ERRORS.IO.FETCH_FAILED, {
        meta: { reason: `${criticalFailures.length} schemas failed with no existing fallback` },
      });
    }

    if (failures.length > 0) {
      log.print('');
      const msg: Result<Str> = strings.warnSomeNotUpdated();
      if (!msg.ok) return msg;
      log.warn(msg.data);
    }

    log.print('');

    return ok(VoidSchema, undefined);
  },
});

export { command };
export default command;
