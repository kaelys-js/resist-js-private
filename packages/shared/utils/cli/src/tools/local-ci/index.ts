#!/usr/bin/env tsx

/**
 * Local CI CLI Tool
 *
 * Run CI workflows locally — act (GitHub Actions) or gitlab-ci-local (GitLab CI).
 * Validates workflow/CI config files, lists available workflows/jobs, checks prerequisites.
 *
 * Usage: `<pm> tool local-ci <action> [flags]`
 *
 * Actions:
 * - `run` — run workflows/jobs locally (default)
 * - `lint` — validate workflow/CI config files
 * - `list` — list available workflows and their jobs
 * - `status` — check prerequisites (Docker, runner tools)
 *
 * @module
 */

import * as v from 'valibot';

import type { CommandContext } from '@/cli/schemas';
import { TOOL_FLAG_DEFS } from '@/cli/tools/local-ci/flags';
import type { BuiltLocalCiStrings } from '@/cli/tools/local-ci/locales/schema';
import {
  checkCiStatus,
  checkGitlabCiStatus,
  ensureCiPrerequisites,
  ensureGitlabPrerequisites,
} from '@/cli/tools/local-ci/utils/prerequisites';
import {
  lintWorkflows,
  listGitlabJobs,
  listWorkflows,
  runAct,
  runGitlabCiLocal,
  validateGitlabCi,
} from '@/cli/tools/local-ci/utils/runner';
import { createCommand } from '@/cli/utils/command';
import { getConfig } from '@/config/loader';
import { VoidSchema, type Bool, type NullableStr, type Str, type Void } from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';
import type { DeepReadonly } from '@/utils/core/object';
import { log } from '@/utils/core/terminal';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Schemas
// =============================================================================

/** Valid local-ci actions. */
const ActionSchema = v.picklist(['run', 'lint', 'list', 'status']);

/** Inferred output type of {@link ActionSchema}. */
type Action = v.InferOutput<typeof ActionSchema>;

// =============================================================================
// GitHub Subcommand Handlers
// =============================================================================

/**
 * Handle `local-ci run` for GitHub — run workflows locally via act.
 *
 * @param cwd - Workspace root path.
 * @param workflow - Optional workflow file path.
 * @param job - Optional job ID.
 * @param dryRun - Whether to preview without executing.
 * @param verbose - Whether to pass `--verbose` to act.
 * @param siteUrl - Infisical server URL.
 * @param strings - Built locale strings for user messages.
 * @returns `Result<Void>` — success or error.
 */
async function handleGithubRun(
  cwd: Str,
  workflow: NullableStr,
  job: NullableStr,
  dryRun: Bool,
  verbose: Bool,
  siteUrl: Str,
  strings: BuiltLocalCiStrings,
): Promise<Result<Void>> {
  const prereqResult: Result<Void> = await ensureCiPrerequisites(cwd, strings);
  if (!prereqResult.ok) return prereqResult;

  const runResult: Result<Void> = await runAct(
    cwd,
    { workflow: workflow ?? undefined, job: job ?? undefined },
    dryRun,
    verbose,
    siteUrl,
    strings,
  );
  if (!runResult.ok) return runResult;

  return ok(VoidSchema, undefined);
}

/**
 * Handle `local-ci lint` for GitHub — lint workflow YAML files via actionlint.
 *
 * @param cwd - Workspace root path.
 * @param strings - Built locale strings for user messages.
 * @returns `Result<Void>` — success or error.
 */
async function handleGithubLint(cwd: Str, strings: BuiltLocalCiStrings): Promise<Result<Void>> {
  const prereqResult: Result<Void> = await ensureCiPrerequisites(cwd, strings);
  if (!prereqResult.ok) return prereqResult;

  const lintResult: Result<Void> = lintWorkflows(cwd, strings);
  if (!lintResult.ok) return lintResult;

  return ok(VoidSchema, undefined);
}

/**
 * Handle `local-ci list` for GitHub — list available workflows and their jobs.
 *
 * @param cwd - Workspace root path.
 * @param strings - Built locale strings for user messages.
 * @returns `Result<Void>` — success or error.
 */
async function handleGithubList(cwd: Str, strings: BuiltLocalCiStrings): Promise<Result<Void>> {
  const prereqResult: Result<Void> = await ensureCiPrerequisites(cwd, strings);
  if (!prereqResult.ok) return prereqResult;

  const listResult: Result<Str> = listWorkflows(cwd, strings);
  if (!listResult.ok) return listResult;

  return ok(VoidSchema, undefined);
}

/**
 * Handle `local-ci status` for GitHub — check prerequisites and print status.
 *
 * @param cwd - Workspace root path.
 * @param strings - Built locale strings for user messages.
 * @returns `Result<Void>` — success or error.
 */
async function handleGithubStatus(cwd: Str, strings: BuiltLocalCiStrings): Promise<Result<Void>> {
  const statusResult: Result<Void> = checkCiStatus(cwd, strings);
  if (!statusResult.ok) return statusResult;

  return ok(VoidSchema, undefined);
}

// =============================================================================
// GitLab Subcommand Handlers
// =============================================================================

/**
 * Handle `local-ci run` for GitLab — run jobs locally via gitlab-ci-local.
 *
 * @param cwd - Workspace root path.
 * @param job - Optional job name.
 * @param dryRun - Whether to preview without executing.
 * @param siteUrl - Infisical server URL.
 * @param strings - Built locale strings for user messages.
 * @returns `Result<Void>` — success or error.
 */
async function handleGitlabRun(
  cwd: Str,
  job: NullableStr,
  dryRun: Bool,
  siteUrl: Str,
  strings: BuiltLocalCiStrings,
): Promise<Result<Void>> {
  const prereqResult: Result<Void> = await ensureGitlabPrerequisites(cwd, strings);
  if (!prereqResult.ok) return prereqResult;

  const runResult: Result<Void> = await runGitlabCiLocal(
    cwd,
    { job: job ?? undefined },
    dryRun,
    siteUrl,
    strings,
  );
  if (!runResult.ok) return runResult;

  return ok(VoidSchema, undefined);
}

/**
 * Handle `local-ci lint` for GitLab — validate .gitlab-ci.yml syntax.
 *
 * @param cwd - Workspace root path.
 * @param strings - Built locale strings for user messages.
 * @returns `Result<Void>` — success or error.
 */
async function handleGitlabLint(cwd: Str, strings: BuiltLocalCiStrings): Promise<Result<Void>> {
  const prereqResult: Result<Void> = await ensureGitlabPrerequisites(cwd, strings);
  if (!prereqResult.ok) return prereqResult;

  const validateResult: Result<Void> = validateGitlabCi(cwd, strings);
  if (!validateResult.ok) return validateResult;

  return ok(VoidSchema, undefined);
}

/**
 * Handle `local-ci list` for GitLab — list available CI jobs.
 *
 * @param cwd - Workspace root path.
 * @param strings - Built locale strings for user messages.
 * @returns `Result<Void>` — success or error.
 */
async function handleGitlabList(cwd: Str, strings: BuiltLocalCiStrings): Promise<Result<Void>> {
  const prereqResult: Result<Void> = await ensureGitlabPrerequisites(cwd, strings);
  if (!prereqResult.ok) return prereqResult;

  const listResult: Result<Str> = listGitlabJobs(cwd, strings);
  if (!listResult.ok) return listResult;

  return ok(VoidSchema, undefined);
}

/**
 * Handle `local-ci status` for GitLab — check prerequisites and print status.
 *
 * @param cwd - Workspace root path.
 * @param strings - Built locale strings for user messages.
 * @returns `Result<Void>` — success or error.
 */
async function handleGitlabStatus(cwd: Str, strings: BuiltLocalCiStrings): Promise<Result<Void>> {
  const statusResult: Result<Void> = checkGitlabCiStatus(cwd, strings);
  if (!statusResult.ok) return statusResult;

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Command Definition
// =============================================================================

/** CLI command instance for the local-ci tool. */
const command = createCommand<BuiltLocalCiStrings>({
  id: 'local-ci',
  version: '2.0.0',
  runtimes: ['node-tty', 'node-pipe'],
  flagDefs: TOOL_FLAG_DEFS,

  /**
   * Route to provider-specific subcommand handler based on git provider
   * and first positional argument.
   *
   * @param ctx - Command context with args, flags, locale.
   * @returns `Result<Void>` — success or error from subcommand.
   */
  handler: async (ctx: CommandContext<BuiltLocalCiStrings>): Promise<Result<Void>> => {
    const strings: BuiltLocalCiStrings = ctx.locale.command;

    // 1. Load config
    const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
    if (!configResult.ok) return configResult;
    const config: DeepReadonly<CoreConfig> = configResult.data;

    // 2. Check if CI is enabled
    if (!config.tooling.ci.enabled) {
      const msg: Result<Str> = strings.ciDisabled();
      if (!msg.ok) return msg;
      log.print(`{dim}${msg.data}{/}`);
      return ok(VoidSchema, undefined);
    }

    // 3. Read flags (typeof narrowing — no `as` casts)
    const options = ctx.options;
    const dryRun: Bool = options.dryRun;
    const verbose: Bool = options.verbose;
    const workflow: NullableStr = typeof options.workflow === 'string' ? options.workflow : null;
    const job: NullableStr = typeof options.job === 'string' ? options.job : null;
    const jsonMode: Bool = options.json === true;
    const filterValue: NullableStr = typeof options.filter === 'string' ? options.filter : null;

    // 4. Read config values
    const provider: Str = config.tooling.gitProvider.provider;
    const siteUrl: Str = config.tooling.infisical.siteUrl;

    // 5. Validate action
    const rawAction: Str = ctx.args[0] ?? 'run';
    const actionResult: Result<Action> = safeParse(ActionSchema, rawAction);
    if (!actionResult.ok) {
      return err(ERRORS.VALIDATION.SCHEMA_FAILED, {
        meta: { reason: `Unknown action: ${rawAction}. Expected: run, lint, list, status` },
      });
    }
    const action: Action = actionResult.data;

    // 6. Dispatch to provider-specific handler
    if (provider === 'gitlab') {
      switch (action) {
        case 'run':
          return handleGitlabRun(ctx.cwd, job, dryRun, siteUrl, strings);
        case 'lint':
          return handleGitlabLint(ctx.cwd, strings);
        case 'list':
          return handleGitlabList(ctx.cwd, strings);
        case 'status':
          return handleGitlabStatus(ctx.cwd, strings);
      }
    } else if (provider === 'github') {
      switch (action) {
        case 'run':
          return handleGithubRun(ctx.cwd, workflow, job, dryRun, verbose, siteUrl, strings);
        case 'lint':
          return handleGithubLint(ctx.cwd, strings);
        case 'list':
          return handleGithubList(ctx.cwd, strings);
        case 'status':
          return handleGithubStatus(ctx.cwd, strings);
      }
    } else {
      // Unsupported provider — warn and exit
      const msg: Result<Str> = strings.providerNotSupported({ provider });
      if (!msg.ok) return msg;
      log.print(`{dim}${msg.data}{/}`);
      return ok(VoidSchema, undefined);
    }
  },
});

export { command };
export default command;
