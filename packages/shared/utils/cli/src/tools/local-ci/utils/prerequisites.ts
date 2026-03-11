/**
 * Local CI Tool Prerequisites
 *
 * Detection, installation, and verification of tools needed
 * for running CI locally — act (GitHub) or gitlab-ci-local (GitLab).
 *
 * @module
 */

import type { BuiltLocalCiStrings } from '@/cli/tools/local-ci/locales/schema';
import { getConfig } from '@/config/loader';
import {
  CommandSchema,
  NonNegativeIntegerSchema,
  type Bool,
  BoolSchema,
  type Command,
  type NonNegativeInteger,
  type Str,
  VoidSchema,
  type Void,
} from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';
import { commandExists, execSyncBool, execSyncSafe } from '@/utils/core/shell';
import { log } from '@/utils/core/terminal';
import type { DeepReadonly } from '@/utils/core/object';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Detection Helpers
// =============================================================================

/**
 * Check if Docker is installed and the daemon is running.
 *
 * @returns `Result<Bool>` — `true` if Docker is available and running.
 */
function isDockerReady(): Result<Bool> {
  const dockerCmdResult: Result<Command> = safeParse(CommandSchema, 'docker');
  if (!dockerCmdResult.ok) return dockerCmdResult;
  const existsResult: Result<Bool> = commandExists(dockerCmdResult.data);
  if (!existsResult.ok) return existsResult;
  if (!existsResult.data) return ok(BoolSchema, false);

  const infoCmdResult: Result<Command> = safeParse(CommandSchema, 'docker info');
  if (!infoCmdResult.ok) return infoCmdResult;
  const runningResult: Result<Bool> = execSyncBool(infoCmdResult.data);
  if (!runningResult.ok) return runningResult;
  return ok(BoolSchema, runningResult.data);
}

/**
 * Install a tool via mise using the workspace bootstrap binary.
 *
 * @param workspaceRoot - Absolute path to workspace root (for bin/mise location).
 * @param toolName - Tool name in mise registry (e.g., `act`, `actionlint`).
 * @param version - Version to install (e.g., `0.2.74`, `1.7.11`).
 * @returns `Result<Void>` — success or install error.
 */
function installViaMise(workspaceRoot: Str, toolName: Str, version: Str): Result<Void> {
  const installCmdResult: Result<Command> = safeParse(
    CommandSchema,
    `${workspaceRoot}/bin/mise install ${toolName}@${version}`,
  );
  if (!installCmdResult.ok) return err(ERRORS.IO.INSTALL_FAILED, { meta: { tool: toolName } });
  const installResult: Result<Str> = execSyncSafe(installCmdResult.data);
  if (!installResult.ok) return err(ERRORS.IO.INSTALL_FAILED, { meta: { tool: toolName } });

  const useCmdResult: Result<Command> = safeParse(
    CommandSchema,
    `${workspaceRoot}/bin/mise use -g ${toolName}@${version}`,
  );
  if (!useCmdResult.ok) return err(ERRORS.IO.INSTALL_FAILED, { meta: { tool: toolName } });
  const useResult: Result<Str> = execSyncSafe(useCmdResult.data);
  if (!useResult.ok) return err(ERRORS.IO.INSTALL_FAILED, { meta: { tool: toolName } });

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Prerequisite Pipeline
// =============================================================================

/**
 * Ensure all prerequisites for running CI locally are installed.
 * Missing tools are auto-installed via mise where possible.
 * Docker is the one exception — prints instructions if not running.
 *
 * Prerequisites checked:
 * 1. Docker (must be running — cannot auto-install)
 * 2. act (auto-install via mise, version from config)
 * 3. actionlint (auto-install via mise, version from config)
 * 4. .actrc (must exist — run sync if missing)
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param strings - Built locale strings for user messages.
 * @returns `Result<Void>` — success if all prerequisites met, or first error.
 */
export async function ensureCiPrerequisites(
  workspaceRoot: Str,
  strings: BuiltLocalCiStrings,
): Promise<Result<Void>> {
  const headerResult: Result<Str> = strings.checkingPrereqs();
  if (!headerResult.ok) return headerResult;
  log.print(`{dim}${headerResult.data}{/}`);

  // Load config for tool versions
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;
  const config: DeepReadonly<CoreConfig> = configResult.data;
  const actVersion: Str = config.versions.systemTools.act;
  const actionlintVersion: Str = config.versions.systemTools.actionlint;

  // 1. Check Docker
  const dockerResult: Result<Bool> = isDockerReady();
  if (!dockerResult.ok) return dockerResult;
  if (!dockerResult.data) {
    const msg: Result<Str> = strings.dockerNotReady();
    if (!msg.ok) return msg;
    log.print(`  {red}{symbol:error}{/} ${msg.data}`);
    return err(ERRORS.IO.PREREQUISITE_MISSING, msg.data);
  }

  // 2. Check act
  const actCmdResult: Result<Command> = safeParse(CommandSchema, 'act');
  if (!actCmdResult.ok) return actCmdResult;
  const actExistsResult: Result<Bool> = commandExists(actCmdResult.data);
  if (!actExistsResult.ok) return actExistsResult;
  if (!actExistsResult.data) {
    const notFoundMsg: Result<Str> = strings.actNotFound();
    if (!notFoundMsg.ok) return notFoundMsg;
    log.print(`  {yellow}{symbol:warning}{/} ${notFoundMsg.data}`);
    const installMsg: Result<Str> = strings.actInstalling();
    if (!installMsg.ok) return installMsg;
    log.print(`  {dim}${installMsg.data}{/}`);

    const installResult: Result<Void> = installViaMise(workspaceRoot, 'act' as Str, actVersion);
    if (!installResult.ok) return installResult;

    const installedMsg: Result<Str> = strings.actInstalled({ version: actVersion });
    if (!installedMsg.ok) return installedMsg;
    log.print(`  {green}{symbol:success}{/} ${installedMsg.data}`);
  }

  // 3. Check actionlint
  const actionlintCmdResult: Result<Command> = safeParse(CommandSchema, 'actionlint');
  if (!actionlintCmdResult.ok) return actionlintCmdResult;
  const actionlintExistsResult: Result<Bool> = commandExists(actionlintCmdResult.data);
  if (!actionlintExistsResult.ok) return actionlintExistsResult;
  if (!actionlintExistsResult.data) {
    const notFoundMsg: Result<Str> = strings.actionlintNotFound();
    if (!notFoundMsg.ok) return notFoundMsg;
    log.print(`  {yellow}{symbol:warning}{/} ${notFoundMsg.data}`);
    const installMsg: Result<Str> = strings.actionlintInstalling();
    if (!installMsg.ok) return installMsg;
    log.print(`  {dim}${installMsg.data}{/}`);

    const installResult: Result<Void> = installViaMise(
      workspaceRoot,
      'actionlint' as Str,
      actionlintVersion,
    );
    if (!installResult.ok) return installResult;
  }

  // 4. Check .actrc exists
  const actrcTestCmdResult: Result<Command> = safeParse(
    CommandSchema,
    `test -f ${workspaceRoot}/.actrc`,
  );
  if (!actrcTestCmdResult.ok) return actrcTestCmdResult;
  const actrcExistsResult: Result<Bool> = execSyncBool(actrcTestCmdResult.data);
  if (!actrcExistsResult.ok) return actrcExistsResult;
  if (!actrcExistsResult.data) {
    const msg: Result<Str> = strings.actrcNotFound();
    if (!msg.ok) return msg;
    log.print(`  {red}{symbol:error}{/} ${msg.data}`);
    return err(ERRORS.CONFIG.NOT_FOUND, msg.data);
  }

  return ok(VoidSchema, undefined);
}

/**
 * Check all CI prerequisites and print a status table.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param strings - Built locale strings for user messages.
 * @returns `Result<Void>` — always succeeds (status is informational).
 */
export async function checkCiStatus(
  workspaceRoot: Str,
  strings: BuiltLocalCiStrings,
): Result<Void> {
  const headerResult: Result<Str> = strings.statusHeader();
  if (!headerResult.ok) return headerResult;
  log.print(`\n{bold}{yellow}${headerResult.data}{/}{/}`);

  // Docker
  const dockerResult: Result<Bool> = isDockerReady();
  if (!dockerResult.ok) return dockerResult;
  if (dockerResult.data) {
    const msg: Result<Str> = strings.statusDockerReady();
    if (!msg.ok) return msg;
    log.print(`  {green}{symbol:success}{/} ${msg.data}`);
  } else {
    const msg: Result<Str> = strings.statusDockerNotReady();
    if (!msg.ok) return msg;
    log.print(`  {red}{symbol:error}{/} ${msg.data}`);
  }

  // act
  const actCmdResult: Result<Command> = safeParse(CommandSchema, 'act');
  if (!actCmdResult.ok) return actCmdResult;
  const actExistsResult: Result<Bool> = commandExists(actCmdResult.data);
  if (!actExistsResult.ok) return actExistsResult;
  if (actExistsResult.data) {
    const versionCmdResult: Result<Command> = safeParse(CommandSchema, 'act --version');
    if (!versionCmdResult.ok) return versionCmdResult;
    const versionResult: Result<Str> = execSyncSafe(versionCmdResult.data);
    if (!versionResult.ok) return versionResult;
    const msg: Result<Str> = strings.statusToolAvailable({
      tool: 'act' as Str,
      version: versionResult.data.trim() as Str,
    });
    if (!msg.ok) return msg;
    log.print(`  {green}{symbol:success}{/} ${msg.data}`);
  } else {
    const msg: Result<Str> = strings.statusToolMissing({ tool: 'act' as Str });
    if (!msg.ok) return msg;
    log.print(`  {yellow}{symbol:warning}{/} ${msg.data}`);
  }

  // actionlint
  const actionlintCmdResult: Result<Command> = safeParse(CommandSchema, 'actionlint');
  if (!actionlintCmdResult.ok) return actionlintCmdResult;
  const actionlintExistsResult: Result<Bool> = commandExists(actionlintCmdResult.data);
  if (!actionlintExistsResult.ok) return actionlintExistsResult;
  if (actionlintExistsResult.data) {
    const versionCmdResult: Result<Command> = safeParse(CommandSchema, 'actionlint --version');
    if (!versionCmdResult.ok) return versionCmdResult;
    const versionResult: Result<Str> = execSyncSafe(versionCmdResult.data);
    if (!versionResult.ok) return versionResult;
    const msg: Result<Str> = strings.statusToolAvailable({
      tool: 'actionlint' as Str,
      version: versionResult.data.trim() as Str,
    });
    if (!msg.ok) return msg;
    log.print(`  {green}{symbol:success}{/} ${msg.data}`);
  } else {
    const msg: Result<Str> = strings.statusToolMissing({ tool: 'actionlint' as Str });
    if (!msg.ok) return msg;
    log.print(`  {yellow}{symbol:warning}{/} ${msg.data}`);
  }

  // .actrc
  const actrcTestCmdResult: Result<Command> = safeParse(
    CommandSchema,
    `test -f ${workspaceRoot}/.actrc`,
  );
  if (!actrcTestCmdResult.ok) return actrcTestCmdResult;
  const actrcExistsResult: Result<Bool> = execSyncBool(actrcTestCmdResult.data);
  if (!actrcExistsResult.ok) return actrcExistsResult;
  if (actrcExistsResult.data) {
    const msg: Result<Str> = strings.statusActrcFound();
    if (!msg.ok) return msg;
    log.print(`  {green}{symbol:success}{/} ${msg.data}`);
  } else {
    const msg: Result<Str> = strings.statusActrcMissing();
    if (!msg.ok) return msg;
    log.print(`  {yellow}{symbol:warning}{/} ${msg.data}`);
  }

  // Workflow files
  const wfCountCmdResult: Result<Command> = safeParse(
    CommandSchema,
    `ls -1 ${workspaceRoot}/.github/workflows/*.yml 2>/dev/null | wc -l`,
  );
  if (wfCountCmdResult.ok) {
    const workflowCountResult: Result<Str> = execSyncSafe(wfCountCmdResult.data);
    if (workflowCountResult.ok) {
      const countStr: Str = workflowCountResult.data.trim() as Str;
      const countNum: number = parseInt(countStr, 10) || 0;
      const countResult: Result<NonNegativeInteger> = safeParse(
        (await import('@/schemas/common')).NonNegativeIntegerSchema,
        countNum,
      );
      if (countNum === 0) {
        const msg: Result<Str> = strings.statusNoWorkflows();
        if (!msg.ok) return msg;
        log.print(`  {dim}{symbol:info}{/} ${msg.data}`);
      } else if (countResult.ok) {
        const msg: Result<Str> = strings.statusWorkflowsFound({ count: countResult.data });
        if (!msg.ok) return msg;
        log.print(`  {green}{symbol:success}{/} ${msg.data}`);
      }
    }
  }

  return ok(VoidSchema, undefined);
}

// =============================================================================
// GitLab Prerequisites
// =============================================================================

/**
 * Ensure all prerequisites for running GitLab CI locally are installed.
 * Missing tools are auto-installed via mise where possible.
 *
 * Prerequisites checked:
 * 1. Docker (must be running — cannot auto-install)
 * 2. gitlab-ci-local (auto-install via mise with npm: prefix)
 * 3. .gitlab-ci.yml (must exist — run sync if missing)
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param strings - Built locale strings for user messages.
 * @returns `Result<Void>` — success if all prerequisites met, or first error.
 */
export async function ensureGitlabPrerequisites(
  workspaceRoot: Str,
  strings: BuiltLocalCiStrings,
): Promise<Result<Void>> {
  const headerResult: Result<Str> = strings.checkingPrereqs();
  if (!headerResult.ok) return headerResult;
  log.print(`{dim}${headerResult.data}{/}`);

  // 1. Check Docker
  const dockerResult: Result<Bool> = isDockerReady();
  if (!dockerResult.ok) return dockerResult;
  if (!dockerResult.data) {
    const msg: Result<Str> = strings.dockerNotReady();
    if (!msg.ok) return msg;
    log.print(`  {red}{symbol:error}{/} ${msg.data}`);
    return err(ERRORS.IO.PREREQUISITE_MISSING, msg.data);
  }

  // Load config for gitlab-ci-local version
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;
  const config: DeepReadonly<CoreConfig> = configResult.data;
  const gclVersion: Str = config.versions.systemTools['gitlab-ci-local'];

  // 2. Check gitlab-ci-local
  const gclCmdResult: Result<Command> = safeParse(CommandSchema, 'gitlab-ci-local');
  if (!gclCmdResult.ok) return gclCmdResult;
  const gclExistsResult: Result<Bool> = commandExists(gclCmdResult.data);
  if (!gclExistsResult.ok) return gclExistsResult;
  if (!gclExistsResult.data) {
    const notFoundMsg: Result<Str> = strings.gitlabCiLocalNotFound();
    if (!notFoundMsg.ok) return notFoundMsg;
    log.print(`  {yellow}{symbol:warning}{/} ${notFoundMsg.data}`);
    const installMsg: Result<Str> = strings.gitlabCiLocalInstalling();
    if (!installMsg.ok) return installMsg;
    log.print(`  {dim}${installMsg.data}{/}`);

    const installResult: Result<Void> = installViaMise(
      workspaceRoot,
      'npm:gitlab-ci-local' as Str,
      gclVersion,
    );
    if (!installResult.ok) return installResult;

    const installedMsg: Result<Str> = strings.gitlabCiLocalInstalled({ version: gclVersion });
    if (!installedMsg.ok) return installedMsg;
    log.print(`  {green}{symbol:success}{/} ${installedMsg.data}`);
  }

  // 3. Check .gitlab-ci.yml exists
  const ciYmlTestCmdResult: Result<Command> = safeParse(
    CommandSchema,
    `test -f ${workspaceRoot}/.gitlab-ci.yml`,
  );
  if (!ciYmlTestCmdResult.ok) return ciYmlTestCmdResult;
  const ciYmlExistsResult: Result<Bool> = execSyncBool(ciYmlTestCmdResult.data);
  if (!ciYmlExistsResult.ok) return ciYmlExistsResult;
  if (!ciYmlExistsResult.data) {
    const msg: Result<Str> = strings.gitlabCiYmlNotFound();
    if (!msg.ok) return msg;
    log.print(`  {red}{symbol:error}{/} ${msg.data}`);
    return err(ERRORS.CONFIG.NOT_FOUND, msg.data);
  }

  return ok(VoidSchema, undefined);
}

/**
 * Check all GitLab CI prerequisites and print a status table.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param strings - Built locale strings for user messages.
 * @returns `Result<Void>` — always succeeds (status is informational).
 */
export function checkGitlabCiStatus(
  workspaceRoot: Str,
  strings: BuiltLocalCiStrings,
): Result<Void> {
  const headerResult: Result<Str> = strings.statusHeader();
  if (!headerResult.ok) return headerResult;
  log.print(`\n{bold}{yellow}${headerResult.data}{/}{/}`);

  // Docker
  const dockerResult: Result<Bool> = isDockerReady();
  if (!dockerResult.ok) return dockerResult;
  if (dockerResult.data) {
    const msg: Result<Str> = strings.statusDockerReady();
    if (!msg.ok) return msg;
    log.print(`  {green}{symbol:success}{/} ${msg.data}`);
  } else {
    const msg: Result<Str> = strings.statusDockerNotReady();
    if (!msg.ok) return msg;
    log.print(`  {red}{symbol:error}{/} ${msg.data}`);
  }

  // gitlab-ci-local
  const gclCmdResult: Result<Command> = safeParse(CommandSchema, 'gitlab-ci-local');
  if (!gclCmdResult.ok) return gclCmdResult;
  const gclExistsResult: Result<Bool> = commandExists(gclCmdResult.data);
  if (!gclExistsResult.ok) return gclExistsResult;
  if (gclExistsResult.data) {
    const versionCmdResult: Result<Command> = safeParse(CommandSchema, 'gitlab-ci-local --version');
    if (!versionCmdResult.ok) return versionCmdResult;
    const versionResult: Result<Str> = execSyncSafe(versionCmdResult.data);
    if (!versionResult.ok) return versionResult;
    const msg: Result<Str> = strings.statusToolAvailable({
      tool: 'gitlab-ci-local' as Str,
      version: versionResult.data.trim() as Str,
    });
    if (!msg.ok) return msg;
    log.print(`  {green}{symbol:success}{/} ${msg.data}`);
  } else {
    const msg: Result<Str> = strings.statusToolMissing({ tool: 'gitlab-ci-local' as Str });
    if (!msg.ok) return msg;
    log.print(`  {yellow}{symbol:warning}{/} ${msg.data}`);
  }

  // .gitlab-ci.yml
  const ciYmlTestCmdResult: Result<Command> = safeParse(
    CommandSchema,
    `test -f ${workspaceRoot}/.gitlab-ci.yml`,
  );
  if (!ciYmlTestCmdResult.ok) return ciYmlTestCmdResult;
  const ciYmlExistsResult: Result<Bool> = execSyncBool(ciYmlTestCmdResult.data);
  if (!ciYmlExistsResult.ok) return ciYmlExistsResult;
  if (ciYmlExistsResult.data) {
    const msg: Result<Str> = strings.statusGitlabCiYmlFound();
    if (!msg.ok) return msg;
    log.print(`  {green}{symbol:success}{/} ${msg.data}`);
  } else {
    const msg: Result<Str> = strings.statusGitlabCiYmlMissing();
    if (!msg.ok) return msg;
    log.print(`  {yellow}{symbol:warning}{/} ${msg.data}`);
  }

  // Job count via gitlab-ci-local --list
  if (gclExistsResult.data && ciYmlExistsResult.ok && ciYmlExistsResult.data) {
    const jobCountCmdResult: Result<Command> = safeParse(
      CommandSchema,
      'gitlab-ci-local --list 2>/dev/null | wc -l',
    );
    if (jobCountCmdResult.ok) {
      const jobCountResult: Result<Str> = execSyncSafe(jobCountCmdResult.data);
      if (jobCountResult.ok) {
        const countStr: Str = jobCountResult.data.trim() as Str;
        const countNum: number = parseInt(countStr, 10) || 0;
        const countResult: Result<NonNegativeInteger> = safeParse(
          NonNegativeIntegerSchema,
          countNum,
        );
        if (countNum === 0) {
          const msg: Result<Str> = strings.statusNoGitlabJobs();
          if (!msg.ok) return msg;
          log.print(`  {dim}{symbol:info}{/} ${msg.data}`);
        } else if (countResult.ok) {
          const msg: Result<Str> = strings.statusGitlabJobsFound({ count: countResult.data });
          if (!msg.ok) return msg;
          log.print(`  {green}{symbol:success}{/} ${msg.data}`);
        }
      }
    }
  }

  return ok(VoidSchema, undefined);
}
