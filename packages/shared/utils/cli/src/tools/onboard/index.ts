#!/usr/bin/env tsx
/**
 * Onboarding Tool
 *
 * Guides new developers through initial environment setup.
 * Checks prerequisites (mise), runs configured onboarding steps
 * from `resist.config.ts`, and writes a completion marker.
 *
 * Usage: `<pm> tool onboard [--dry-run]`
 *
 * @module
 */

import type { CommandContext } from '@/cli/schemas';
import type { BuiltOnboardStrings } from '@/cli/tools/onboard/locales/schema';
import { ONBOARDING_ENV_VAR, writeOnboardingMarker } from '@/cli/tools/onboard/utils';
import { createCommand } from '@/cli/utils/command';
import { getConfig } from '@/config/loader';
import {
  BoolSchema,
  NonNegativeIntegerSchema,
  StrSchema,
  VoidSchema,
  type Bool,
  type EnsureMiseResult,
  type EnsureWorkspaceRootResult,
  type NonNegativeInteger,
  type Path,
  type Str,
  type SupportedRuntimes,
  type Void,
} from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import { ERRORS, type Result, err, ok } from '@/schemas/result/result';
import { type OptionalNodeChildProcess, nodeChildProcess } from '@/utils/core/node-imports';
import type { DeepReadonly } from '@/utils/core/object';
import { ensureMise, runPmCommand } from '@/utils/core/shell';
import { log, style, symbols } from '@/utils/core/terminal';
import { ensureWorkspaceRoot } from '@/utils/core/workspace';
import { fromUnknownError, safeParse } from '@/utils/result/safe';

// =============================================================================
// Core Logic
// =============================================================================

/**
 * Handle mise installation during onboarding.
 * Checks workspace-local mise, auto-installs at pinned version if missing/outdated.
 *
 * @param strings - Built locale strings for the onboard tool.
 * @param workspaceRoot - Absolute path to workspace root.
 * @param configVersion - Pinned mise version from config.
 * @param dryRun - Whether to skip actual operations.
 * @returns `Result<Void>` — success or error.
 */
function handleMise(
  strings: BuiltOnboardStrings,
  workspaceRoot: Str,
  configVersion: Str,
  dryRun: Bool,
): Result<Void> {
  const checkingMiseMsg: Result<Str> = strings.checkingMise();
  if (!checkingMiseMsg.ok) return checkingMiseMsg;
  log.print(`  {symbol:info} ${checkingMiseMsg.data}`);

  const miseResult: Result<EnsureMiseResult> = ensureMise(workspaceRoot, configVersion, dryRun);
  if (!miseResult.ok) return miseResult;

  switch (miseResult.data.status) {
    case 'skipped_dry_run': {
      const dryRunPrefixMsg: Result<Str> = strings.dryRunPrefix();
      if (!dryRunPrefixMsg.ok) return dryRunPrefixMsg;
      const dryRunMiseCheckMsg: Result<Str> = strings.dryRunMiseCheck();
      if (!dryRunMiseCheckMsg.ok) return dryRunMiseCheckMsg;
      log.print(`  {yellow}${dryRunPrefixMsg.data}{/} {dim}${dryRunMiseCheckMsg.data}{/}`);
      break;
    }
    case 'already_installed': {
      const miseFoundMsg: Result<Str> = strings.miseFound();
      if (!miseFoundMsg.ok) return miseFoundMsg;
      log.print(`  {green}{symbol:success}{/} ${miseFoundMsg.data}`);
      break;
    }
    case 'installed': {
      const miseInstalledMsg: Result<Str> = strings.miseInstalled();
      if (!miseInstalledMsg.ok) return miseInstalledMsg;
      log.print(`  {green}{symbol:success}{/} ${miseInstalledMsg.data}`);
      break;
    }
    case 'updated': {
      const miseUpdatedMsg: Result<Str> = strings.miseUpdated();
      if (!miseUpdatedMsg.ok) return miseUpdatedMsg;
      log.print(`  {green}{symbol:success}{/} ${miseUpdatedMsg.data}`);
      break;
    }
    case 'install_failed': {
      const miseNotFoundMsg: Result<Str> = strings.miseNotFound();
      if (!miseNotFoundMsg.ok) return miseNotFoundMsg;
      log.print(`  {red}{symbol:error}{/} ${miseNotFoundMsg.data}`);
      return err(ERRORS.IO.EXEC_FAILED, {
        meta: {
          tool: 'mise',
          reason: 'Failed to install mise — see https://mise.jdx.dev/getting-started.html',
        },
      });
    }
  }

  return ok(VoidSchema, undefined);
}

/**
 * Run `./bin/mise install` to install all system tools at pinned versions.
 * Called after mise itself is verified/installed. This ensures Node is at the
 * correct version (from .nvmrc via mise) BEFORE `pnpm i` runs.
 *
 * @param strings - Built locale strings for the onboard tool.
 * @param workspaceRoot - Absolute path to workspace root.
 * @param dryRun - Whether to skip actual operations.
 * @returns `Result<Void>` — success or error.
 */
function handleMiseInstall(
  strings: BuiltOnboardStrings,
  workspaceRoot: Str,
  dryRun: Bool,
): Result<Void> {
  const installingToolsMsg: Result<Str> = strings.installingMiseTools();
  if (!installingToolsMsg.ok) return installingToolsMsg;
  log.print(`  {symbol:info} ${installingToolsMsg.data}`);

  if (dryRun) {
    const dryRunPrefixMsg: Result<Str> = strings.dryRunPrefix();
    if (!dryRunPrefixMsg.ok) return dryRunPrefixMsg;
    const dryRunMiseInstallMsg: Result<Str> = strings.dryRunMiseInstall();
    if (!dryRunMiseInstallMsg.ok) return dryRunMiseInstallMsg;
    log.print(`  {yellow}${dryRunPrefixMsg.data}{/} {dim}${dryRunMiseInstallMsg.data}{/}`);
    return ok(VoidSchema, undefined);
  }

  const cp: OptionalNodeChildProcess = nodeChildProcess;
  if (!cp) {
    return err(ERRORS.IO.EXEC_FAILED, {
      meta: { command: './bin/mise install', reason: 'Node.js child_process not available' },
    });
  }

  try {
    cp.execSync(`${workspaceRoot}/bin/mise install`, {
      stdio: 'inherit',
      cwd: workspaceRoot,
    });
  } catch (thrown: unknown) {
    return err(ERRORS.IO.EXEC_FAILED, {
      meta: { command: './bin/mise install' },
      cause: fromUnknownError(thrown),
    });
  }

  // Generate shims so tools are on PATH without requiring `mise activate` in the shell
  try {
    cp.execSync(`${workspaceRoot}/bin/mise reshim`, {
      stdio: 'inherit',
      cwd: workspaceRoot,
    });
  } catch (thrown: unknown) {
    // Non-fatal — tools are installed, shims are a convenience
    const reshimWarnMsg: Result<Str> = strings.miseReshimFailed();
    if (!reshimWarnMsg.ok) return reshimWarnMsg;
    log.warn(reshimWarnMsg.data);
  }

  const toolsInstalledMsg: Result<Str> = strings.miseToolsInstalled();
  if (!toolsInstalledMsg.ok) return toolsInstalledMsg;
  log.print(`  {green}{symbol:success}{/} ${toolsInstalledMsg.data}`);

  return ok(VoidSchema, undefined);
}

/**
 * Run a single onboarding step.
 *
 * Passes `RESIST_ONBOARDING=1` env var so nested tools know they're
 * being called as part of onboarding and skip their own onboarding check.
 *
 * @param strings - Built locale strings for messages.
 * @param step - Step command to run (e.g. `"sync"`, `"install"`).
 * @param dryRun - Whether to skip actual execution.
 * @returns `Result<Bool>` — `true` if the step succeeded, `false` if it failed.
 */
function runStep(strings: BuiltOnboardStrings, step: Str, dryRun: Bool): Result<Bool> {
  const stepResult: Result<Str> = safeParse(StrSchema, step);
  if (!stepResult.ok) return stepResult;

  const runningStepMsg: Result<Str> = strings.runningStep({ step: stepResult.data });
  if (!runningStepMsg.ok) return runningStepMsg;
  log.print(`\n{bold}${runningStepMsg.data}{/}`);

  if (dryRun) {
    const dryRunPrefixMsg: Result<Str> = strings.dryRunPrefix();
    if (!dryRunPrefixMsg.ok) return dryRunPrefixMsg;
    const dryRunSkippingMsg: Result<Str> = strings.dryRunSkipping({ step: stepResult.data });
    if (!dryRunSkippingMsg.ok) return dryRunSkippingMsg;
    log.print(`  {yellow}${dryRunPrefixMsg.data}{/} ${dryRunSkippingMsg.data}`);
    return ok(BoolSchema, true);
  }

  const pmResult: Result<Str> = runPmCommand([stepResult.data], 'inherit', {
    [ONBOARDING_ENV_VAR]: '1',
  });
  if (!pmResult.ok) {
    const stepFailedMsg: Result<Str> = strings.stepFailed({ step: stepResult.data });
    if (!stepFailedMsg.ok) return stepFailedMsg;
    log.error(stepFailedMsg.data);
    return ok(BoolSchema, false);
  }

  const stepSucceededMsg: Result<Str> = strings.stepSucceeded({ step: stepResult.data });
  if (!stepSucceededMsg.ok) return stepSucceededMsg;
  log.print(`  {green}{symbol:success}{/} ${stepSucceededMsg.data}`);
  return ok(BoolSchema, true);
}

/**
 * Print completion message with a bordered box showing next steps.
 *
 * @param strings - Built locale strings for messages.
 * @param config - Resolved core configuration (for package manager name).
 * @returns Ok on success, or an error Result.
 */
function printSuccess(
  strings: BuiltOnboardStrings,
  config: DeepReadonly<CoreConfig>,
): Result<Void> {
  const separatorMsg: Result<Str> = strings.separator();
  if (!separatorMsg.ok) return separatorMsg;

  log.print('');
  log.print(`{dim}${separatorMsg.data}{/}`);
  log.print('');

  const sectionCompleteMsg: Result<Str> = strings.sectionComplete();
  if (!sectionCompleteMsg.ok) return sectionCompleteMsg;
  log.print(`  {green}{symbol:success}{/} {bold}${sectionCompleteMsg.data}{/}`);
  log.print('');

  // Box with next steps
  const boxWidthResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, 43);
  if (!boxWidthResult.ok) return boxWidthResult;
  const boxWidth: NonNegativeInteger = boxWidthResult.data;
  const boxLine: Str = '─'.repeat(boxWidth);

  log.raw(`  ${symbols.boxTopLeft}${boxLine}${symbols.boxTopRight}`);
  log.raw(`  ${symbols.boxVertical}${' '.repeat(boxWidth)}${symbols.boxVertical}`);

  const readyToDevHeaderMsg: Result<Str> = strings.readyToDevHeader();
  if (!readyToDevHeaderMsg.ok) return readyToDevHeaderMsg;
  const boldHeaderResult: Result<Str> = style.bold(readyToDevHeaderMsg.data);
  if (!boldHeaderResult.ok) return boldHeaderResult;
  log.raw(
    `  ${symbols.boxVertical}   ${boldHeaderResult.data}${' '.repeat(boxWidth - 4 - readyToDevHeaderMsg.data.length)}${symbols.boxVertical}`,
  );

  log.raw(`  ${symbols.boxVertical}${' '.repeat(boxWidth)}${symbols.boxVertical}`);

  const inTwoTerminalsMsg: Result<Str> = strings.inTwoTerminals();
  if (!inTwoTerminalsMsg.ok) return inTwoTerminalsMsg;
  const dimTerminalsResult: Result<Str> = style.dim(inTwoTerminalsMsg.data);
  if (!dimTerminalsResult.ok) return dimTerminalsResult;
  log.raw(
    `  ${symbols.boxVertical}   ${dimTerminalsResult.data}${' '.repeat(boxWidth - 4 - inTwoTerminalsMsg.data.length)}${symbols.boxVertical}`,
  );

  log.raw(`  ${symbols.boxVertical}${' '.repeat(boxWidth)}${symbols.boxVertical}`);

  const pm: Str = config.tooling.packageManager.manager;
  const pmRun: Str = pm === 'npm' ? 'npm run' : pm;
  const devCmd: Str = `${pmRun} dev`;
  const proxyCmd: Str = `${pmRun} dev:proxy`;

  const stepDevDescriptionMsg: Result<Str> = strings.stepDevDescription();
  if (!stepDevDescriptionMsg.ok) return stepDevDescriptionMsg;
  const stepProxyDescriptionMsg: Result<Str> = strings.stepProxyDescription();
  if (!stepProxyDescriptionMsg.ok) return stepProxyDescriptionMsg;

  const devPaddingResult: Result<NonNegativeInteger> = safeParse(
    NonNegativeIntegerSchema,
    Math.max(0, boxWidth - 4 - 3 - devCmd.length - 1 - stepDevDescriptionMsg.data.length),
  );
  if (!devPaddingResult.ok) return devPaddingResult;
  const devPadding: NonNegativeInteger = devPaddingResult.data;
  const proxyPaddingResult: Result<NonNegativeInteger> = safeParse(
    NonNegativeIntegerSchema,
    Math.max(0, boxWidth - 4 - 3 - proxyCmd.length - 1 - stepProxyDescriptionMsg.data.length),
  );
  if (!proxyPaddingResult.ok) return proxyPaddingResult;
  const proxyPadding: NonNegativeInteger = proxyPaddingResult.data;

  const cyan1Result: Result<Str> = style.cyan('1.');
  if (!cyan1Result.ok) return cyan1Result;
  const greenDevResult: Result<Str> = style.green(devCmd);
  if (!greenDevResult.ok) return greenDevResult;
  const dimDevResult: Result<Str> = style.dim(stepDevDescriptionMsg.data);
  if (!dimDevResult.ok) return dimDevResult;
  log.raw(
    `  ${symbols.boxVertical}   ${cyan1Result.data} ${greenDevResult.data}${' '.repeat(Math.max(1, 15 - devCmd.length))}${dimDevResult.data}${' '.repeat(devPadding)}${symbols.boxVertical}`,
  );

  const cyan2Result: Result<Str> = style.cyan('2.');
  if (!cyan2Result.ok) return cyan2Result;
  const greenProxyResult: Result<Str> = style.green(proxyCmd);
  if (!greenProxyResult.ok) return greenProxyResult;
  const dimProxyResult: Result<Str> = style.dim(stepProxyDescriptionMsg.data);
  if (!dimProxyResult.ok) return dimProxyResult;
  log.raw(
    `  ${symbols.boxVertical}   ${cyan2Result.data} ${greenProxyResult.data}${' '.repeat(Math.max(1, 15 - proxyCmd.length))}${dimProxyResult.data}${' '.repeat(proxyPadding)}${symbols.boxVertical}`,
  );

  log.raw(`  ${symbols.boxVertical}${' '.repeat(boxWidth)}${symbols.boxVertical}`);
  log.raw(`  ${symbols.boxBottomLeft}${boxLine}${symbols.boxBottomRight}`);

  log.print('');
  log.print(`{dim}${separatorMsg.data}{/}`);
  log.print('');

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Command Definition
// =============================================================================

/** CLI command instance for the onboard tool. */
const command = createCommand<BuiltOnboardStrings>({
  id: 'onboard',
  version: '1.0.0',
  runtimes: ['node-tty', 'node-pipe'],
  handler: async (ctx: CommandContext<BuiltOnboardStrings>): Promise<Result<Void>> => {
    const strings: BuiltOnboardStrings = ctx.locale.command;
    const dryRun: Bool = ctx.options.dryRun;

    // Debug output for verbose/debug modes
    const debugOptionsMsg: Result<Str> = strings.debugOptions({ dryRun });
    if (!debugOptionsMsg.ok) return debugOptionsMsg;
    log.debug(debugOptionsMsg.data);

    // Enforce workspace root
    const ensureResult: Result<EnsureWorkspaceRootResult> = ensureWorkspaceRoot();
    if (!ensureResult.ok) return ensureResult;
    if (ensureResult.data.status !== 'ok') {
      return err(ERRORS.WORKSPACE.ROOT_NOT_FOUND, {
        meta: { status: ensureResult.data.status, root: ensureResult.data.root },
      });
    }

    const headerMsg: Result<Str> = strings.header();
    if (!headerMsg.ok) return headerMsg;
    log.print(`{bold}{yellow}${headerMsg.data}{/}{/}`);
    const separatorMsg: Result<Str> = strings.separator();
    if (!separatorMsg.ok) return separatorMsg;
    log.print(`{dim}${separatorMsg.data}{/}`);

    if (dryRun) {
      const dryRunPrefixMsg: Result<Str> = strings.dryRunPrefix();
      if (!dryRunPrefixMsg.ok) return dryRunPrefixMsg;
      const dryRunPreviewModeMsg: Result<Str> = strings.dryRunPreviewMode();
      if (!dryRunPreviewModeMsg.ok) return dryRunPreviewModeMsg;
      log.raw(`\n{yellow}${dryRunPrefixMsg.data}{/} {dim}${dryRunPreviewModeMsg.data}{/}`);
    }

    // Check prerequisites (mise)
    const sectionPrerequisitesMsg: Result<Str> = strings.sectionPrerequisites();
    if (!sectionPrerequisitesMsg.ok) return sectionPrerequisitesMsg;
    log.print(`\n{bold}${sectionPrerequisitesMsg.data}{/}`);

    const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
    if (!configResult.ok) return configResult;

    const workspaceRoot: Path = ensureResult.data.root;

    // 1. Ensure mise is at correct version
    const miseResult: Result<Void> = handleMise(
      strings,
      workspaceRoot,
      configResult.data.versions.systemTools.mise,
      dryRun,
    );
    if (!miseResult.ok) return miseResult;

    // 2. Install all system tools via mise (Node, formatters, etc.)
    const miseInstallResult: Result<Void> = handleMiseInstall(strings, workspaceRoot, dryRun);
    if (!miseInstallResult.ok) return miseInstallResult;

    // Run setup steps
    const sectionSetupMsg: Result<Str> = strings.sectionSetup();
    if (!sectionSetupMsg.ok) return sectionSetupMsg;
    log.print(`\n{bold}${sectionSetupMsg.data}{/}`);

    for (const step of configResult.data.tooling.onboarding.steps) {
      const stepResult: Result<Bool> = runStep(strings, step, dryRun);
      if (!stepResult.ok) return stepResult;

      if (!stepResult.data) {
        return err(ERRORS.IO.EXEC_FAILED, { meta: { reason: `Setup failed at step: ${step}` } });
      }
    }

    // Write onboarding marker after all steps succeed
    if (!dryRun) {
      const markerResult: Result<Void> = writeOnboardingMarker(
        configResult.data.tooling.onboarding.steps,
        '1.0.0',
      );
      if (!markerResult.ok) return markerResult;
    }

    const printResult: Result<Void> = printSuccess(strings, configResult.data);
    if (!printResult.ok) return printResult;

    return ok(VoidSchema, undefined);
  },
});

export { command };
export default command;
