/**
 * Secrets Sync — Push to Cloudflare Workers
 *
 * Fetches secrets from Infisical and pushes each to Cloudflare Workers
 * via `wrangler secret put`. Supports multi-environment sync and dry-run.
 *
 * Adapted from `_INTEGRATE/env-management/cli/sync.ts`.
 *
 * @module
 */

import * as v from 'valibot';

import {
  BoolSchema,
  NonNegativeIntegerSchema,
  StrSchema,
  type Bool,
  type NonNegativeInteger,
  type Str,
} from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import type { EnvironmentName } from '@/schemas/core-config/environment';
import { ERRORS, err, okUnchecked, type Result } from '@/schemas/result/result';
import type { DeepReadonly } from '@/utils/core/object';
import { commandExists, execSyncSafe } from '@/utils/core/shell';
import { fetchSecretsJson } from '@/cli/tools/secrets/utils/infisical';

// =============================================================================
// Schemas
// =============================================================================

/** Schema for sync options. */
export const SyncOptionsSchema = v.strictObject({
  environment: StrSchema,
  dryRun: BoolSchema,
  config: v.unknown(), // DeepReadonly<CoreConfig> — can't express in Valibot
});

/** @see {@link SyncOptionsSchema} */
export type SyncOptions = v.InferOutput<typeof SyncOptionsSchema>;

/** Schema for sync result. */
export const SyncResultSchema = v.strictObject({
  synced: NonNegativeIntegerSchema,
  errors: v.array(StrSchema),
});

/** @see {@link SyncResultSchema} */
export type SyncResult = v.InferOutput<typeof SyncResultSchema>;

// =============================================================================
// Functions
// =============================================================================

/**
 * Sync secrets to Cloudflare Workers via `wrangler secret put`.
 * Adapted from `_INTEGRATE/env-management/cli/sync.ts` syncToWorker.
 *
 * Fetches all secrets for the given environment from Infisical,
 * then pushes each to the Workers determined from config.
 *
 * @param options - Sync options with environment, dryRun, config.
 * @returns `Result<SyncResult>` — sync summary.
 */
export async function syncToWorkers(options: SyncOptions): Promise<Result<SyncResult>> {
  // Check wrangler installed
  const wranglerResult: Result<Bool> = commandExists('wrangler');
  if (!wranglerResult.ok) return wranglerResult;
  if (!wranglerResult.data) {
    return err(ERRORS.IO.TOOL_NOT_FOUND, {
      meta: { tool: 'wrangler', installHint: 'npm install -g wrangler' },
    });
  }

  const config: DeepReadonly<CoreConfig> = options.config as DeepReadonly<CoreConfig>;
  const environment: EnvironmentName = options.environment as EnvironmentName;

  // Fetch secrets from Infisical
  const secretsResult: Result<Record<string, string>> = await fetchSecretsJson(environment, config);
  if (!secretsResult.ok) return secretsResult;

  const errors: Str[] = [];
  let synced: NonNegativeInteger = 0;

  // Push each secret to wrangler
  for (const [key, value] of Object.entries(secretsResult.data)) {
    if (options.dryRun) {
      synced++;
      continue;
    }

    // Pipe value via stdin to avoid shell escaping issues
    // (same approach as _INTEGRATE/env-management/cli/sync.ts syncToWorker)
    const putResult: Result<Str> = execSyncSafe(`echo "${value}" | wrangler secret put ${key}`);
    if (putResult.ok) {
      synced++;
    } else {
      errors.push(`Failed to sync ${key}`);
    }
  }

  return okUnchecked({ synced, errors });
}
