#!/usr/bin/env tsx
/**
 * Consistency Check Tool
 *
 * Validates version consistency across config, lockfile, package.json,
 * mise.toml, installed tools, and JSON schemas.
 *
 * 7 validation passes:
 * 1. Config vs. lockfile (node tools)
 * 2. Config vs. package.json devDependencies
 * 3. Config vs. mise.toml (system tools)
 * 4. Config vs. installed system tools
 * 5. Schema versionCheck drift
 * 6. Schema metadata freshness
 * 7. Internal consistency (.nvmrc, packageManager, mise bootstrap, no volta)
 *
 * Usage: `<pm> tool checks [--fix] [--verbose]`
 *
 * @module
 */

import type { CommandContext } from '@/cli/schemas';
import type { BuiltChecksStrings } from '@/cli/tools/checks/locales/schema';
import { TOOL_FLAG_DEFS } from '@/cli/tools/checks/flags';
import { createCommand } from '@/cli/utils/command';
import { requireOnboarding } from '@/cli/utils/core';
import { checkToolVersion } from '@/cli/utils/installer';
import { getConfig } from '@/config/loader';
import {
  BoolSchema,
  CommandSchema,
  NonNegativeIntegerSchema,
  StrSchema,
  VoidSchema,
  type Bool,
  type Command,
  type EnsureWorkspaceRootResult,
  type NonNegativeInteger,
  type NullableRegExpMatchArray,
  type NullableStr,
  type OptionalStr,
  type Path,
  type Str,
  type SupportedRuntimes,
  type UntypedJson,
  type Void,
} from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import {
  type NodeToolVersions,
  type PinnedVersion,
  type SystemToolVersions,
} from '@/schemas/core-config/versions';
import { ERRORS, err, ok, okUnchecked, type Result } from '@/schemas/result/result';
import { readFile } from '@/utils/core/fs';
import type { DeepReadonly } from '@/utils/core/object';
import { joinPath, pathExists } from '@/utils/core/path';
import { execSyncSafe } from '@/utils/core/shell';
import { log } from '@/utils/core/terminal';
import { ensureWorkspaceRoot } from '@/utils/core/workspace';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Schemas & Types
// =============================================================================

/** Severity level for a check result. */
type CheckSeverity = 'pass' | 'fail' | 'warn' | 'skip';

/** A single check result entry. */
type CheckResult = {
  readonly name: Str;
  readonly severity: CheckSeverity;
  readonly detail: Str;
};

/** Accumulated counters (mutated during pass execution). */
type CheckSummary = {
  passed: NonNegativeInteger;
  failed: NonNegativeInteger;
  warnings: NonNegativeInteger;
  skipped: NonNegativeInteger;
};

/** Common parameters passed to every pass function. */
type PassContext = {
  readonly strings: BuiltChecksStrings;
  readonly config: DeepReadonly<CoreConfig>;
  readonly workspaceRoot: Path;
  readonly summary: CheckSummary;
  readonly verbose: Bool;
  readonly fix: Bool;
  readonly dryRun: Bool;
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Look up a tool version from a Valibot-typed tool versions record.
 *
 * @param tools - Tool versions record (NodeToolVersions or SystemToolVersions).
 * @param name - Tool name to look up.
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
 * Format and print a single check result. Updates the running summary.
 *
 * @param ctx - Pass context containing strings, summary, and verbose flag.
 * @param result - The check result to emit.
 * @returns `Result<Void>` — propagates locale errors.
 */
function emitResult(ctx: PassContext, result: CheckResult): Result<Void> {
  // Update counters
  switch (result.severity) {
    case 'pass':
      ctx.summary.passed++;
      break;
    case 'fail':
      ctx.summary.failed++;
      break;
    case 'warn':
      ctx.summary.warnings++;
      break;
    case 'skip':
      ctx.summary.skipped++;
      break;
  }

  // In non-verbose mode, only print fail and warn
  if (!ctx.verbose && (result.severity === 'pass' || result.severity === 'skip')) {
    return ok(VoidSchema, undefined);
  }

  // Select the appropriate locale template
  const msgFn =
    result.severity === 'pass'
      ? ctx.strings.resultPass
      : result.severity === 'fail'
        ? ctx.strings.resultFail
        : result.severity === 'warn'
          ? ctx.strings.resultWarn
          : ctx.strings.resultSkip;

  const msg: Result<Str> = msgFn({ name: result.name, detail: result.detail });
  if (!msg.ok) return msg;
  log.print(`  ${msg.data}`);
  return ok(VoidSchema, undefined);
}

/**
 * Execute a fix command if --fix is set, or print dry-run message.
 *
 * @param ctx - Pass context.
 * @param command - Shell command to execute.
 * @param action - Human-readable action description.
 * @returns `Result<Bool>` — true if fix was attempted, false if skipped.
 */
function runFix(ctx: PassContext, command: Str, action: Str): Result<Bool> {
  if (!ctx.fix) return ok(BoolSchema, false);

  if (ctx.dryRun) {
    const msg: Result<Str> = ctx.strings.fixSkippedDryRun({ action });
    if (!msg.ok) return msg;
    log.print(`  ${msg.data}`);
    return ok(BoolSchema, false);
  }

  const cmdResult: Result<Command> = safeParse(CommandSchema, command);
  if (!cmdResult.ok) return cmdResult;

  const execResult: Result<Str> = execSyncSafe(cmdResult.data);
  if (!execResult.ok) {
    const msg: Result<Str> = ctx.strings.fixFailed({ action, error: execResult.error.message });
    if (!msg.ok) return msg;
    log.print(`  ${msg.data}`);
    return ok(BoolSchema, true);
  }

  const msg: Result<Str> = ctx.strings.fixSuccess({ action });
  if (!msg.ok) return msg;
  log.print(`  ${msg.data}`);
  return ok(BoolSchema, true);
}

// =============================================================================
// Pass 1: Config vs. Lockfile (Node Tools)
// =============================================================================

/**
 * Compare node tool versions in config against lockfile.
 *
 * @param ctx - Pass context.
 * @returns `Result<Void>`
 */
function checkNodeLockfile(ctx: PassContext): Result<Void> {
  const headerMsg: Result<Str> = ctx.strings.passNodeLockfile();
  if (!headerMsg.ok) return headerMsg;
  log.print(`\n{bold}${headerMsg.data}{/}`);

  const nodeTools: DeepReadonly<NodeToolVersions> = ctx.config.versions.nodeTools;

  // Determine lockfile based on PM
  const PM_LOCKFILES: Readonly<Record<Str, Str>> = {
    pnpm: 'pnpm-lock.yaml',
    npm: 'package-lock.json',
    yarn: 'yarn.lock',
    bun: 'bun.lockb',
  };
  const pmName: Str = ctx.config.tooling.packageManager.manager;
  const lockfileName: Str = PM_LOCKFILES[pmName] ?? 'pnpm-lock.yaml';

  const lockfilePathResult: Result<Path> = joinPath([ctx.workspaceRoot, lockfileName]);
  if (!lockfilePathResult.ok) return lockfilePathResult;
  const lockfilePath: Path = lockfilePathResult.data;

  const lockfileExistsResult: Result<Bool> = pathExists(lockfilePath);
  if (!lockfileExistsResult.ok) return lockfileExistsResult;

  if (!lockfileExistsResult.data) {
    const detailMsg: Result<Str> = ctx.strings.detailMissing({ what: 'lockfile' });
    if (!detailMsg.ok) return detailMsg;
    return emitResult(ctx, { name: lockfileName, severity: 'skip', detail: detailMsg.data });
  }

  const lockfileContentResult: Result<Str> = readFile(lockfilePath);
  if (!lockfileContentResult.ok) return lockfileContentResult;
  const lockfileContent: Str = lockfileContentResult.data;

  // Regex patterns per PM lockfile format
  const LOCKFILE_PATTERNS: Readonly<Record<Str, (name: Str) => RegExp>> = {
    'pnpm-lock.yaml': (name: Str): RegExp =>
      new RegExp(`[/'"]${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}@([^:'"/]+)`, 'm'),
    'package-lock.json': (name: Str): RegExp =>
      new RegExp(
        `"${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}":\\s*\\{[^}]*"version":\\s*"([^"]+)"`,
        'm',
      ),
    'yarn.lock': (name: Str): RegExp =>
      new RegExp(
        `"?${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}@[^"]*"?:[\\s\\S]*?version "([^"]+)"`,
        'm',
      ),
  };
  const patternFn = LOCKFILE_PATTERNS[lockfileName];

  let needsInstall: Bool = false;

  for (const [packageName, configVersion] of Object.entries(nodeTools)) {
    if (!patternFn) {
      // bun.lockb is binary — skip lockfile check
      const detailMsg: Result<Str> = ctx.strings.detailMissing({ what: 'lockfile parser' });
      if (!detailMsg.ok) return detailMsg;
      const e: Result<Void> = emitResult(ctx, {
        name: packageName,
        severity: 'skip',
        detail: detailMsg.data,
      });
      if (!e.ok) return e;
      continue;
    }

    const regex: RegExp = patternFn(packageName);
    const match: NullableRegExpMatchArray = lockfileContent.match(regex);
    const lockfileVersion: NullableStr = match?.[1] ?? null;

    if (!lockfileVersion) {
      const detailMsg: Result<Str> = ctx.strings.detailMissing({ what: 'lockfile entry' });
      if (!detailMsg.ok) return detailMsg;
      const e: Result<Void> = emitResult(ctx, {
        name: packageName,
        severity: 'fail',
        detail: detailMsg.data,
      });
      if (!e.ok) return e;
      needsInstall = true;
      continue;
    }

    if (lockfileVersion === configVersion) {
      const detailMsg: Result<Str> = ctx.strings.detailVersionMatch({ version: configVersion });
      if (!detailMsg.ok) return detailMsg;
      const e: Result<Void> = emitResult(ctx, {
        name: packageName,
        severity: 'pass',
        detail: detailMsg.data,
      });
      if (!e.ok) return e;
    } else {
      const detailMsg: Result<Str> = ctx.strings.detailVersionMismatch({
        expected: configVersion,
        actual: lockfileVersion,
      });
      if (!detailMsg.ok) return detailMsg;
      const e: Result<Void> = emitResult(ctx, {
        name: packageName,
        severity: 'fail',
        detail: detailMsg.data,
      });
      if (!e.ok) return e;
      needsInstall = true;
    }
  }

  // Fix: run <pm> install
  if (needsInstall) {
    const fixResult: Result<Bool> = runFix(ctx, `${pmName} install`, 'lockfile sync');
    if (!fixResult.ok) return fixResult;
  }

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Pass 2: Config vs. package.json devDependencies
// =============================================================================

/**
 * Compare node tool versions in config against root package.json devDependencies.
 *
 * @param ctx - Pass context.
 * @returns `Result<Void>`
 */
function checkNodeDevDeps(ctx: PassContext): Result<Void> {
  const headerMsg: Result<Str> = ctx.strings.passNodeDevDeps();
  if (!headerMsg.ok) return headerMsg;
  log.print(`\n{bold}${headerMsg.data}{/}`);

  const nodeTools: DeepReadonly<NodeToolVersions> = ctx.config.versions.nodeTools;

  const pkgPathResult: Result<Path> = joinPath([ctx.workspaceRoot, 'package.json']);
  if (!pkgPathResult.ok) return pkgPathResult;
  const contentResult: Result<Str> = readFile(pkgPathResult.data);
  if (!contentResult.ok) return contentResult;

  let pkg: UntypedJson;
  try {
    pkg = JSON.parse(contentResult.data);
  } catch {
    return err(ERRORS.VALIDATION.INVALID_FORMAT, {
      meta: { reason: 'Invalid JSON in package.json' },
    });
  }

  const devDeps: Record<Str, Str> =
    typeof pkg === 'object' &&
    pkg !== null &&
    'devDependencies' in pkg &&
    typeof (pkg as Record<Str, unknown>).devDependencies === 'object' &&
    (pkg as Record<Str, unknown>).devDependencies !== null
      ? ((pkg as Record<Str, unknown>).devDependencies as Record<Str, Str>)
      : {};

  let needsSync: Bool = false;

  for (const [packageName, configVersion] of Object.entries(nodeTools)) {
    const pkgVersion: OptionalStr = devDeps[packageName];

    if (!pkgVersion) {
      const detailMsg: Result<Str> = ctx.strings.detailMissing({ what: 'devDependency' });
      if (!detailMsg.ok) return detailMsg;
      const e: Result<Void> = emitResult(ctx, {
        name: packageName,
        severity: 'fail',
        detail: detailMsg.data,
      });
      if (!e.ok) return e;
      needsSync = true;
      continue;
    }

    // package.json may have exact version or range — extract numeric version
    const versionMatch: NullableRegExpMatchArray = pkgVersion.match(/(\d+\.\d+\.\d+)/);
    const actualVersion: NullableStr = versionMatch?.[1] ?? null;

    if (actualVersion === configVersion) {
      const detailMsg: Result<Str> = ctx.strings.detailVersionMatch({ version: configVersion });
      if (!detailMsg.ok) return detailMsg;
      const e: Result<Void> = emitResult(ctx, {
        name: packageName,
        severity: 'pass',
        detail: detailMsg.data,
      });
      if (!e.ok) return e;
    } else {
      const detailMsg: Result<Str> = ctx.strings.detailVersionMismatch({
        expected: configVersion,
        actual: pkgVersion,
      });
      if (!detailMsg.ok) return detailMsg;
      const e: Result<Void> = emitResult(ctx, {
        name: packageName,
        severity: 'fail',
        detail: detailMsg.data,
      });
      if (!e.ok) return e;
      needsSync = true;
    }
  }

  // Fix: re-run sync (regenerates package.json from template)
  if (needsSync) {
    const pmName: Str = ctx.config.tooling.packageManager.manager;
    const fixResult: Result<Bool> = runFix(
      ctx,
      `${pmName} run update:sync`,
      'regenerate package.json',
    );
    if (!fixResult.ok) return fixResult;
  }

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Pass 3: Config vs. mise.toml (System Tools)
// =============================================================================

/**
 * Compare system tool versions in config against generated mise.toml.
 *
 * @param ctx - Pass context.
 * @returns `Result<Void>`
 */
function checkMiseToml(ctx: PassContext): Result<Void> {
  const headerMsg: Result<Str> = ctx.strings.passMiseToml();
  if (!headerMsg.ok) return headerMsg;
  log.print(`\n{bold}${headerMsg.data}{/}`);

  const systemTools: DeepReadonly<SystemToolVersions> = ctx.config.versions.systemTools;

  const misePathResult: Result<Path> = joinPath([ctx.workspaceRoot, 'mise.toml']);
  if (!misePathResult.ok) return misePathResult;
  const miseExistsResult: Result<Bool> = pathExists(misePathResult.data);
  if (!miseExistsResult.ok) return miseExistsResult;

  if (!miseExistsResult.data) {
    const detailMsg: Result<Str> = ctx.strings.detailMissing({ what: 'mise.toml' });
    if (!detailMsg.ok) return detailMsg;
    return emitResult(ctx, { name: 'mise.toml', severity: 'fail', detail: detailMsg.data });
  }

  const contentResult: Result<Str> = readFile(misePathResult.data);
  if (!contentResult.ok) return contentResult;
  const miseContent: Str = contentResult.data;

  let needsSync: Bool = false;

  for (const [toolName, configVersion] of Object.entries(systemTools)) {
    if (toolName === 'mise') continue; // mise itself isn't in [tools]

    // Match `toolname = "version"` or `ubi:org/repo = "version"` in [tools] section
    const escapedTool: Str = toolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern: RegExp = new RegExp(
      `(?:${escapedTool}|[^\\s]+/${escapedTool})\\s*=\\s*"([^"]+)"`,
      'm',
    );
    const match: NullableRegExpMatchArray = miseContent.match(pattern);
    const miseVersion: NullableStr = match?.[1] ?? null;

    if (!miseVersion) {
      const detailMsg: Result<Str> = ctx.strings.detailMissing({ what: 'mise.toml entry' });
      if (!detailMsg.ok) return detailMsg;
      const e: Result<Void> = emitResult(ctx, {
        name: toolName,
        severity: 'fail',
        detail: detailMsg.data,
      });
      if (!e.ok) return e;
      needsSync = true;
      continue;
    }

    if (miseVersion === configVersion) {
      const detailMsg: Result<Str> = ctx.strings.detailVersionMatch({ version: configVersion });
      if (!detailMsg.ok) return detailMsg;
      const e: Result<Void> = emitResult(ctx, {
        name: toolName,
        severity: 'pass',
        detail: detailMsg.data,
      });
      if (!e.ok) return e;
    } else {
      const detailMsg: Result<Str> = ctx.strings.detailVersionMismatch({
        expected: configVersion,
        actual: miseVersion,
      });
      if (!detailMsg.ok) return detailMsg;
      const e: Result<Void> = emitResult(ctx, {
        name: toolName,
        severity: 'fail',
        detail: detailMsg.data,
      });
      if (!e.ok) return e;
      needsSync = true;
    }
  }

  if (needsSync) {
    const pmName: Str = ctx.config.tooling.packageManager.manager;
    const fixResult: Result<Bool> = runFix(
      ctx,
      `${pmName} run update:sync`,
      'regenerate mise.toml',
    );
    if (!fixResult.ok) return fixResult;
  }

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Pass 4: Config vs. Installed System Tools
// =============================================================================

/**
 * Compare installed system tool versions against config.
 * Uses `checkToolVersion()` from installer.ts for each tool.
 * Emits `warn` (not `fail`) for version mismatches — installed versions
 * drift frequently during development and are informational.
 *
 * @param ctx - Pass context.
 * @returns `Result<Void>`
 */
function checkInstalledTools(ctx: PassContext): Result<Void> {
  const headerMsg: Result<Str> = ctx.strings.passInstalledTools();
  if (!headerMsg.ok) return headerMsg;
  log.print(`\n{bold}${headerMsg.data}{/}`);

  const systemTools: DeepReadonly<SystemToolVersions> = ctx.config.versions.systemTools;

  for (const [toolName, configVersion] of Object.entries(systemTools)) {
    const versionResult = checkToolVersion(toolName);
    if (!versionResult.ok) {
      const detailMsg: Result<Str> = ctx.strings.detailNotInstalled();
      if (!detailMsg.ok) return detailMsg;
      const e: Result<Void> = emitResult(ctx, {
        name: toolName,
        severity: 'skip',
        detail: detailMsg.data,
      });
      if (!e.ok) return e;
      continue;
    }

    if (versionResult.data.installedVersion === null) {
      const detailMsg: Result<Str> = ctx.strings.detailNotInstalled();
      if (!detailMsg.ok) return detailMsg;
      const e: Result<Void> = emitResult(ctx, {
        name: toolName,
        severity: 'warn',
        detail: detailMsg.data,
      });
      if (!e.ok) return e;

      // Fix: run mise install for this tool
      if (toolName !== 'mise') {
        const fixResult: Result<Bool> = runFix(
          ctx,
          `${ctx.workspaceRoot}/bin/mise install ${toolName}@${configVersion}`,
          `install ${toolName}@${configVersion}`,
        );
        if (!fixResult.ok) return fixResult;
      }
      continue;
    }

    if (versionResult.data.matches) {
      const detailMsg: Result<Str> = ctx.strings.detailVersionMatch({ version: configVersion });
      if (!detailMsg.ok) return detailMsg;
      const e: Result<Void> = emitResult(ctx, {
        name: toolName,
        severity: 'pass',
        detail: detailMsg.data,
      });
      if (!e.ok) return e;
    } else {
      const detailMsg: Result<Str> = ctx.strings.detailVersionMismatch({
        expected: configVersion,
        actual: versionResult.data.installedVersion,
      });
      if (!detailMsg.ok) return detailMsg;
      const e: Result<Void> = emitResult(ctx, {
        name: toolName,
        severity: 'warn',
        detail: detailMsg.data,
      });
      if (!e.ok) return e;

      // Fix: mise install
      if (toolName !== 'mise') {
        const fixResult: Result<Bool> = runFix(
          ctx,
          `${ctx.workspaceRoot}/bin/mise install ${toolName}@${configVersion}`,
          `install ${toolName}@${configVersion}`,
        );
        if (!fixResult.ok) return fixResult;
      }
    }
  }

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Pass 5: Schema versionCheck Drift
// =============================================================================

/**
 * Check schema versionCheck drift.
 * Emits `warn` (not `fail`) — schema drift is informational.
 *
 * @param ctx - Pass context.
 * @returns `Result<Void>`
 */
function checkSchemaVersionDrift(ctx: PassContext): Result<Void> {
  const headerMsg: Result<Str> = ctx.strings.passSchemaVersionCheck();
  if (!headerMsg.ok) return headerMsg;
  log.print(`\n{bold}${headerMsg.data}{/}`);

  const cliToolsDir: Path = ctx.config.tooling.paths.cliToolsDir;
  const schemasJsonPathResult: Result<Path> = joinPath([
    ctx.workspaceRoot,
    cliToolsDir,
    'schema-updater',
    'schemas.json',
  ]);
  if (!schemasJsonPathResult.ok) return schemasJsonPathResult;

  const existsResult: Result<Bool> = pathExists(schemasJsonPathResult.data);
  if (!existsResult.ok) return existsResult;
  if (!existsResult.data) {
    const detailMsg: Result<Str> = ctx.strings.detailMissing({ what: 'schemas.json' });
    if (!detailMsg.ok) return detailMsg;
    return emitResult(ctx, { name: 'schemas.json', severity: 'skip', detail: detailMsg.data });
  }

  const contentResult: Result<Str> = readFile(schemasJsonPathResult.data);
  if (!contentResult.ok) return contentResult;

  let schemasConfig: UntypedJson;
  try {
    schemasConfig = JSON.parse(contentResult.data);
  } catch {
    return ok(VoidSchema, undefined);
  }

  const schemas: Record<Str, UntypedJson> =
    typeof schemasConfig === 'object' &&
    schemasConfig !== null &&
    'schemas' in schemasConfig &&
    typeof (schemasConfig as Record<Str, unknown>).schemas === 'object' &&
    (schemasConfig as Record<Str, unknown>).schemas !== null
      ? ((schemasConfig as Record<Str, unknown>).schemas as Record<Str, UntypedJson>)
      : {};

  const nodeTools: DeepReadonly<NodeToolVersions> = ctx.config.versions.nodeTools;
  const systemTools: DeepReadonly<SystemToolVersions> = ctx.config.versions.systemTools;

  for (const [name, entry] of Object.entries(schemas)) {
    if (typeof entry !== 'object' || entry === null) continue;
    const entryObj: Record<Str, unknown> = entry as Record<Str, unknown>;
    if (
      !('versionCheck' in entryObj) ||
      typeof entryObj.versionCheck !== 'object' ||
      entryObj.versionCheck === null
    )
      continue;

    const vc: Record<Str, unknown> = entryObj.versionCheck as Record<Str, unknown>;
    const tool: Str = typeof vc.tool === 'string' ? vc.tool : '';
    const schemaVersion: Str =
      typeof vc.schemaWrittenForVersion === 'string' ? vc.schemaWrittenForVersion : '';
    if (!tool || !schemaVersion) continue;

    // Look up current version from config
    const currentVersion: OptionalStr =
      lookupToolVersion(nodeTools, tool) ?? lookupToolVersion(systemTools, tool);

    if (!currentVersion) {
      const detailMsg: Result<Str> = ctx.strings.detailMissing({
        what: `config version for ${tool}`,
      });
      if (!detailMsg.ok) return detailMsg;
      const e: Result<Void> = emitResult(ctx, { name, severity: 'skip', detail: detailMsg.data });
      if (!e.ok) return e;
      continue;
    }

    if (schemaVersion === currentVersion) {
      const detailMsg: Result<Str> = ctx.strings.detailVersionMatch({ version: schemaVersion });
      if (!detailMsg.ok) return detailMsg;
      const e: Result<Void> = emitResult(ctx, { name, severity: 'pass', detail: detailMsg.data });
      if (!e.ok) return e;
    } else {
      const detailMsg: Result<Str> = ctx.strings.detailSchemaDrift({
        schemaVersion,
        installedVersion: currentVersion,
      });
      if (!detailMsg.ok) return detailMsg;
      const e: Result<Void> = emitResult(ctx, { name, severity: 'warn', detail: detailMsg.data });
      if (!e.ok) return e;
    }
  }

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Pass 6: Schema Metadata Freshness
// =============================================================================

/**
 * Check schema metadata freshness.
 * Emits `warn` for schemas fetched > 90 days ago.
 *
 * @param ctx - Pass context.
 * @returns `Result<Void>`
 */
function checkSchemaFreshness(ctx: PassContext): Result<Void> {
  const headerMsg: Result<Str> = ctx.strings.passSchemaFreshness();
  if (!headerMsg.ok) return headerMsg;
  log.print(`\n{bold}${headerMsg.data}{/}`);

  const schemasDir: Path = ctx.config.tooling.paths.schemasDir;
  const metaPathResult: Result<Path> = joinPath([
    ctx.workspaceRoot,
    schemasDir,
    'schemas.meta.json',
  ]);
  if (!metaPathResult.ok) return metaPathResult;

  const existsResult: Result<Bool> = pathExists(metaPathResult.data);
  if (!existsResult.ok) return existsResult;
  if (!existsResult.data) {
    const detailMsg: Result<Str> = ctx.strings.detailMissing({ what: 'schemas.meta.json' });
    if (!detailMsg.ok) return detailMsg;
    return emitResult(ctx, { name: 'schemas.meta.json', severity: 'skip', detail: detailMsg.data });
  }

  const contentResult: Result<Str> = readFile(metaPathResult.data);
  if (!contentResult.ok) return contentResult;

  let meta: UntypedJson;
  try {
    meta = JSON.parse(contentResult.data);
  } catch {
    return ok(VoidSchema, undefined);
  }

  if (typeof meta !== 'object' || meta === null) return ok(VoidSchema, undefined);

  const STALE_THRESHOLD_DAYS: NonNegativeInteger = 90;
  const now: NonNegativeInteger = Date.now();

  for (const [name, entry] of Object.entries(meta as Record<Str, UntypedJson>)) {
    if (typeof entry !== 'object' || entry === null) continue;
    const entryObj: Record<Str, unknown> = entry as Record<Str, unknown>;
    const fetchedAt: unknown = entryObj.fetchedAt;
    if (typeof fetchedAt !== 'string') continue;

    const fetchDate: NonNegativeInteger = new Date(fetchedAt).getTime();
    if (Number.isNaN(fetchDate)) continue;

    const daysSince: NonNegativeInteger = Math.floor((now - fetchDate) / (1000 * 60 * 60 * 24));

    if (daysSince > STALE_THRESHOLD_DAYS) {
      const detailMsg: Result<Str> = ctx.strings.detailSchemaStale({ daysSince, fetchedAt });
      if (!detailMsg.ok) return detailMsg;
      const e: Result<Void> = emitResult(ctx, { name, severity: 'warn', detail: detailMsg.data });
      if (!e.ok) return e;
    } else {
      const detailMsg: Result<Str> = ctx.strings.detailSchemaFresh();
      if (!detailMsg.ok) return detailMsg;
      const e: Result<Void> = emitResult(ctx, { name, severity: 'pass', detail: detailMsg.data });
      if (!e.ok) return e;
    }
  }

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Pass 7: Internal Consistency
// =============================================================================

/**
 * Internal consistency checks:
 * - .nvmrc vs config.versions.node
 * - package.json packageManager field vs config
 * - No volta config in package.json
 * - mise.toml presence when systemTools configured
 * - ./bin/mise bootstrap script exists
 * - .mise/ in .gitignore
 *
 * @param ctx - Pass context.
 * @returns `Result<Void>`
 */
function checkInternalConsistency(ctx: PassContext): Result<Void> {
  const headerMsg: Result<Str> = ctx.strings.passInternalConsistency();
  if (!headerMsg.ok) return headerMsg;
  log.print(`\n{bold}${headerMsg.data}{/}`);

  let needsSync: Bool = false;

  // 7a. .nvmrc vs config.versions.node
  const nvmrcPathResult: Result<Path> = joinPath([ctx.workspaceRoot, '.nvmrc']);
  if (nvmrcPathResult.ok) {
    const nvmrcExistsResult: Result<Bool> = pathExists(nvmrcPathResult.data);
    if (nvmrcExistsResult.ok && nvmrcExistsResult.data) {
      const nvmrcContentResult: Result<Str> = readFile(nvmrcPathResult.data);
      if (nvmrcContentResult.ok) {
        const nvmrcVersion: Str = nvmrcContentResult.data.trim();
        const configNodeVersion: Str = ctx.config.versions.node;
        if (nvmrcVersion === configNodeVersion) {
          const detailMsg: Result<Str> = ctx.strings.detailNodeVersionMatch({
            version: configNodeVersion,
          });
          if (!detailMsg.ok) return detailMsg;
          const e: Result<Void> = emitResult(ctx, {
            name: '.nvmrc',
            severity: 'pass',
            detail: detailMsg.data,
          });
          if (!e.ok) return e;
        } else {
          const detailMsg: Result<Str> = ctx.strings.detailVersionMismatch({
            expected: configNodeVersion,
            actual: nvmrcVersion,
          });
          if (!detailMsg.ok) return detailMsg;
          const e: Result<Void> = emitResult(ctx, {
            name: '.nvmrc',
            severity: 'fail',
            detail: detailMsg.data,
          });
          if (!e.ok) return e;
          needsSync = true;
        }
      }
    } else {
      const detailMsg: Result<Str> = ctx.strings.detailFileNotFound({ path: '.nvmrc' });
      if (!detailMsg.ok) return detailMsg;
      const e: Result<Void> = emitResult(ctx, {
        name: '.nvmrc',
        severity: 'fail',
        detail: detailMsg.data,
      });
      if (!e.ok) return e;
      needsSync = true;
    }
  }

  // 7b. package.json packageManager field + 7c. No volta
  const pkgPathResult: Result<Path> = joinPath([ctx.workspaceRoot, 'package.json']);
  if (pkgPathResult.ok) {
    const pkgContentResult: Result<Str> = readFile(pkgPathResult.data);
    if (pkgContentResult.ok) {
      try {
        const pkg: UntypedJson = JSON.parse(pkgContentResult.data);
        if (typeof pkg === 'object' && pkg !== null) {
          const pkgObj: Record<Str, unknown> = pkg as Record<Str, unknown>;

          // 7b. packageManager field
          const pmField: unknown = pkgObj.packageManager;
          const pmName: Str = ctx.config.tooling.packageManager.manager;
          const pmVersion: Str = ctx.config.versions.packageManager;
          const expectedPm: Str = `${pmName}@${pmVersion}`;

          if (typeof pmField === 'string' && pmField.startsWith(expectedPm)) {
            const detailMsg: Result<Str> = ctx.strings.detailPackageManagerMatch({
              pm: pmName,
              version: pmVersion,
            });
            if (!detailMsg.ok) return detailMsg;
            const e: Result<Void> = emitResult(ctx, {
              name: 'packageManager',
              severity: 'pass',
              detail: detailMsg.data,
            });
            if (!e.ok) return e;
          } else {
            const actual: Str = typeof pmField === 'string' ? pmField : 'missing';
            const detailMsg: Result<Str> = ctx.strings.detailVersionMismatch({
              expected: expectedPm,
              actual,
            });
            if (!detailMsg.ok) return detailMsg;
            const e: Result<Void> = emitResult(ctx, {
              name: 'packageManager',
              severity: 'fail',
              detail: detailMsg.data,
            });
            if (!e.ok) return e;
            needsSync = true;
          }

          // 7c. No volta in package.json
          if ('volta' in pkgObj) {
            const detailMsg: Result<Str> = ctx.strings.detailVoltaFound();
            if (!detailMsg.ok) return detailMsg;
            const e: Result<Void> = emitResult(ctx, {
              name: 'volta',
              severity: 'fail',
              detail: detailMsg.data,
            });
            if (!e.ok) return e;
            needsSync = true;
          } else {
            const detailMsg: Result<Str> = ctx.strings.detailNoVolta();
            if (!detailMsg.ok) return detailMsg;
            const e: Result<Void> = emitResult(ctx, {
              name: 'volta',
              severity: 'pass',
              detail: detailMsg.data,
            });
            if (!e.ok) return e;
          }
        }
      } catch {
        // JSON parse error — handled by pass 2
      }
    }
  }

  // 7d. mise.toml exists when systemTools are configured
  const hasSystemTools: Bool = Object.keys(ctx.config.versions.systemTools).length > 0;
  if (hasSystemTools) {
    const misePathResult: Result<Path> = joinPath([ctx.workspaceRoot, 'mise.toml']);
    if (misePathResult.ok) {
      const miseExistsResult: Result<Bool> = pathExists(misePathResult.data);
      if (miseExistsResult.ok && miseExistsResult.data) {
        const detailMsg: Result<Str> = ctx.strings.detailMiseTomlExists();
        if (!detailMsg.ok) return detailMsg;
        const e: Result<Void> = emitResult(ctx, {
          name: 'mise.toml',
          severity: 'pass',
          detail: detailMsg.data,
        });
        if (!e.ok) return e;
      } else {
        const detailMsg: Result<Str> = ctx.strings.detailMissing({ what: 'mise.toml' });
        if (!detailMsg.ok) return detailMsg;
        const e: Result<Void> = emitResult(ctx, {
          name: 'mise.toml',
          severity: 'fail',
          detail: detailMsg.data,
        });
        if (!e.ok) return e;
        needsSync = true;
      }
    }
  }

  // 7e. ./bin/mise bootstrap script exists
  const binMisePathResult: Result<Path> = joinPath([ctx.workspaceRoot, 'bin', 'mise']);
  if (binMisePathResult.ok) {
    const binMiseExistsResult: Result<Bool> = pathExists(binMisePathResult.data);
    if (binMiseExistsResult.ok && binMiseExistsResult.data) {
      const detailMsg: Result<Str> = ctx.strings.detailMiseBootstrapExists();
      if (!detailMsg.ok) return detailMsg;
      const e: Result<Void> = emitResult(ctx, {
        name: './bin/mise',
        severity: 'pass',
        detail: detailMsg.data,
      });
      if (!e.ok) return e;
    } else {
      const detailMsg: Result<Str> = ctx.strings.detailMissing({ what: './bin/mise bootstrap' });
      if (!detailMsg.ok) return detailMsg;
      const e: Result<Void> = emitResult(ctx, {
        name: './bin/mise',
        severity: 'warn',
        detail: detailMsg.data,
      });
      if (!e.ok) return e;
    }
  }

  // 7f. .gitignore has .mise/ entry
  const gitignorePathResult: Result<Path> = joinPath([ctx.workspaceRoot, '.gitignore']);
  if (gitignorePathResult.ok) {
    const gitignoreExistsResult: Result<Bool> = pathExists(gitignorePathResult.data);
    if (gitignoreExistsResult.ok && gitignoreExistsResult.data) {
      const gitignoreContentResult: Result<Str> = readFile(gitignorePathResult.data);
      if (gitignoreContentResult.ok) {
        const hasMiseIgnore: Bool = gitignoreContentResult.data.includes('.mise/');
        if (hasMiseIgnore) {
          const detailMsg: Result<Str> = ctx.strings.detailGitignoreHasMise();
          if (!detailMsg.ok) return detailMsg;
          const e: Result<Void> = emitResult(ctx, {
            name: '.gitignore',
            severity: 'pass',
            detail: detailMsg.data,
          });
          if (!e.ok) return e;
        } else {
          const detailMsg: Result<Str> = ctx.strings.detailMissing({
            what: '.mise/ in .gitignore',
          });
          if (!detailMsg.ok) return detailMsg;
          const e: Result<Void> = emitResult(ctx, {
            name: '.gitignore',
            severity: 'fail',
            detail: detailMsg.data,
          });
          if (!e.ok) return e;
          needsSync = true;
        }
      }
    }
  }

  // Fix: re-run sync
  if (needsSync) {
    const pmName: Str = ctx.config.tooling.packageManager.manager;
    const fixResult: Result<Bool> = runFix(
      ctx,
      `${pmName} run update:sync`,
      'regenerate config files',
    );
    if (!fixResult.ok) return fixResult;
  }

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Command Definition
// =============================================================================

/** CLI command instance for the checks tool. */
const command = createCommand<BuiltChecksStrings>({
  id: 'checks',
  version: '1.0.0',
  runtimes: ['node-tty', 'node-pipe'] as SupportedRuntimes,
  flagDefs: TOOL_FLAG_DEFS,

  /**
   * Handler: run all 7 validation passes sequentially.
   *
   * @param ctx - Command context with options, locale, args, cwd.
   * @returns `Result<Void>` — `ok` if all checks pass, `err` if any fail.
   */
  handler: async (ctx: CommandContext<BuiltChecksStrings>): Promise<Result<Void>> => {
    const strings: BuiltChecksStrings = ctx.locale.command;

    // Require onboarding
    const onboardResult: Result<Bool> = requireOnboarding();
    if (!onboardResult.ok) return onboardResult;
    if (!onboardResult.data) {
      return err(ERRORS.CONFIG.ONBOARDING_REQUIRED);
    }

    // Enforce workspace root
    const ensureResult: Result<EnsureWorkspaceRootResult> = ensureWorkspaceRoot();
    if (!ensureResult.ok) return ensureResult;
    if (ensureResult.data.status !== 'ok') {
      return err(ERRORS.WORKSPACE.ROOT_NOT_FOUND, {
        meta: { status: ensureResult.data.status, root: ensureResult.data.root },
      });
    }
    const workspaceRoot: Path = ensureResult.data.root;

    // Load config
    const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
    if (!configResult.ok) return configResult;
    const config: DeepReadonly<CoreConfig> = configResult.data;

    const options = ctx.options;
    const verbose: Bool = options.verbose;
    const dryRun: Bool = options.dryRun;
    const fix: Bool = (options as Record<Str, unknown>).fix === true;

    // Print header
    const headerMsg: Result<Str> = strings.headerSummary();
    if (!headerMsg.ok) return headerMsg;
    log.print(`\n{bold}{underline}${headerMsg.data}{/}`);

    // Initialize summary and pass context
    const summary: CheckSummary = { passed: 0, failed: 0, warnings: 0, skipped: 0 };
    const passCtx: PassContext = { strings, config, workspaceRoot, summary, verbose, fix, dryRun };

    // Pass 1: Config vs. lockfile
    const pass1: Result<Void> = checkNodeLockfile(passCtx);
    if (!pass1.ok) return pass1;

    // Pass 2: Config vs. devDeps
    const pass2: Result<Void> = checkNodeDevDeps(passCtx);
    if (!pass2.ok) return pass2;

    // Pass 3: Config vs. mise.toml
    const pass3: Result<Void> = checkMiseToml(passCtx);
    if (!pass3.ok) return pass3;

    // Pass 4: Installed system tools
    const pass4: Result<Void> = checkInstalledTools(passCtx);
    if (!pass4.ok) return pass4;

    // Pass 5: Schema versionCheck drift
    const pass5: Result<Void> = checkSchemaVersionDrift(passCtx);
    if (!pass5.ok) return pass5;

    // Pass 6: Schema freshness
    const pass6: Result<Void> = checkSchemaFreshness(passCtx);
    if (!pass6.ok) return pass6;

    // Pass 7: Internal consistency
    const pass7: Result<Void> = checkInternalConsistency(passCtx);
    if (!pass7.ok) return pass7;

    // Print summary
    log.print('');
    const summaryMsg: Result<Str> = strings.infoSummary({
      passed: summary.passed,
      failed: summary.failed,
      warnings: summary.warnings,
      skipped: summary.skipped,
    });
    if (!summaryMsg.ok) return summaryMsg;
    log.print(`{bold}${summaryMsg.data}{/}`);

    // Exit code: 1 if any fail, 0 otherwise (warnings don't affect exit)
    if (summary.failed > 0) {
      return err(ERRORS.IO.FETCH_FAILED, {
        meta: { reason: `${summary.failed} check(s) failed` },
      });
    }

    return ok(VoidSchema, undefined);
  },
});

export { command };
export default command;
