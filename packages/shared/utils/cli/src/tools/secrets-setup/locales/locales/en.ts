/**
 * Secrets Setup English Strings
 *
 * @module
 */

import type { SecretsSetupStrings } from '@/cli/tools/secrets-setup/locales/schema';

/** English strings for the secrets-setup tool. */
export const en: SecretsSetupStrings = {
  name: 'secrets-setup',
  description: 'Set up self-hosted Infisical secrets management',

  flags: {
    skipLogin: 'Skip interactive login (for CI or re-provisioning)',
    reset: 'Tear down Infisical setup (stop containers, remove config, logout)',
  },

  examples: [
    { command: '{pmTool} secrets-setup', description: 'Run secrets setup wizard' },
    {
      command: '{pmTool} secrets-setup --skip-login',
      description: 'Re-provision without re-authenticating',
    },
    {
      command: '{pmTool} secrets-setup --reset',
      description: 'Tear down local or remote Infisical setup',
    },
  ],

  exitCodes: [
    { code: 0, description: 'Completed successfully' },
    { code: 1, description: 'Setup failed or prerequisite missing' },
  ],

  // CLI check
  checkingCli: 'Checking for Infisical CLI...',
  cliFound: 'Infisical CLI found (v{version})',
  cliInstalling: 'Installing Infisical CLI via mise...',
  cliInstalled: 'Infisical CLI installed successfully',
  cliInstallFailed: 'Failed to install Infisical CLI. Run: ./bin/mise install infisical',

  // Mode detection
  detectedBootstrapMode: 'Bootstrap mode — no VPS deployed yet, starting local Infisical server',
  detectedConnectMode: 'Connect mode — authenticating against {siteUrl}',

  // Server env (bootstrap only)
  generatingEnvFile: 'Generating .env.infisical with encryption keys...',
  envFileExists: '.env.infisical already exists, skipping generation',
  envFileGenerated: '.env.infisical generated successfully',

  // Server management (bootstrap only)
  checkingServer: 'Checking Infisical server status...',
  serverRunning: 'Infisical server is already running',
  serverStarting: 'Starting local Infisical server via Docker Compose...',
  serverStarted: 'Infisical server started',
  serverStartFailed: 'Failed to start Infisical server. Is Docker running?',
  waitingForServer: 'Waiting for Infisical server to be ready...',
  serverReady: 'Infisical server is ready',

  // Authentication
  authenticating: 'Authenticating with Infisical...',
  loginSuccess: 'Authenticated successfully',
  loginSkipped: 'Login skipped (--skip-login)',

  // Auto-provisioning (bootstrap only)
  provisioningStructure: 'Auto-provisioning Infisical project structure from resist.config.ts...',
  creatingProject: 'Creating project: {name}',
  projectCreated: 'Project created: {name} (ID: {id})',
  creatingFolder: 'Creating folder {path} in project {project}',
  creatingMachineIdentity: 'Creating machine identity: {name}',
  machineIdentityCreated: 'Machine identity created: {name}',
  ciCredentialsPrint:
    'CI credentials — add these to GitHub repo secrets:\n  INFISICAL_CLIENT_ID={clientId}\n  INFISICAL_CLIENT_SECRET={clientSecret}',
  promptSecretValue: 'Enter {key} ({path}, press Enter to skip):',
  secretSet: '{key} set',
  secretSkipped: '{key} skipped',
  provisioningComplete: 'Provisioning complete',

  // .infisical.json config
  configExists: '.infisical.json already exists',
  configWritten: '.infisical.json written (commit this file to git)',

  // VPS deploy prompt (bootstrap only)
  promptDeployVps: 'Deploy Coder VPS + Infisical now? (y/N)',
  deployingVps: 'Deploying VPS...',
  deployVpsComplete: 'VPS deployed successfully',
  deployVpsFailed: 'VPS deployment failed (non-fatal — you can run pnpm devenv:deploy later)',
  deployVpsSkipped: 'VPS deployment skipped — run pnpm devenv:deploy when ready',
  updateSiteUrlReminder:
    'Update tooling.infisical.siteUrl in resist.config.ts to your VPS domain and commit',

  // Reset
  resetStoppingContainers: 'Stopping Docker containers...',
  resetContainersStopped: 'Docker containers stopped',
  resetFileRemoved: 'Removed {path}',
  resetBootstrapComplete: 'Reset complete — local Infisical setup removed',
  resetLoggingOut: 'Logging out of Infisical...',
  resetLoggedOut: 'Logged out of Infisical',
  resetConnectComplete: 'Reset complete — disconnected from remote Infisical',
  resetReconnectHint: 'Run `pnpm tool secrets-setup` to reconnect',

  // Test
  testingConnection: 'Testing Infisical connection...',
  testSuccess: 'Connection test passed',
  testFailed: 'Connection test failed. Check server status and authentication.',

  // Complete
  setupComplete: 'Secrets setup complete',
};
