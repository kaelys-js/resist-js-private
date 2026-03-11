/**
 * Secrets Doctor — Diagnostic Checks
 *
 * Runs 8 checks to verify Infisical setup health.
 * Each check returns pass/fail with a fix suggestion.
 *
 * @module
 */

import * as v from 'valibot';

import { getConfig } from '@/config/loader';
import { BoolSchema, StrSchema, type Bool, type Str } from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import { okUnchecked, type Result } from '@/schemas/result/result';
import type { DeepReadonly } from '@/utils/core/object';
import { commandExists, execSyncSafe } from '@/utils/core/shell';
import { pathExists } from '@/utils/core/path';

// =============================================================================
// Schemas
// =============================================================================

/** Schema for a single diagnostic check result. */
export const CheckResultSchema = v.strictObject({
  name: StrSchema,
  passed: BoolSchema,
  fix: v.optional(StrSchema),
});

/** @see {@link CheckResultSchema} */
export type CheckResult = v.InferOutput<typeof CheckResultSchema>;

// =============================================================================
// Checks
// =============================================================================

/**
 * Run all 8 diagnostic checks.
 *
 * @returns `Result<readonly CheckResult[]>` — array of check results.
 */
export async function runDoctorChecks(): Promise<Result<readonly CheckResult[]>> {
  const results: CheckResult[] = [];

  // 1. CLI installed
  const cliResult: Result<Bool> = commandExists('infisical');
  if (!cliResult.ok) return cliResult;
  results.push({
    name: 'Infisical CLI installed',
    passed: cliResult.data,
    fix: cliResult.data ? undefined : 'Run: pnpm tool secrets-setup',
  });

  // 2. Authenticated
  const authResult: Result<Str> = execSyncSafe('infisical user get 2>/dev/null');
  results.push({
    name: 'Authenticated',
    passed: authResult.ok,
    fix: authResult.ok ? undefined : 'Run: pnpm tool secrets login',
  });

  // 3. .infisical.json exists
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;
  const configExistsResult: Result<Bool> = pathExists('.infisical.json');
  if (!configExistsResult.ok) return configExistsResult;
  results.push({
    name: '.infisical.json exists',
    passed: configExistsResult.data,
    fix: configExistsResult.data ? undefined : 'Run: pnpm tool secrets-setup',
  });

  // 4. Config valid (resist.config.ts loads)
  results.push({
    name: 'resist.config.ts valid',
    passed: configResult.ok,
    fix: configResult.ok ? undefined : 'Run: pnpm tool config validate',
  });

  // 5. Server connectivity
  const siteUrl: Str = configResult.data.tooling.infisical.siteUrl;
  const pingResult: Result<Str> = execSyncSafe(
    `curl -s -o /dev/null -w "%{http_code}" ${siteUrl}/api/status`,
  );
  const serverUp: Bool = pingResult.ok && pingResult.data.trim() === '200';
  results.push({
    name: 'Server reachable',
    passed: serverUp,
    fix: serverUp ? undefined : `Cannot reach ${siteUrl} — check server or network`,
  });

  // 6. Can fetch secrets
  const fetchResult: Result<Str> = execSyncSafe(
    'infisical export --env=development --format=json 2>/dev/null',
  );
  results.push({
    name: 'Secret fetch works',
    passed: fetchResult.ok,
    fix: fetchResult.ok ? undefined : 'Check project access and environment configuration',
  });

  // 7. No .env files in workspace root
  const envFileResult: Result<Bool> = pathExists('.env');
  if (!envFileResult.ok) return envFileResult;
  results.push({
    name: 'No .env in workspace root',
    passed: !envFileResult.data,
    fix: envFileResult.data ? 'Migrate .env to Infisical: pnpm tool secrets migrate' : undefined,
  });

  // 8. .env* in .gitignore
  const gitignoreResult: Result<Str> = execSyncSafe('git check-ignore .env 2>/dev/null');
  results.push({
    name: '.env in .gitignore',
    passed: gitignoreResult.ok,
    fix: gitignoreResult.ok ? undefined : 'Add .env* to .gitignore',
  });

  return okUnchecked(results);
}
