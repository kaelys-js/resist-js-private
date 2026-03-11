/**
 * Reset Mode — Teardown Infisical Setup
 *
 * Two modes based on siteUrl in config:
 * - **Bootstrap reset (local)**: Stops Docker containers, removes
 *   `.env.infisical`, `.infisical.json`, runs `infisical logout`.
 * - **Connect reset (VPS)**: Runs `infisical logout`, removes local
 *   `.infisical.json`, clears cached auth tokens. Does NOT destroy
 *   the remote server (that's `devenv destroy`).
 *
 * @module
 */

import type { CommandContext } from '@/cli/schemas';
import type { BuiltSecretsSetupStrings } from '@/cli/tools/secrets-setup/locales/schema';
import { VoidSchema, type Bool, type Str, type Void } from '@/schemas/common';
import { ok, type Result } from '@/schemas/result/result';
import { execSyncBool, execSyncSafe } from '@/utils/core/shell';

// =============================================================================
// Shared Helpers
// =============================================================================

/**
 * Remove a file if it exists, logging via locale strings.
 *
 * @param filePath - Absolute path to file.
 * @param displayName - Human-readable name for logging (e.g. '.infisical.json').
 * @param strings - Built locale strings.
 * @returns `Result<Void>` — success or error.
 */
async function removeFileIfExists(
  filePath: Str,
  displayName: Str,
  strings: BuiltSecretsSetupStrings,
): Promise<Result<Void>> {
  const existsResult: Result<Bool> = execSyncBool(`test -f ${filePath}`);
  if (!existsResult.ok) return existsResult;

  if (existsResult.data) {
    const removeResult: Result<Str> = execSyncSafe(`rm ${filePath}`);
    if (!removeResult.ok) return removeResult;
    const removedMsg: Result<Str> = strings.resetFileRemoved({ path: displayName });
    if (!removedMsg.ok) return removedMsg;
  }

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Bootstrap Reset (Local Docker)
// =============================================================================

/**
 * Reset local Infisical setup by tearing down Docker containers
 * and removing generated configuration files.
 *
 * Steps:
 * 1. Stop Docker Compose services (down --volumes --remove-orphans)
 * 2. Remove `.env.infisical`
 * 3. Remove `.infisical.json`
 * 4. Run `infisical logout`
 *
 * @param ctx - Command context with config, cwd, locale.
 * @param strings - Built locale strings.
 * @returns `Result<Void>` — success or error.
 */
export async function resetBootstrap(
  ctx: CommandContext<BuiltSecretsSetupStrings>,
  strings: BuiltSecretsSetupStrings,
): Promise<Result<Void>> {
  const config = ctx.config;
  const composeFile: Str = config.tooling.infisical.docker.composeFile;

  // Step 1: Stop Docker Compose services
  const stopMsg: Result<Str> = strings.resetStoppingContainers();
  if (!stopMsg.ok) return stopMsg;

  const composeExistsResult: Result<Bool> = execSyncBool(`test -f ${ctx.cwd}/${composeFile}`);
  if (!composeExistsResult.ok) return composeExistsResult;

  if (composeExistsResult.data) {
    const stopResult: Result<Str> = execSyncSafe(
      `docker compose -f ${composeFile} down --volumes --remove-orphans`,
    );
    if (stopResult.ok) {
      const stoppedMsg: Result<Str> = strings.resetContainersStopped();
      if (!stoppedMsg.ok) return stoppedMsg;
    }
    // Non-fatal — containers may not be running
  }

  // Step 2: Remove .env.infisical
  const envResult: Result<Void> = await removeFileIfExists(
    `${ctx.cwd}/.env.infisical`,
    '.env.infisical',
    strings,
  );
  if (!envResult.ok) return envResult;

  // Step 3: Remove .infisical.json
  const configResult: Result<Void> = await removeFileIfExists(
    `${ctx.cwd}/.infisical.json`,
    '.infisical.json',
    strings,
  );
  if (!configResult.ok) return configResult;

  // Step 4: Logout
  execSyncSafe('infisical logout 2>/dev/null');
  // Non-fatal — may not be logged in

  const completeMsg: Result<Str> = strings.resetBootstrapComplete();
  if (!completeMsg.ok) return completeMsg;

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Connect Reset (Remote VPS)
// =============================================================================

/**
 * Reset connection to remote Infisical VPS.
 *
 * Does NOT destroy the remote server — that's `devenv destroy`.
 * Only cleans up local state so the user can re-run `secrets-setup`
 * to reconnect.
 *
 * Steps:
 * 1. Run `infisical logout` (clear cached auth tokens)
 * 2. Remove `.infisical.json` (local project link)
 * 3. Guide user to re-run `secrets-setup` to reconnect
 *
 * @param ctx - Command context with config, cwd, locale.
 * @param strings - Built locale strings.
 * @returns `Result<Void>` — success or error.
 */
export async function resetConnect(
  ctx: CommandContext<BuiltSecretsSetupStrings>,
  strings: BuiltSecretsSetupStrings,
): Promise<Result<Void>> {
  // Step 1: Logout (clear cached auth tokens)
  const logoutMsg: Result<Str> = strings.resetLoggingOut();
  if (!logoutMsg.ok) return logoutMsg;

  execSyncSafe('infisical logout 2>/dev/null');
  // Non-fatal — may not be logged in

  const loggedOutMsg: Result<Str> = strings.resetLoggedOut();
  if (!loggedOutMsg.ok) return loggedOutMsg;

  // Step 2: Remove .infisical.json (local project link)
  const configResult: Result<Void> = await removeFileIfExists(
    `${ctx.cwd}/.infisical.json`,
    '.infisical.json',
    strings,
  );
  if (!configResult.ok) return configResult;

  // Step 3: Guide user
  const completeMsg: Result<Str> = strings.resetConnectComplete();
  if (!completeMsg.ok) return completeMsg;

  const rehintMsg: Result<Str> = strings.resetReconnectHint();
  if (!rehintMsg.ok) return rehintMsg;

  return ok(VoidSchema, undefined);
}
