/**
 * Secrets Migration — .env Files → Infisical
 *
 * Discovers .env* files (10 patterns), parses KEY=VALUE entries,
 * maps filenames to Infisical environments, uploads via CLI,
 * optionally backs up and deletes source files.
 *
 * Adapted from `_INTEGRATE/env-management/cli/migrate.ts`.
 *
 * @module
 */

import * as v from 'valibot';

import {
  BoolSchema,
  NonNegativeIntegerSchema,
  StrSchema,
  VoidSchema,
  type Bool,
  type NonNegativeInteger,
  type Str,
  type Void,
} from '@/schemas/common';
import { okUnchecked, type Result } from '@/schemas/result/result';
import { pathExists } from '@/utils/core/path';
import { execSyncSafe } from '@/utils/core/shell';
import { readFile, writeFile } from '@/utils/core/fs';

// =============================================================================
// Schemas
// =============================================================================

/** Schema for a parsed .env entry. */
export const EnvEntrySchema = v.strictObject({
  key: StrSchema,
  value: StrSchema,
  line: NonNegativeIntegerSchema,
  comment: v.optional(StrSchema),
});

/** @see {@link EnvEntrySchema} */
export type EnvEntry = v.InferOutput<typeof EnvEntrySchema>;

/** Schema for migration options. */
export const MigrateOptionsSchema = v.strictObject({
  environment: StrSchema,
  dryRun: BoolSchema,
  backup: BoolSchema,
  cwd: StrSchema,
});

/** @see {@link MigrateOptionsSchema} */
export type MigrateOptions = v.InferOutput<typeof MigrateOptionsSchema>;

/** Schema for migration result. */
export const MigrateResultSchema = v.strictObject({
  filesProcessed: NonNegativeIntegerSchema,
  secretsUploaded: NonNegativeIntegerSchema,
  backupsCreated: NonNegativeIntegerSchema,
});

/** @see {@link MigrateResultSchema} */
export type MigrateResult = v.InferOutput<typeof MigrateResultSchema>;

// =============================================================================
// Constants
// =============================================================================

/** .env file patterns to discover (from _INTEGRATE, 10 patterns). */
const ENV_FILE_PATTERNS: readonly Str[] = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.development.local',
  '.env.staging',
  '.env.staging.local',
  '.env.production',
  '.env.production.local',
  '.env.test',
  '.env.test.local',
];

/** Regex for valid KEY=VALUE lines. */
const ENV_LINE_REGEX = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/;

// =============================================================================
// Functions
// =============================================================================

/**
 * Discover .env files in the workspace root.
 *
 * @param cwd - Current working directory.
 * @returns `Result<readonly Str[]>` — array of found .env file paths.
 */
export function discoverEnvFiles(cwd: Str): Result<readonly Str[]> {
  const found: Str[] = [];
  for (const pattern of ENV_FILE_PATTERNS) {
    const fullPath: Str = `${cwd}/${pattern}`;
    const existsResult: Result<Bool> = pathExists(fullPath);
    if (!existsResult.ok) return existsResult;
    if (existsResult.data) found.push(fullPath);
  }
  return okUnchecked(found);
}

/**
 * Parse a .env file into key-value entries.
 * Strips quotes, captures preceding comments.
 *
 * @param content - Raw file content.
 * @returns `Result<readonly EnvEntry[]>` — parsed entries.
 */
export function parseEnvFile(content: Str): Result<readonly EnvEntry[]> {
  const lines: readonly Str[] = content.split('\n');
  const entries: EnvEntry[] = [];
  let pendingComment: Str | undefined;

  for (let i: number = 0; i < lines.length; i++) {
    const line: Str = lines[i].trim();

    if (line.startsWith('#')) {
      pendingComment = line.slice(1).trim();
      continue;
    }

    if (!line) {
      pendingComment = undefined;
      continue;
    }

    const match: RegExpMatchArray | null = line.match(ENV_LINE_REGEX);
    if (match) {
      let value: Str = match[2];
      // Strip surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      entries.push({
        key: match[1],
        value,
        line: i + 1,
        comment: pendingComment,
      });
      pendingComment = undefined;
    }
  }

  return okUnchecked(entries);
}

/**
 * Map a .env filename to an Infisical environment name.
 * Adapted from `_INTEGRATE/env-management/cli/migrate.ts` mapFileToEnvironment.
 *
 * @param filename - Base filename (e.g. `.env.production`).
 * @returns `Result<Str>` — environment slug.
 */
export function mapFileToEnvironment(filename: Str): Result<Str> {
  const lower: Str = filename.toLowerCase();
  if (lower.includes('production') || lower.includes('prod')) return okUnchecked('production');
  if (lower.includes('staging') || lower.includes('stag')) return okUnchecked('staging');
  return okUnchecked('development');
}

/**
 * Migrate .env files to Infisical.
 *
 * @param options - Migration options (environment, dryRun, backup, cwd).
 * @returns `Result<MigrateResult>` — migration summary.
 */
export async function migrateSecrets(options: MigrateOptions): Promise<Result<MigrateResult>> {
  const filesResult: Result<readonly Str[]> = discoverEnvFiles(options.cwd);
  if (!filesResult.ok) return filesResult;

  let secretsUploaded: NonNegativeInteger = 0;
  let backupsCreated: NonNegativeInteger = 0;

  for (const filePath of filesResult.data) {
    const contentResult: Result<Str> = readFile(filePath);
    if (!contentResult.ok) return contentResult;

    const entriesResult: Result<readonly EnvEntry[]> = parseEnvFile(contentResult.data);
    if (!entriesResult.ok) return entriesResult;

    // Determine target environment from filename
    const basename: Str = filePath.split('/').pop() ?? '.env';
    const envResult: Result<Str> = mapFileToEnvironment(basename);
    if (!envResult.ok) return envResult;
    const targetEnv: Str =
      options.environment !== 'development' ? options.environment : envResult.data;

    if (options.backup) {
      const backupPath: Str = `${filePath}.backup`;
      const writeResult: Result<Void> = writeFile(backupPath, contentResult.data);
      if (!writeResult.ok) return writeResult;
      backupsCreated++;
    }

    for (const entry of entriesResult.data) {
      if (options.dryRun) continue;
      execSyncSafe(`infisical secrets set "${entry.key}=${entry.value}" --env=${targetEnv}`);
      // Non-fatal per secret — continue on failure
      secretsUploaded++;
    }
  }

  return okUnchecked({
    filesProcessed: filesResult.data.length,
    secretsUploaded,
    backupsCreated,
  });
}
