/**
 * Bootstrap Mode — Local Infisical Server Setup
 *
 * Runs when siteUrl is `http://localhost:8080` (no VPS deployed yet).
 * Starts local Docker Compose server, authenticates, auto-provisions
 * project structure from resist.config.ts, prompts for secret values.
 *
 * @module
 */

import type { CommandContext } from '@/cli/schemas';
import type { BuiltSecretsSetupStrings } from '@/cli/tools/secrets-setup/locales/schema';
import { provisionStructure } from '@/cli/tools/secrets-setup/utils/provision';
import { VoidSchema, type Bool, type Str, type Void } from '@/schemas/common';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';
import { execSyncBool, execSyncSafe } from '@/utils/core/shell';

/**
 * Bootstrap local Infisical server and provision project structure.
 *
 * @param ctx - Command context with config, cwd, locale.
 * @param strings - Built locale strings.
 * @param skipLogin - Whether to skip interactive login.
 * @returns `Result<Void>` — success or error.
 */
export async function bootstrapLocal(
  ctx: CommandContext<BuiltSecretsSetupStrings>,
  strings: BuiltSecretsSetupStrings,
  skipLogin: Bool,
): Promise<Result<Void>> {
  const siteUrl: Str = ctx.config.tooling.infisical.siteUrl;

  // Generate .env.infisical if missing
  const envPath: Str = `${ctx.cwd}/.env.infisical`;
  const envExistsResult: Result<Bool> = execSyncBool(`test -f ${envPath}`);
  if (!envExistsResult.ok) return envExistsResult;

  if (!envExistsResult.data) {
    const genMsg: Result<Str> = strings.generatingEnvFile();
    if (!genMsg.ok) return genMsg;

    const encKeyResult: Result<Str> = execSyncSafe(
      "node -e \"console.log(require('crypto').randomBytes(16).toString('hex'))\"",
    );
    if (!encKeyResult.ok) return encKeyResult;

    const authSecretResult: Result<Str> = execSyncSafe(
      "node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
    if (!authSecretResult.ok) return authSecretResult;

    const envContent: Str = [
      `ENCRYPTION_KEY=${encKeyResult.data.trim()}`,
      `AUTH_SECRET=${authSecretResult.data.trim()}`,
      `SITE_URL=${siteUrl}`,
      'DB_CONNECTION_URI=postgres://infisical:infisical@db:5432/infisical',
      'REDIS_URL=redis://redis:6379',
      'POSTGRES_USER=infisical',
      'POSTGRES_PASSWORD=infisical',
      'POSTGRES_DB=infisical',
    ].join('\n');

    const writeResult: Result<Str> = execSyncSafe(
      `node -e "require('fs').writeFileSync('${envPath}', ${JSON.stringify(envContent + '\n')})"`,
    );
    if (!writeResult.ok) return writeResult;

    const genDoneMsg: Result<Str> = strings.envFileGenerated();
    if (!genDoneMsg.ok) return genDoneMsg;
  } else {
    const existsMsg: Result<Str> = strings.envFileExists();
    if (!existsMsg.ok) return existsMsg;
  }

  // Start local server if not running
  const serverCheckMsg: Result<Str> = strings.checkingServer();
  if (!serverCheckMsg.ok) return serverCheckMsg;

  const serverRunning: Result<Bool> = execSyncBool(
    'docker compose -f docker-compose.infisical.yml ps --status running infisical 2>/dev/null',
  );
  if (!serverRunning.ok) return serverRunning;

  if (!serverRunning.data) {
    const startMsg: Result<Str> = strings.serverStarting();
    if (!startMsg.ok) return startMsg;

    const startResult: Result<Str> = execSyncSafe(
      'docker compose -f docker-compose.infisical.yml up -d',
    );
    if (!startResult.ok) {
      const failMsg: Result<Str> = strings.serverStartFailed();
      if (!failMsg.ok) return failMsg;
      return err(ERRORS.IO.EXEC_FAILED, { meta: { reason: 'Infisical server start failed' } });
    }

    // Wait for server to be ready (health check with retries)
    const waitMsg: Result<Str> = strings.waitingForServer();
    if (!waitMsg.ok) return waitMsg;

    const healthResult: Result<Str> = execSyncSafe(
      `node -e "const http=require('http');let i=0;const check=()=>{http.get('${siteUrl}/api/status',r=>{if(r.statusCode===200)process.exit(0);else if(++i<30)setTimeout(check,2000);else process.exit(1)}).on('error',()=>{if(++i<30)setTimeout(check,2000);else process.exit(1)})};check()"`,
    );
    if (!healthResult.ok) {
      return err(ERRORS.IO.EXEC_FAILED, {
        meta: { reason: 'Infisical server health check timed out after 60s' },
      });
    }

    const readyMsg: Result<Str> = strings.serverReady();
    if (!readyMsg.ok) return readyMsg;
  } else {
    const runningMsg: Result<Str> = strings.serverRunning();
    if (!runningMsg.ok) return runningMsg;
  }

  // Authenticate
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

  // Auto-provision project structure from resist.config.ts
  const provisionResult: Result<Void> = await provisionStructure(ctx, strings);
  if (!provisionResult.ok) return provisionResult;

  // Write .infisical.json (points to "global" project)
  const configPath: Str = `${ctx.cwd}/.infisical.json`;
  const configExistsResult: Result<Bool> = execSyncBool(`test -f ${configPath}`);
  if (!configExistsResult.ok) return configExistsResult;

  if (!configExistsResult.data) {
    const globalProjectId: Str = process.env.INFISICAL_GLOBAL_PROJECT_ID ?? '';

    const infisicalConfig: string = JSON.stringify(
      {
        workspaceId: globalProjectId,
        defaultEnvironment: 'development',
        gitBranchToEnvironmentMapping: {
          main: 'production',
          staging: 'staging',
        },
      },
      null,
      '\t',
    );

    const writeConfigResult: Result<Str> = execSyncSafe(
      `node -e "require('fs').writeFileSync('${configPath}', ${JSON.stringify(infisicalConfig + '\n')})"`,
    );
    if (!writeConfigResult.ok) return writeConfigResult;

    const configMsg: Result<Str> = strings.configWritten();
    if (!configMsg.ok) return configMsg;
  } else {
    const existsMsg: Result<Str> = strings.configExists();
    if (!existsMsg.ok) return existsMsg;
  }

  // Ask if user wants to deploy VPS now
  const { createInterface } = await import('node:readline/promises');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const deployPromptMsg: Result<Str> = strings.promptDeployVps();
  if (!deployPromptMsg.ok) {
    rl.close();
    return deployPromptMsg;
  }

  const answer: Str = await rl.question(deployPromptMsg.data + ' ');
  rl.close();

  if (answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes') {
    const deployMsg: Result<Str> = strings.deployingVps();
    if (!deployMsg.ok) return deployMsg;

    const pmName: string = ctx.config.tooling.packageManager.manager ?? 'pnpm';
    const deployResult: Result<Str> = execSyncSafe(
      `INFISICAL_API_URL=${siteUrl} infisical run --path=/devenv -- ${pmName} tool devenv deploy`,
    );
    if (!deployResult.ok) {
      // Non-fatal — VPS deploy failure shouldn't block local setup
      const deployFailMsg: Result<Str> = strings.deployVpsFailed();
      if (!deployFailMsg.ok) return deployFailMsg;
    } else {
      const deployDoneMsg: Result<Str> = strings.deployVpsComplete();
      if (!deployDoneMsg.ok) return deployDoneMsg;
      const reminderMsg: Result<Str> = strings.updateSiteUrlReminder();
      if (!reminderMsg.ok) return reminderMsg;
    }
  } else {
    const skipDeployMsg: Result<Str> = strings.deployVpsSkipped();
    if (!skipDeployMsg.ok) return skipDeployMsg;
  }

  return ok(VoidSchema, undefined);
}
