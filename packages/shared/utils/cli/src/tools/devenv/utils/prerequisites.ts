/**
 * Devenv Prerequisites
 *
 * Detection, installation, and verification of all tools needed
 * for local dev containers and remote Coder workspaces.
 *
 * @module
 */

import * as v from 'valibot';

import type { BuiltDevenvStrings } from '@/cli/tools/devenv/locales/schema';
import { getConfig } from '@/config/loader';
import {
  type Bool,
  BoolSchema,
  type Str,
  StrSchema,
  VoidSchema,
  type Void,
} from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import type { SystemToolVersions } from '@/schemas/core-config/versions';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';
import type { DeepReadonly } from '@/utils/core/object';
import { isWindows } from '@/utils/core/process';
import { commandExists, ensureMise, execSyncBool, execSyncSafe } from '@/utils/core/shell';
import { startSpinner, stopSpinner } from '@/utils/core/terminal';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Types
// =============================================================================

/**
 * Prerequisite target scope.
 * - `local`: prerequisites for `devenv up` (Docker, devcontainer CLI)
 * - `remote`: prerequisites for `devenv deploy` (all local + kubectl, helm, hcloud, coder)
 * - `push`: prerequisites for `devenv push` (coder CLI only)
 */
export const PrerequisiteTargetSchema = v.picklist(['local', 'remote', 'push']);

/** Inferred output type of {@link PrerequisiteTargetSchema}. */
export type PrerequisiteTarget = v.InferOutput<typeof PrerequisiteTargetSchema>;

/** Single prerequisite check result. */
export const PrerequisiteStatusSchema = v.strictObject({
  /** Tool name. */
  tool: StrSchema,
  /** Whether the tool is available. */
  available: BoolSchema,
  /** Version string if available. */
  version: v.optional(StrSchema),
});

/** Inferred output type of {@link PrerequisiteStatusSchema}. */
export type PrerequisiteStatus = v.InferOutput<typeof PrerequisiteStatusSchema>;

// =============================================================================
// Detection Helpers
// =============================================================================

/**
 * Check if Docker is installed and the daemon is running.
 *
 * @returns `Result<Bool>` — `true` if Docker is available and running.
 */
export function isDockerReady(): Result<Bool> {
  const existsResult: Result<Bool> = commandExists('docker' as Str);
  if (!existsResult.ok) return existsResult;
  if (!existsResult.data) return ok(BoolSchema, false);

  const runningResult: Result<Bool> = execSyncBool('docker info' as Str);
  if (!runningResult.ok) return runningResult;
  return ok(BoolSchema, runningResult.data);
}

/**
 * Get version string from a CLI tool.
 *
 * @param versionCommand - Command to run (e.g., `docker --version`).
 * @returns `Result<Str>` — trimmed version output, or error.
 */
export function getToolVersion(versionCommand: Str): Result<Str> {
  const parsed: Result<Str> = safeParse(StrSchema, versionCommand);
  if (!parsed.ok) return parsed;
  return execSyncSafe(parsed.data);
}

/**
 * Install a tool via mise.
 *
 * @param toolName - Tool name in mise registry (e.g., `kubectl`, `helm`).
 * @param version - Version to install (e.g., `latest`, `1.32.0`).
 * @returns `Result<Void>` — success or install error.
 */
export function installViaMise(toolName: Str, version: Str): Result<Void> {
  const installResult: Result<Str> = execSyncSafe(
    `./bin/mise install ${toolName}@${version}` as Str,
  );
  if (!installResult.ok) return err(ERRORS.IO.INSTALL_FAILED, { meta: { tool: toolName } });

  const useResult: Result<Str> = execSyncSafe(`./bin/mise use -g ${toolName}@${version}` as Str);
  if (!useResult.ok) return err(ERRORS.IO.INSTALL_FAILED, { meta: { tool: toolName } });

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Prerequisite Pipeline
// =============================================================================

/**
 * Ensure all prerequisites for the given target are installed.
 * Missing tools are auto-installed where possible (via mise, npm, or curl).
 * Docker is the one exception — prints platform-specific install instructions.
 *
 * @param target - Which prerequisite set to check (`local`, `remote`, or `push`).
 * @param workspaceRoot - Absolute path to workspace root.
 * @param strings - Built locale strings for user messages.
 * @returns `Result<Void>` — success if all prerequisites met, or first error.
 */
export async function ensurePrerequisites(
  target: PrerequisiteTarget,
  workspaceRoot: Str,
  strings: BuiltDevenvStrings,
): Promise<Result<Void>> {
  const targetResult: Result<PrerequisiteTarget> = safeParse(PrerequisiteTargetSchema, target);
  if (!targetResult.ok) return targetResult;

  const headerResult: Result<Str> = strings.checkingPrereqs();
  if (!headerResult.ok) return headerResult;

  // 1. Always check mise
  const miseResult: Result<{ status: Str }> = ensureMise(workspaceRoot, '' as Str, false);
  if (!miseResult.ok) return miseResult;

  // 2. Check Docker (required for local and remote, not push)
  if (targetResult.data === 'local' || targetResult.data === 'remote') {
    const dockerResult: Result<Bool> = isDockerReady();
    if (!dockerResult.ok) return dockerResult;
    if (!dockerResult.data) {
      const platform: Str = process.platform as Str;
      if (platform === 'darwin') {
        const msg: Result<Str> = strings.dockerNotFoundMac();
        if (!msg.ok) return msg;
        return err(ERRORS.IO.PREREQUISITE_MISSING, msg.data);
      } else if (platform === 'win32') {
        const msg: Result<Str> = strings.dockerNotFoundWindows();
        if (!msg.ok) return msg;
        return err(ERRORS.IO.PREREQUISITE_MISSING, msg.data);
      } else {
        const msg: Result<Str> = strings.dockerNotFoundLinux();
        if (!msg.ok) return msg;
        return err(ERRORS.IO.PREREQUISITE_MISSING, msg.data);
      }
    }

    // 3. Check devcontainer CLI
    const dcExistsResult: Result<Bool> = commandExists('devcontainer' as Str);
    if (!dcExistsResult.ok) return dcExistsResult;
    if (!dcExistsResult.data) {
      const installMsg: Result<Str> = strings.prereqInstalling({ tool: 'devcontainer CLI' as Str });
      if (!installMsg.ok) return installMsg;
      const npmInstall: Result<Str> = execSyncSafe('npm install -g @devcontainers/cli' as Str);
      if (!npmInstall.ok) return err(ERRORS.IO.INSTALL_FAILED, { meta: { tool: 'devcontainer' } });
    }
  }

  // 4. Remote-only prerequisites (versions from SystemToolVersionsSchema)
  if (targetResult.data === 'remote') {
    const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
    if (!configResult.ok) return configResult;
    const systemTools: DeepReadonly<SystemToolVersions> = configResult.data.versions.systemTools;

    const remoteTools: readonly { tool: Str; version: Str }[] = [
      { tool: 'hcloud' as Str, version: systemTools.hcloud },
      { tool: 'kubectl' as Str, version: systemTools.kubectl },
      { tool: 'helm' as Str, version: systemTools.helm },
    ];

    for (const { tool, version } of remoteTools) {
      const existsResult: Result<Bool> = commandExists(tool);
      if (!existsResult.ok) return existsResult;
      if (!existsResult.data) {
        const installMsg: Result<Str> = strings.prereqInstalling({ tool });
        if (!installMsg.ok) return installMsg;
        const spinStartResult: Result<Void> = startSpinner(installMsg.data);
        if (!spinStartResult.ok) return spinStartResult;
        const installResult: Result<Void> = installViaMise(tool, version);
        const spinStopResult: Result<Void> = stopSpinner(installMsg.data);
        if (!spinStopResult.ok) return spinStopResult;
        if (!installResult.ok) return installResult;
      }
    }

    // Coder CLI (not in mise — use curl installer)
    const coderExistsResult: Result<Bool> = commandExists('coder' as Str);
    if (!coderExistsResult.ok) return coderExistsResult;
    if (!coderExistsResult.data) {
      const installMsg: Result<Str> = strings.prereqInstalling({ tool: 'coder' as Str });
      if (!installMsg.ok) return installMsg;
      const curlResult: Result<Str> = execSyncSafe(
        'curl -fsSL https://coder.com/install.sh | sh' as Str,
      );
      if (!curlResult.ok) return err(ERRORS.IO.INSTALL_FAILED, { meta: { tool: 'coder' } });
    }

    // SSH key + permissions validation
    const sshDirPath: Str = `${process.env.HOME ?? '~'}/.ssh` as Str;
    const sshKeyPath: Str = `${sshDirPath}/id_ed25519` as Str;

    // Ensure .ssh directory exists
    const mkdirSshResult: Result<Str> = execSyncSafe(`mkdir -p ${sshDirPath}` as Str);
    if (!mkdirSshResult.ok)
      return err(ERRORS.IO.EXEC_FAILED, { meta: { command: `mkdir -p ${sshDirPath}` } });

    // Set directory permissions (Unix only — Windows OpenSSH handles via NTFS ACLs)
    if (!isWindows) {
      const chmodDirResult: Result<Str> = execSyncSafe(`chmod 700 ${sshDirPath}` as Str);
      if (!chmodDirResult.ok)
        return err(ERRORS.IO.EXEC_FAILED, { meta: { command: `chmod 700 ${sshDirPath}` } });
    }

    // Generate key if missing
    const sshExistsResult: Result<Bool> = execSyncBool(`test -f ${sshKeyPath}` as Str);
    if (!sshExistsResult.ok) return sshExistsResult;
    if (!sshExistsResult.data) {
      const genResult: Result<Str> = execSyncSafe(
        `ssh-keygen -t ed25519 -C "devenv" -f ${sshKeyPath} -N ""` as Str,
      );
      if (!genResult.ok)
        return err(ERRORS.IO.EXEC_FAILED, { meta: { command: 'ssh-keygen', tool: 'ssh-keygen' } });
    }

    // Validate key permissions (Unix only — OpenSSH enforces 600 on private key)
    if (!isWindows) {
      const chmodKeyResult: Result<Str> = execSyncSafe(`chmod 600 ${sshKeyPath}` as Str);
      if (!chmodKeyResult.ok)
        return err(ERRORS.IO.EXEC_FAILED, { meta: { command: `chmod 600 ${sshKeyPath}` } });
      // Best-effort on public key
      execSyncSafe(`chmod 644 ${sshKeyPath}.pub 2>/dev/null` as Str);
    }
  }

  // 5. Push-only prerequisites (coder CLI + auth)
  if (targetResult.data === 'push') {
    const coderExistsResult: Result<Bool> = commandExists('coder' as Str);
    if (!coderExistsResult.ok) return coderExistsResult;
    if (!coderExistsResult.data) {
      return err(ERRORS.IO.PREREQUISITE_MISSING, { meta: { tool: 'coder CLI' } });
    }
    const authResult: Result<Bool> = execSyncBool('coder whoami' as Str);
    if (!authResult.ok) return authResult;
    if (!authResult.data) {
      const msg: Result<Str> = strings.coderNotAuthenticated();
      if (!msg.ok) return msg;
      return err(ERRORS.AUTH.UNAUTHORIZED, msg.data);
    }
  }

  return ok(VoidSchema, undefined);
}

/**
 * Check all prerequisites and print a status table.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param strings - Built locale strings for user messages.
 * @returns `Result<Void>` — always succeeds (status is informational).
 */
export function checkAllStatus(workspaceRoot: Str, strings: BuiltDevenvStrings): Result<Void> {
  const headerResult: Result<Str> = strings.statusHeader();
  if (!headerResult.ok) return headerResult;

  const localResult: Result<Str> = strings.statusLocalSection();
  if (!localResult.ok) return localResult;

  // Check each local tool
  const localTools: readonly { tool: Str; versionCmd: Str }[] = [
    { tool: 'mise' as Str, versionCmd: './bin/mise --version' as Str },
    { tool: 'docker' as Str, versionCmd: 'docker --version' as Str },
    { tool: 'devcontainer' as Str, versionCmd: 'devcontainer --version' as Str },
  ];

  for (const { tool, versionCmd } of localTools) {
    const existsResult: Result<Bool> = commandExists(tool);
    if (!existsResult.ok) return existsResult;
    if (existsResult.data) {
      const versionResult: Result<Str> = execSyncSafe(versionCmd);
      const version: Str = versionResult.ok ? versionResult.data : ('unknown' as Str);
      const msg: Result<Str> = strings.statusAvailable({ tool, version });
      if (!msg.ok) return msg;
    } else {
      const msg: Result<Str> = strings.statusMissing({ tool });
      if (!msg.ok) return msg;
    }
  }

  const remoteResult: Result<Str> = strings.statusRemoteSection();
  if (!remoteResult.ok) return remoteResult;

  // Load expected versions from config for comparison
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;
  const expectedVersions: DeepReadonly<SystemToolVersions> = configResult.data.versions.systemTools;

  // Check each remote tool (with version comparison)
  const remoteTools: readonly { tool: Str; versionCmd: Str }[] = [
    { tool: 'kubectl' as Str, versionCmd: 'kubectl version --client --short' as Str },
    { tool: 'helm' as Str, versionCmd: 'helm version --short' as Str },
    { tool: 'coder' as Str, versionCmd: 'coder version' as Str },
    { tool: 'terraform' as Str, versionCmd: 'terraform version' as Str },
    { tool: 'cloudflared' as Str, versionCmd: 'cloudflared version' as Str },
    { tool: 'hcloud' as Str, versionCmd: 'hcloud version' as Str },
  ];

  for (const { tool, versionCmd } of remoteTools) {
    const existsResult: Result<Bool> = commandExists(tool);
    if (!existsResult.ok) return existsResult;
    if (existsResult.data) {
      const versionResult: Result<Str> = execSyncSafe(versionCmd);
      const version: Str = versionResult.ok ? versionResult.data : ('unknown' as Str);

      // Compare against expected version from config (if available)
      const toolKey: string = tool as string;
      const expectedVersion: Str = ((expectedVersions as Record<string, string>)[toolKey] ??
        '') as Str;
      if (
        expectedVersion &&
        version !== ('unknown' as Str) &&
        !version.includes(expectedVersion as string)
      ) {
        const outdatedMsg: Result<Str> = strings.statusOutdated({
          tool,
          current: version,
          expected: expectedVersion,
        });
        if (!outdatedMsg.ok) return outdatedMsg;
      } else {
        const msg: Result<Str> = strings.statusAvailable({ tool, version });
        if (!msg.ok) return msg;
      }
    } else {
      const msg: Result<Str> = strings.statusMissing({ tool });
      if (!msg.ok) return msg;
    }
  }

  // Secrets section
  const secretsResult: Result<Str> = strings.statusSecretsSection();
  if (!secretsResult.ok) return secretsResult;

  // Check infisical CLI
  const infisicalExists: Result<Bool> = commandExists('infisical' as Str);
  if (!infisicalExists.ok) return infisicalExists;
  if (infisicalExists.data) {
    const versionResult: Result<Str> = execSyncSafe('infisical --version' as Str);
    const version: Str = versionResult.ok ? versionResult.data : ('unknown' as Str);
    const msg: Result<Str> = strings.statusAvailable({ tool: 'infisical' as Str, version });
    if (!msg.ok) return msg;
  } else {
    const msg: Result<Str> = strings.statusMissing({ tool: 'infisical' as Str });
    if (!msg.ok) return msg;
  }

  // Check .infisical.json
  const infisicalConfigPath: Str = `${workspaceRoot}/.infisical.json` as Str;
  const infisicalConfigExists: Result<Bool> = execSyncBool(`test -f ${infisicalConfigPath}` as Str);
  if (!infisicalConfigExists.ok) return infisicalConfigExists;
  if (infisicalConfigExists.data) {
    const msg: Result<Str> = strings.statusAvailable({
      tool: '.infisical.json' as Str,
      version: 'found' as Str,
    });
    if (!msg.ok) return msg;
  } else {
    const msg: Result<Str> = strings.statusMissing({ tool: '.infisical.json' as Str });
    if (!msg.ok) return msg;
  }

  // Check Infisical server (Docker Compose)
  const serverRunning: Result<Bool> = execSyncBool(
    'docker compose -f docker-compose.infisical.yml ps --status running infisical 2>/dev/null' as Str,
  );
  if (serverRunning.ok && serverRunning.data) {
    const msg: Result<Str> = strings.statusAvailable({
      tool: 'Infisical server' as Str,
      version: 'running' as Str,
    });
    if (!msg.ok) return msg;
  } else {
    const msg: Result<Str> = strings.statusMissing({ tool: 'Infisical server (local)' as Str });
    if (!msg.ok) return msg;
  }

  // Container status section
  const containerSectionMsg: Result<Str> = strings.statusContainerSection();
  if (!containerSectionMsg.ok) return containerSectionMsg;

  // Check for running devcontainer
  const containerResult: Result<Str> = execSyncSafe(
    `docker ps --filter "label=devcontainer.local_folder=${workspaceRoot}" --format "{{.Status}}"` as Str,
  );
  if (containerResult.ok && containerResult.data.trim()) {
    const runningMsg: Result<Str> = strings.statusContainerRunning({
      status: containerResult.data.trim() as Str,
    });
    if (!runningMsg.ok) return runningMsg;
  } else {
    const stoppedMsg: Result<Str> = strings.statusContainerStopped();
    if (!stoppedMsg.ok) return stoppedMsg;
  }

  // Check for Coder workspaces (only if coder CLI is available)
  const coderAvailableResult: Result<Bool> = commandExists('coder' as Str);
  if (!coderAvailableResult.ok) return coderAvailableResult;
  if (coderAvailableResult.data) {
    const wsListResult: Result<Str> = execSyncSafe('coder list --output json 2>/dev/null' as Str);
    if (wsListResult.ok && wsListResult.data.trim()) {
      const wsMsg: Result<Str> = strings.statusCoderWorkspace({
        workspaces: wsListResult.data.trim() as Str,
      });
      if (!wsMsg.ok) return wsMsg;
    }
  }

  return ok(VoidSchema, undefined);
}
