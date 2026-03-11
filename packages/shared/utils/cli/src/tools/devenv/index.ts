#!/usr/bin/env tsx

/**
 * Dev Environment CLI Tool
 *
 * One-command setup for local dev containers and remote Coder workspaces.
 * Automates prerequisite installation, container building, VPS provisioning,
 * and Coder deployment.
 *
 * Usage: `<pm> tool devenv <action> [flags]`
 *
 * Actions:
 * - `up` — set up local dev container
 * - `down` — stop and remove local dev container
 * - `deploy` — provision VPS + Coder from scratch
 * - `destroy` — tear down remote infrastructure (requires --confirm)
 * - `push` — push updated Coder template
 * - `status` — show environment setup status (default)
 * - `exec` — execute a command inside the running container
 * - `restart` — stop then re-start the local dev container
 * - `logs` — stream logs from the running container
 * - `ssh` — SSH into the remote Coder workspace
 * - `stop` — stop the remote workspace without destroying it
 * - `start` — start a previously stopped remote workspace
 * - `prebuild` — prebuild the container image for faster startup
 * - `env` — generate `.env` file from Infisical secrets
 *
 * @module
 */

import type { CommandContext } from '@/cli/schemas';
import { TOOL_FLAG_DEFS } from '@/cli/tools/devenv/flags';
import type { BuiltDevenvStrings } from '@/cli/tools/devenv/locales/schema';
import { ensurePrerequisites, checkAllStatus } from '@/cli/tools/devenv/utils/prerequisites';
import {
  buildAndPushImage,
  configureCloudflare,
  createWorkspace,
  execInContainer,
  generateEnvFile,
  hasConfigChanged,
  installCoder,
  installInfisical,
  installK3s,
  openInIde,
  prebuildImage,
  provisionVps,
  pushCoderTemplate,
  resolveDeployConfig,
  runDevcontainerUp,
  runSync,
  saveConfigHash,
  showContainerLogs,
  type DeployConfig,
} from '@/cli/tools/devenv/utils/steps';
import {
  stopLocalContainer,
  destroyRemoteInfra,
  previewDestroy,
} from '@/cli/tools/devenv/utils/teardown';
import { createCommand } from '@/cli/utils/command';
import { getConfig } from '@/config/loader';
import { VoidSchema, type Bool, type Str, type Void } from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';
import type { DeepReadonly } from '@/utils/core/object';
import { execSyncSafe } from '@/utils/core/shell';

// =============================================================================
// Subcommand Handlers
// =============================================================================

/**
 * Handle `devenv up` — local dev container setup.
 *
 * @param ctx - Command context with parsed flags and locale.
 * @returns `Result<Void>` — success or error.
 */
async function handleUp(ctx: CommandContext<BuiltDevenvStrings>): Promise<Result<Void>> {
  const strings: BuiltDevenvStrings = ctx.locale.command;
  const dryRun: Bool = ctx.options.dryRun;
  const rebuild: Bool = (ctx.options as Record<Str, Bool>).rebuild ?? false;

  // Step 1: Ensure all local prerequisites
  const prereqResult: Result<Void> = await ensurePrerequisites('local', ctx.cwd, strings);
  if (!prereqResult.ok) return prereqResult;

  // Step 1b: Check if config changed since last build
  const changeResult: Result<Bool> = hasConfigChanged(ctx.cwd);
  if (changeResult.ok && changeResult.data && !rebuild) {
    const warnMsg: Result<Str> = strings.configChanged();
    if (!warnMsg.ok) return warnMsg;
  }

  // Step 2: Ensure sync outputs exist
  const syncResult: Result<Void> = await runSync(ctx.cwd, dryRun, strings);
  if (!syncResult.ok) return syncResult;

  // Step 3: Build and start container
  const upResult: Result<Void> = await runDevcontainerUp(ctx.cwd, rebuild, dryRun, strings);
  if (!upResult.ok) return upResult;

  // Step 4: Save config hash for future change detection
  const saveResult: Result<Void> = saveConfigHash(ctx.cwd);
  if (!saveResult.ok) return saveResult;

  // Step 5: Auto-open IDE if configured
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (configResult.ok && configResult.data.tooling.devContainer.autoOpen) {
    const openResult: Result<Void> = openInIde(ctx.cwd);
    if (!openResult.ok) return openResult;
  }

  return ok(VoidSchema, undefined);
}

/**
 * Handle `devenv down` — stop local devcontainer.
 *
 * @param ctx - Command context with parsed flags and locale.
 * @returns `Result<Void>` — success or error.
 */
async function handleDown(ctx: CommandContext<BuiltDevenvStrings>): Promise<Result<Void>> {
  const strings: BuiltDevenvStrings = ctx.locale.command;
  const dryRun: Bool = ctx.options.dryRun;
  const prune: Bool = (ctx.options as Record<Str, Bool>).prune ?? false;

  const result: Result<Void> = await stopLocalContainer(ctx.cwd, prune, dryRun, strings);
  if (!result.ok) return result;

  return ok(VoidSchema, undefined);
}

/**
 * Handle `devenv deploy` — full VPS + Coder provisioning.
 *
 * @param ctx - Command context with parsed flags and locale.
 * @returns `Result<Void>` — success or error.
 */
async function handleDeploy(ctx: CommandContext<BuiltDevenvStrings>): Promise<Result<Void>> {
  const strings: BuiltDevenvStrings = ctx.locale.command;
  const dryRun: Bool = ctx.options.dryRun;
  const imageOnly: Bool = (ctx.options as Record<Str, Bool>).imageOnly ?? false;

  // Step 1: Ensure all remote prerequisites
  const prereqResult: Result<Void> = await ensurePrerequisites('remote', ctx.cwd, strings);
  if (!prereqResult.ok) return prereqResult;

  // Step 2: Resolve deployment config from environment variables
  const coderAccessUrl: Str = (ctx.config?.tooling?.coder?.accessUrl ?? '') as Str;
  const configResult: Result<DeployConfig> = resolveDeployConfig(coderAccessUrl, strings);
  if (!configResult.ok) return configResult;
  const deployConfig: DeployConfig = configResult.data;

  // Step 2b: If --image-only, skip VPS provisioning
  if (imageOnly) {
    const syncResult: Result<Void> = await runSync(ctx.cwd, dryRun, strings);
    if (!syncResult.ok) return syncResult;
    const imageResult: Result<Void> = await buildAndPushImage(
      ctx.cwd,
      deployConfig,
      dryRun,
      strings,
    );
    if (!imageResult.ok) return imageResult;
    const pushResult: Result<Void> = await pushCoderTemplate(
      ctx.cwd,
      deployConfig,
      dryRun,
      strings,
    );
    if (!pushResult.ok) return pushResult;
    return ok(VoidSchema, undefined);
  }

  // Step 3: Provision VPS via Hetzner API
  const vpsResult: Result<Str> = await provisionVps(deployConfig, dryRun, strings);
  if (!vpsResult.ok) return vpsResult;

  // Step 4: Install k3s on VPS
  const k3sResult: Result<Void> = await installK3s(vpsResult.data, dryRun, strings);
  if (!k3sResult.ok) return k3sResult;

  // Step 5: Install Coder on k3s
  const coderResult: Result<Void> = await installCoder(deployConfig, dryRun, strings);
  if (!coderResult.ok) return coderResult;

  // Step 5.5: Install Infisical on k3s
  const infisicalResult: Result<Void> = await installInfisical(ctx.cwd, dryRun, strings);
  if (!infisicalResult.ok) return infisicalResult;

  // Step 6: Configure DNS + TLS via Cloudflare
  const dnsResult: Result<Void> = await configureCloudflare(deployConfig, dryRun, strings);
  if (!dnsResult.ok) return dnsResult;

  // Step 7: Ensure sync outputs + build/push workspace image
  const syncResult: Result<Void> = await runSync(ctx.cwd, dryRun, strings);
  if (!syncResult.ok) return syncResult;
  const imageResult: Result<Void> = await buildAndPushImage(ctx.cwd, deployConfig, dryRun, strings);
  if (!imageResult.ok) return imageResult;

  // Step 8: Push Coder template
  const pushResult: Result<Void> = await pushCoderTemplate(ctx.cwd, deployConfig, dryRun, strings);
  if (!pushResult.ok) return pushResult;

  // Step 9: Create first workspace
  const wsResult: Result<Void> = await createWorkspace(deployConfig, dryRun, strings);
  if (!wsResult.ok) return wsResult;

  return ok(VoidSchema, undefined);
}

/**
 * Handle `devenv destroy` — tear down remote infrastructure.
 *
 * @param ctx - Command context with parsed flags and locale.
 * @returns `Result<Void>` — success or error.
 */
async function handleDestroy(ctx: CommandContext<BuiltDevenvStrings>): Promise<Result<Void>> {
  const strings: BuiltDevenvStrings = ctx.locale.command;
  const dryRun: Bool = ctx.options.dryRun;
  const confirm: Bool = (ctx.options as Record<Str, Bool>).confirm ?? false;

  // Always show preview of what will be destroyed
  const previewResult: Result<Void> = previewDestroy(ctx.cwd, strings);
  if (!previewResult.ok) return previewResult;

  if (!confirm) {
    const requiredMsg: Result<Str> = strings.destroyConfirmRequired();
    if (!requiredMsg.ok) return requiredMsg;
    return err(ERRORS.VALIDATION.SCHEMA_FAILED, {
      meta: { reason: 'Use --confirm flag to proceed with destruction' as Str },
    });
  }

  const result: Result<Void> = await destroyRemoteInfra(ctx.cwd, dryRun, strings);
  if (!result.ok) return result;

  return ok(VoidSchema, undefined);
}

/**
 * Handle `devenv push` — push updated Coder template.
 *
 * @param ctx - Command context with parsed flags and locale.
 * @returns `Result<Void>` — success or error.
 */
async function handlePush(ctx: CommandContext<BuiltDevenvStrings>): Promise<Result<Void>> {
  const strings: BuiltDevenvStrings = ctx.locale.command;
  const dryRun: Bool = ctx.options.dryRun;

  // Verify coder CLI + auth
  const prereqResult: Result<Void> = await ensurePrerequisites('push', ctx.cwd, strings);
  if (!prereqResult.ok) return prereqResult;

  const coderAccessUrl: Str = (ctx.config?.tooling?.coder?.accessUrl ?? '') as Str;
  const configResult: Result<DeployConfig> = resolveDeployConfig(coderAccessUrl, strings);
  if (!configResult.ok) return configResult;

  const pushResult: Result<Void> = await pushCoderTemplate(
    ctx.cwd,
    configResult.data,
    dryRun,
    strings,
  );
  if (!pushResult.ok) return pushResult;

  return ok(VoidSchema, undefined);
}

/**
 * Handle `devenv status` — report environment setup status.
 *
 * @param ctx - Command context with parsed flags and locale.
 * @returns `Result<Void>` — success or error.
 */
async function handleStatus(ctx: CommandContext<BuiltDevenvStrings>): Promise<Result<Void>> {
  const strings: BuiltDevenvStrings = ctx.locale.command;

  const statusResult: Result<Void> = checkAllStatus(ctx.cwd, strings);
  if (!statusResult.ok) return statusResult;

  return ok(VoidSchema, undefined);
}

/**
 * Handle `devenv exec` — execute a command inside the running container.
 *
 * @param ctx - Command context with parsed flags and locale.
 * @returns `Result<Void>` — success or error.
 */
async function handleExec(ctx: CommandContext<BuiltDevenvStrings>): Promise<Result<Void>> {
  const strings: BuiltDevenvStrings = ctx.locale.command;
  const execArgs: Str[] = ctx.args.slice(1) as Str[];
  return execInContainer(ctx.cwd, execArgs, strings);
}

/**
 * Handle `devenv restart` — stop then re-start the local dev container.
 *
 * @param ctx - Command context with parsed flags and locale.
 * @returns `Result<Void>` — success or error.
 */
async function handleRestart(ctx: CommandContext<BuiltDevenvStrings>): Promise<Result<Void>> {
  const strings: BuiltDevenvStrings = ctx.locale.command;
  const dryRun: Bool = ctx.options.dryRun;
  const prune: Bool = false as Bool;

  const restartingMsg: Result<Str> = strings.containerRestarting();
  if (!restartingMsg.ok) return restartingMsg;

  // Stop
  const downResult: Result<Void> = await stopLocalContainer(ctx.cwd, prune, dryRun, strings);
  if (!downResult.ok) return downResult;

  // Re-up
  const prereqResult: Result<Void> = await ensurePrerequisites('local', ctx.cwd, strings);
  if (!prereqResult.ok) return prereqResult;
  const syncResult: Result<Void> = await runSync(ctx.cwd, dryRun, strings);
  if (!syncResult.ok) return syncResult;
  const rebuild: Bool = false as Bool;
  const upResult: Result<Void> = await runDevcontainerUp(ctx.cwd, rebuild, dryRun, strings);
  if (!upResult.ok) return upResult;

  const restartedMsg: Result<Str> = strings.containerRestarted();
  if (!restartedMsg.ok) return restartedMsg;

  return ok(VoidSchema, undefined);
}

/**
 * Handle `devenv logs` — stream logs from the running container.
 *
 * @param ctx - Command context with parsed flags and locale.
 * @returns `Result<Void>` — success or error.
 */
async function handleLogs(ctx: CommandContext<BuiltDevenvStrings>): Promise<Result<Void>> {
  const strings: BuiltDevenvStrings = ctx.locale.command;
  const follow: Bool = true as Bool;
  const tail: number = 100;
  return showContainerLogs(ctx.cwd, follow, tail, strings);
}

/**
 * Handle `devenv ssh` — SSH into the remote Coder workspace.
 *
 * @param ctx - Command context with parsed flags and locale.
 * @returns `Result<Void>` — success or error.
 */
async function handleSsh(ctx: CommandContext<BuiltDevenvStrings>): Promise<Result<Void>> {
  const strings: BuiltDevenvStrings = ctx.locale.command;

  const connectMsg: Result<Str> = strings.sshConnecting();
  if (!connectMsg.ok) return connectMsg;

  const sshResult: Result<Str> = execSyncSafe('coder ssh dev' as Str);
  if (!sshResult.ok)
    return err(ERRORS.IO.EXEC_FAILED, { meta: { command: 'coder ssh dev', tool: 'coder' } });

  return ok(VoidSchema, undefined);
}

/**
 * Handle `devenv stop` — stop the remote Coder workspace without destroying it.
 *
 * @param ctx - Command context with parsed flags and locale.
 * @returns `Result<Void>` — success or error.
 */
async function handleStop(ctx: CommandContext<BuiltDevenvStrings>): Promise<Result<Void>> {
  const strings: BuiltDevenvStrings = ctx.locale.command;
  const dryRun: Bool = ctx.options.dryRun;

  const stoppingMsg: Result<Str> = strings.workspaceStopping();
  if (!stoppingMsg.ok) return stoppingMsg;

  if (dryRun) return ok(VoidSchema, undefined);

  const stopResult: Result<Str> = execSyncSafe('coder stop dev' as Str);
  if (!stopResult.ok)
    return err(ERRORS.IO.EXEC_FAILED, { meta: { command: 'coder stop dev', tool: 'coder' } });

  const stoppedMsg: Result<Str> = strings.workspaceStopped();
  if (!stoppedMsg.ok) return stoppedMsg;

  return ok(VoidSchema, undefined);
}

/**
 * Handle `devenv start` — start a previously stopped remote Coder workspace.
 *
 * @param ctx - Command context with parsed flags and locale.
 * @returns `Result<Void>` — success or error.
 */
async function handleStart(ctx: CommandContext<BuiltDevenvStrings>): Promise<Result<Void>> {
  const strings: BuiltDevenvStrings = ctx.locale.command;
  const dryRun: Bool = ctx.options.dryRun;

  const startingMsg: Result<Str> = strings.workspaceStarting();
  if (!startingMsg.ok) return startingMsg;

  if (dryRun) return ok(VoidSchema, undefined);

  const startResult: Result<Str> = execSyncSafe('coder start dev' as Str);
  if (!startResult.ok)
    return err(ERRORS.IO.EXEC_FAILED, { meta: { command: 'coder start dev', tool: 'coder' } });

  const startedMsg: Result<Str> = strings.workspaceStarted();
  if (!startedMsg.ok) return startedMsg;

  return ok(VoidSchema, undefined);
}

/**
 * Handle `devenv prebuild` — prebuild the container image for faster startup.
 *
 * @param ctx - Command context with parsed flags and locale.
 * @returns `Result<Void>` — success or error.
 */
async function handlePrebuild(ctx: CommandContext<BuiltDevenvStrings>): Promise<Result<Void>> {
  const strings: BuiltDevenvStrings = ctx.locale.command;
  const dryRun: Bool = ctx.options.dryRun;
  return prebuildImage(ctx.cwd, dryRun, strings);
}

/**
 * Handle `devenv env` — generate `.env` file from Infisical.
 *
 * @param ctx - Command context with parsed flags and locale.
 * @returns `Result<Void>` — success or error.
 */
async function handleEnv(ctx: CommandContext<BuiltDevenvStrings>): Promise<Result<Void>> {
  const strings: BuiltDevenvStrings = ctx.locale.command;
  const dryRun: Bool = ctx.options.dryRun;
  return generateEnvFile(ctx.cwd, dryRun, strings);
}

// =============================================================================
// Command Definition
// =============================================================================

/** CLI command instance for the devenv tool. */
const command = createCommand<BuiltDevenvStrings>({
  id: 'devenv',
  version: '1.0.0',
  runtimes: ['node-tty', 'node-pipe'],
  flagDefs: TOOL_FLAG_DEFS,

  /**
   * Route to subcommand handler based on first positional argument.
   *
   * @param ctx - Command context with args, flags, locale.
   * @returns `Result<Void>` — success or error from subcommand.
   */
  handler: async (ctx: CommandContext<BuiltDevenvStrings>): Promise<Result<Void>> => {
    const action: Str = ctx.args[0] ?? ('status' as Str);

    switch (action) {
      case 'up':
        return handleUp(ctx);
      case 'down':
        return handleDown(ctx);
      case 'deploy':
        return handleDeploy(ctx);
      case 'destroy':
        return handleDestroy(ctx);
      case 'push':
        return handlePush(ctx);
      case 'status':
        return handleStatus(ctx);
      case 'exec':
        return handleExec(ctx);
      case 'restart':
        return handleRestart(ctx);
      case 'logs':
        return handleLogs(ctx);
      case 'ssh':
        return handleSsh(ctx);
      case 'stop':
        return handleStop(ctx);
      case 'start':
        return handleStart(ctx);
      case 'prebuild':
        return handlePrebuild(ctx);
      case 'env':
        return handleEnv(ctx);
      default:
        return err(ERRORS.VALIDATION.SCHEMA_FAILED, {
          meta: {
            reason: `Unknown action: ${action}. Expected: up, down, deploy, destroy, push, status, exec, restart, logs, ssh, stop, start, prebuild, env`,
          },
        });
    }
  },
});

export { command };
export default command;
