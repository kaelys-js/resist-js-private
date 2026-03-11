/**
 * Local CI Tool Runner
 *
 * Execution helpers for running CI workflows locally — act (GitHub Actions)
 * and gitlab-ci-local (GitLab CI). Handles command construction, Apple Silicon
 * detection, and streaming output.
 *
 * @module
 */

import * as v from 'valibot';

import type { BuiltLocalCiStrings } from '@/cli/tools/local-ci/locales/schema';
import {
  CommandSchema,
  type Bool,
  BoolSchema,
  type Command,
  type Str,
  StrSchema,
  VoidSchema,
  type Void,
} from '@/schemas/common';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';
import { execSyncBool, execSyncSafe } from '@/utils/core/shell';
import { log } from '@/utils/core/terminal';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Types
// =============================================================================

/** Schema for act run options. */
export const ActRunOptionsSchema = v.strictObject({
  /** Path to a specific workflow file (optional). */
  workflow: v.optional(StrSchema),
  /** Specific job ID to run (optional). */
  job: v.optional(StrSchema),
});

/** Inferred output type of {@link ActRunOptionsSchema}. */
export type ActRunOptions = v.InferOutput<typeof ActRunOptionsSchema>;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Detect if running on Apple Silicon (ARM64 macOS).
 * When true, act needs `--container-architecture linux/amd64` because
 * most GitHub Actions runner images are x86_64 only.
 *
 * @returns `Result<Bool>` — `true` if Apple Silicon detected.
 */
export function isAppleSilicon(): Result<Bool> {
  return ok(BoolSchema, process.arch === 'arm64' && process.platform === 'darwin');
}

/**
 * Build the full `act` command from options.
 *
 * @param opts - Act run options (workflow, job).
 * @param verbose - Whether to include `--verbose` flag.
 * @returns `Result<Command>` — the complete act command, or an error Result.
 */
export function buildActCommand(opts: ActRunOptions, verbose: Bool): Result<Command> {
  const parts: string[] = ['act'];

  // Apple Silicon: force x86_64 container architecture
  const armResult: Result<Bool> = isAppleSilicon();
  if (!armResult.ok) return armResult;
  if (armResult.data) {
    parts.push('--container-architecture');
    parts.push('linux/amd64');
  }

  // Specific workflow file
  if (opts.workflow) {
    const workflowParsed: Result<Str> = safeParse(StrSchema, opts.workflow);
    if (!workflowParsed.ok) return workflowParsed;
    parts.push('--workflows');
    parts.push(workflowParsed.data);
  }

  // Specific job
  if (opts.job) {
    const jobParsed: Result<Str> = safeParse(StrSchema, opts.job);
    if (!jobParsed.ok) return jobParsed;
    parts.push('--job');
    parts.push(jobParsed.data);
  }

  // Verbose output (conditional on CLI flag)
  if (verbose) {
    parts.push('--verbose');
  }

  return safeParse(CommandSchema, parts.join(' '));
}

// =============================================================================
// Secrets
// =============================================================================

/**
 * Generate a `.secrets` dotenv file from Infisical for act.
 * Non-fatal — if anything fails, act runs without secrets.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param siteUrl - Infisical server URL.
 * @param strings - Built locale strings for user messages.
 * @returns `Result<Void>` — always succeeds (non-fatal).
 */
function generateSecretsFromInfisical(
  workspaceRoot: Str,
  siteUrl: Str,
  strings: BuiltLocalCiStrings,
): Result<Void> {
  const cliCheckResult: Result<Command> = safeParse(CommandSchema, 'command -v infisical');
  if (!cliCheckResult.ok) return ok(VoidSchema, undefined);
  const cliExists: Result<Bool> = execSyncBool(cliCheckResult.data);
  if (!cliExists.ok || !cliExists.data) return ok(VoidSchema, undefined);

  const exportCmdResult: Result<Command> = safeParse(
    CommandSchema,
    `INFISICAL_API_URL=${siteUrl} infisical export --env=development --format=dotenv`,
  );
  if (!exportCmdResult.ok) return ok(VoidSchema, undefined); // Non-fatal
  const exportResult: Result<Str> = execSyncSafe(exportCmdResult.data);
  if (!exportResult.ok) return ok(VoidSchema, undefined); // Non-fatal

  const writeCmdResult: Result<Command> = safeParse(
    CommandSchema,
    `node -e "require('fs').writeFileSync('${workspaceRoot}/.secrets', Buffer.from('${Buffer.from(exportResult.data).toString('base64')}', 'base64').toString())"`,
  );
  if (!writeCmdResult.ok) return ok(VoidSchema, undefined); // Non-fatal
  const writeResult: Result<Str> = execSyncSafe(writeCmdResult.data);
  if (!writeResult.ok) return ok(VoidSchema, undefined); // Non-fatal

  const msg: Result<Str> = strings.secretsGenerated();
  if (!msg.ok) return msg;
  log.print(`  {dim}${msg.data}{/}`);

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Execution
// =============================================================================

/**
 * Run GitHub Actions workflows locally via act.
 *
 * act runs commands for real inside Docker containers. Deploy steps that
 * lack secrets fail with clear errors — this is expected. The tool now
 * propagates failure exit codes rather than swallowing them.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param opts - Act run options (workflow, job).
 * @param dryRun - Whether to print command without executing.
 * @param verbose - Whether to pass `--verbose` to act.
 * @param siteUrl - Infisical server URL for secrets generation.
 * @param strings - Built locale strings for user messages.
 * @returns `Result<Void>` — success or error.
 */
export async function runAct(
  workspaceRoot: Str,
  opts: ActRunOptions,
  dryRun: Bool,
  verbose: Bool,
  siteUrl: Str,
  strings: BuiltLocalCiStrings,
): Promise<Result<Void>> {
  // Generate .secrets from Infisical (non-fatal — act runs without secrets)
  generateSecretsFromInfisical(workspaceRoot, siteUrl, strings);

  // Build command
  const cmdResult: Result<Command> = buildActCommand(opts, verbose);
  if (!cmdResult.ok) return cmdResult;
  let commandStr: Str = cmdResult.data;

  // Add --secret-file if .secrets exists
  const secretsTestCmdResult: Result<Command> = safeParse(
    CommandSchema,
    `test -f ${workspaceRoot}/.secrets`,
  );
  if (secretsTestCmdResult.ok) {
    const secretsExist: Result<Bool> = execSyncBool(secretsTestCmdResult.data);
    if (secretsExist.ok && secretsExist.data) {
      commandStr = `${commandStr} --secret-file ${workspaceRoot}/.secrets` as Str;
    }
  }

  // Apple Silicon notice
  const armResult: Result<Bool> = isAppleSilicon();
  if (!armResult.ok) return armResult;
  if (armResult.data) {
    const armMsg: Result<Str> = strings.appleArmDetected();
    if (!armMsg.ok) return armMsg;
    log.print(`  {dim}${armMsg.data}{/}`);
  }

  // Log what we're doing
  if (opts.workflow) {
    const msg: Result<Str> = strings.runningWorkflow({ workflow: opts.workflow });
    if (!msg.ok) return msg;
    log.print(`{bold}${msg.data}{/}`);
  } else {
    const msg: Result<Str> = strings.runningAllWorkflows();
    if (!msg.ok) return msg;
    log.print(`{bold}${msg.data}{/}`);
  }
  if (opts.job) {
    const msg: Result<Str> = strings.runningJob({ job: opts.job });
    if (!msg.ok) return msg;
    log.print(`  {dim}${msg.data}{/}`);
  }

  // Dry-run: print command and exit
  if (dryRun) {
    const msg: Result<Str> = strings.dryRunAct({ command: commandStr });
    if (!msg.ok) return msg;
    log.print(`{dim}${msg.data}{/}`);
    return ok(VoidSchema, undefined);
  }

  // Execute act
  const startTime: number = Date.now();
  const runCmdResult: Result<Command> = safeParse(CommandSchema, commandStr);
  if (!runCmdResult.ok) return runCmdResult;
  const runResult: Result<Str> = execSyncSafe(runCmdResult.data);

  if (!runResult.ok) {
    const failMsg: Result<Str> = strings.runFailed();
    if (!failMsg.ok) return failMsg;
    log.print(`{red}{symbol:error}{/} ${failMsg.data}`);
    return err(ERRORS.IO.FETCH_FAILED, {
      meta: { reason: 'CI workflow execution failed' },
    });
  }

  const doneMsg: Result<Str> = strings.runComplete();
  if (!doneMsg.ok) return doneMsg;
  log.print(`{green}{symbol:success}{/} ${doneMsg.data}`);

  // Timing
  const elapsed: Str = ((Date.now() - startTime) / 1000).toFixed(1) as Str;
  const durationMsg: Result<Str> = strings.runDuration({ duration: elapsed });
  if (!durationMsg.ok) return durationMsg;
  log.print(`{dim}${durationMsg.data}{/}`);

  return ok(VoidSchema, undefined);
}

/**
 * List available workflows and their jobs via `act --list`.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param strings - Built locale strings for user messages.
 * @returns `Result<Str>` — act's list output, or error.
 */
export function listWorkflows(workspaceRoot: Str, strings: BuiltLocalCiStrings): Result<Str> {
  const headerMsg: Result<Str> = strings.listingWorkflows();
  if (!headerMsg.ok) return headerMsg;
  log.print(`\n{bold}{yellow}${headerMsg.data}{/}{/}`);

  const listCmdResult: Result<Command> = safeParse(CommandSchema, 'act --list');
  if (!listCmdResult.ok) return listCmdResult;
  const listResult: Result<Str> = execSyncSafe(listCmdResult.data);
  if (!listResult.ok) {
    const noWfMsg: Result<Str> = strings.noWorkflowsFound();
    if (!noWfMsg.ok) return noWfMsg;
    log.print(`  {dim}${noWfMsg.data}{/}`);
    return ok(StrSchema, '' as Str);
  }

  log.print(listResult.data);
  return ok(StrSchema, listResult.data);
}

/**
 * Lint workflow YAML files via actionlint.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param strings - Built locale strings for user messages.
 * @returns `Result<Void>` — success if all files pass, or error with lint output.
 */
export function lintWorkflows(workspaceRoot: Str, strings: BuiltLocalCiStrings): Result<Void> {
  const lintMsg: Result<Str> = strings.lintingWorkflows();
  if (!lintMsg.ok) return lintMsg;
  log.print(`{dim}${lintMsg.data}{/}`);

  const lintCmdResult: Result<Command> = safeParse(
    CommandSchema,
    `actionlint ${workspaceRoot}/.github/workflows/*.yml`,
  );
  if (!lintCmdResult.ok) return lintCmdResult;
  const lintResult: Result<Str> = execSyncSafe(lintCmdResult.data);

  if (!lintResult.ok) {
    const errorMessage: Str = (lintResult.error?.message ?? 'Unknown lint error') as Str;
    const failMsg: Result<Str> = strings.lintFailed({ output: errorMessage });
    if (!failMsg.ok) return failMsg;
    log.print(`{red}${failMsg.data}{/}`);
    return err(ERRORS.VALIDATION.SCHEMA_FAILED, { meta: { reason: 'Workflow lint errors found' } });
  }

  const passMsg: Result<Str> = strings.lintPassed();
  if (!passMsg.ok) return passMsg;
  log.print(`{green}{symbol:success}{/} ${passMsg.data}`);

  return ok(VoidSchema, undefined);
}

// =============================================================================
// GitLab CI Local Types
// =============================================================================

/** Schema for gitlab-ci-local run options. */
export const GitlabCiLocalRunOptionsSchema = v.strictObject({
  /** Specific job name to run (optional). */
  job: v.optional(StrSchema),
});

/** Inferred output type of {@link GitlabCiLocalRunOptionsSchema}. */
export type GitlabCiLocalRunOptions = v.InferOutput<typeof GitlabCiLocalRunOptionsSchema>;

// =============================================================================
// GitLab CI Local Helpers
// =============================================================================

/**
 * Build the full `gitlab-ci-local` command string from options.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param opts - gitlab-ci-local run options (job).
 * @returns `Result<Command>` — the complete command, or an error Result.
 */
export function buildGitlabCiLocalCommand(
  workspaceRoot: Str,
  opts: GitlabCiLocalRunOptions,
): Result<Command> {
  const parts: string[] = ['gitlab-ci-local'];

  // Specific job
  if (opts.job) {
    const jobParsed: Result<Str> = safeParse(StrSchema, opts.job);
    if (!jobParsed.ok) return jobParsed;
    parts.push('--job');
    parts.push(jobParsed.data);
  }

  // Mount workspace
  parts.push('--volume');
  parts.push(`${workspaceRoot}:/builds/project`);

  // Add --variables-file if .secrets exists
  const secretsTestCmdResult: Result<Command> = safeParse(
    CommandSchema,
    `test -f ${workspaceRoot}/.secrets`,
  );
  if (secretsTestCmdResult.ok) {
    const secretsExist: Result<Bool> = execSyncBool(secretsTestCmdResult.data);
    if (secretsExist.ok && secretsExist.data) {
      parts.push('--variables-file');
      parts.push(`${workspaceRoot}/.secrets`);
    }
  }

  return safeParse(CommandSchema, parts.join(' '));
}

// =============================================================================
// GitLab CI Local Execution
// =============================================================================

/**
 * Run GitLab CI jobs locally via gitlab-ci-local.
 *
 * gitlab-ci-local runs jobs inside Docker containers using the
 * `.gitlab-ci.yml` configuration. Jobs without proper secrets will
 * fail with clear errors — this is expected behavior in local mode.
 * The tool now propagates failure exit codes rather than swallowing them.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param opts - gitlab-ci-local run options (job).
 * @param dryRun - Whether to print command without executing.
 * @param siteUrl - Infisical server URL for secrets generation.
 * @param strings - Built locale strings for user messages.
 * @returns `Result<Void>` — success or error.
 */
export async function runGitlabCiLocal(
  workspaceRoot: Str,
  opts: GitlabCiLocalRunOptions,
  dryRun: Bool,
  siteUrl: Str,
  strings: BuiltLocalCiStrings,
): Promise<Result<Void>> {
  // Generate .secrets from Infisical (non-fatal)
  generateSecretsFromInfisical(workspaceRoot, siteUrl, strings);

  // Build command
  const cmdResult: Result<Command> = buildGitlabCiLocalCommand(workspaceRoot, opts);
  if (!cmdResult.ok) return cmdResult;
  const command: Str = cmdResult.data;

  // Log what we're doing
  if (opts.job) {
    const msg: Result<Str> = strings.runningGitlabJob({ job: opts.job });
    if (!msg.ok) return msg;
    log.print(`{bold}${msg.data}{/}`);
  } else {
    const msg: Result<Str> = strings.runningAllGitlabJobs();
    if (!msg.ok) return msg;
    log.print(`{bold}${msg.data}{/}`);
  }

  // Dry-run: print command and exit
  if (dryRun) {
    const msg: Result<Str> = strings.dryRunGitlabCiLocal({ command });
    if (!msg.ok) return msg;
    log.print(`{dim}${msg.data}{/}`);
    return ok(VoidSchema, undefined);
  }

  // Execute gitlab-ci-local
  const startTime: number = Date.now();
  const runCmdResult: Result<Command> = safeParse(CommandSchema, command);
  if (!runCmdResult.ok) return runCmdResult;
  const runResult: Result<Str> = execSyncSafe(runCmdResult.data);

  if (!runResult.ok) {
    const failMsg: Result<Str> = strings.gitlabRunFailed();
    if (!failMsg.ok) return failMsg;
    log.print(`{red}{symbol:error}{/} ${failMsg.data}`);
    return err(ERRORS.IO.FETCH_FAILED, {
      meta: { reason: 'GitLab CI execution failed' },
    });
  }

  const doneMsg: Result<Str> = strings.gitlabRunComplete();
  if (!doneMsg.ok) return doneMsg;
  log.print(`{green}{symbol:success}{/} ${doneMsg.data}`);

  // Timing
  const elapsed: Str = ((Date.now() - startTime) / 1000).toFixed(1) as Str;
  const durationMsg: Result<Str> = strings.gitlabRunDuration({ duration: elapsed });
  if (!durationMsg.ok) return durationMsg;
  log.print(`{dim}${durationMsg.data}{/}`);

  return ok(VoidSchema, undefined);
}

/**
 * List available GitLab CI jobs via `gitlab-ci-local --list`.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param strings - Built locale strings for user messages.
 * @returns `Result<Str>` — job list output, or error.
 */
export function listGitlabJobs(workspaceRoot: Str, strings: BuiltLocalCiStrings): Result<Str> {
  const headerMsg: Result<Str> = strings.listingGitlabJobs();
  if (!headerMsg.ok) return headerMsg;
  log.print(`\n{bold}{yellow}${headerMsg.data}{/}{/}`);

  const listCmdResult: Result<Command> = safeParse(CommandSchema, 'gitlab-ci-local --list');
  if (!listCmdResult.ok) return listCmdResult;
  const listResult: Result<Str> = execSyncSafe(listCmdResult.data);
  if (!listResult.ok) {
    const noJobsMsg: Result<Str> = strings.noGitlabJobsFound();
    if (!noJobsMsg.ok) return noJobsMsg;
    log.print(`  {dim}${noJobsMsg.data}{/}`);
    return ok(StrSchema, '' as Str);
  }

  log.print(listResult.data);
  return ok(StrSchema, listResult.data);
}

/**
 * Validate `.gitlab-ci.yml` syntax via `gitlab-ci-local --list`.
 * The `--list` command validates syntax as a side effect — if the YAML
 * is invalid, it exits non-zero with error output.
 *
 * @param workspaceRoot - Absolute path to workspace root.
 * @param strings - Built locale strings for user messages.
 * @returns `Result<Void>` — success if valid, or error with validation output.
 */
export function validateGitlabCi(workspaceRoot: Str, strings: BuiltLocalCiStrings): Result<Void> {
  const lintMsg: Result<Str> = strings.validatingGitlabCi();
  if (!lintMsg.ok) return lintMsg;
  log.print(`{dim}${lintMsg.data}{/}`);

  const validateCmdResult: Result<Command> = safeParse(CommandSchema, 'gitlab-ci-local --list');
  if (!validateCmdResult.ok) return validateCmdResult;
  const validateResult: Result<Str> = execSyncSafe(validateCmdResult.data);

  if (!validateResult.ok) {
    const errorMessage: Str = (validateResult.error?.message ?? 'Unknown validation error') as Str;
    const failMsg: Result<Str> = strings.gitlabValidationFailed({ output: errorMessage });
    if (!failMsg.ok) return failMsg;
    log.print(`{red}${failMsg.data}{/}`);
    return err(ERRORS.VALIDATION.SCHEMA_FAILED, {
      meta: { reason: 'GitLab CI validation errors found' },
    });
  }

  const passMsg: Result<Str> = strings.gitlabValidationPassed();
  if (!passMsg.ok) return passMsg;
  log.print(`{green}{symbol:success}{/} ${passMsg.data}`);

  return ok(VoidSchema, undefined);
}
