/**
 * Devenv Setup Steps
 *
 * Individual step implementations for local and remote dev environment setup.
 * Each step is idempotent — safe to run multiple times.
 *
 * @module
 */

import * as v from 'valibot';

import type { BuiltDevenvStrings } from '@/cli/tools/devenv/locales/schema';
import { getConfig } from '@/config/loader';
import {
  type Bool,
  BoolSchema,
  type NonNegativeInteger,
  type Str,
  StrSchema,
  type StrArray,
  VoidSchema,
  type Void,
} from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import type { ContainerRegistry, Coder } from '@/schemas/core-config/tooling';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';
import type { DeepReadonly } from '@/utils/core/object';
import { execSyncBool, execSyncSafe } from '@/utils/core/shell';
import { startSpinner, stopSpinner } from '@/utils/core/terminal';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Types
// =============================================================================

/**
 * Deployment configuration resolved from environment variables.
 * Secrets come from Infisical via `infisical run --path=/devenv`.
 * Non-secret values come from `resist.config.ts`.
 */
export const DeployConfigSchema = v.strictObject({
  /** Hetzner Cloud API token (from Infisical /devenv/HETZNER_TOKEN). */
  hetznerToken: StrSchema,
  /** Cloudflare API token (from Infisical /devenv/CLOUDFLARE_API_TOKEN). */
  cloudflareToken: StrSchema,
  /** GitHub OAuth App Client ID (from Infisical /devenv/GITHUB_OAUTH_CLIENT_ID). */
  githubClientId: StrSchema,
  /** GitHub OAuth App Client Secret (from Infisical /devenv/GITHUB_OAUTH_CLIENT_SECRET). */
  githubClientSecret: StrSchema,
  /** Coder access domain (from resist.config.ts tooling.coder.accessUrl). */
  coderDomain: StrSchema,
  /** Infisical machine identity client ID (from Infisical /devenv/INFISICAL_CLIENT_ID). */
  infisicalClientId: StrSchema,
  /** Infisical machine identity client secret (from Infisical /devenv/INFISICAL_CLIENT_SECRET). */
  infisicalClientSecret: StrSchema,
  /** Container registry URL. */
  registryUrl: StrSchema,
  /** Container registry namespace/org. */
  registryNamespace: StrSchema,
  /** Hetzner server type. */
  serverType: StrSchema,
  /** Hetzner datacenter location. */
  location: StrSchema,
});

/** Inferred output type of {@link DeployConfigSchema}. */
export type DeployConfig = v.InferOutput<typeof DeployConfigSchema>;

// =============================================================================
// Local Steps
// =============================================================================

/**
 * Run sync tool to generate devcontainer files if they don't exist.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param dryRun - Whether to skip actual execution.
 * @param strings - Built locale strings.
 * @returns `Result<Void>` — success or error.
 */
export async function runSync(
  workspaceRoot: Str,
  dryRun: Bool,
  strings: BuiltDevenvStrings,
): Promise<Result<Void>> {
  const dcJsonPath: Str = `${workspaceRoot}/.devcontainer/devcontainer.json` as Str;
  const existsResult: Result<Bool> = execSyncBool(`test -f ${dcJsonPath}` as Str);
  if (!existsResult.ok) return existsResult;

  if (!existsResult.data) {
    const syncMsg: Result<Str> = strings.syncRunning();
    if (!syncMsg.ok) return syncMsg;

    if (!dryRun) {
      const syncResult: Result<Str> = execSyncSafe(
        `node --import tsx ${workspaceRoot}/packages/shared/utils/cli/src/utils/tool.ts sync` as Str,
      );
      if (!syncResult.ok) return err(ERRORS.IO.EXEC_FAILED, { meta: { reason: 'Sync failed' } });
    }
  }

  return ok(VoidSchema, undefined);
}

/**
 * Run `devcontainer up` to build and start the local dev container.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param rebuild - Whether to force rebuild the container image.
 * @param dryRun - Whether to skip actual execution.
 * @param strings - Built locale strings.
 * @returns `Result<Void>` — success or error.
 */
export async function runDevcontainerUp(
  workspaceRoot: Str,
  rebuild: Bool,
  dryRun: Bool,
  strings: BuiltDevenvStrings,
): Promise<Result<Void>> {
  if (dryRun) {
    const msg: Result<Str> = strings.dryRunUp();
    if (!msg.ok) return msg;
    return ok(VoidSchema, undefined);
  }

  const buildMsg: Result<Str> = rebuild
    ? strings.containerRebuilding()
    : strings.containerBuilding();
  if (!buildMsg.ok) return buildMsg;

  const rebuildFlag: Str = rebuild ? (' --rebuild-on-change' as Str) : ('' as Str);
  const upResult: Result<Str> = execSyncSafe(
    `devcontainer up --workspace-folder ${workspaceRoot}${rebuildFlag}` as Str,
  );
  if (!upResult.ok)
    return err(ERRORS.IO.EXEC_FAILED, { meta: { reason: 'devcontainer up failed' } });

  const readyMsg: Result<Str> = strings.containerReady();
  if (!readyMsg.ok) return readyMsg;
  const vscodeMsg: Result<Str> = strings.openInVscode();
  if (!vscodeMsg.ok) return vscodeMsg;

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Remote Steps
// =============================================================================

/**
 * Resolve deployment config from environment variables and resist.config.ts.
 * Secrets are injected by `infisical run --path=/devenv` in the package.json script.
 * Non-secret config comes from the loaded CoreConfig.
 *
 * @param coderAccessUrl - Coder access URL from resist.config.ts tooling.coder.accessUrl.
 * @param strings - Built locale strings for user messages.
 * @returns `Result<DeployConfig>` — resolved config or error if secrets missing.
 */
export function resolveDeployConfig(
  coderAccessUrl: Str,
  strings: BuiltDevenvStrings,
): Result<DeployConfig> {
  const fetchMsg: Result<Str> = strings.fetchingSecrets();
  if (!fetchMsg.ok) return fetchMsg;

  const env: NodeJS.ProcessEnv = process.env;
  const hetznerToken: Str | undefined = env.HETZNER_TOKEN as Str | undefined;
  const cloudflareToken: Str | undefined = env.CLOUDFLARE_API_TOKEN as Str | undefined;
  const githubClientId: Str | undefined = env.GITHUB_OAUTH_CLIENT_ID as Str | undefined;
  const githubClientSecret: Str | undefined = env.GITHUB_OAUTH_CLIENT_SECRET as Str | undefined;
  const infisicalClientId: Str | undefined = env.INFISICAL_CLIENT_ID as Str | undefined;
  const infisicalClientSecret: Str | undefined = env.INFISICAL_CLIENT_SECRET as Str | undefined;

  // Check all required secrets exist
  const missing: Str[] = [];
  if (!hetznerToken) missing.push('HETZNER_TOKEN' as Str);
  if (!cloudflareToken) missing.push('CLOUDFLARE_API_TOKEN' as Str);
  if (!githubClientId) missing.push('GITHUB_OAUTH_CLIENT_ID' as Str);
  if (!githubClientSecret) missing.push('GITHUB_OAUTH_CLIENT_SECRET' as Str);
  if (!infisicalClientId) missing.push('INFISICAL_CLIENT_ID' as Str);
  if (!infisicalClientSecret) missing.push('INFISICAL_CLIENT_SECRET' as Str);

  if (missing.length > 0) {
    return err(ERRORS.VALIDATION.SCHEMA_FAILED, {
      meta: {
        reason: (`Missing secrets: ${missing.join(', ')}. ` +
          'Ensure secrets exist in Infisical at /devenv and run via: ' +
          'INFISICAL_API_URL=<siteUrl> infisical run --path=/devenv -- <command>') as Str,
      },
    });
  }

  // coderDomain comes from config, not secrets
  if (!coderAccessUrl) {
    return err(ERRORS.VALIDATION.SCHEMA_FAILED, {
      meta: { reason: 'tooling.coder.accessUrl is empty in resist.config.ts' },
    });
  }

  // Pull registry and server config from CoreConfig
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;
  const coderConfig: DeepReadonly<Coder> = configResult.data.tooling.coder;
  const registryConfig: DeepReadonly<ContainerRegistry> = coderConfig.registry;

  const deployConfig: DeployConfig = {
    hetznerToken: hetznerToken!,
    cloudflareToken: cloudflareToken!,
    githubClientId: githubClientId!,
    githubClientSecret: githubClientSecret!,
    coderDomain: coderAccessUrl,
    infisicalClientId: infisicalClientId!,
    infisicalClientSecret: infisicalClientSecret!,
    registryUrl: registryConfig.url,
    registryNamespace: registryConfig.namespace,
    serverType: coderConfig.serverType,
    location: coderConfig.location,
  };

  const validateResult: Result<DeployConfig> = safeParse(DeployConfigSchema, deployConfig);
  if (!validateResult.ok) return validateResult;

  return validateResult;
}

/**
 * Provision a Hetzner VPS via `hcloud` CLI.
 * Idempotent — skips if server already exists.
 *
 * @param config - Deployment configuration with Hetzner token.
 * @param dryRun - Whether to skip actual execution.
 * @param strings - Built locale strings.
 * @returns `Result<Str>` — VPS IP address.
 */
export async function provisionVps(
  config: DeployConfig,
  dryRun: Bool,
  strings: BuiltDevenvStrings,
): Promise<Result<Str>> {
  if (dryRun) {
    const msg: Result<Str> = strings.dryRunDeploy();
    if (!msg.ok) return msg;
    return ok(StrSchema, '0.0.0.0' as Str);
  }

  // Set hcloud context
  const ctxResult: Result<Str> = execSyncSafe(
    `hcloud context create devenv --token ${config.hetznerToken}` as Str,
  );
  if (!ctxResult.ok) {
    // Context may already exist — try to use it
    const useResult: Result<Str> = execSyncSafe('hcloud context use devenv' as Str);
    if (!useResult.ok) return useResult;
  }

  // Check if server already exists
  const existsResult: Result<Str> = execSyncSafe('hcloud server ip devenv-coder' as Str);
  if (existsResult.ok) {
    const ipMsg: Result<Str> = strings.vpsExists({ ip: existsResult.data });
    if (!ipMsg.ok) return ipMsg;
    return ok(StrSchema, existsResult.data);
  }

  // Upload SSH key (idempotent — ignore duplicate error)
  const sshKeyPath: Str = `${process.env.HOME ?? '~'}/.ssh/id_ed25519.pub` as Str;
  execSyncSafe(`hcloud ssh-key create --name devenv --public-key-from-file ${sshKeyPath}` as Str);

  // Create server
  const provMsg: Result<Str> = strings.provisioningVps();
  if (!provMsg.ok) return provMsg;

  const createResult: Result<Str> = execSyncSafe(
    `hcloud server create --name devenv-coder --type ${config.serverType} --image ubuntu-24.04 --ssh-key devenv --location ${config.location}` as Str,
  );
  if (!createResult.ok)
    return err(ERRORS.IO.EXEC_FAILED, {
      meta: { command: 'hcloud server create', tool: 'hcloud' },
    });

  // Get IP
  const ipResult: Result<Str> = execSyncSafe('hcloud server ip devenv-coder' as Str);
  if (!ipResult.ok) return ipResult;

  const createdMsg: Result<Str> = strings.vpsCreated({ ip: ipResult.data });
  if (!createdMsg.ok) return createdMsg;

  return ok(StrSchema, ipResult.data);
}

/**
 * Install k3s on the VPS via SSH.
 * Idempotent — skips if kubectl can already reach the cluster.
 *
 * @param vpsIp - VPS IP address.
 * @param dryRun - Whether to skip actual execution.
 * @param strings - Built locale strings.
 * @returns `Result<Void>` — success or error.
 */
export async function installK3s(
  vpsIp: Str,
  dryRun: Bool,
  strings: BuiltDevenvStrings,
): Promise<Result<Void>> {
  if (dryRun) return ok(VoidSchema, undefined);

  const kubeconfigPath: Str = `${process.env.HOME ?? '~'}/.kube/config-coder` as Str;
  const reachResult: Result<Bool> = execSyncBool(
    `KUBECONFIG=${kubeconfigPath} kubectl get nodes` as Str,
  );
  if (!reachResult.ok) return reachResult;
  if (reachResult.data) {
    const readyMsg: Result<Str> = strings.k3sReady();
    if (!readyMsg.ok) return readyMsg;
    return ok(VoidSchema, undefined);
  }

  const installMsg: Result<Str> = strings.installingK3s();
  if (!installMsg.ok) return installMsg;

  const sshInstall: Result<Str> = execSyncSafe(
    `ssh -o StrictHostKeyChecking=no root@${vpsIp} "curl -sfL https://get.k3s.io | sh -"` as Str,
  );
  if (!sshInstall.ok) return err(ERRORS.IO.EXEC_FAILED, { meta: { reason: 'k3s install failed' } });

  const scpResult: Result<Str> = execSyncSafe(
    `scp root@${vpsIp}:/etc/rancher/k3s/k3s.yaml ${kubeconfigPath}` as Str,
  );
  if (!scpResult.ok)
    return err(ERRORS.IO.EXEC_FAILED, { meta: { reason: 'kubeconfig copy failed' } });

  // Rewrite server address from 127.0.0.1 to VPS IP
  const sedResult: Result<Str> = execSyncSafe(
    `sed -i '' "s/127.0.0.1/${vpsIp}/g" ${kubeconfigPath}` as Str,
  );
  if (!sedResult.ok) return sedResult;

  return ok(VoidSchema, undefined);
}

/**
 * Install Coder on k3s via Helm.
 * Idempotent — skips if Coder pods already running.
 *
 * @param config - Deployment configuration.
 * @param dryRun - Whether to skip actual execution.
 * @param strings - Built locale strings.
 * @returns `Result<Void>` — success or error.
 */
export async function installCoder(
  config: DeployConfig,
  dryRun: Bool,
  strings: BuiltDevenvStrings,
): Promise<Result<Void>> {
  if (dryRun) return ok(VoidSchema, undefined);

  const kubeconfigPath: Str = `${process.env.HOME ?? '~'}/.kube/config-coder` as Str;
  const env: Str = `KUBECONFIG=${kubeconfigPath}` as Str;

  const existsResult: Result<Bool> = execSyncBool(
    `${env} kubectl get pods -l app=coder --no-headers` as Str,
  );
  if (!existsResult.ok) return existsResult;
  if (existsResult.data) {
    const readyMsg: Result<Str> = strings.coderReady();
    if (!readyMsg.ok) return readyMsg;
    return ok(VoidSchema, undefined);
  }

  const installMsg: Result<Str> = strings.installingCoder();
  if (!installMsg.ok) return installMsg;

  execSyncSafe(`${env} helm repo add coder-v2 https://helm.coder.com/v2` as Str);
  execSyncSafe(`${env} helm repo update` as Str);

  const helmResult: Result<Str> = execSyncSafe(
    (`${env} helm install coder coder-v2/coder ` +
      `--set coder.env[0].name=CODER_ACCESS_URL ` +
      `--set coder.env[0].value=https://${config.coderDomain} ` +
      `--set coder.env[1].name=CODER_OIDC_ISSUER_URL ` +
      `--set coder.env[1].value=https://github.com ` +
      `--set coder.env[2].name=CODER_OIDC_CLIENT_ID ` +
      `--set coder.env[2].value=${config.githubClientId} ` +
      `--set coder.env[3].name=CODER_OIDC_CLIENT_SECRET ` +
      `--set coder.env[3].value=${config.githubClientSecret}`) as Str,
  );
  if (!helmResult.ok)
    return err(ERRORS.IO.EXEC_FAILED, { meta: { reason: 'Helm install failed' } });

  const waitResult: Result<Str> = execSyncSafe(
    `${env} kubectl wait --for=condition=ready pod -l app=coder --timeout=120s` as Str,
  );
  if (!waitResult.ok)
    return err(ERRORS.IO.EXEC_FAILED, { meta: { reason: 'Coder pods not ready' } });

  return ok(VoidSchema, undefined);
}

/**
 * Install Infisical on k3s via Helm.
 * Idempotent — skips if Infisical pods already running.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param dryRun - Whether to skip actual execution.
 * @param strings - Built locale strings.
 * @returns `Result<Void>` — success or error.
 */
export async function installInfisical(
  workspaceRoot: Str,
  dryRun: Bool,
  strings: BuiltDevenvStrings,
): Promise<Result<Void>> {
  if (dryRun) return ok(VoidSchema, undefined);

  const kubeconfigPath: Str = `${process.env.HOME ?? '~'}/.kube/config-coder` as Str;
  const env: Str = `KUBECONFIG=${kubeconfigPath}` as Str;

  const existsResult: Result<Bool> = execSyncBool(
    `${env} kubectl get pods -n infisical -l app=infisical --no-headers` as Str,
  );
  if (!existsResult.ok) return existsResult;
  if (existsResult.data) return ok(VoidSchema, undefined);

  const installMsg: Result<Str> = strings.installingInfisical();
  if (!installMsg.ok) return installMsg;

  execSyncSafe(
    `${env} helm repo add infisical-helm-charts https://dl.cloudsmith.io/public/infisical/helm-charts/helm/charts/` as Str,
  );
  execSyncSafe(`${env} helm repo update` as Str);

  const helmResult: Result<Str> = execSyncSafe(
    (`${env} helm install infisical infisical-helm-charts/infisical-standalone ` +
      `--namespace infisical --create-namespace ` +
      `--values ${workspaceRoot}/.coder/infisical-values.yaml`) as Str,
  );
  if (!helmResult.ok)
    return err(ERRORS.IO.EXEC_FAILED, { meta: { reason: 'Infisical Helm install failed' } });

  return ok(VoidSchema, undefined);
}

/**
 * Configure DNS + TLS via Cloudflare Tunnel.
 * Idempotent — skips if tunnel already exists.
 *
 * @param config - Deployment configuration.
 * @param dryRun - Whether to skip actual execution.
 * @param strings - Built locale strings.
 * @returns `Result<Void>` — success or error.
 */
export async function configureCloudflare(
  config: DeployConfig,
  dryRun: Bool,
  strings: BuiltDevenvStrings,
): Promise<Result<Void>> {
  if (dryRun) return ok(VoidSchema, undefined);

  const dnsMsg: Result<Str> = strings.configuringDns();
  if (!dnsMsg.ok) return dnsMsg;

  // Create tunnel (idempotent — will fail if exists, which is fine)
  execSyncSafe('cloudflared tunnel create coder-tunnel' as Str);

  // Route DNS
  execSyncSafe(`cloudflared tunnel route dns coder-tunnel ${config.coderDomain}` as Str);

  const doneMsg: Result<Str> = strings.dnsConfigured({ domain: config.coderDomain });
  if (!doneMsg.ok) return doneMsg;

  return ok(VoidSchema, undefined);
}

/**
 * Build and push the workspace Docker image to the configured container registry.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param config - Deployment configuration with registry URL and namespace.
 * @param dryRun - Whether to skip actual execution.
 * @param strings - Built locale strings.
 * @returns `Result<Void>` — success or error.
 */
export async function buildAndPushImage(
  workspaceRoot: Str,
  config: DeployConfig,
  dryRun: Bool,
  strings: BuiltDevenvStrings,
): Promise<Result<Void>> {
  if (dryRun) return ok(VoidSchema, undefined);

  const buildMsg: Result<Str> = strings.buildingImage();
  if (!buildMsg.ok) return buildMsg;

  const spinResult: Result<Void> = startSpinner(buildMsg.data);
  if (!spinResult.ok) return spinResult;

  // Build full image reference: registry/namespace/image:tag
  const registryUrl: Str = config.registryUrl;
  const registryNamespace: Str = config.registryNamespace;
  const imageBase = 'devenv-workspace';
  const tag = 'latest';
  const fullImageName: Str = registryNamespace
    ? `${registryUrl}/${registryNamespace}/${imageBase}:${tag}`
    : `${registryUrl}/${imageBase}:${tag}`;

  // Build
  const buildResult: Result<Str> = execSyncSafe(
    `docker build -t ${fullImageName} -f ${workspaceRoot}/.devcontainer/Dockerfile ${workspaceRoot}` as Str,
  );
  if (!buildResult.ok) {
    stopSpinner();
    return err(ERRORS.IO.EXEC_FAILED, {
      meta: { command: `docker build -t ${fullImageName}`, tool: 'docker' },
    });
  }

  // Push
  const pushResult: Result<Str> = execSyncSafe(`docker push ${fullImageName}` as Str);
  if (!pushResult.ok) {
    stopSpinner();
    return err(ERRORS.IO.EXEC_FAILED, {
      meta: { command: `docker push ${fullImageName}`, tool: 'docker' },
    });
  }

  stopSpinner();

  const pushedMsg: Result<Str> = strings.imagePushed();
  if (!pushedMsg.ok) return pushedMsg;

  return ok(VoidSchema, undefined);
}

/**
 * Push Coder workspace template.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param _config - Deployment configuration.
 * @param dryRun - Whether to skip actual execution.
 * @param strings - Built locale strings.
 * @returns `Result<Void>` — success or error.
 */
export async function pushCoderTemplate(
  workspaceRoot: Str,
  _config: DeployConfig,
  dryRun: Bool,
  strings: BuiltDevenvStrings,
): Promise<Result<Void>> {
  if (dryRun) return ok(VoidSchema, undefined);

  const pushMsg: Result<Str> = strings.pushingTemplate();
  if (!pushMsg.ok) return pushMsg;

  const pushResult: Result<Str> = execSyncSafe(
    `coder templates push devenv-workspace --directory ${workspaceRoot}/.coder/ --yes` as Str,
  );
  if (!pushResult.ok)
    return err(ERRORS.IO.EXEC_FAILED, { meta: { reason: 'Template push failed' } });

  const doneMsg: Result<Str> = strings.templatePushed();
  if (!doneMsg.ok) return doneMsg;

  return ok(VoidSchema, undefined);
}

/**
 * Create the first Coder workspace.
 * Idempotent — skips if workspace already exists.
 *
 * @param config - Deployment configuration.
 * @param dryRun - Whether to skip actual execution.
 * @param strings - Built locale strings.
 * @returns `Result<Void>` — success or error.
 */
export async function createWorkspace(
  config: DeployConfig,
  dryRun: Bool,
  strings: BuiltDevenvStrings,
): Promise<Result<Void>> {
  if (dryRun) return ok(VoidSchema, undefined);

  const existsResult: Result<Bool> = execSyncBool('coder list --output json | grep dev' as Str);
  if (!existsResult.ok) return existsResult;
  if (existsResult.data) return ok(VoidSchema, undefined);

  const createMsg: Result<Str> = strings.creatingWorkspace();
  if (!createMsg.ok) return createMsg;

  const createResult: Result<Str> = execSyncSafe(
    'coder create dev --template devenv-workspace --yes' as Str,
  );
  if (!createResult.ok)
    return err(ERRORS.IO.EXEC_FAILED, { meta: { reason: 'Workspace creation failed' } });

  const readyMsg: Result<Str> = strings.workspaceReady({
    url: `https://${config.coderDomain}/@me/dev`,
  });
  if (!readyMsg.ok) return readyMsg;

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Infrastructure State (Gap 9)
// =============================================================================

/**
 * Schema for devenv infrastructure state.
 * Tracks which resources were created during provisioning.
 * Stored at `<workspace>/.devenv-state.json`.
 */
export const DevenvStateSchema = v.strictObject({
  /** When the state was last updated. */
  lastUpdated: v.pipe(v.string(), v.isoTimestamp()),
  /** VPS IP address if provisioned. */
  vpsIp: v.optional(StrSchema),
  /** Whether k3s was installed. */
  k3sInstalled: v.optional(BoolSchema),
  /** Whether Coder was installed. */
  coderInstalled: v.optional(BoolSchema),
  /** Whether Infisical was installed. */
  infisicalInstalled: v.optional(BoolSchema),
  /** Whether DNS/tunnel was configured. */
  dnsConfigured: v.optional(BoolSchema),
  /** Whether workspace image was pushed. */
  imagePushed: v.optional(BoolSchema),
  /** Whether Coder template was pushed. */
  templatePushed: v.optional(BoolSchema),
  /** Whether workspace was created. */
  workspaceCreated: v.optional(BoolSchema),
});

/** Inferred output type of {@link DevenvStateSchema}. */
export type DevenvState = v.InferOutput<typeof DevenvStateSchema>;

/**
 * Save devenv infrastructure state to disk.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param state - Current infrastructure state.
 * @returns `Result<Void>` — success or error.
 */
export function saveState(workspaceRoot: Str, state: DevenvState): Result<Void> {
  const stateResult: Result<DevenvState> = safeParse(DevenvStateSchema, state);
  if (!stateResult.ok) return stateResult;

  const statePath = `${workspaceRoot}/.devenv-state.json`;
  const json: Str = JSON.stringify(stateResult.data, null, '\t');
  const writeResult: Result<Str> = execSyncSafe(
    `printf '%s' '${json.replace(/'/g, "'\\''")}' > ${statePath}` as Str,
  );
  if (!writeResult.ok)
    return err(ERRORS.IO.EXEC_FAILED, { meta: { command: 'write .devenv-state.json' } });

  return ok(VoidSchema, undefined);
}

/**
 * Load devenv infrastructure state from disk.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @returns `Result<DevenvState>` — loaded state or empty default.
 */
export function loadState(workspaceRoot: Str): Result<DevenvState> {
  const statePath = `${workspaceRoot}/.devenv-state.json`;
  const readResult: Result<Str> = execSyncSafe(`cat ${statePath} 2>/dev/null` as Str);
  if (!readResult.ok) {
    // No state file — return empty state
    const emptyState: DevenvState = {
      lastUpdated: new Date().toISOString(),
    };
    return safeParse(DevenvStateSchema, emptyState);
  }

  const parsed: unknown = JSON.parse(readResult.data);
  return safeParse(DevenvStateSchema, parsed);
}

// =============================================================================
// Container Operations (Gaps 2, 4)
// =============================================================================

/**
 * Execute a command inside the running dev container.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param command - Command to execute (defaults to interactive shell).
 * @param strings - Built locale strings.
 * @returns `Result<Void>` — success or error.
 */
export async function execInContainer(
  workspaceRoot: Str,
  command: StrArray,
  strings: BuiltDevenvStrings,
): Promise<Result<Void>> {
  const findResult: Result<Str> = execSyncSafe(
    `docker ps --filter "label=devcontainer.local_folder=${workspaceRoot}" --format "{{.ID}}"` as Str,
  );
  if (!findResult.ok) return findResult;

  const containerId: Str = findResult.data.trim() as Str;
  if (!containerId) {
    const msg: Result<Str> = strings.execContainerNotFound();
    if (!msg.ok) return msg;
    return err(ERRORS.IO.PREREQUISITE_MISSING, { meta: { tool: 'docker' } });
  }

  const cmd: Str =
    command.length > 0
      ? `docker exec -it ${containerId} ${command.join(' ')}`
      : `docker exec -it ${containerId} /bin/bash`;

  const execResult: Result<Str> = execSyncSafe(cmd as Str);
  if (!execResult.ok) return err(ERRORS.IO.EXEC_FAILED, { meta: { command: cmd, tool: 'docker' } });

  return ok(VoidSchema, undefined);
}

/**
 * Stream logs from the running dev container.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param follow - Whether to follow log output (like `tail -f`).
 * @param tail - Number of lines to show (0 = all).
 * @param strings - Built locale strings.
 * @returns `Result<Void>` — success or error.
 */
export async function showContainerLogs(
  workspaceRoot: Str,
  follow: Bool,
  tail: NonNegativeInteger,
  strings: BuiltDevenvStrings,
): Promise<Result<Void>> {
  const findResult: Result<Str> = execSyncSafe(
    `docker ps --filter "label=devcontainer.local_folder=${workspaceRoot}" --format "{{.ID}}"` as Str,
  );
  if (!findResult.ok) return findResult;

  const containerId: Str = findResult.data.trim() as Str;
  if (!containerId) {
    const msg: Result<Str> = strings.logsContainerNotFound();
    if (!msg.ok) return msg;
    return err(ERRORS.IO.PREREQUISITE_MISSING, { meta: { tool: 'docker' } });
  }

  const streamMsg: Result<Str> = strings.logsStreaming();
  if (!streamMsg.ok) return streamMsg;

  const followFlag = follow ? ' --follow' : '';
  const tailFlag = tail > 0 ? ` --tail ${tail}` : '';
  const logsResult: Result<Str> = execSyncSafe(
    `docker logs ${containerId}${followFlag}${tailFlag}` as Str,
  );
  if (!logsResult.ok)
    return err(ERRORS.IO.EXEC_FAILED, {
      meta: { command: `docker logs ${containerId}`, tool: 'docker' },
    });

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Prebuild, Env File, Config Change, IDE (Gaps 7, 13, 14, 18)
// =============================================================================

/**
 * Prebuild the dev container image for faster startup.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param dryRun - Whether to skip actual execution.
 * @param strings - Built locale strings.
 * @returns `Result<Void>` — success or error.
 */
export async function prebuildImage(
  workspaceRoot: Str,
  dryRun: Bool,
  strings: BuiltDevenvStrings,
): Promise<Result<Void>> {
  if (dryRun) return ok(VoidSchema, undefined);

  const msg: Result<Str> = strings.prebuildStarting();
  if (!msg.ok) return msg;

  const buildResult: Result<Str> = execSyncSafe(
    `devcontainer build --workspace-folder ${workspaceRoot} --image-name devenv-workspace:prebuilt` as Str,
  );
  if (!buildResult.ok)
    return err(ERRORS.IO.EXEC_FAILED, {
      meta: { command: 'devcontainer build', tool: 'devcontainer' },
    });

  const doneMsg: Result<Str> = strings.prebuildComplete();
  if (!doneMsg.ok) return doneMsg;

  return ok(VoidSchema, undefined);
}

/**
 * Generate a `.env` file from Infisical secrets for local development.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param dryRun - Whether to skip actual execution.
 * @param strings - Built locale strings.
 * @returns `Result<Void>` — success or error.
 */
export async function generateEnvFile(
  workspaceRoot: Str,
  dryRun: Bool,
  strings: BuiltDevenvStrings,
): Promise<Result<Void>> {
  const genMsg: Result<Str> = strings.envGenerating();
  if (!genMsg.ok) return genMsg;

  if (dryRun) return ok(VoidSchema, undefined);

  const envPath = `${workspaceRoot}/.env`;
  const exportResult: Result<Str> = execSyncSafe(
    `infisical export --env=development --format=dotenv > ${envPath}` as Str,
  );
  if (!exportResult.ok)
    return err(ERRORS.IO.EXEC_FAILED, { meta: { command: 'infisical export', tool: 'infisical' } });

  const doneMsg: Result<Str> = strings.envGenerated();
  if (!doneMsg.ok) return doneMsg;

  return ok(VoidSchema, undefined);
}

/**
 * Check if resist.config.ts has changed since the last devcontainer build.
 * Stores a hash of the config in `.devcontainer/.config-hash`.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @returns `Result<Bool>` — `true` if config has changed.
 */
export function hasConfigChanged(workspaceRoot: Str): Result<Bool> {
  const hashPath = `${workspaceRoot}/.devcontainer/.config-hash`;
  const configPath = `${workspaceRoot}/resist.config.ts`;

  const currentHashResult: Result<Str> = execSyncSafe(
    `shasum -a 256 ${configPath} | cut -d' ' -f1` as Str,
  );
  if (!currentHashResult.ok) return ok(BoolSchema, false);

  const storedHashResult: Result<Str> = execSyncSafe(`cat ${hashPath} 2>/dev/null` as Str);
  if (!storedHashResult.ok) return ok(BoolSchema, true);

  const changed: Bool = currentHashResult.data.trim() !== storedHashResult.data.trim();
  return ok(BoolSchema, changed);
}

/**
 * Save the current config hash for future change detection.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @returns `Result<Void>` — success or error.
 */
export function saveConfigHash(workspaceRoot: Str): Result<Void> {
  const hashPath = `${workspaceRoot}/.devcontainer/.config-hash`;
  const configPath = `${workspaceRoot}/resist.config.ts`;

  const hashResult: Result<Str> = execSyncSafe(
    `shasum -a 256 ${configPath} | cut -d' ' -f1 > ${hashPath}` as Str,
  );
  if (!hashResult.ok)
    return err(ERRORS.IO.EXEC_FAILED, { meta: { command: 'shasum -a 256', tool: 'shasum' } });

  return ok(VoidSchema, undefined);
}

/**
 * Open the dev container in VS Code.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @returns `Result<Void>` — success or error.
 */
export function openInIde(workspaceRoot: Str): Result<Void> {
  const openResult: Result<Str> = execSyncSafe(
    `devcontainer open --workspace-folder ${workspaceRoot}` as Str,
  );
  if (!openResult.ok)
    return err(ERRORS.IO.EXEC_FAILED, {
      meta: { command: 'devcontainer open', tool: 'devcontainer' },
    });
  return ok(VoidSchema, undefined);
}
