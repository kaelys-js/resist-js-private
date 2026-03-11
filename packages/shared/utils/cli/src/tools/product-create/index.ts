#!/usr/bin/env tsx
/**
 * Product Create Tool
 *
 * Scaffolds a new product from the template directory.
 * Validates the product name, copies the template into
 * `packages/products/<name>/`, and prints next-step instructions.
 *
 * Usage: `<pm> tool product-create --product <name>`
 *
 * @module
 */

import type { CommandContext } from '@/cli/schemas';
import { TOOL_FLAG_DEFS } from '@/cli/tools/product-create/flags';
import type { BuiltProductCreateStrings } from '@/cli/tools/product-create/locales/schema';
import { createCommand } from '@/cli/utils/command';
import { requireOnboarding } from '@/cli/utils/core';
import { getConfig } from '@/config/loader';
import {
  PathSchema,
  StrSchema,
  VoidSchema,
  type Bool,
  type EnsureWorkspaceRootResult,
  type Path,
  type Str,
  type SupportedRuntimes,
  type Void,
} from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';
import { copyDir } from '@/utils/core/fs';
import type { DeepReadonly } from '@/utils/core/object';
import { joinPath, pathExists } from '@/utils/core/path';
import { log } from '@/utils/core/terminal';
import { ensureWorkspaceRoot } from '@/utils/core/workspace';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Core Logic
// =============================================================================

/**
 * Validate that the template directory exists and the target does not.
 *
 * @param strings - Locale strings for error messages.
 * @param templateDir - Path to the product template directory (validated as Path).
 * @param targetDir - Path where the new product will be created (validated as Path).
 * @param productName - Validated product name (validated as non-empty Str).
 * @returns `Result<Void>` — success, or an error if paths are invalid.
 */
function validatePaths(
  strings: BuiltProductCreateStrings,
  templateDir: Path,
  targetDir: Path,
  productName: Str,
): Result<Void> {
  const templateResult: Result<Path> = safeParse(PathSchema, templateDir);
  if (!templateResult.ok) return templateResult;
  const targetResult: Result<Path> = safeParse(PathSchema, targetDir);
  if (!targetResult.ok) return targetResult;
  const nameResult: Result<Str> = safeParse(StrSchema, productName);
  if (!nameResult.ok) return nameResult;

  const templateExistsResult: Result<Bool> = pathExists(templateResult.data);
  if (!templateExistsResult.ok) return templateExistsResult;
  if (!templateExistsResult.data) {
    return err(ERRORS.IO.READDIR_FAILED, { meta: { path: templateResult.data } });
  }

  const targetExistsResult: Result<Bool> = pathExists(targetResult.data);
  if (!targetExistsResult.ok) return targetExistsResult;
  if (targetExistsResult.data) {
    return err(ERRORS.IO.COPY_FAILED, { meta: { product: nameResult.data } });
  }

  return ok(VoidSchema, undefined);
}

/**
 * Copy the product template directory to the target location.
 *
 * @param strings - Locale strings for progress messages.
 * @param templateDir - Path to the product template directory (validated as Path).
 * @param targetDir - Path where the new product will be created (validated as Path).
 * @returns `Result<Void>` — success, or an error if copy fails.
 */
function copyTemplate(
  strings: BuiltProductCreateStrings,
  templateDir: Path,
  targetDir: Path,
): Result<Void> {
  const templateResult: Result<Path> = safeParse(PathSchema, templateDir);
  if (!templateResult.ok) return templateResult;
  const targetResult: Result<Path> = safeParse(PathSchema, targetDir);
  if (!targetResult.ok) return targetResult;

  const msg: Result<Str> = strings.copyingTemplate();
  if (!msg.ok) return msg;
  log.print(`  {symbol:info} ${msg.data}`);

  const result: Result<Void> = copyDir(templateResult.data, targetResult.data);
  if (!result.ok) return result;

  return ok(VoidSchema, undefined);
}

/**
 * Print success message with next-step instructions.
 *
 * @param strings - Locale strings for messages.
 * @param productName - The created product name.
 * @param targetDir - Path to the created product directory.
 * @param config - Global config (for dynamic paths in messages).
 * @returns `Result<Void>` — success, or a locale error.
 */
function printSuccess(
  strings: BuiltProductCreateStrings,
  productName: Str,
  targetDir: Path,
  config: DeepReadonly<CoreConfig>,
): Result<Void> {
  const successMsg: Result<Str> = strings.success({ name: productName });
  if (!successMsg.ok) return successMsg;
  const projectPathMsg: Result<Str> = strings.projectPath({ path: targetDir });
  if (!projectPathMsg.ok) return projectPathMsg;
  const nextStepsHeaderMsg: Result<Str> = strings.nextStepsHeader();
  if (!nextStepsHeaderMsg.ok) return nextStepsHeaderMsg;
  const stepInstallMsg: Result<Str> = strings.stepInstall();
  if (!stepInstallMsg.ok) return stepInstallMsg;
  const stepCdMsg: Result<Str> = strings.stepCd({
    name: productName,
    productsDir: config.tooling.paths.productsDir,
  });
  if (!stepCdMsg.ok) return stepCdMsg;
  const stepConfigMsg: Result<Str> = strings.stepConfig();
  if (!stepConfigMsg.ok) return stepConfigMsg;
  const hintDevProxyMsg: Result<Str> = strings.hintDevProxy();
  if (!hintDevProxyMsg.ok) return hintDevProxyMsg;

  log.print('');
  log.print(`  {green}{symbol:success}{/} ${successMsg.data}`);
  log.print(`  ${projectPathMsg.data}`);

  log.print(`{bold}{yellow}${nextStepsHeaderMsg.data}{/}{/}`);
  log.print(`  ${stepInstallMsg.data}`);
  log.print(`  ${stepCdMsg.data}`);
  log.print(`  ${stepConfigMsg.data}`);
  log.print('');
  log.print(`{dim}${hintDevProxyMsg.data}{/}`);
  log.print('');

  return ok(VoidSchema, undefined);
}

/**
 * Print dry-run preview of what would be created.
 *
 * @param strings - Locale strings for messages.
 * @param productName - The product name that would be created.
 * @param templateDir - Path to the source template directory.
 * @param targetDir - Path where the product would be created.
 * @returns Ok on success, or an error Result.
 */
function printDryRun(
  strings: BuiltProductCreateStrings,
  productName: Str,
  templateDir: Path,
  targetDir: Path,
): Result<Void> {
  const dryRunPrefixMsg: Result<Str> = strings.dryRunPrefix();
  if (!dryRunPrefixMsg.ok) return dryRunPrefixMsg;
  const dryRunSourceMsg: Result<Str> = strings.dryRunSourcePath({ path: templateDir });
  if (!dryRunSourceMsg.ok) return dryRunSourceMsg;
  const dryRunTargetMsg: Result<Str> = strings.dryRunTargetPath({ path: targetDir });
  if (!dryRunTargetMsg.ok) return dryRunTargetMsg;
  const dryRunWouldCreateMsg: Result<Str> = strings.dryRunWouldCreate({ name: productName });
  if (!dryRunWouldCreateMsg.ok) return dryRunWouldCreateMsg;

  log.print('');
  log.print(`  {yellow}${dryRunPrefixMsg.data}{/} ${dryRunWouldCreateMsg.data}`);
  log.print(`    {dim}${dryRunSourceMsg.data}{/}`);
  log.print(`    {dim}${dryRunTargetMsg.data}{/}`);
  log.print('');

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Command Definition
// =============================================================================

/** CLI command instance for the product-create tool. */
const command = createCommand<BuiltProductCreateStrings>({
  id: 'product-create',
  version: '1.0.0',
  runtimes: ['node-tty', 'node-pipe'],
  flagDefs: TOOL_FLAG_DEFS,

  handler: async (ctx: CommandContext<BuiltProductCreateStrings>): Promise<Result<Void>> => {
    const strings: BuiltProductCreateStrings = ctx.locale.command;

    // Check onboarding requirement
    const onboardResult: Result<Bool> = requireOnboarding();
    if (!onboardResult.ok) return onboardResult;
    if (!onboardResult.data) {
      return err(ERRORS.CONFIG.ONBOARDING_REQUIRED);
    }
    const dryRun: Bool = ctx.options.dryRun;

    // Ensure we are at workspace root
    const ensureResult: Result<EnsureWorkspaceRootResult> = ensureWorkspaceRoot();
    if (!ensureResult.ok) return ensureResult;
    if (ensureResult.data.status !== 'ok') {
      return err(ERRORS.WORKSPACE.ROOT_NOT_FOUND, {
        meta: { status: ensureResult.data.status, root: ensureResult.data.root },
      });
    }

    // Get product name (format validated by ProductNameSchema in flag parser)
    const productName: Str = ctx.options.product;
    if (productName.length === 0) {
      return err(ERRORS.CLI.MISSING_VALUE, {
        meta: { flag: '--product', reason: 'Product name is required' },
      });
    }

    const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
    if (!configResult.ok) return configResult;

    const templateDirResult: Result<Path> = joinPath([
      ctx.cwd,
      configResult.data.tooling.paths.productTemplateDir,
    ]);
    if (!templateDirResult.ok) return templateDirResult;
    const templateDir: Path = templateDirResult.data;

    const targetDirResult: Result<Path> = joinPath([
      ctx.cwd,
      configResult.data.tooling.paths.productsDir,
      productName,
    ]);
    if (!targetDirResult.ok) return targetDirResult;
    const targetDir: Path = targetDirResult.data;

    const pathsResult: Result<Void> = validatePaths(strings, templateDir, targetDir, productName);
    if (!pathsResult.ok) return pathsResult;

    // Handle dry-run mode
    if (dryRun) {
      const dryRunResult: Result<Void> = printDryRun(strings, productName, templateDir, targetDir);
      if (!dryRunResult.ok) return dryRunResult;
      return ok(VoidSchema, undefined);
    }

    const creatingMsg: Result<Str> = strings.creating({ name: productName });
    if (!creatingMsg.ok) return creatingMsg;
    log.print('');
    log.print(`{bold}{yellow}${creatingMsg.data}{/}{/}`);

    const copyResult: Result<Void> = copyTemplate(strings, templateDir, targetDir);
    if (!copyResult.ok) return copyResult;

    const printResult: Result<Void> = printSuccess(
      strings,
      productName,
      targetDir,
      configResult.data,
    );
    if (!printResult.ok) return printResult;

    return ok(VoidSchema, undefined);
  },
});

export { command };
export default command;
