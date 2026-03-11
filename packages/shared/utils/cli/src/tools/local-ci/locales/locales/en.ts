/**
 * Local CI Tool English Strings
 *
 * @module
 */

import type { LocalCiStrings } from '@/cli/tools/local-ci/locales/schema';

/** English strings for the local-ci tool. */
export const en: LocalCiStrings = {
  name: 'local-ci',
  description: 'Run CI workflows locally: execute, lint, list, and audit prerequisites',

  flags: {
    workflow: 'Path to a specific workflow file to run',
    job: 'Specific job ID to run from the workflow',
    json: 'Output results in JSON format for CI/scripting',
    filter: 'Filter workflows/jobs by substring match',
  },

  examples: [
    {
      command: '{pmTool} local-ci run',
      description: 'Run all workflows locally',
    },
    {
      command: '{pmTool} local-ci run -j lint-and-test',
      description: 'Run only the lint-and-test job',
    },
    {
      command: '{pmTool} local-ci run -w .github/workflows/ci.yml',
      description: 'Run a specific workflow file',
    },
    {
      command: '{pmTool} local-ci lint',
      description: 'Lint all workflow YAML files with actionlint',
    },
    {
      command: '{pmTool} local-ci list',
      description: 'List available workflows and jobs',
    },
    {
      command: '{pmTool} local-ci status',
      description: 'Check CI prerequisites (Docker, act, actionlint)',
    },
    {
      command: '{pmTool} local-ci list --json',
      description: 'List workflows as JSON for scripting',
    },
    {
      command: '{pmTool} local-ci run --filter ci',
      description: 'Run only workflows matching "ci"',
    },
  ],

  exitCodes: [
    { code: 0, description: 'Completed successfully' },
    { code: 1, description: 'Workflow failed or prerequisite missing' },
    { code: 2, description: 'Invalid command usage or arguments' },
    { code: 3, description: 'Unexpected fatal error' },
    { code: 130, description: 'Operation interrupted by user (Ctrl+C)' },
  ],

  // Provider
  providerNotSupported:
    'local-ci only supports GitHub Actions (current provider: {provider}). Skipping.',

  // CI Disabled
  ciDisabled: 'Local CI is disabled in config (tooling.ci.enabled = false). Skipping.',

  // Prerequisites
  checkingPrereqs: 'Checking CI prerequisites...',
  dockerNotReady: 'Docker is not running. Start Docker Desktop and try again.',
  actNotFound: 'act is not installed. Installing via mise...',
  actInstalling: 'Installing act via mise...',
  actInstalled: 'act v{version} installed',
  actionlintNotFound: 'actionlint is not installed. Installing via mise...',
  actionlintInstalling: 'Installing actionlint via mise...',
  actrcNotFound: '.actrc not found. Run sync first: pnpm tool sync',

  // Run
  runningWorkflow: 'Running workflow: {workflow}',
  runningAllWorkflows: 'Running all workflows...',
  runningJob: 'Running job: {job}',
  runComplete: 'Workflow run complete',
  runFailed: 'Workflow run failed',
  appleArmDetected: 'Apple Silicon detected — using --container-architecture linux/amd64',
  dryRunAct: '[dry-run] Would execute: {command}',

  // Lint
  lintingWorkflows: 'Linting workflow files with actionlint...',
  lintPassed: 'All workflow files passed lint checks',
  lintFailed: 'Workflow lint errors:\n{output}',

  // List
  listingWorkflows: 'Available workflows and jobs:',
  noWorkflowsFound: 'No workflow files found in .github/workflows/',

  // Secrets
  secretsGenerated: 'Generated .secrets from Infisical for act',

  // Status
  statusHeader: 'CI Environment Status',
  statusDockerReady: 'Docker is running',
  statusDockerNotReady: 'Docker is not running',
  statusToolAvailable: '{tool} v{version}',
  statusToolMissing: '{tool} — not installed',
  statusActrcFound: '.actrc exists',
  statusActrcMissing: '.actrc not found (run sync)',
  statusWorkflowsFound: '{count} workflow file(s) found',
  statusNoWorkflows: 'No workflow files found',

  // GitLab Prerequisites
  gitlabCiLocalNotFound: 'gitlab-ci-local is not installed. Installing via mise...',
  gitlabCiLocalInstalling: 'Installing gitlab-ci-local via mise...',
  gitlabCiLocalInstalled: 'gitlab-ci-local v{version} installed',
  gitlabCiYmlNotFound: '.gitlab-ci.yml not found. Run sync first to generate it.',

  // GitLab Run
  runningGitlabJob: 'Running GitLab CI job: {job}',
  runningAllGitlabJobs: 'Running all GitLab CI jobs...',
  gitlabRunComplete: 'GitLab CI run complete',
  gitlabRunFailed: 'GitLab CI run failed',
  dryRunGitlabCiLocal: '[dry-run] Would execute: {command}',

  // GitLab Lint
  validatingGitlabCi: 'Validating .gitlab-ci.yml with gitlab-ci-local...',
  gitlabValidationPassed: '.gitlab-ci.yml is valid',
  gitlabValidationFailed: 'GitLab CI validation errors:\n{output}',

  // GitLab List
  listingGitlabJobs: 'Available GitLab CI jobs:',
  noGitlabJobsFound: 'No jobs found in .gitlab-ci.yml',

  // GitLab Status
  statusGitlabCiYmlFound: '.gitlab-ci.yml exists',
  statusGitlabCiYmlMissing: '.gitlab-ci.yml not found (run sync)',
  statusGitlabJobsFound: '{count} job(s) found',
  statusNoGitlabJobs: 'No jobs found in .gitlab-ci.yml',

  // Timing
  runDuration: 'Completed in {duration}s',
  gitlabRunDuration: 'Completed in {duration}s',

  // Filter
  filterActive: 'Filter active: "{filter}" ({matched}/{total} matched)',
};
