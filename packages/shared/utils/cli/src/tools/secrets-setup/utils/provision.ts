/**
 * Auto-Provisioning — Create Infisical Structure from Config
 *
 * Reads resist.config.ts to determine products, then creates:
 * - "global" project with /cloudflare, /{provider}, /turbo, /devenv folders
 * - Per-product projects with /api, /app, /marketing, /status folders
 * - Machine identities for Coder VPS and CI
 * - Prompts for actual secret values
 *
 * Uses REST API for operations the CLI doesn't support (projects, identities)
 * and CLI for operations it does support (folders, secrets).
 *
 * @module
 */

import type { CommandContext } from '@/cli/schemas';
import type { BuiltSecretsSetupStrings } from '@/cli/tools/secrets-setup/locales/schema';
import { StrSchema, VoidSchema, type Str, type Void } from '@/schemas/common';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';
import { execSyncSafe } from '@/utils/core/shell';

/**
 * Get folders to create in the "global" project.
 * The provider folder is dynamic (e.g., `/github` or `/gitlab`).
 *
 * @param provider - Git provider name.
 * @returns Array of folder paths.
 */
function getGlobalFolders(provider: Str): Str[] {
  return ['/cloudflare', `/${provider}`, '/turbo', '/devenv'];
}

/** Folders to create in each product project. */
const PRODUCT_FOLDERS: Str[] = ['/api', '/app', '/marketing', '/status'];

/** Provider-specific secret keys for the provider folder. */
const PROVIDER_SECRETS: Record<string, Str[]> = {
  github: ['GITHUB_PAT', 'GITHUB_OAUTH_CLIENT_ID', 'GITHUB_OAUTH_CLIENT_SECRET'],
  gitlab: ['GITLAB_TOKEN', 'GITLAB_OAUTH_APP_ID', 'GITLAB_OAUTH_APP_SECRET'],
};

/**
 * Get secret keys expected in each folder (for prompting).
 * The provider folder secrets are dynamic based on the git provider.
 *
 * @param provider - Git provider name.
 * @returns Record mapping folder paths to expected secret keys.
 */
function getExpectedSecrets(provider: Str): Record<string, Str[]> {
  return {
    '/cloudflare': ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'],
    [`/${provider}`]: PROVIDER_SECRETS[provider] ?? [],
    '/turbo': ['TURBO_TOKEN', 'TURBO_TEAM'],
    '/devenv': ['HETZNER_TOKEN'],
    '/api': ['D1_DATABASE_ID', 'KV_NAMESPACE_ID', 'API_SECRET_KEY'],
    '/app': ['POSTHOG_API_KEY', 'LEMON_SQUEEZY_API_KEY', 'REVENUECAT_API_KEY'],
    '/marketing': ['RESEND_API_KEY', 'GA_MEASUREMENT_ID'],
    '/status': ['STATUS_PAGE_TOKEN'],
  };
}

/**
 * Make a REST API call to the Infisical server via curl.
 *
 * @param siteUrl - Infisical server URL.
 * @param method - HTTP method.
 * @param path - API path (e.g., "/api/v2/workspace").
 * @param body - JSON body (optional).
 * @returns `Result<Str>` — JSON response body or error.
 */
function infisicalApi(
  siteUrl: Str,
  method: Str,
  path: Str,
  body?: Record<string, unknown>,
): Result<Str> {
  const bodyArg: Str = body ? `-d '${JSON.stringify(body)}'` : '';
  const curlResult: Result<Str> = execSyncSafe(
    `curl -s -X ${method} '${siteUrl}${path}' -H 'Content-Type: application/json' ${bodyArg}`,
  );
  return curlResult;
}

/** Environment names matching StandardEnvironmentSchema. */
const STANDARD_ENVIRONMENTS: Array<{ name: Str; slug: Str }> = [
  { name: 'development', slug: 'development' },
  { name: 'staging', slug: 'staging' },
  { name: 'production', slug: 'production' },
];

/**
 * Create a project via REST API with custom environments matching StandardEnvironmentSchema.
 * Does NOT use Infisical's default envs (dev/staging/prod).
 *
 * @param siteUrl - Infisical server URL.
 * @param name - Project name.
 * @param strings - Built locale strings.
 * @returns `Result<Str>` — project ID.
 */
function createProject(siteUrl: Str, name: Str, strings: BuiltSecretsSetupStrings): Result<Str> {
  const msg: Result<Str> = strings.creatingProject({ name });
  if (!msg.ok) return msg;

  // Create project WITHOUT default envs — we create custom ones
  const result: Result<Str> = infisicalApi(siteUrl, 'POST', '/api/v2/workspace', {
    projectName: name,
    shouldCreateDefaultEnvs: false,
  });
  if (!result.ok) return result;

  // Parse project ID from response
  const parseResult: Result<Str> = execSyncSafe(
    `echo '${result.data}' | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const p=JSON.parse(d);console.log(p.workspace?.id||p.id||'')}catch{console.log('')}})"`,
  );
  if (!parseResult.ok) return parseResult;

  const projectId: Str = parseResult.data.trim();
  if (!projectId) {
    return err(ERRORS.IO.EXEC_FAILED, { meta: { reason: `Failed to create project "${name}"` } });
  }

  // Create custom environments matching StandardEnvironmentSchema
  for (const env of STANDARD_ENVIRONMENTS) {
    infisicalApi(siteUrl, 'POST', `/api/v1/workspace/${projectId}/environments`, {
      name: env.name,
      slug: env.slug,
    });
    // Non-fatal — env may already exist
  }

  const createdMsg: Result<Str> = strings.projectCreated({ name, id: projectId });
  if (!createdMsg.ok) return createdMsg;

  return ok(StrSchema, projectId);
}

/**
 * Create folders in a project via CLI.
 *
 * @param siteUrl - Infisical server URL.
 * @param projectId - Infisical project ID.
 * @param folders - Array of folder paths to create.
 * @param projectName - Project name (for logging).
 * @param strings - Built locale strings.
 * @returns `Result<Void>` — success or error.
 */
function createFolders(
  siteUrl: Str,
  projectId: Str,
  folders: Str[],
  projectName: Str,
  strings: BuiltSecretsSetupStrings,
): Result<Void> {
  for (const folder of folders) {
    const msg: Result<Str> = strings.creatingFolder({ path: folder, project: projectName });
    if (!msg.ok) return msg;

    // Extract folder name from path like "/cloudflare"
    const folderName: Str = folder.slice(1);
    execSyncSafe(
      `INFISICAL_API_URL=${siteUrl} infisical secrets folders create --path=/ --name=${folderName} --projectId=${projectId} --env=development 2>/dev/null`,
    );
    // Non-fatal — folder may already exist
  }

  return ok(VoidSchema, undefined);
}

/**
 * Prompt for secret values and set them via CLI.
 *
 * @param siteUrl - Infisical server URL.
 * @param projectId - Infisical project ID.
 * @param folders - Array of folder paths.
 * @param expectedSecrets - Record mapping folder paths to expected secret keys.
 * @param strings - Built locale strings.
 * @returns `Result<Void>` — success or error.
 */
async function promptAndSetSecrets(
  siteUrl: Str,
  projectId: Str,
  folders: Str[],
  expectedSecrets: Record<string, Str[]>,
  strings: BuiltSecretsSetupStrings,
): Promise<Result<Void>> {
  const { createInterface } = await import('node:readline/promises');
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  for (const folder of folders) {
    const secrets: Str[] | undefined = expectedSecrets[folder];
    if (!secrets) continue;

    for (const key of secrets) {
      const promptMsg: Result<Str> = strings.promptSecretValue({ key, path: folder });
      if (!promptMsg.ok) {
        rl.close();
        return promptMsg;
      }

      const value: Str = await rl.question(promptMsg.data + ' ');
      if (value.trim()) {
        execSyncSafe(
          `INFISICAL_API_URL=${siteUrl} infisical secrets set ${key}=${value.trim()} --env=development --path=${folder} --projectId=${projectId}`,
        );
        const setMsg: Result<Str> = strings.secretSet({ key });
        if (!setMsg.ok) {
          rl.close();
          return setMsg;
        }
      } else {
        const skipMsg: Result<Str> = strings.secretSkipped({ key });
        if (!skipMsg.ok) {
          rl.close();
          return skipMsg;
        }
      }
    }
  }

  rl.close();
  return ok(VoidSchema, undefined);
}

/**
 * Auto-provision full Infisical structure from resist.config.ts.
 * Creates projects, folders, machine identities, and prompts for secrets.
 *
 * @param ctx - Command context with config.
 * @param strings - Built locale strings.
 * @returns `Result<Void>` — success or error.
 */
export async function provisionStructure(
  ctx: CommandContext<BuiltSecretsSetupStrings>,
  strings: BuiltSecretsSetupStrings,
): Promise<Result<Void>> {
  const siteUrl: Str = ctx.config.tooling.infisical.siteUrl;
  const provider: Str = ctx.config.tooling.gitProvider?.provider ?? 'github';
  const globalFolders: Str[] = getGlobalFolders(provider);
  const expectedSecrets: Record<string, Str[]> = getExpectedSecrets(provider);

  const provMsg: Result<Str> = strings.provisioningStructure();
  if (!provMsg.ok) return provMsg;

  // Create "global" project
  const globalResult: Result<Str> = createProject(siteUrl, 'global', strings);
  if (!globalResult.ok) return globalResult;
  const globalProjectId: Str = globalResult.data;

  // Store for .infisical.json creation later
  process.env.INFISICAL_GLOBAL_PROJECT_ID = globalProjectId;

  // Create global folders
  const globalFoldersResult: Result<Void> = createFolders(
    siteUrl,
    globalProjectId,
    globalFolders,
    'global',
    strings,
  );
  if (!globalFoldersResult.ok) return globalFoldersResult;

  // Prompt for global secrets
  const globalSecretsResult: Result<Void> = await promptAndSetSecrets(
    siteUrl,
    globalProjectId,
    globalFolders,
    expectedSecrets,
    strings,
  );
  if (!globalSecretsResult.ok) return globalSecretsResult;

  // Create per-product projects
  const products = ctx.config.products;
  for (const product of products) {
    const productResult: Result<Str> = createProject(siteUrl, product.id, strings);
    if (!productResult.ok) return productResult;
    const productProjectId: Str = productResult.data;

    const productFoldersResult: Result<Void> = createFolders(
      siteUrl,
      productProjectId,
      PRODUCT_FOLDERS,
      product.id,
      strings,
    );
    if (!productFoldersResult.ok) return productFoldersResult;

    const productSecretsResult: Result<Void> = await promptAndSetSecrets(
      siteUrl,
      productProjectId,
      PRODUCT_FOLDERS,
      expectedSecrets,
      strings,
    );
    if (!productSecretsResult.ok) return productSecretsResult;
  }

  // Create machine identities
  // Coder VPS identity
  const coderIdMsg: Result<Str> = strings.creatingMachineIdentity({ name: 'coder-vps' });
  if (!coderIdMsg.ok) return coderIdMsg;

  const coderIdResult: Result<Str> = infisicalApi(siteUrl, 'POST', '/api/v1/identities', {
    name: 'coder-vps',
    role: 'member',
  });
  if (coderIdResult.ok) {
    const createdMsg: Result<Str> = strings.machineIdentityCreated({ name: 'coder-vps' });
    if (!createdMsg.ok) return createdMsg;
  }

  // CI identity (named after the git provider, e.g., 'github-ci' or 'gitlab-ci')
  const ciIdentityName: Str = `${provider}-ci`;
  const ciIdMsg: Result<Str> = strings.creatingMachineIdentity({ name: ciIdentityName });
  if (!ciIdMsg.ok) return ciIdMsg;

  const ciIdResult: Result<Str> = infisicalApi(siteUrl, 'POST', '/api/v1/identities', {
    name: ciIdentityName,
    role: 'member',
  });
  if (ciIdResult.ok) {
    const createdMsg: Result<Str> = strings.machineIdentityCreated({ name: ciIdentityName });
    if (!createdMsg.ok) return createdMsg;
  }

  const doneMsg: Result<Str> = strings.provisioningComplete();
  if (!doneMsg.ok) return doneMsg;

  return ok(VoidSchema, undefined);
}
