/**
 * Shell Utilities
 *
 * Pure utilities for command execution, process spawning, and tool management.
 * No CLI dependencies — suitable for use in any context.
 *
 * All type annotations use Valibot-inferred types from `@/schemas/common`.
 *
 * @module
 */

import type { ChildProcess } from 'node:child_process';
import * as v from 'valibot';

import {
  BoolSchema,
  CommandSchema,
  EnsureCommandResultSchema,
  EnsureMiseResultSchema,
  NullableStrSchema,
  SpawnProcessOptionsSchema,
  StdioOptionSchema,
  StrArraySchema,
  StrSchema,
  VoidSchema,
  type Bool,
  type Command,
  type EnsureCommandResult,
  type EnvRecord,
  type EnvRecordWithUndefined,
  type EnsureMiseResult,
  type NullableStr,
  type OptionalEnvRecord,
  type SpawnProcessOptions,
  DEFAULT_STDIO_OPTION,
  type StdioOption,
  type Str,
  type StrArray,
  type Void,
} from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import type { PackageManagerType } from '@/schemas/core-config/tooling';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';
import { requireRuntime } from '@/utils/core/environment';
import { type OptionalNodeChildProcess, nodeChildProcess } from '@/utils/core/node-imports';
import type { DeepReadonly } from '@/utils/core/object';
import { getEnvRecord, isWindows } from '@/utils/core/process';
import { fromUnknownError, safeParse } from '@/utils/result/safe';

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Deferred require for `@/config` to avoid circular dependency.
 * Centralizes the dynamic require so no individual function needs the cast.
 *
 * @returns The config module's `getConfig` function.
 */
function _loadConfig(): typeof import('@/config') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/config') as typeof import('@/config');
}

// =============================================================================
// Command Execution
// =============================================================================

/**
 * Run a shell command synchronously.
 *
 * @param command - Non-empty command string to execute.
 * @param stdio - stdio option (defaults to `'inherit'`).
 * @param env - Optional additional environment variables.
 * @returns `Result<Str>` — command output, or an error if the command
 *          or validation fails.
 *
 * @example
 * ```typescript
 * const result = runCommand('ls -la', 'pipe');
 * if (!result.ok) return result;
 * result.data; // command output
 * ```
 */
export function runCommand(
  command: Command,
  stdio: StdioOption = DEFAULT_STDIO_OPTION,
  env?: EnvRecord,
): Result<Str> {
  const cp: OptionalNodeChildProcess = nodeChildProcess;
  if (!cp) return requireRuntime('runCommand', 'node');
  const cmdResult: Result<Command> = safeParse(CommandSchema, command);
  if (!cmdResult.ok) return cmdResult;

  const stdioResult: Result<StdioOption> = safeParse(StdioOptionSchema, stdio);
  if (!stdioResult.ok) return stdioResult;

  try {
    const envRecordResult: Result<EnvRecordWithUndefined> = getEnvRecord();
    const mergedEnv: OptionalEnvRecord =
      env && envRecordResult.ok ? { ...envRecordResult.data, ...env } : undefined;
    const output: Str =
      cp.execSync(cmdResult.data, {
        stdio: stdioResult.data,
        encoding: 'utf-8',
        env: mergedEnv,
      }) ?? '';
    return ok(StrSchema, output);
  } catch (thrown: unknown) {
    return err(ERRORS.IO.EXEC_FAILED, {
      meta: { command: cmdResult.data },
      cause: fromUnknownError(thrown),
    });
  }
}

/**
 * Run a shell command and return its trimmed output.
 *
 * @param command - Non-empty command string to execute.
 * @returns `Result<Str>` — trimmed output on success, or an error if the
 *          command or validation fails.
 *
 * @example
 * ```typescript
 * const result = execSyncSafe('git rev-parse --short HEAD');
 * if (result.ok) result.data; // 'a1b2c3d'
 * ```
 */
export function execSyncSafe(command: Command): Result<Str> {
  const cp: OptionalNodeChildProcess = nodeChildProcess;
  if (!cp) return requireRuntime('execSyncSafe', 'node');
  const cmdResult: Result<Command> = safeParse(CommandSchema, command);
  if (!cmdResult.ok) return cmdResult;

  try {
    const output: Str = cp
      .execSync(cmdResult.data, {
        stdio: 'pipe',
        encoding: 'utf-8',
      })
      .trim();
    return ok(StrSchema, output);
  } catch (thrown: unknown) {
    return err(ERRORS.IO.EXEC_FAILED, {
      meta: { command: cmdResult.data },
      cause: fromUnknownError(thrown),
    });
  }
}

/**
 * Run a shell command and return whether it succeeded.
 *
 * @param command - Non-empty command string to execute.
 * @returns `Result<Bool>` — `true` if command exited 0, `false` otherwise,
 *          or a validation error.
 *
 * @example
 * ```typescript
 * const result = execSyncBool('git diff --quiet');
 * // result.data is true when there are no changes
 * ```
 */
export function execSyncBool(command: Command): Result<Bool> {
  const cp: OptionalNodeChildProcess = nodeChildProcess;
  if (!cp) return requireRuntime('execSyncBool', 'node');
  const cmdResult: Result<Command> = safeParse(CommandSchema, command);
  if (!cmdResult.ok) return cmdResult;

  try {
    cp.execSync(cmdResult.data, { stdio: 'ignore' });
    return ok(BoolSchema, true);
  } catch {
    return ok(BoolSchema, false);
  }
}

/**
 * Spawn a child process.
 *
 * @param command - Non-empty command string to execute.
 * @param args - Command arguments.
 * @param options - Spawn options.
 * @returns `Result<ChildProcess>` — child process handle, or an error.
 *
 * @example
 * ```typescript
 * const result = spawnProcess('node', ['server.js'], { inherit: true });
 * if (!result.ok) return result;
 * ```
 */
export function spawnProcess(
  command: Command,
  args: StrArray = [],
  options: SpawnProcessOptions = {},
): Result<ChildProcess> {
  const cp: OptionalNodeChildProcess = nodeChildProcess;
  if (!cp) return requireRuntime('spawnProcess', 'node');
  const cmdResult: Result<Command> = safeParse(CommandSchema, command);
  if (!cmdResult.ok) return cmdResult;

  const argsResult: Result<StrArray> = safeParse(StrArraySchema, args);
  if (!argsResult.ok) return argsResult;

  const optionsResult: Result<SpawnProcessOptions> = safeParse(SpawnProcessOptionsSchema, options);
  if (!optionsResult.ok) return optionsResult;

  const { inherit, ...spawnOptions } = optionsResult.data;

  try {
    const child: ChildProcess = cp.spawn(cmdResult.data, argsResult.data, {
      stdio: inherit ? 'inherit' : 'pipe',
      ...spawnOptions,
    });
    // ChildProcess is an opaque Node.js handle — no structural Valibot schema applies
    return ok(v.unknown(), child);
  } catch (thrown: unknown) {
    return err(ERRORS.IO.EXEC_FAILED, {
      meta: { command: cmdResult.data },
      cause: fromUnknownError(thrown),
    });
  }
}

// =============================================================================
// Command Detection
// =============================================================================

/**
 * Check if a command exists in PATH.
 *
 * @param cmd - Non-empty command name to check.
 * @returns `Result<Bool>` — `true` if the command exists, or a validation error.
 *
 * @example
 * ```typescript
 * const result = commandExists('node');
 * // result.data is true when node is available
 * ```
 */
export function commandExists(cmd: Command): Result<Bool> {
  const cp: OptionalNodeChildProcess = nodeChildProcess;
  if (!cp) return requireRuntime('commandExists', 'node');
  const cmdResult: Result<Command> = safeParse(CommandSchema, cmd);
  if (!cmdResult.ok) return cmdResult;

  const checkCommand: Str = isWindows ? `where ${cmdResult.data}` : `command -v ${cmdResult.data}`;
  const checkResult: Result<Command> = safeParse(CommandSchema, checkCommand);
  if (!checkResult.ok) return checkResult;
  return execSyncBool(checkResult.data);
}

/**
 * Ensure a command is available, returning a structured result.
 *
 * The caller handles error display — this is a pure function with no CLI dependencies.
 *
 * @param cmd - Non-empty command name to check.
 * @param installHint - Installation instructions if command not found.
 * @returns `Result<EnsureCommandResult>` with `{ status: 'available' }` or
 *          `{ status: 'not_found', command, installHint }`.
 *
 * @example
 * ```typescript
 * const result = ensureCommand('node', 'brew install node');
 * if (!result.ok) return result;
 * if (result.data.status === 'not_found') {
 *   // install with: result.data.installHint
 * }
 * ```
 */
export function ensureCommand(cmd: Command, installHint: Command): Result<EnsureCommandResult> {
  const cp: OptionalNodeChildProcess = nodeChildProcess;
  if (!cp) return requireRuntime('ensureCommand', 'node');
  const cmdResult: Result<Command> = safeParse(CommandSchema, cmd);
  if (!cmdResult.ok) return cmdResult;

  const hintResult: Result<Command> = safeParse(CommandSchema, installHint);
  if (!hintResult.ok) return hintResult;

  const exists: Result<Bool> = commandExists(cmdResult.data);
  if (!exists.ok) return exists;

  if (exists.data) {
    return ok(EnsureCommandResultSchema, { status: 'available' });
  }

  return ok(EnsureCommandResultSchema, {
    status: 'not_found',
    command: cmdResult.data,
    installHint: hintResult.data,
  });
}

/**
 * Ensure a command is available, returning an error if not found.
 *
 * Convenience wrapper around {@link ensureCommand} that converts
 * a `'not_found'` status to an error Result.
 *
 * @param cmd - Command name to check for in PATH.
 * @param installHint - Installation instructions if command not found.
 * @returns `Result<Void>` — success, or `CONFIG.NOT_FOUND` error if command is missing.
 *
 * @example
 * ```typescript
 * const result = ensureCommandOrFail('node', 'Install from https://nodejs.org');
 * if (!result.ok) return result;
 * // Command is available
 * ```
 */
export function ensureCommandOrFail(cmd: Command, installHint: Command): Result<Void> {
  const cp: OptionalNodeChildProcess = nodeChildProcess;
  if (!cp) return requireRuntime('ensureCommandOrFail', 'node');
  const cmdResult: Result<Command> = safeParse(CommandSchema, cmd);
  if (!cmdResult.ok) return cmdResult;
  const hintResult: Result<Command> = safeParse(CommandSchema, installHint);
  if (!hintResult.ok) return hintResult;

  const result: Result<EnsureCommandResult> = ensureCommand(cmdResult.data, hintResult.data);
  if (!result.ok) return result;

  if (result.data.status === 'not_found') {
    return err(ERRORS.CONFIG.NOT_FOUND, {
      meta: { command: result.data.command, installHint: result.data.installHint },
    });
  }

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Package Manager
// =============================================================================

/**
 * Run a package manager command.
 *
 * Uses the package manager configured in the workspace config, defaults to pnpm.
 *
 * @param args - Arguments to pass to the package manager.
 * @param stdio - stdio option (defaults to `'inherit'`).
 * @param env - Optional additional environment variables.
 * @returns `Result<Str>` — command output, or an error.
 *
 * @example
 * ```typescript
 * const result = runPmCommand(['install', '--frozen-lockfile']);
 * if (!result.ok) return result;
 * ```
 */
export function runPmCommand(
  args: StrArray,
  stdio: StdioOption = DEFAULT_STDIO_OPTION,
  env?: EnvRecord,
): Result<Str> {
  const cp: OptionalNodeChildProcess = nodeChildProcess;
  if (!cp) return requireRuntime('runPmCommand', 'node');
  // Deferred require to avoid circular dependency: @/config imports @/utils/core
  const { getConfig } = _loadConfig();
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;

  const pmName: PackageManagerType = configResult.data.tooling.packageManager.manager;
  const commandStr: Str = `${pmName} ${args.join(' ')}`;
  const commandResult: Result<Command> = safeParse(CommandSchema, commandStr);
  if (!commandResult.ok) return commandResult;
  return runCommand(commandResult.data, stdio, env);
}

/**
 * Get the package manager tool command prefix for CLI examples.
 *
 * Returns `"npm run tool"` for npm (requires `run` for scripts),
 * `"{pm} tool"` for others.
 *
 * @returns `Result<Str>` — the tool command prefix, or a config error.
 *
 * @example
 * ```typescript
 * const result = getPmTool();
 * if (!result.ok) return result;
 * // result.data + ' sync --dry-run' → "pnpm tool sync --dry-run"
 * ```
 */
export function getPmTool(): Result<Str> {
  const cp: OptionalNodeChildProcess = nodeChildProcess;
  if (!cp) return requireRuntime('getPmTool', 'node');
  // Deferred require to avoid circular dependency: @/config imports @/utils/core
  const { getConfig } = _loadConfig();
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;

  const pm: PackageManagerType = configResult.data.tooling.packageManager.manager;
  return ok(StrSchema, pm === 'npm' ? 'npm run tool' : `${pm} tool`);
}

/**
 * Get the package manager exec command for direct script invocation.
 *
 * Returns `'npx'` for npm, `'yarn'` for yarn, `'bunx'` for bun, `'pnpm'` for pnpm.
 *
 * @returns `Result<Str>` — the exec command, or a config error.
 *
 * @example
 * ```typescript
 * const result = getPmExec();
 * if (!result.ok) return result;
 * // result.data + ' vitest' → "pnpm vitest"
 * ```
 */
export function getPmExec(): Result<Str> {
  const cp: OptionalNodeChildProcess = nodeChildProcess;
  if (!cp) return requireRuntime('getPmExec', 'node');
  // Deferred require to avoid circular dependency: @/config imports @/utils/core
  const { getConfig } = _loadConfig();
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;

  const pm: PackageManagerType = configResult.data.tooling.packageManager.manager;
  if (pm === 'npm') return ok(StrSchema, 'npx');
  if (pm === 'yarn') return ok(StrSchema, 'yarn');
  if (pm === 'bun') return ok(StrSchema, 'bunx');
  return ok(StrSchema, 'pnpm');
}

// =============================================================================
// Mise Management
// =============================================================================

/**
 * Check if the workspace-local mise bootstrap script exists and
 * return its version.
 * Checks `./bin/mise --version` relative to workspace root.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @returns `Result<NullableStr>` — version string if found, `null` if missing.
 */
function checkMise(workspaceRoot: Str): Result<NullableStr> {
  const cp: OptionalNodeChildProcess = nodeChildProcess;
  if (!cp) return requireRuntime('checkMise', 'node');
  const bootstrapPath: Str = `${workspaceRoot}/bin/mise`;

  try {
    const output: Str = cp
      .execSync(`${bootstrapPath} --version`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: workspaceRoot,
      })
      .trim();
    // `mise --version` outputs e.g. "2026.2.16 linux-x64"
    const match: RegExpMatchArray | null = output.match(/(\d+\.\d+\.\d+)/);
    const version: NullableStr = match?.[1] ?? null;
    return ok(NullableStrSchema, version);
  } catch {
    return ok(NullableStrSchema, null);
  }
}

/**
 * Install workspace-local mise at the specified version.
 * Uses `MISE_VERSION` + `MISE_INSTALL_PATH` env vars with the official installer.
 * Unix: `curl -fsSL https://mise.run | sh`
 * Windows: `powershell -c "irm https://mise.run | iex"`
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param version - Exact mise version to install (e.g., '2026.2.16').
 * @returns `Result<Bool>` — `true` on success.
 */
function installMise(workspaceRoot: Str, version: Str): Result<Bool> {
  const cp: OptionalNodeChildProcess = nodeChildProcess;
  if (!cp) return requireRuntime('installMise', 'node');

  const installPath: Str = `${workspaceRoot}/.mise/bin/mise`;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    MISE_VERSION: `v${version}`,
    MISE_INSTALL_PATH: installPath,
  };

  try {
    if (isWindows) {
      cp.execSync('powershell -c "irm https://mise.run | iex"', {
        stdio: 'inherit',
        env,
        cwd: workspaceRoot,
      });
    } else {
      cp.execSync('curl -fsSL https://mise.run | sh', {
        stdio: 'inherit',
        shell: '/bin/bash',
        env,
        cwd: workspaceRoot,
      });
    }

    // Generate the bootstrap script that wraps the installed binary
    // This makes `./bin/mise` the stable entry point
    cp.execSync(
      `${installPath} generate bootstrap --localize --version ${version} --write ${workspaceRoot}/bin/mise`,
      { stdio: 'inherit', cwd: workspaceRoot },
    );

    return ok(BoolSchema, true);
  } catch (thrown: unknown) {
    return err(ERRORS.IO.EXEC_FAILED, {
      meta: { command: 'mise' },
      cause: fromUnknownError(thrown),
    });
  }
}

/**
 * Ensure workspace-local mise is installed at the version pinned in config.
 * Checks `./bin/mise --version` first. If missing or wrong version, installs/updates.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param configVersion - Pinned mise version from `versions.systemTools.mise`.
 * @param dryRun - If `true`, skip actual operations and return `skipped_dry_run`.
 * @returns `Result<EnsureMiseResult>` — status variant indicating outcome.
 */
export function ensureMise(
  workspaceRoot: Str,
  configVersion: Str,
  dryRun: Bool = false,
): Result<EnsureMiseResult> {
  const cp: OptionalNodeChildProcess = nodeChildProcess;
  if (!cp) return requireRuntime('ensureMise', 'node');
  const dryRunResult: Result<Bool> = safeParse(BoolSchema, dryRun);
  if (!dryRunResult.ok) return dryRunResult;

  if (dryRunResult.data) {
    return ok(EnsureMiseResultSchema, { status: 'skipped_dry_run' });
  }

  const installedVersion: Result<NullableStr> = checkMise(workspaceRoot);
  if (!installedVersion.ok) return installedVersion;

  // Already installed at correct version
  if (installedVersion.data === configVersion) {
    return ok(EnsureMiseResultSchema, { status: 'already_installed' });
  }

  // Missing or wrong version — install/update
  const installed: Result<Bool> = installMise(workspaceRoot, configVersion);
  if (!installed.ok) return installed;

  if (installedVersion.data === null) {
    return ok(EnsureMiseResultSchema, { status: 'installed' });
  }
  return ok(EnsureMiseResultSchema, { status: 'updated' });
}
