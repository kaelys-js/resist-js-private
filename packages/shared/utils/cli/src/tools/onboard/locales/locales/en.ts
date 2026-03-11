/**
 * Onboard English Strings
 *
 * @module
 */

import type { OnboardStrings } from '@/cli/tools/onboard/locales/schema';

const SEPARATOR_LENGTH = 50;

/** English strings for onboard. */
export const en: OnboardStrings = {
  name: 'onboard',
  description: 'Set up the development environment',

  flags: {},

  examples: [
    { command: '{pmTool} onboard', description: 'Run full setup after cloning' },
    { command: '{pmTool} onboard --dry-run', description: 'Preview steps without executing' },
    { command: '{pmTool} onboard --verbose', description: 'Show detailed debug output' },
  ],

  exitCodes: [
    { code: 0, description: 'Success - environment setup complete' },
    { code: 1, description: 'Failure - a setup step failed' },
    { code: 2, description: 'Invalid usage - bad flags or arguments' },
    { code: 3, description: 'Unexpected fatal error' },
    { code: 130, description: 'Interrupted - received SIGINT (Ctrl+C)' },
  ],

  // Headers
  header: 'Development Environment Setup',
  separator: '═'.repeat(SEPARATOR_LENGTH),
  sectionPrerequisites: 'Checking Prerequisites',
  sectionSetup: 'Running Setup Steps',
  sectionComplete: 'Setup Complete!',

  // Mise (handleMise)
  checkingMise: 'Checking for workspace-local mise',
  miseFound: 'mise is installed at correct version',
  miseNotFound: 'mise not found — installing',
  miseInstalled: 'mise installed successfully',
  miseUpdated: 'mise updated to pinned version',
  // Mise tools (handleMiseInstall)
  installingMiseTools: 'Installing system tools via mise',
  miseToolsInstalled: 'All system tools installed at pinned versions',
  miseReshimFailed:
    'Failed to generate mise shims — tools may not be on PATH until you run: ./bin/mise reshim',

  // Steps
  runningStep: 'Running: {step}',
  stepSucceeded: 'Completed: {step}',
  stepFailed: 'Failed: {step}',

  // Dry run
  dryRunPrefix: '[DRY RUN]',
  dryRunSkipping: 'Would run: {step}',
  dryRunPreviewMode: 'Preview mode - no changes will be made',
  dryRunMiseCheck: 'Would check/install mise',
  dryRunMiseInstall: 'Would run ./bin/mise install',

  // Debug
  debugOptions: 'Options: dryRun={dryRun}',

  // Next steps (completion box)
  readyToDevHeader: 'Ready to start developing!',
  inTwoTerminals: 'Open two terminals and run:',
  stepDevDescription: 'Start all dev servers',
  stepProxyDescription: 'Start HTTPS proxy',
};
