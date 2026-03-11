#!/usr/bin/env tsx

/**
 * Secrets Setup CLI Tool
 *
 * One-command setup for self-hosted Infisical. Three modes:
 *
 * - **Bootstrap** (siteUrl is localhost): Start local server, create admin account,
 *   auto-provision project structure from resist.config.ts, prompt for secret values.
 * - **Connect** (siteUrl is remote): Authenticate against existing VPS server,
 *   read committed .infisical.json, test connection.
 * - **Reset** (`--reset` flag): Teardown local or remote setup (stop containers,
 *   remove config files, logout).
 *
 * Usage: `<pm> tool secrets-setup [flags]`
 *
 * @module
 */

import type { CommandContext } from '@/cli/schemas';
import { TOOL_FLAG_DEFS } from '@/cli/tools/secrets-setup/flags';
import type { BuiltSecretsSetupStrings } from '@/cli/tools/secrets-setup/locales/schema';
import { bootstrapLocal } from '@/cli/tools/secrets-setup/utils/bootstrap';
import { connectRemote } from '@/cli/tools/secrets-setup/utils/connect';
import { resetBootstrap, resetConnect } from '@/cli/tools/secrets-setup/utils/reset';
import { createCommand } from '@/cli/utils/command';
import { VoidSchema, type Bool, type Str, type Void } from '@/schemas/common';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';
import { execSyncBool, execSyncSafe } from '@/utils/core/shell';

/** Default siteUrl indicating no VPS has been deployed yet. */
const LOCALHOST_SITE_URL: Str = 'http://localhost:8080';

/** CLI command instance for the secrets-setup tool. */
const command = createCommand<BuiltSecretsSetupStrings>({
  id: 'secrets-setup',
  version: '1.1.0',
  runtimes: ['node-tty'],
  flagDefs: TOOL_FLAG_DEFS,

  /**
   * Run secrets setup wizard. Routes to bootstrap, connect, or reset mode
   * based on flags and whether siteUrl is still the localhost default.
   *
   * @param ctx - Command context with args, flags, locale.
   * @returns `Result<Void>` — success or error.
   */
  handler: async (ctx: CommandContext<BuiltSecretsSetupStrings>): Promise<Result<Void>> => {
    const strings: BuiltSecretsSetupStrings = ctx.locale.command;
    const skipLogin: Bool = ctx.options.skipLogin ?? false;
    const siteUrl: Str = ctx.config.tooling.infisical.siteUrl;
    const isBootstrap: Bool = siteUrl === LOCALHOST_SITE_URL;

    // Check for --reset flag
    const resetFlag: Bool = 'reset' in ctx.options && ctx.options.reset === true;
    if (resetFlag) {
      if (isBootstrap) {
        return resetBootstrap(ctx, strings);
      }
      return resetConnect(ctx, strings);
    }

    // Step 1: Verify infisical CLI exists (mise-installed)
    const cliCheckMsg: Result<Str> = strings.checkingCli();
    if (!cliCheckMsg.ok) return cliCheckMsg;

    const existsResult: Result<Bool> = execSyncBool('command -v infisical');
    if (!existsResult.ok) return existsResult;

    if (!existsResult.data) {
      const installMsg: Result<Str> = strings.cliInstalling();
      if (!installMsg.ok) return installMsg;

      const installResult: Result<Str> = execSyncSafe('./bin/mise install infisical');
      if (!installResult.ok) {
        const failMsg: Result<Str> = strings.cliInstallFailed();
        if (!failMsg.ok) return failMsg;
        return err(ERRORS.IO.TOOL_NOT_FOUND, {
          meta: { tool: 'infisical', installHint: './bin/mise install' },
        });
      }

      const reshimResult: Result<Str> = execSyncSafe('./bin/mise reshim');
      if (!reshimResult.ok) return reshimResult;

      const installedMsg: Result<Str> = strings.cliInstalled();
      if (!installedMsg.ok) return installedMsg;
    } else {
      const versionResult: Result<Str> = execSyncSafe('infisical --version');
      if (!versionResult.ok) return versionResult;
      const foundMsg: Result<Str> = strings.cliFound({ version: versionResult.data });
      if (!foundMsg.ok) return foundMsg;
    }

    // Step 2: Route based on siteUrl
    if (isBootstrap) {
      const modeMsg: Result<Str> = strings.detectedBootstrapMode();
      if (!modeMsg.ok) return modeMsg;
      const bootstrapResult: Result<Void> = await bootstrapLocal(ctx, strings, skipLogin);
      if (!bootstrapResult.ok) return bootstrapResult;
    } else {
      const modeMsg: Result<Str> = strings.detectedConnectMode({ siteUrl });
      if (!modeMsg.ok) return modeMsg;
      const connectResult: Result<Void> = await connectRemote(ctx, strings, skipLogin);
      if (!connectResult.ok) return connectResult;
    }

    // Step 3: Test connection
    const testMsg: Result<Str> = strings.testingConnection();
    if (!testMsg.ok) return testMsg;

    process.env.INFISICAL_API_URL = siteUrl;
    const testResult: Result<Str> = execSyncSafe('infisical secrets --env=development');
    if (!testResult.ok) {
      const failMsg: Result<Str> = strings.testFailed();
      if (!failMsg.ok) return failMsg;
      return err(ERRORS.IO.EXEC_FAILED, { meta: { reason: 'Connection test failed' } });
    }

    const successMsg: Result<Str> = strings.testSuccess();
    if (!successMsg.ok) return successMsg;

    const completeMsg: Result<Str> = strings.setupComplete();
    if (!completeMsg.ok) return completeMsg;

    return ok(VoidSchema, undefined);
  },
});

export { command };
export default command;
