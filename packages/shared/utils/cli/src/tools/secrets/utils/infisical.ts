/**
 * Infisical CLI Helpers
 *
 * Shared utilities for interacting with the Infisical CLI.
 * Extracted from `secrets/index.ts` and expanded with
 * `fetchSecretsJson()`, `requireInfisical()`, `getSiteUrl()`.
 *
 * @module
 */

import type { ChildProcess } from 'node:child_process';

import * as v from 'valibot';

import { getConfig } from '@/config/loader';
import {
  DEFAULT_EXIT_CODE,
  NonNegativeIntegerSchema,
  PathSchema,
  StrArraySchema,
  StrSchema,
  type Bool,
  type NonNegativeInteger,
  type OptionalPath,
  type Path,
  type Str,
  type StrArray,
} from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import type { EnvironmentName } from '@/schemas/core-config/environment';
import type { PackageManagerType } from '@/schemas/core-config/tooling';
import { ERRORS, err, ok, okUnchecked, type Result } from '@/schemas/result/result';
import type { DeepReadonly } from '@/utils/core/object';
import { isWindows, writeStderr } from '@/utils/core/process';
import { commandExists, spawnProcess } from '@/utils/core/shell';
import { log } from '@/utils/core/terminal';
import { fromUnknownError, safeParse } from '@/utils/result/safe';

// =============================================================================
// Local Type Aliases
// =============================================================================

/** Schema for nullable non-negative integer. */
const NullableNonNegativeIntegerSchema = v.nullable(NonNegativeIntegerSchema);

/** @see {@link NullableNonNegativeIntegerSchema} */
type NullableNonNegativeInteger = v.InferOutput<typeof NullableNonNegativeIntegerSchema>;

// =============================================================================
// Schemas
// =============================================================================

/** Schema for exec command and arguments. */
export const ExecArgsSchema = v.strictObject({
  execCmd: v.string(),
  execArgs: v.array(v.string()),
});

/** Exec command name and its arguments. */
export type ExecArgs = v.InferOutput<typeof ExecArgsSchema>;

// =============================================================================
// Error Classification
// =============================================================================

/**
 * Classify an Infisical CLI error from stderr output.
 *
 * Inspects the stderr content for known Infisical error patterns
 * (auth, init, permission, network) and returns a typed error Result.
 *
 * @param output - Captured stderr output from the Infisical process.
 * @returns `Result<Void>` — always an error Result matching the detected failure category.
 */
export function classifyInfisicalError(output: Str): Result<never> {
  const parsed: Result<Str> = safeParse(StrSchema, output);
  if (!parsed.ok) return parsed;
  const lowerOutput: Str = parsed.data.toLowerCase();

  if (lowerOutput.includes('you must be logged in')) {
    return err(ERRORS.AUTH.UNAUTHORIZED, {
      meta: { tool: 'infisical', reason: 'Not logged in — run: infisical login' },
    });
  }

  if (lowerOutput.includes('not yet connected') || lowerOutput.includes('.infisical.json')) {
    return err(ERRORS.CONFIG.NOT_FOUND, { meta: { path: '.infisical.json', tool: 'infisical' } });
  }

  if (
    lowerOutput.includes('permission') ||
    lowerOutput.includes('access denied') ||
    lowerOutput.includes('forbidden')
  ) {
    return err(ERRORS.AUTH.FORBIDDEN, {
      meta: { tool: 'infisical', reason: 'Permission denied for this project/environment' },
    });
  }

  if (
    lowerOutput.includes('network') ||
    lowerOutput.includes('econnrefused') ||
    lowerOutput.includes('timeout')
  ) {
    return err(ERRORS.IO.EXEC_FAILED, {
      meta: { tool: 'infisical', reason: 'Network error — check connection and try again' },
    });
  }

  return err(ERRORS.IO.EXEC_FAILED, {
    meta: { tool: 'infisical', reason: 'Unknown error — see output above for details' },
  });
}

// =============================================================================
// Argument Builders
// =============================================================================

/**
 * Build Infisical CLI arguments for secret export.
 *
 * @param environment - Target environment.
 * @param path - Optional Infisical path prefix (e.g. `/products/myapp`).
 * @returns `Result<StrArray>` — CLI arguments for the infisical export command, or a validation error.
 */
export function buildInfisicalArgs(
  environment: EnvironmentName,
  path: OptionalPath,
): Result<StrArray> {
  const envResult: Result<Str> = safeParse(StrSchema, environment);
  if (!envResult.ok) return envResult;

  const args: StrArray = ['infisical', 'export', '--env', envResult.data, '--format', 'json'];

  if (path !== undefined) {
    const pathResult: Result<Path> = safeParse(PathSchema, path);
    if (!pathResult.ok) return pathResult;
    args.push('--path', pathResult.data);
  }

  return ok(StrArraySchema, args);
}

/**
 * Build package-manager-specific exec arguments.
 *
 * Wraps infisical args with the correct exec prefix for each package manager.
 * npm uses `npx` directly (no `exec` prefix); others use `<pm> exec`.
 *
 * @param pmName - Package manager name (e.g. `"pnpm"`, `"npm"`).
 * @param infisicalArgs - Base infisical CLI arguments.
 * @returns `Result<ExecArgs>` — exec command and final arguments, or a validation error.
 */
export function buildExecArgs(pmName: Str, infisicalArgs: StrArray): Result<ExecArgs> {
  const pmResult: Result<Str> = safeParse(StrSchema, pmName);
  if (!pmResult.ok) return pmResult;

  if (pmResult.data === 'npm') {
    return okUnchecked<ExecArgs>({ execCmd: 'npx', execArgs: infisicalArgs });
  }

  return okUnchecked<ExecArgs>({ execCmd: pmResult.data, execArgs: ['exec', ...infisicalArgs] });
}

// =============================================================================
// Fetch Functions
// =============================================================================

/**
 * Fetch secrets from Infisical by spawning the CLI via the package manager.
 *
 * Stdout is inherited (secrets are printed directly to the terminal).
 * Stderr is captured to classify errors on non-zero exit.
 *
 * @param environment - Target environment.
 * @param config - Resolved core configuration (for package manager name).
 * @param path - Optional Infisical path prefix.
 * @returns `Result<NonNegativeInteger>` — exit code from Infisical, or an error Result.
 */
export function fetchSecrets(
  environment: EnvironmentName,
  config: DeepReadonly<CoreConfig>,
  path?: Path,
): Promise<Result<NonNegativeInteger>> {
  const pmName: PackageManagerType = config.tooling.packageManager.manager;

  const infisicalArgsResult: Result<StrArray> = buildInfisicalArgs(environment, path);
  if (!infisicalArgsResult.ok) return Promise.resolve(infisicalArgsResult);
  const infisicalArgs: StrArray = infisicalArgsResult.data;

  const execArgsResult: Result<ExecArgs> = buildExecArgs(pmName, infisicalArgs);
  if (!execArgsResult.ok) return Promise.resolve(execArgsResult);
  const { execCmd, execArgs }: ExecArgs = execArgsResult.data;

  const spawnResult: Result<ChildProcess> = spawnProcess(execCmd, execArgs, {
    stdio: ['inherit', 'inherit', 'pipe'],
    shell: isWindows,
  });
  if (!spawnResult.ok) return Promise.resolve(spawnResult);

  const infisical: ChildProcess = spawnResult.data;

  return new Promise((resolve) => {
    let stderrOutput: Str = '';

    infisical.stderr?.on('data', (data: Buffer) => {
      stderrOutput += data.toString();
      writeStderr(data.toString());
    });

    infisical.on('error', (error: Error) => {
      resolve(
        err(ERRORS.IO.EXEC_FAILED, {
          meta: { tool: 'infisical' },
          cause: fromUnknownError(error),
        }),
      );
    });

    infisical.on('close', (code: NullableNonNegativeInteger) => {
      const exitCode: NonNegativeInteger = code ?? DEFAULT_EXIT_CODE;

      if (exitCode !== 0) {
        log.print('');
        resolve(classifyInfisicalError(stderrOutput));
        return;
      }

      resolve(ok(NonNegativeIntegerSchema, exitCode));
    });
  });
}

/**
 * Fetch secrets as parsed JSON (captures stdout instead of inheriting).
 *
 * @param environment - Target environment.
 * @param config - Resolved core configuration.
 * @param path - Optional Infisical path prefix.
 * @returns `Result<Record<string, string>>` — parsed secret key-value pairs.
 */
export function fetchSecretsJson(
  environment: EnvironmentName,
  config: DeepReadonly<CoreConfig>,
  path?: Path,
): Promise<Result<Record<string, string>>> {
  const pmName: PackageManagerType = config.tooling.packageManager.manager;

  const infisicalArgsResult: Result<StrArray> = buildInfisicalArgs(environment, path);
  if (!infisicalArgsResult.ok) return Promise.resolve(infisicalArgsResult);
  const infisicalArgs: StrArray = infisicalArgsResult.data;

  const execArgsResult: Result<ExecArgs> = buildExecArgs(pmName, infisicalArgs);
  if (!execArgsResult.ok) return Promise.resolve(execArgsResult);
  const { execCmd, execArgs }: ExecArgs = execArgsResult.data;

  const spawnResult: Result<ChildProcess> = spawnProcess(execCmd, execArgs, {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: isWindows,
  });
  if (!spawnResult.ok) return Promise.resolve(spawnResult);

  const infisical: ChildProcess = spawnResult.data;

  return new Promise((resolve) => {
    let stdoutData: Str = '';
    let stderrOutput: Str = '';

    infisical.stdout?.on('data', (data: Buffer) => {
      stdoutData += data.toString();
    });

    infisical.stderr?.on('data', (data: Buffer) => {
      stderrOutput += data.toString();
    });

    infisical.on('error', (error: Error) => {
      resolve(
        err(ERRORS.IO.EXEC_FAILED, {
          meta: { tool: 'infisical' },
          cause: fromUnknownError(error),
        }),
      );
    });

    infisical.on('close', (code: NullableNonNegativeInteger) => {
      const exitCode: NonNegativeInteger = code ?? DEFAULT_EXIT_CODE;

      if (exitCode !== 0) {
        resolve(classifyInfisicalError(stderrOutput));
        return;
      }

      // Parse JSON output — array of { key, value, type, ... }
      let parsed: unknown;
      try {
        parsed = JSON.parse(stdoutData);
      } catch {
        resolve(
          err(ERRORS.VALIDATION.INVALID_TYPE, {
            meta: { reason: 'Failed to parse Infisical JSON output' },
          }),
        );
        return;
      }

      // Convert array to key-value record via typeof narrowing
      const secretsObj: Record<string, string> = {};
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          if (
            typeof entry === 'object' &&
            entry !== null &&
            'key' in entry &&
            'value' in entry &&
            typeof entry.key === 'string' &&
            typeof entry.value === 'string'
          ) {
            secretsObj[entry.key] = entry.value;
          }
        }
      } else if (typeof parsed === 'object' && parsed !== null) {
        // Object format fallback
        for (const [key, value] of Object.entries(parsed as Record<string, string>)) {
          if (typeof value === 'string') {
            secretsObj[key] = value;
          }
        }
      }

      resolve(okUnchecked(secretsObj));
    });
  });
}

// =============================================================================
// Shared Helpers
// =============================================================================

/**
 * Check that the Infisical CLI is available.
 *
 * @returns `Result<Bool>` — true if installed, error if not.
 */
export function requireInfisical(): Result<Bool> {
  const result: Result<Bool> = commandExists('infisical');
  if (!result.ok) return result;
  if (!result.data) {
    return err(ERRORS.IO.TOOL_NOT_FOUND, {
      meta: { tool: 'infisical', installHint: 'pnpm tool secrets-setup' },
    });
  }
  return result;
}

/**
 * Get the Infisical site URL from config and set INFISICAL_API_URL env var.
 *
 * @returns `Result<Str>` — the site URL.
 */
export function getSiteUrl(): Result<Str> {
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;
  const siteUrl: Str = configResult.data.tooling.infisical.siteUrl;
  process.env.INFISICAL_API_URL = siteUrl;
  return okUnchecked(siteUrl);
}
