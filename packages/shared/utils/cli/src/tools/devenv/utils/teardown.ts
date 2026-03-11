/**
 * Devenv Teardown Steps
 *
 * Implementations for `devenv down` (local) and `devenv destroy` (remote).
 * Each step is individually fault-tolerant — continues even if a resource is already deleted.
 *
 * @module
 */

import type { BuiltDevenvStrings } from '@/cli/tools/devenv/locales/schema';
import { loadState, type DevenvState } from '@/cli/tools/devenv/utils/steps';
import { type Bool, type Str, VoidSchema, type Void } from '@/schemas/common';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';
import { execSyncBool, execSyncSafe } from '@/utils/core/shell';

/**
 * Stop and remove the local devcontainer.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param prune - Whether to also remove Docker images.
 * @param dryRun - Whether to skip actual execution.
 * @param strings - Built locale strings.
 * @returns `Result<Void>` — success or error.
 */
export async function stopLocalContainer(
  workspaceRoot: Str,
  prune: Bool,
  dryRun: Bool,
  strings: BuiltDevenvStrings,
): Promise<Result<Void>> {
  const stoppingMsg: Result<Str> = strings.containerStopping();
  if (!stoppingMsg.ok) return stoppingMsg;

  if (dryRun) return ok(VoidSchema, undefined);

  // Find container by devcontainer label
  const findResult: Result<Str> = execSyncSafe(
    `docker ps -a --filter "label=devcontainer.local_folder=${workspaceRoot}" --format "{{.ID}}"` as Str,
  );
  if (!findResult.ok) return findResult;

  const containerId: Str = findResult.data.trim() as Str;
  if (!containerId) {
    const notRunningMsg: Result<Str> = strings.containerNotRunning();
    if (!notRunningMsg.ok) return notRunningMsg;
    return ok(VoidSchema, undefined);
  }

  const stopResult: Result<Str> = execSyncSafe(
    `docker stop ${containerId} && docker rm ${containerId}` as Str,
  );
  if (!stopResult.ok)
    return err(ERRORS.IO.EXEC_FAILED, { meta: { reason: 'Container stop failed' } });

  const stoppedMsg: Result<Str> = strings.containerStopped();
  if (!stoppedMsg.ok) return stoppedMsg;

  if (prune) {
    execSyncSafe('docker image prune -f --filter "label=devcontainer"' as Str);
    const prunedMsg: Result<Str> = strings.imagesPruned();
    if (!prunedMsg.ok) return prunedMsg;
  }

  const doneMsg: Result<Str> = strings.downComplete();
  if (!doneMsg.ok) return doneMsg;

  return ok(VoidSchema, undefined);
}

/**
 * Preview what would be destroyed without actually deleting anything.
 * Reads infrastructure state and checks which resources exist.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param strings - Built locale strings.
 * @returns `Result<Void>` — always succeeds (preview is informational).
 */
export function previewDestroy(workspaceRoot: Str, strings: BuiltDevenvStrings): Result<Void> {
  const headerMsg: Result<Str> = strings.destroyPreviewHeader();
  if (!headerMsg.ok) return headerMsg;

  const stateResult: Result<DevenvState> = loadState(workspaceRoot);
  if (!stateResult.ok) return stateResult;
  const state: DevenvState = stateResult.data;

  const resources: readonly { name: Str; exists: Bool }[] = [
    { name: 'Coder workspace' as Str, exists: (state.workspaceCreated ?? false) as Bool },
    { name: 'Coder template' as Str, exists: (state.templatePushed ?? false) as Bool },
    { name: 'Workspace image' as Str, exists: (state.imagePushed ?? false) as Bool },
    { name: 'Cloudflare tunnel/DNS' as Str, exists: (state.dnsConfigured ?? false) as Bool },
    { name: 'Infisical (Helm)' as Str, exists: (state.infisicalInstalled ?? false) as Bool },
    { name: 'Coder (Helm)' as Str, exists: (state.coderInstalled ?? false) as Bool },
    { name: 'k3s cluster' as Str, exists: (state.k3sInstalled ?? false) as Bool },
    { name: 'Hetzner VPS' as Str, exists: !!state.vpsIp as Bool },
  ];

  for (const resource of resources) {
    if (resource.exists) {
      const itemMsg: Result<Str> = strings.destroyPreviewItem({ resource: resource.name });
      if (!itemMsg.ok) return itemMsg;
    }
  }

  return ok(VoidSchema, undefined);
}

/**
 * Destroy remote infrastructure (VPS, Coder, Infisical, DNS).
 * Requires --confirm flag. Each step is fault-tolerant.
 * Uses infrastructure state to determine which resources to destroy.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param dryRun - Whether to skip actual execution.
 * @param strings - Built locale strings.
 * @returns `Result<Void>` — success or error.
 */
export async function destroyRemoteInfra(
  workspaceRoot: Str,
  dryRun: Bool,
  strings: BuiltDevenvStrings,
): Promise<Result<Void>> {
  const startMsg: Result<Str> = strings.destroyStarting();
  if (!startMsg.ok) return startMsg;

  if (dryRun) return ok(VoidSchema, undefined);

  // Load infrastructure state to determine which resources exist
  const stateResult: Result<DevenvState> = loadState(workspaceRoot);
  if (!stateResult.ok) return stateResult;
  const state: DevenvState = stateResult.data;

  const kubeconfigPath: Str = `${process.env.HOME ?? '~'}/.kube/config-coder` as Str;
  const env: Str = `KUBECONFIG=${kubeconfigPath}` as Str;

  // Destroy only resources that state indicates were created
  if (state.workspaceCreated) {
    const stepMsg: Result<Str> = strings.destroyStep({ step: 'Coder workspace' as Str });
    if (!stepMsg.ok) return stepMsg;
    execSyncSafe('coder delete dev --yes' as Str);
  }

  if (state.templatePushed) {
    const stepMsg: Result<Str> = strings.destroyStep({ step: 'Coder template' as Str });
    if (!stepMsg.ok) return stepMsg;
    execSyncSafe('coder templates delete devenv-workspace --yes' as Str);
  }

  if (state.coderInstalled) {
    const stepMsg: Result<Str> = strings.destroyStep({ step: 'Coder Helm chart' as Str });
    if (!stepMsg.ok) return stepMsg;
    execSyncSafe(`${env} helm uninstall coder` as Str);
  }

  if (state.infisicalInstalled) {
    const stepMsg: Result<Str> = strings.destroyStep({ step: 'Infisical Helm chart' as Str });
    if (!stepMsg.ok) return stepMsg;
    execSyncSafe(`${env} helm uninstall infisical -n infisical` as Str);
  }

  if (state.dnsConfigured) {
    const stepMsg: Result<Str> = strings.destroyStep({ step: 'Cloudflare tunnel' as Str });
    if (!stepMsg.ok) return stepMsg;
    execSyncSafe('cloudflared tunnel delete coder-tunnel' as Str);
  }

  if (state.vpsIp) {
    const stepMsg: Result<Str> = strings.destroyStep({ step: 'Hetzner VPS' as Str });
    if (!stepMsg.ok) return stepMsg;
    execSyncSafe('hcloud server delete devenv-coder' as Str);

    const ctxMsg: Result<Str> = strings.destroyStep({ step: 'hcloud context' as Str });
    if (!ctxMsg.ok) return ctxMsg;
    execSyncSafe('hcloud context delete devenv' as Str);
  }

  // Kubeconfig cleanup
  execSyncSafe(`rm -f ${kubeconfigPath}` as Str);

  const doneMsg: Result<Str> = strings.destroyComplete();
  if (!doneMsg.ok) return doneMsg;

  return ok(VoidSchema, undefined);
}
