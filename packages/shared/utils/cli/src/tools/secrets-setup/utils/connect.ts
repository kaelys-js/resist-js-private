/**
 * Connect Mode — Authenticate Against Remote Infisical
 *
 * Runs when siteUrl is NOT localhost (VPS already deployed by first developer).
 * Simply authenticates against the remote server and verifies .infisical.json exists.
 *
 * @module
 */

import type { CommandContext } from '@/cli/schemas';
import type { BuiltSecretsSetupStrings } from '@/cli/tools/secrets-setup/locales/schema';
import { VoidSchema, type Bool, type Str, type Void } from '@/schemas/common';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';
import { execSyncBool, execSyncSafe } from '@/utils/core/shell';

/**
 * Connect to existing remote Infisical server and authenticate.
 *
 * @param ctx - Command context with config, cwd, locale.
 * @param strings - Built locale strings.
 * @param skipLogin - Whether to skip interactive login.
 * @returns `Result<Void>` — success or error.
 */
export async function connectRemote(
  ctx: CommandContext<BuiltSecretsSetupStrings>,
  strings: BuiltSecretsSetupStrings,
  skipLogin: Bool,
): Promise<Result<Void>> {
  const siteUrl: Str = ctx.config.tooling.infisical.siteUrl;

  // Authenticate against remote server
  if (!skipLogin) {
    const authMsg: Result<Str> = strings.authenticating();
    if (!authMsg.ok) return authMsg;

    process.env.INFISICAL_API_URL = siteUrl;
    const loginResult: Result<Str> = execSyncSafe('infisical login');
    if (!loginResult.ok)
      return err(ERRORS.IO.EXEC_FAILED, { meta: { reason: 'Infisical login failed' } });

    const loginMsg: Result<Str> = strings.loginSuccess();
    if (!loginMsg.ok) return loginMsg;
  } else {
    const skipMsg: Result<Str> = strings.loginSkipped();
    if (!skipMsg.ok) return skipMsg;
  }

  // Verify .infisical.json exists (should be committed by first developer)
  const configPath: Str = `${ctx.cwd}/.infisical.json`;
  const configExistsResult: Result<Bool> = execSyncBool(`test -f ${configPath}`);
  if (!configExistsResult.ok) return configExistsResult;

  if (configExistsResult.data) {
    const existsMsg: Result<Str> = strings.configExists();
    if (!existsMsg.ok) return existsMsg;
  } else {
    return err(ERRORS.IO.FILE_NOT_FOUND, {
      meta: {
        reason:
          '.infisical.json not found. The first developer should have committed this file. ' +
          'Check that it exists in git or re-run secrets:setup on the bootstrap machine.',
      },
    });
  }

  return ok(VoidSchema, undefined);
}
