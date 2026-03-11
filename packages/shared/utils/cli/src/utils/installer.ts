/**
 * Tool Installer
 *
 * Checks tool availability and installs missing tools.
 * Used by the format tool (`--install-tools`) and
 * dev-proxy (auto-install hard prerequisites).
 *
 * Node tools → root workspace devDependencies (exact versions from config).
 * System tools → workspace-local mise (`./bin/mise install`).
 *
 * Installer error messages use `BuiltCliStrings.installer` — callers
 * pass their resolved CLI strings so the correct locale is used.
 *
 * Every function returns `Result<T>`. No function throws.
 *
 * @module
 */

import type { ChildProcess } from 'node:child_process';
import * as v from 'valibot';

import type { BuiltCliStrings } from '@/cli/locale/schema';
import {
  InstallCommandSchema,
  InstallCommandsRecordSchema,
  ToolNameSchema,
  type InstallCommand,
  type InstallCommandsRecord,
  type ToolName,
} from '@/cli/schemas';
import { getConfig } from '@/config/loader';
import {
  BoolSchema,
  CommandSchema,
  NullableStrSchema,
  NonNegativeIntegerSchema,
  PathSchema,
  StrArraySchema,
  StrSchema,
  VoidSchema,
  type Bool,
  type Command,
  type ExitCode,
  type NonNegativeInteger,
  type NullableRegExpMatchArray,
  type NullableStr,
  type Path,
  type OptionalBool,
  type OptionalStr,
  type Str,
  type StrArray,
  type NullableExitCode,
  type NullableStrArray,
  type Void,
} from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import type { PackageManagerType } from '@/schemas/core-config/tooling';
import {
  type NodeToolVersions,
  type PinnedVersion,
  type SystemToolVersions,
} from '@/schemas/core-config/versions';
import { ERRORS, type Result, err, ok } from '@/schemas/result/result';
import type { DeepReadonly } from '@/utils/core/object';
import { getHomedir, joinPath, pathExists } from '@/utils/core/path';
import { getEnvVar, isLinux, isMacOS, isWindows } from '@/utils/core/process';
import { execSyncBool, execSyncSafe, spawnProcess } from '@/utils/core/shell';
import { fromUnknownError, safeParse } from '@/utils/result/safe';

// =============================================================================
// Local Type Aliases
// =============================================================================

/** Schema for optional install command. */
const OptionalInstallCommandSchema = v.optional(InstallCommandSchema);

/** `InstallCommand` or `undefined` — result of indexing `InstallCommandsRecord`. @see {@link OptionalInstallCommandSchema} */
type OptionalInstallCommand = v.InferOutput<typeof OptionalInstallCommandSchema>;

/**
 * `Promise<Result<Void>>` or `undefined` — result of `Map.get()` for in-progress installs.
 *
 * **Why type alias (not schema):** `Promise` is a deferred value — Valibot cannot validate
 * unresolved promises. The resolved value `Result<Void>` has `OkSchema`/`ErrSchema`.
 */
type OptionalPendingInstall = Promise<Result<Void>> | undefined;

// =============================================================================
// Mise Backend Mapping
// =============================================================================

/** Mise backend identifiers for tools not in the default registry. */
const MiseBackendsSchema = v.record(StrSchema, StrSchema);
type MiseBackends = v.InferOutput<typeof MiseBackendsSchema>;

const MISE_BACKENDS: MiseBackends = {
  'swift-format': 'ubi:apple/swift-format',
  scalafmt: 'ubi:scalameta/scalafmt',
  rubocop: 'ubi:rubocop/rubocop',
  rufo: 'ubi:ruby-formatter/rufo',
  csharpier: 'ubi:belav/csharpier',
  'gitlab-ci-local': 'npm:gitlab-ci-local',
};

// =============================================================================
// Tool Availability Cache
// =============================================================================

/** Cache for tool availability checks. */
const toolCache: Map<ToolName, Bool> = new Map();

/**
 * Clears the tool availability cache.
 * Primarily used for testing to reset cached state.
 *
 * @returns `Result<Void>` — always succeeds.
 */
export function clearToolCache(): Result<Void> {
  toolCache.clear();
  cachedExtraToolPaths = null;
  return ok(VoidSchema, undefined);
}

// =============================================================================
// Package Manager Helpers
// =============================================================================

/**
 * Get the root workspace dev dependency add command for the configured package manager.
 *
 * @returns `Result<StrArray>` — array of command and args for adding root workspace devDependencies.
 */
function getPmRootAddDevCmd(): Result<StrArray> {
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;

  const pmName: PackageManagerType = configResult.data.tooling.packageManager.manager;

  const PM_ADD_DEV_ROOT_COMMANDS: Readonly<Record<PackageManagerType, StrArray>> = {
    pnpm: ['pnpm', 'add', '-D', '-w'],
    npm: ['npm', 'install', '-D'],
    yarn: ['yarn', 'add', '-D', '-W'],
    bun: ['bun', 'add', '-d'],
  };

  return ok(StrArraySchema, PM_ADD_DEV_ROOT_COMMANDS[pmName]);
}

// =============================================================================
// Tool Version Lookup
// =============================================================================

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

// =============================================================================
// Install Commands Registry
// =============================================================================

/**
 * Binary-to-npm-package mapping for Node tools.
 * Maps binary names used by the format/checks tools to their npm package names.
 */
const NodeToolBinaryMapSchema = v.record(StrSchema, StrSchema);
type NodeToolBinaryMap = v.InferOutput<typeof NodeToolBinaryMapSchema>;

const NODE_TOOL_BINARY_MAP: NodeToolBinaryMap = {
  biome: '@biomejs/biome',
  prettier: 'prettier',
  'sql-formatter': 'sql-formatter',
  'pug-beautifier': 'pug-beautifier',
  '@prettier/plugin-xml': '@prettier/plugin-xml',
  'prettier-plugin-svelte': 'prettier-plugin-svelte',
  'prettier-plugin-astro': 'prettier-plugin-astro',
  '@prettier/plugin-pug': '@prettier/plugin-pug',
  '@zackad/prettier-plugin-twig': '@zackad/prettier-plugin-twig',
  'blade-formatter': 'blade-formatter',
  prisma: 'prisma',
  oxlint: 'oxlint',
  knip: 'knip',
  wrangler: 'wrangler',
};

/**
 * Get install commands for all known tools.
 * Node tools → root devDependencies with exact version.
 * System tools → workspace-local mise install with exact version.
 *
 * @returns `Result<InstallCommandsRecord>` — record mapping tool name to install command definition.
 */
export function getToolInstallCommands(): Result<InstallCommandsRecord> {
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;
  const config: DeepReadonly<CoreConfig> = configResult.data;

  const pmCmdResult: Result<StrArray> = getPmRootAddDevCmd();
  if (!pmCmdResult.ok) return pmCmdResult;
  const pmCmd: DeepReadonly<StrArray> = pmCmdResult.data;

  const nodeTools: DeepReadonly<NodeToolVersions> = config.versions.nodeTools;
  const systemTools: DeepReadonly<SystemToolVersions> = config.versions.systemTools;

  const commands: Record<ToolName, InstallCommand> = {};

  // Node tools → root devDependencies with exact version
  for (const [binaryName, packageName] of Object.entries(NODE_TOOL_BINARY_MAP)) {
    const version: OptionalStr = lookupToolVersion(nodeTools, packageName);
    commands[binaryName] = {
      cmd: [...pmCmd, version ? `${packageName}@${version}` : packageName],
      category: 'node',
      npmPackage: packageName,
    };
  }

  // System tools → workspace-local mise install with exact version
  // Skip 'mise' itself — managed by bootstrap script, not self-install
  for (const [toolName, version] of Object.entries(systemTools)) {
    if (toolName === 'mise') continue;
    const backend: Str = MISE_BACKENDS[toolName] ?? toolName;
    commands[toolName] = {
      cmd: ['./bin/mise', 'install', `${backend}@${version}`],
      category: 'system',
      requires: './bin/mise',
    };
  }

  return ok(InstallCommandsRecordSchema, commands);
}

// =============================================================================
// Tool Availability
// =============================================================================

/** Cached extra tool paths (computed once per process). */
let cachedExtraToolPaths: NullableStrArray = null;

/**
 * Get common install directories that may not be in PATH.
 * Uses `os.homedir()` for cross-platform home directory resolution
 * and `path.join()` for correct path separators.
 *
 * @returns `Result<StrArray>` — array of directory paths to search for tools.
 */
function getExtraToolPaths(): Result<StrArray> {
  if (cachedExtraToolPaths) return ok(StrArraySchema, cachedExtraToolPaths);

  const homeResult: Result<Path> = getHomedir();
  if (!homeResult.ok) return homeResult;
  const home: Path = homeResult.data;
  const paths: StrArray = [];

  /**
   * Joins home directory with segments and pushes to the paths array.
   * Skips on error (best-effort — extra tool paths are advisory, not critical).
   *
   * @param segments - Path segments to join after the home directory.
   * @returns void — mutates `paths` array as a side effect.
   */
  const push = (...segments: Str[]): Void => {
    const result: Result<Path> = joinPath([home, ...segments]);
    if (result.ok) paths.push(result.data);
  };

  if (isWindows) {
    const appDataEnv: Result<OptionalStr> = getEnvVar('APPDATA');
    const appDataFallback: Result<Path> = joinPath([home, 'AppData', 'Roaming']);
    let appData: Str = '';
    if (appDataEnv.ok && appDataEnv.data) {
      appData = appDataEnv.data;
    } else if (appDataFallback.ok) {
      appData = appDataFallback.data;
    }

    const localAppDataEnv: Result<OptionalStr> = getEnvVar('LOCALAPPDATA');
    const localAppDataFallback: Result<Path> = joinPath([home, 'AppData', 'Local']);
    let localAppData: Str = '';
    if (localAppDataEnv.ok && localAppDataEnv.data) {
      localAppData = localAppDataEnv.data;
    } else if (localAppDataFallback.ok) {
      localAppData = localAppDataFallback.data;
    }

    push('go', 'bin');
    push('.cargo', 'bin');
    const pythonResult: Result<Path> = joinPath([appData, 'Python', 'Scripts']);
    if (pythonResult.ok) paths.push(pythonResult.data);
    push('.dotnet', 'tools');
    const coursierResult: Result<Path> = joinPath([localAppData, 'Coursier', 'data', 'bin']);
    if (coursierResult.ok) paths.push(coursierResult.data);
    push('.composer', 'vendor', 'bin');
  } else {
    // Workspace-local mise shims — tools installed by ./bin/mise are accessible here
    push('.mise', 'shims');
    // User-level mise shims as fallback
    push('.local', 'share', 'mise', 'shims');

    push('go', 'bin');
    push('.cargo', 'bin');
    push('.local', 'bin');
    push('.local', 'share', 'coursier', 'bin');
    push('.composer', 'vendor', 'bin');
    push('.config', 'composer', 'vendor', 'bin');
    push('.dotnet', 'tools');
    push('.opam', 'default', 'bin');
    push('.nix-profile', 'bin');

    if (isMacOS) {
      push('Library', 'Application Support', 'Coursier', 'bin');
      paths.push('/usr/local/bin');
    }

    if (isLinux) {
      paths.push('/usr/local/bin', '/snap/bin');
    }
  }

  cachedExtraToolPaths = paths;
  return ok(StrArraySchema, paths);
}

/**
 * Check if a tool is available in PATH or common install locations.
 * Results are cached for the lifetime of the process.
 *
 * @param tool - Tool binary name to check. Validated via `ToolNameSchema`.
 * @returns `Result<Bool>` — `true` if the tool is found, `false` otherwise.
 */
export function isToolAvailable(tool: ToolName): Result<Bool> {
  const parsed: Result<ToolName> = safeParse(ToolNameSchema, tool);
  if (!parsed.ok) return parsed;
  const validTool: ToolName = parsed.data;

  const cached: OptionalBool = toolCache.get(validTool);
  if (cached !== undefined) {
    return ok(BoolSchema, cached);
  }

  const checkCommandResult: Result<Command> = safeParse(
    CommandSchema,
    isWindows ? `where ${validTool}` : `which ${validTool}`,
  );
  if (!checkCommandResult.ok) return checkCommandResult;
  const checkCommand: Command = checkCommandResult.data;
  const whichResult: Result<Bool> = execSyncBool(checkCommand);
  if (!whichResult.ok) return whichResult;
  if (whichResult.data) {
    toolCache.set(validTool, true);
    return ok(BoolSchema, true);
  }

  const extraPathsResult: Result<StrArray> = getExtraToolPaths();
  if (!extraPathsResult.ok) return extraPathsResult;
  for (const dir of extraPathsResult.data) {
    const toolPathResult: Result<Path> = joinPath([dir, validTool]);
    if (!toolPathResult.ok) continue;
    const toolPath: Path = toolPathResult.data;
    const existsResult: Result<Bool> = pathExists(toolPath);
    if (existsResult.ok && existsResult.data) {
      toolCache.set(validTool, true);
      return ok(BoolSchema, true);
    }
    if (isWindows) {
      for (const ext of ['.exe', '.cmd', '.bat']) {
        const extPathResult: Result<Path> = safeParse(PathSchema, toolPath + ext);
        if (!extPathResult.ok) continue;
        const extExistsResult: Result<Bool> = pathExists(extPathResult.data);
        if (extExistsResult.ok && extExistsResult.data) {
          toolCache.set(validTool, true);
          return ok(BoolSchema, true);
        }
      }
    }
  }

  toolCache.set(validTool, false);
  return ok(BoolSchema, false);
}

// =============================================================================
// Brew Lock (deprecated — no-op, kept for caller compatibility)
// =============================================================================

/**
 * No-op: brew is no longer used for tool installation.
 * Kept as export for backward compatibility with callers (dev-proxy, format).
 *
 * @returns `Promise<Result<Bool>>` — always returns `true`.
 * @deprecated Brew is no longer used. System tools are managed by mise.
 */
export async function waitForBrewLock(): Promise<Result<Bool>> {
  return ok(BoolSchema, true);
}

// =============================================================================
// Prerequisites
// =============================================================================

/**
 * Get the prerequisite tool for an install command.
 * Returns the explicit `requires` field, or the first command element.
 * For `sh -c` commands, returns `'sh'` (assumed available).
 *
 * @param installDef - Install command definition. Validated against `InstallCommandSchema`.
 * @returns `Result<ToolName>` — prerequisite binary name.
 */
function getPrerequisite(installDef: InstallCommand): Result<ToolName> {
  const parsed: Result<InstallCommand> = safeParse(InstallCommandSchema, installDef);
  if (!parsed.ok) return parsed;
  const def: InstallCommand = parsed.data;

  if (def.requires) return ok(ToolNameSchema, def.requires);
  if (def.cmd[0] === 'sh' && def.cmd[1] === '-c') return ok(ToolNameSchema, 'sh');
  if (def.cmd[0] === 'powershell' && def.cmd[1] === '-c') return ok(ToolNameSchema, 'powershell');
  return ok(ToolNameSchema, def.cmd[0]);
}

/**
 * Look up an install command definition by tool name.
 *
 * @param commands - The install commands record.
 * @param tool - The tool name to look up.
 * @returns `Result<InstallCommand>` — the definition, or `IO.NO_INSTALL_COMMAND` error.
 */
function lookupInstallDef(commands: InstallCommandsRecord, tool: ToolName): Result<InstallCommand> {
  const commandsResult: Result<InstallCommandsRecord> = safeParse(
    InstallCommandsRecordSchema,
    commands,
  );
  if (!commandsResult.ok) return commandsResult;
  const toolResult: Result<ToolName> = safeParse(ToolNameSchema, tool);
  if (!toolResult.ok) return toolResult;

  const installDef: OptionalInstallCommand = commandsResult.data[toolResult.data];
  if (!installDef) {
    return err(ERRORS.IO.NO_INSTALL_COMMAND, { meta: { tool } });
  }
  return ok(InstallCommandSchema, installDef);
}

/**
 * Get the prerequisite for a tool by name.
 *
 * @param tool - Tool name to look up. Validated via `ToolNameSchema`.
 * @returns `Result<ToolName>` — prerequisite binary name, or an error if
 *          the tool has no install command defined.
 */
export function getToolPrerequisite(tool: ToolName): Result<ToolName> {
  const parsed: Result<ToolName> = safeParse(ToolNameSchema, tool);
  if (!parsed.ok) return parsed;

  const commandsResult: Result<InstallCommandsRecord> = getToolInstallCommands();
  if (!commandsResult.ok) return commandsResult;

  const installDefResult: Result<InstallCommand> = lookupInstallDef(
    commandsResult.data,
    parsed.data,
  );
  if (!installDefResult.ok) return installDefResult;

  const prereqResult: Result<ToolName> = getPrerequisite(installDefResult.data);
  if (!prereqResult.ok) return prereqResult;
  return ok(ToolNameSchema, prereqResult.data);
}

/**
 * Check if prerequisites for installing a tool are met.
 *
 * @param tool - Tool name to check prerequisites for. Validated via `ToolNameSchema`.
 * @returns `Result<Void>` — success if prerequisites are met, or an error
 *          with a localized message if not.
 */
export function checkPrerequisite(tool: ToolName): Result<Void> {
  const parsed: Result<ToolName> = safeParse(ToolNameSchema, tool);
  if (!parsed.ok) return parsed;

  const commandsResult: Result<InstallCommandsRecord> = getToolInstallCommands();
  if (!commandsResult.ok) return commandsResult;

  const installDefResult: Result<InstallCommand> = lookupInstallDef(
    commandsResult.data,
    parsed.data,
  );
  if (!installDefResult.ok) return installDefResult;

  const prereqResult: Result<ToolName> = getPrerequisite(installDefResult.data);
  if (!prereqResult.ok) return prereqResult;
  const prereq: ToolName = prereqResult.data;

  const available: Result<Bool> = isToolAvailable(prereq);
  if (!available.ok) return available;

  if (!available.data) {
    return err(ERRORS.IO.PREREQUISITE_MISSING, { meta: { tool: parsed.data, prereq } });
  }

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Version Checking
// =============================================================================

/** Schema for version check result. */
const VersionCheckResultSchema = v.strictObject({
  /** Tool name. */
  tool: ToolNameSchema,
  /** Version from config. */
  configVersion: v.nullable(StrSchema),
  /** Currently installed version. */
  installedVersion: NullableStrSchema,
  /** Whether versions match. */
  matches: BoolSchema,
});

/** Inferred type of {@link VersionCheckResultSchema}. */
type VersionCheckResult = v.InferOutput<typeof VersionCheckResultSchema>;

/**
 * Compare installed tool version against config version.
 *
 * @param tool - Tool binary name.
 * @returns `Result<VersionCheckResult>` — comparison result.
 */
export function checkToolVersion(tool: ToolName): Result<VersionCheckResult> {
  const parsed: Result<ToolName> = safeParse(ToolNameSchema, tool);
  if (!parsed.ok) return parsed;

  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;

  const nodeTools: DeepReadonly<NodeToolVersions> = configResult.data.versions.nodeTools;
  const systemTools: DeepReadonly<SystemToolVersions> = configResult.data.versions.systemTools;
  const configVersion: NullableStr =
    lookupToolVersion(nodeTools, parsed.data) ??
    lookupToolVersion(systemTools, parsed.data) ??
    null;

  // Get installed version via `<tool> --version`
  const versionCmdResult: Result<Command> = safeParse(CommandSchema, `${parsed.data} --version`);
  if (!versionCmdResult.ok) {
    return ok(VersionCheckResultSchema, {
      tool: parsed.data,
      configVersion,
      installedVersion: null,
      matches: false,
    });
  }

  const versionResult: Result<Str> = execSyncSafe(versionCmdResult.data);
  if (!versionResult.ok) {
    return ok(VersionCheckResultSchema, {
      tool: parsed.data,
      configVersion,
      installedVersion: null,
      matches: false,
    });
  }

  const match: NullableRegExpMatchArray = versionResult.data.match(/(\d+\.\d+\.\d+)/);
  const installedVersion: NullableStr = match?.[1] ?? null;

  return ok(VersionCheckResultSchema, {
    tool: parsed.data,
    configVersion,
    installedVersion,
    matches:
      configVersion !== null && installedVersion !== null && configVersion === installedVersion,
  });
}

// =============================================================================
// Installation
// =============================================================================

/**
 * Attempt to install a tool synchronously.
 *
 * @param tool - Tool name to install. Validated via `ToolNameSchema`.
 * @returns `Result<Void>` — success if installed, error if failed.
 */
export function installTool(tool: ToolName): Result<Void> {
  const parsed: Result<ToolName> = safeParse(ToolNameSchema, tool);
  if (!parsed.ok) return parsed;

  const commandsResult: Result<InstallCommandsRecord> = getToolInstallCommands();
  if (!commandsResult.ok) return commandsResult;

  const installDefResult: Result<InstallCommand> = lookupInstallDef(
    commandsResult.data,
    parsed.data,
  );
  if (!installDefResult.ok) return installDefResult;
  const installDef: InstallCommand = installDefResult.data;

  const prereqResult: Result<Void> = checkPrerequisite(parsed.data);
  if (!prereqResult.ok) return prereqResult;

  const installCmdResult: Result<Command> = safeParse(CommandSchema, installDef.cmd.join(' '));
  if (!installCmdResult.ok) return installCmdResult;
  const installCmd: Command = installCmdResult.data;
  const execResult: Result<Str> = execSyncSafe(installCmd);
  if (!execResult.ok) {
    return err(ERRORS.IO.INSTALL_FAILED, {
      cause: execResult.error,
      meta: { tool: parsed.data, command: installCmd },
    });
  }
  toolCache.delete(parsed.data);
  return ok(VoidSchema, undefined);
}

/** Track in-progress installations to prevent parallel duplicate installs. */
const installInProgress: Map<ToolName, Promise<Result<Void>>> = new Map();

/**
 * Attempt to install a tool asynchronously.
 * Deduplicates parallel requests for the same tool.
 *
 * @param tool - Tool name to install. Validated via `ToolNameSchema`.
 * @returns `Promise<Result<Void>>` — success if installed, error if failed.
 */
export async function installToolAsync(tool: ToolName): Promise<Result<Void>> {
  const parsed: Result<ToolName> = safeParse(ToolNameSchema, tool);
  if (!parsed.ok) return parsed;

  const existing: OptionalPendingInstall = installInProgress.get(parsed.data);
  if (existing) {
    return existing;
  }

  const installPromise: Promise<Result<Void>> = installToolAsyncInternal(parsed.data);
  installInProgress.set(parsed.data, installPromise);

  try {
    return await installPromise;
  } finally {
    installInProgress.delete(parsed.data);
  }
}

/**
 * Internal async tool installation implementation.
 *
 * @param tool - Validated tool name to install.
 * @returns `Promise<Result<Void>>` — success if installed, error if failed.
 */
async function installToolAsyncInternal(tool: ToolName): Promise<Result<Void>> {
  const parsed: Result<ToolName> = safeParse(ToolNameSchema, tool);
  if (!parsed.ok) return parsed;

  const commandsResult: Result<InstallCommandsRecord> = getToolInstallCommands();
  if (!commandsResult.ok) return commandsResult;

  const installDefResult: Result<InstallCommand> = lookupInstallDef(commandsResult.data, tool);
  if (!installDefResult.ok) return installDefResult;
  const installDef: InstallCommand = installDefResult.data;

  const prereqResult: Result<ToolName> = getPrerequisite(installDef);
  if (!prereqResult.ok) return prereqResult;
  const prereq: ToolName = prereqResult.data;

  const prereqAvailable: Result<Bool> = isToolAvailable(prereq);
  if (!prereqAvailable.ok) return prereqAvailable;

  if (!prereqAvailable.data) {
    return err(ERRORS.IO.PREREQUISITE_MISSING, { meta: { tool, prereq } });
  }

  return new Promise<Result<Void>>((resolve: (value: Result<Void>) => void) => {
    const [cmd, ...spawnArgs]: StrArray = installDef.cmd;
    const procResult: Result<ChildProcess> = spawnProcess(cmd, spawnArgs, { inherit: false });
    if (!procResult.ok) {
      resolve(
        err(ERRORS.IO.EXEC_FAILED, {
          cause: procResult.error,
          meta: { tool, command: installDef.cmd.join(' ') },
        }),
      );
      return;
    }
    const proc: ChildProcess = procResult.data;

    let stdout: Str = '';
    let stderr: Str = '';

    proc.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', (code: NullableExitCode) => {
      toolCache.delete(tool);

      if (code === 0) {
        resolve(ok(VoidSchema, undefined));
      } else {
        resolve(
          err(ERRORS.IO.EXEC_FAILED, {
            meta: {
              tool,
              exitCode: code,
              command: installDef.cmd.join(' '),
              stderr: stderr.trim(),
              stdout: stdout.trim(),
            },
          }),
        );
      }
    });

    proc.on('error', (error: Error) => {
      resolve(
        err(ERRORS.IO.EXEC_FAILED, {
          cause: fromUnknownError(error),
          meta: { tool, command: installDef.cmd.join(' ') },
        }),
      );
    });
  });
}
