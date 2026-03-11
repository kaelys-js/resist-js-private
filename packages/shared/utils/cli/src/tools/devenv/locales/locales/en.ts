/**
 * Devenv English Strings
 *
 * @module
 */

import type { DevenvStrings } from '@/cli/tools/devenv/locales/schema';

/** English strings for devenv. */
export const en: DevenvStrings = {
  name: 'devenv',
  description: 'Set up local and remote dev environments with one command',

  flags: {
    rebuild: 'Force rebuild of the container image',
    imageOnly: 'Only rebuild and push the workspace image',
    prune: 'Also remove Docker images when stopping the container',
    confirm: 'Confirm destructive operations (required for destroy)',
  },

  examples: [
    {
      command: '{pmTool} devenv up',
      description: 'Set up local dev container (installs prerequisites, builds, starts)',
    },
    {
      command: '{pmTool} devenv down',
      description: 'Stop and remove local dev container',
    },
    {
      command: '{pmTool} devenv deploy',
      description: 'Provision VPS + Coder from scratch (fully automated)',
    },
    {
      command: '{pmTool} devenv destroy --confirm',
      description: 'Tear down remote infrastructure (VPS, Coder, Infisical, DNS)',
    },
    {
      command: '{pmTool} devenv push',
      description: 'Push updated Coder template after config change',
    },
    {
      command: '{pmTool} devenv status',
      description: 'Show environment setup status',
    },
    {
      command: '{pmTool} devenv exec',
      description: 'Shell into running dev container (defaults to /bin/bash)',
    },
    {
      command: '{pmTool} devenv restart',
      description: 'Stop then re-start the local dev container',
    },
    {
      command: '{pmTool} devenv logs',
      description: 'Stream logs from the running dev container',
    },
    {
      command: '{pmTool} devenv ssh',
      description: 'SSH into the remote Coder workspace',
    },
    {
      command: '{pmTool} devenv stop',
      description: 'Stop remote workspace without destroying infrastructure',
    },
    {
      command: '{pmTool} devenv start',
      description: 'Start a previously stopped remote workspace',
    },
    {
      command: '{pmTool} devenv prebuild',
      description: 'Prebuild the dev container image for faster startup',
    },
    {
      command: '{pmTool} devenv env',
      description: 'Generate .env file from Infisical secrets',
    },
  ],

  exitCodes: [
    { code: 0, description: 'Completed successfully' },
    { code: 1, description: 'Failed or prerequisite missing' },
    { code: 2, description: 'Invalid command usage or arguments' },
    { code: 3, description: 'Unexpected fatal error' },
    { code: 130, description: 'Operation interrupted by user (Ctrl+C)' },
  ],

  // Prerequisites
  checkingPrereqs: 'Checking prerequisites...',
  prereqFound: '{tool} v{version} found',
  prereqInstalling: 'Installing {tool}...',
  prereqInstalled: '{tool} installed successfully',
  prereqMissing: '{tool} is required but could not be auto-installed',
  dockerNotFoundMac: 'Docker not found. Install Docker Desktop: brew install --cask docker',
  dockerNotFoundLinux: 'Docker not found. Install: curl -fsSL https://get.docker.com | sh',
  dockerNotFoundWindows:
    'Docker not found. Install Docker Desktop from https://docker.com/download',
  dockerNotRunning: 'Docker is installed but not running. Start Docker Desktop and try again.',

  // Sync
  syncRunning: 'Running sync to generate devcontainer files...',
  syncComplete: 'Sync complete — devcontainer files generated',
  syncOutputsMissing: '.devcontainer/ not found. Running sync first...',

  // Local (up)
  containerBuilding: 'Building dev container...',
  containerRebuilding: 'Rebuilding dev container (--rebuild)...',
  containerReady: 'Dev environment ready!',
  configChanged: 'Config has changed since last build. Run with --rebuild to apply.',
  openInVscode: 'Open in VSCode: Ctrl+Shift+P -> "Reopen in Container"',
  dryRunUp: '[dry-run] Would build and start dev container',

  // Down (local teardown)
  containerStopping: 'Stopping dev container...',
  containerStopped: 'Dev container stopped and removed',
  containerNotRunning: 'No dev container running for this workspace',
  imagesPruned: 'Devcontainer images pruned',
  downComplete: 'Local dev environment stopped',

  // Remote (deploy)
  fetchingSecrets: 'Resolving deployment secrets from Infisical...',
  provisioningVps: 'Provisioning VPS via Hetzner API...',
  vpsExists: 'VPS already exists at {ip}',
  vpsCreated: 'VPS created at {ip}',
  installingK3s: 'Installing k3s on VPS...',
  k3sReady: 'k3s cluster ready',
  installingCoder: 'Installing Coder via Helm...',
  coderReady: 'Coder is running',
  installingInfisical: 'Installing Infisical via Helm...',
  configuringDns: 'Configuring DNS + TLS via Cloudflare Tunnel...',
  dnsConfigured: 'DNS configured: {domain}',
  buildingImage: 'Building and pushing workspace image...',
  imagePushed: 'Workspace image pushed to registry',
  pushingTemplate: 'Pushing Coder workspace template...',
  templatePushed: 'Coder template pushed successfully',
  creatingWorkspace: 'Creating first workspace...',
  workspaceReady: 'Workspace ready at {url}',
  dryRunDeploy: '[dry-run] Would provision VPS, install Coder, and create workspace',

  // Destroy (remote teardown)
  destroyConfirmRequired: 'Destroy is irreversible. Use --confirm to proceed.',
  destroyStarting: 'Destroying remote infrastructure...',
  destroyStep: 'Removing {step}...',
  destroyComplete: 'Remote infrastructure destroyed',

  // Push
  pushComplete: 'Coder template pushed successfully',
  coderNotAuthenticated: 'Coder CLI not authenticated. Run: coder login <CODER_URL>',

  // Exec
  execContainerNotFound: 'No running dev container found for this workspace',

  // Restart
  containerRestarting: 'Restarting dev container...',
  containerRestarted: 'Dev container restarted successfully',

  // Logs
  logsStreaming: 'Streaming container logs...',
  logsContainerNotFound: 'No running dev container found for this workspace',

  // Health check
  healthCheckPassed: 'Container health check passed',
  healthCheckFailed: 'Container health check failed',

  // Prebuild
  prebuildStarting: 'Prebuilding dev container image...',
  prebuildComplete: 'Prebuild complete — image cached for faster startup',

  // Env file generation
  envGenerating: 'Generating .env from Infisical...',
  envGenerated: '.env file generated successfully',
  envFailed: 'Failed to generate .env file. Is Infisical CLI configured?',

  // SSH
  sshConnecting: 'Connecting to remote workspace via SSH...',
  sshFailed: 'SSH connection failed. Is Coder CLI authenticated?',

  // Remote workspace lifecycle
  workspaceStopping: 'Stopping remote workspace...',
  workspaceStopped: 'Remote workspace stopped',
  workspaceStarting: 'Starting remote workspace...',
  workspaceStarted: 'Remote workspace started',

  // Destroy preview
  destroyPreviewHeader: 'The following resources will be destroyed:',
  destroyPreviewItem: '  ✗ {resource}',

  // Status
  statusHeader: 'Dev Environment Status',
  statusLocalSection: 'LOCAL',
  statusRemoteSection: 'REMOTE',
  statusSecretsSection: 'SECRETS',
  statusAvailable: '{tool} v{version}',
  statusMissing: '{tool} — not installed',
  statusOutdated:
    '{tool} v{current} (expected v{expected} — update in resist.config.ts, then: pnpm tool sync && ./bin/mise install)',
  statusContainerSection: 'CONTAINERS',
  statusContainerRunning: 'Local dev container: running ({status})',
  statusContainerStopped: 'Local dev container: not running',
  statusCoderWorkspace: 'Coder workspaces: {workspaces}',
};
