#!/usr/bin/env tsx

/**
 * Sync Tool
 *
 * Generates and updates configuration files across the monorepo
 * from Handlebars templates based on resist.config.ts.
 *
 * @module
 */

import { glob, globSync } from 'glob';

import type { CommandContext } from '@/cli/schemas';
import type { BuiltSyncStrings } from '@/cli/tools/sync/locales/schema';
import { CONFIG } from '@/cli/tools/sync/utils/config';
import {
  Handlebars,
  clearMissingVariables,
  getMissingVariables,
} from '@/cli/tools/sync/utils/helpers';
import {
  validateLocaleFiles,
  type LocaleValidationResult,
} from '@/cli/tools/sync/utils/locale-validator';
import {
  resolveOutputPath,
  shouldSkipTemplate,
  getStaleConditionalOutputs,
} from '@/cli/tools/sync/utils/mapping';
import {
  transformConfigForTemplates,
  type TemplateContext,
} from '@/cli/tools/sync/utils/transform';
import { createCommand } from '@/cli/utils/command';
import { requireOnboarding } from '@/cli/utils/core';
import { defaults } from '@/config/defaults';
import { configExists, getConfig } from '@/config/loader';
import {
  BoolSchema,
  NonNegativeIntegerSchema,
  PathSchema,
  StrArraySchema,
  StrSchema,
  VoidSchema,
  type Bool,
  type EnsureMiseResult,
  type EnsureWorkspaceRootResult,
  type Filename,
  type NonNegativeInteger,
  type NullableStr,
  type Path,
  type Str,
  type StrArray,
  type SupportedRuntimes,
  type Void,
} from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import type { PackageManagerType } from '@/schemas/core-config/tooling';
import { ERRORS, type Result, err, ok, okUnchecked } from '@/schemas/result/result';
import { readFile, mkdirRecursive, writeFile, deleteFile } from '@/utils/core/fs';
import { safeStringify, type DeepReadonly } from '@/utils/core/object';
import { getDirname, joinPath, pathExists, resolvePath, toRelativePath } from '@/utils/core/path';
import { ensureMise } from '@/utils/core/shell';
import { log } from '@/utils/core/terminal';
import { ensureWorkspaceRoot } from '@/utils/core/workspace';
import { fromUnknownError, safeParse } from '@/utils/result/safe';

// =============================================================================
// Package Manager Detection
// =============================================================================

/** Lock files for each package manager. */
const PM_LOCKFILES: Record<PackageManagerType, Str> = {
  pnpm: 'pnpm-lock.yaml',
  npm: 'package-lock.json',
  yarn: 'yarn.lock',
  bun: 'bun.lockb',
};

/**
 * Detect mismatched package manager lock files.
 *
 * @param workspaceRoot - Workspace root path.
 * @param configuredPm - The configured package manager.
 * @returns `Result<StrArray>` — lock files that don't match the configured PM, or a structured error.
 */
function detectMismatchedLockfiles(
  workspaceRoot: Path,
  configuredPm: PackageManagerType,
): Result<StrArray> {
  const mismatched: StrArray = [];

  for (const [pm, lockfile] of Object.entries(PM_LOCKFILES)) {
    if (pm !== configuredPm) {
      const lockPathResult: Result<Path> = joinPath([workspaceRoot, lockfile]);
      if (!lockPathResult.ok) return lockPathResult;
      const existsResult: Result<Bool> = pathExists(lockPathResult.data);
      if (!existsResult.ok) return existsResult;
      if (existsResult.data) {
        mismatched.push(lockfile);
      }
    }
  }

  return ok(StrArraySchema, mismatched);
}

/**
 * Handle package manager switch: auto-delete stale files + warn about manual steps.
 *
 * When the configured PM differs from lockfiles found on disk:
 * 1. Deletes stale lockfiles (respects dry-run).
 * 2. Deletes stale pnpm-workspace.yaml when switching away from pnpm.
 * 3. Warns about node_modules/ needing manual cleanup.
 * 4. Warns about devcontainers needing rebuild (if enabled).
 * 5. Warns about Coder workspaces needing reprovision (if enabled).
 *
 * @param workspaceRoot - Workspace root path.
 * @param config - The loaded and validated core configuration.
 * @param dryRun - Whether to simulate without making changes.
 * @param strings - Locale strings for messages.
 * @returns `Result<Void>` — success, or a structured error.
 */
function handlePmSwitch(
  workspaceRoot: Path,
  config: DeepReadonly<CoreConfig>,
  dryRun: Bool,
  strings: BuiltSyncStrings,
): Result<Void> {
  const configuredPm: PackageManagerType = config.tooling.packageManager.manager;
  const mismatchedResult: Result<StrArray> = detectMismatchedLockfiles(workspaceRoot, configuredPm);
  if (!mismatchedResult.ok) return mismatchedResult;
  const mismatched: StrArray = mismatchedResult.data;

  if (mismatched.length === 0) {
    return ok(VoidSchema, undefined);
  }

  // --- Header ---
  const detectedMsg: Result<Str> = strings.warnPmSwitchDetected({ newPm: configuredPm });
  if (!detectedMsg.ok) return detectedMsg;
  log.print('');
  log.warn(detectedMsg.data);

  // --- Delete stale lock files ---
  let deletedCount: NonNegativeInteger = 0;

  for (const lockfile of mismatched) {
    const lockPathResult: Result<Path> = joinPath([workspaceRoot, lockfile]);
    if (!lockPathResult.ok) return lockPathResult;
    const lockPath: Path = lockPathResult.data;

    const foundMsg: Result<Str> = strings.warnPmSwitchOldLockfile({ lockfile });
    if (!foundMsg.ok) return foundMsg;
    log.print(`    {yellow}${foundMsg.data}{/}`);

    if (dryRun) {
      const dryMsg: Result<Str> = strings.pmSwitchDryRunDeleteLockfile({ lockfile });
      if (!dryMsg.ok) return dryMsg;
      const dryRunPrefixMsg: Result<Str> = strings.dryRunPrefix();
      if (!dryRunPrefixMsg.ok) return dryRunPrefixMsg;
      log.print(`  {yellow}${dryRunPrefixMsg.data}{/} ${dryMsg.data}`);
    } else {
      const deletingMsg: Result<Str> = strings.pmSwitchDeletingLockfile({ lockfile });
      if (!deletingMsg.ok) return deletingMsg;
      log.print(`  {symbol:info} ${deletingMsg.data}`);
      const deleteResult: Result<Void> = deleteFile(lockPath);
      if (!deleteResult.ok) return deleteResult;
      const deletedMsg: Result<Str> = strings.pmSwitchDeletedLockfile({ lockfile });
      if (!deletedMsg.ok) return deletedMsg;
      log.print(`  {green}{symbol:success}{/} ${deletedMsg.data}`);
      deletedCount++;
    }
  }

  // --- Delete stale pnpm-workspace.yaml ---
  if (configuredPm !== 'pnpm') {
    const wsPathResult: Result<Path> = joinPath([workspaceRoot, 'pnpm-workspace.yaml']);
    if (!wsPathResult.ok) return wsPathResult;
    const wsExistsResult: Result<Bool> = pathExists(wsPathResult.data);
    if (!wsExistsResult.ok) return wsExistsResult;

    if (wsExistsResult.data) {
      if (dryRun) {
        const dryMsg: Result<Str> = strings.pmSwitchDryRunDeleteWorkspaceFile();
        if (!dryMsg.ok) return dryMsg;
        const dryRunPrefixMsg: Result<Str> = strings.dryRunPrefix();
        if (!dryRunPrefixMsg.ok) return dryRunPrefixMsg;
        log.print(`  {yellow}${dryRunPrefixMsg.data}{/} ${dryMsg.data}`);
      } else {
        const deletingMsg: Result<Str> = strings.pmSwitchDeletingWorkspaceFile();
        if (!deletingMsg.ok) return deletingMsg;
        log.print(`  {symbol:info} ${deletingMsg.data}`);
        const deleteResult: Result<Void> = deleteFile(wsPathResult.data);
        if (!deleteResult.ok) return deleteResult;
        const deletedMsg: Result<Str> = strings.pmSwitchDeletedWorkspaceFile();
        if (!deletedMsg.ok) return deletedMsg;
        log.print(`  {green}{symbol:success}{/} ${deletedMsg.data}`);
        deletedCount++;
      }
    }
  }

  // --- Advisory: node_modules ---
  log.print('');
  const nodeModulesMsg: Result<Str> = strings.warnPmSwitchNodeModules();
  if (!nodeModulesMsg.ok) return nodeModulesMsg;
  log.warn(nodeModulesMsg.data);
  const hintMsg: Result<Str> = strings.warnPmSwitchNodeModulesHint({ pm: configuredPm });
  if (!hintMsg.ok) return hintMsg;
  log.print(`  {dim}${hintMsg.data}{/}`);

  // --- Advisory: devcontainer (only if enabled) ---
  if (config.tooling.devContainer.enabled) {
    const devcontainerMsg: Result<Str> = strings.warnPmSwitchDevcontainer();
    if (!devcontainerMsg.ok) return devcontainerMsg;
    log.warn(devcontainerMsg.data);
  }

  // --- Advisory: Coder (only if enabled) ---
  if (config.tooling.coder.enabled) {
    const coderMsg: Result<Str> = strings.warnPmSwitchCoder();
    if (!coderMsg.ok) return coderMsg;
    log.warn(coderMsg.data);
  }

  // --- Summary ---
  if (!dryRun && deletedCount > 0) {
    const countResult: Result<NonNegativeInteger> = safeParse(
      NonNegativeIntegerSchema,
      deletedCount,
    );
    if (!countResult.ok) return countResult;
    const summaryMsg: Result<Str> = strings.pmSwitchCleanupComplete({ count: countResult.data });
    if (!summaryMsg.ok) return summaryMsg;
    log.print(`  {green}{symbol:success}{/} ${summaryMsg.data}`);
  }

  log.print('');
  return ok(VoidSchema, undefined);
}

/**
 * Delete stale outputs from PM-conditional templates skipped in this sync.
 *
 * When the PM changes, templates gated by `PM_CONDITIONAL_TEMPLATES` are
 * skipped, but previously generated output files remain. This function
 * identifies and deletes those stale outputs.
 *
 * @param workspaceRoot - Workspace root path.
 * @param context - Template context with current PM configuration.
 * @param dryRun - Whether to simulate without making changes.
 * @param strings - Locale strings for messages.
 * @returns `Result<NonNegativeInteger>` — number of stale files cleaned, or a structured error.
 */
function cleanStaleConditionalOutputs(
  workspaceRoot: Path,
  context: TemplateContext,
  dryRun: Bool,
  strings: BuiltSyncStrings,
): Result<NonNegativeInteger> {
  const staleResult: Result<StrArray> = getStaleConditionalOutputs(context);
  if (!staleResult.ok) return staleResult;
  const stalePaths: StrArray = staleResult.data;

  let cleaned: NonNegativeInteger = 0;

  for (const relativePath of stalePaths) {
    const absolutePathResult: Result<Path> = resolvePath([workspaceRoot, relativePath]);
    if (!absolutePathResult.ok) return absolutePathResult;
    const absolutePath: Path = absolutePathResult.data;

    const existsResult: Result<Bool> = pathExists(absolutePath);
    if (!existsResult.ok) return existsResult;
    if (!existsResult.data) continue;

    if (dryRun) {
      const dryMsg: Result<Str> = strings.staleConditionalDryRunDelete({ path: relativePath });
      if (!dryMsg.ok) return dryMsg;
      const dryRunPrefixMsg: Result<Str> = strings.dryRunPrefix();
      if (!dryRunPrefixMsg.ok) return dryRunPrefixMsg;
      log.print(`  {yellow}${dryRunPrefixMsg.data}{/} ${dryMsg.data}`);
    } else {
      const deleteResult: Result<Void> = deleteFile(absolutePath);
      if (!deleteResult.ok) return deleteResult;
      const deletedMsg: Result<Str> = strings.staleConditionalDeleted({ path: relativePath });
      if (!deletedMsg.ok) return deletedMsg;
      log.print(`  {green}{symbol:success}{/} ${deletedMsg.data}`);
    }
    cleaned++;
  }

  const cleanedResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, cleaned);
  if (!cleanedResult.ok) return cleanedResult;
  return okUnchecked<NonNegativeInteger>(cleanedResult.data);
}

// =============================================================================
// Core Logic
// =============================================================================

/**
 * Validate that templates directory exists.
 *
 * @param strings - Locale strings for error messages.
 * @param templatesDir - Path to the templates directory.
 * @returns `Result<Void>` — success if directory exists, or a structured error.
 */
function validateTemplatesDir(strings: BuiltSyncStrings, templatesDir: Path): Result<Void> {
  const existsResult: Result<Bool> = pathExists(templatesDir);
  if (!existsResult.ok) return existsResult;
  if (!existsResult.data) {
    return err(ERRORS.IO.READDIR_FAILED, { meta: { path: templatesDir } });
  }
  return ok(VoidSchema, undefined);
}

/**
 * Generate the content for {root}.config.ts from defaults.
 *
 * @param config - Configuration object with default values.
 * @returns `Result<Str>` — the generated TypeScript configuration file content, or a structured error.
 */
function generateConfigContent(config: DeepReadonly<CoreConfig>): Result<Str> {
  const productsJson: Result<Str> = safeStringify(config.products, '\t\t');
  if (!productsJson.ok) return productsJson;
  const zeroIndent: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, 0);
  if (!zeroIndent.ok) return zeroIndent;
  const localesJson: Result<Str> = safeStringify(config.locales, zeroIndent.data);
  if (!localesJson.ok) return localesJson;
  const keywordsJson: Result<Str> = safeStringify(config.repo.keywords, zeroIndent.data);
  if (!keywordsJson.ok) return keywordsJson;

  return ok(
    StrSchema,
    `/**
 * Core Configuration
 *
 * This is the source of truth for all repo-wide settings.
 * Edit this file to customize your project configuration.
 *
 * Run the sync tool after making changes to regenerate derived files.
 */

import { defineConfig } from '@/config/loader';

export default defineConfig({
	company: {
		name: '${config.company.name}',
		domain: '${config.company.domain}',
		supportEmail: '${config.company.supportEmail}',
		license: '${config.company.license}',
	},
	products: ${productsJson.data.replace(/\n/g, '\n\t')},
	locales: ${localesJson.data},
	defaultLocale: '${config.defaultLocale}',
	tooling: {
		devProxy: {
			port: ${config.tooling.devProxy.port},
			https: ${config.tooling.devProxy.https},
		},
		formatting: {
			useTabs: ${config.tooling.formatting.useTabs},
			tabWidth: ${config.tooling.formatting.tabWidth},
			printWidth: ${config.tooling.formatting.printWidth},
			singleQuote: ${config.tooling.formatting.singleQuote},
			semi: ${config.tooling.formatting.semi},
		},
	},
	repo: {
		description: '${config.repo.description}',
		keywords: ${keywordsJson.data},
	},
	versions: {
		node: '${config.versions.node}',
		packageManager: '${config.versions.packageManager}',
	},
	format: {
		global: {
			indent_style: '${config.format.global.indent_style}',
			indent_size: ${config.format.global.indent_size},
			tab_width: ${config.format.global.tab_width},
			line_length: ${config.format.global.line_length},
		},
	},
	git: {
		branch: '${config.git.branch}',
		npm_publish_branch: '${config.git.npm_publish_branch}',
	},
});
`,
  );
}

/**
 * Create {root}.config.ts from defaults.
 *
 * @param strings - Locale strings for messages.
 * @param workspaceRoot - Workspace root path.
 * @param dryRun - Whether to simulate without making changes.
 * @returns `Result<Void>` — success, or a structured error.
 */
function createConfigFile(
  strings: BuiltSyncStrings,
  workspaceRoot: Path,
  dryRun: Bool,
): Result<Void> {
  const configFilename: Filename = defaults.tooling.paths.configFilename;
  const configPathResult: Result<Path> = resolvePath([workspaceRoot, configFilename]);
  if (!configPathResult.ok) return configPathResult;
  const configPath: Path = configPathResult.data;
  const contentResult: Result<Str> = generateConfigContent(defaults);
  if (!contentResult.ok) return contentResult;
  const content: Str = contentResult.data;

  if (dryRun) {
    const dryRunPrefixMsg: Result<Str> = strings.dryRunPrefix();
    if (!dryRunPrefixMsg.ok) return dryRunPrefixMsg;
    const wouldCreateMsg: Result<Str> = strings.dryRunWouldCreateConfig({ configFilename });
    if (!wouldCreateMsg.ok) return wouldCreateMsg;
    log.print(`  {yellow}${dryRunPrefixMsg.data}{/} ${wouldCreateMsg.data}`);
    log.print(`    {dim}${configPath}{/}`);
    return ok(VoidSchema, undefined);
  }

  const creatingMsg: Result<Str> = strings.creatingConfig({ configFilename });
  if (!creatingMsg.ok) return creatingMsg;
  log.print(`  {symbol:info} ${creatingMsg.data}`);
  const writeResult: Result<Void> = writeFile(configPath, content);
  if (!writeResult.ok) return writeResult;
  const createdMsg: Result<Str> = strings.configCreated({ configFilename });
  if (!createdMsg.ok) return createdMsg;
  log.print(`  {green}{symbol:success}{/} ${createdMsg.data}`);
  return ok(VoidSchema, undefined);
}

/**
 * Process a single template and write the output.
 *
 * @param templatePath - Absolute path to the .hbs template file.
 * @param outputPath - Relative output path from workspace root.
 * @param context - Template context for Handlebars rendering.
 * @param workspaceRoot - Workspace root path.
 * @param dryRun - Whether to simulate without making changes.
 * @param strings - Locale strings for messages.
 * @returns `Result<Bool>` — `true` if the file was updated, `false` if unchanged, or a structured error.
 */
function processTemplate(
  templatePath: Path,
  outputPath: Path,
  context: TemplateContext,
  workspaceRoot: Path,
  dryRun: Bool,
  strings: BuiltSyncStrings,
): Result<Bool> {
  // Read template content
  const templateContentResult: Result<Str> = readFile(templatePath);
  if (!templateContentResult.ok) return templateContentResult;
  const templateContent: Str = templateContentResult.data;

  // Clear missing variables tracking before each template
  const clearResult: Result<Void> = clearMissingVariables();
  if (!clearResult.ok) return clearResult;

  // Add output path to context for helpers that need it (e.g., schemaPath)
  const contextWithPath = {
    ...context,
    _outputPath: outputPath,
  };

  // Compile and render with Handlebars
  const compiled = Handlebars.compile(templateContent, { noEscape: true });
  const rendered: Str = compiled(contextWithPath);

  // Check for missing variables and return error
  const missingResult: Result<StrArray> = getMissingVariables();
  if (!missingResult.ok) return missingResult;
  const missing: StrArray = missingResult.data;
  if (missing.length > 0) {
    const templateNameResult: Result<Path> = toRelativePath(templatePath);
    if (!templateNameResult.ok) return templateNameResult;
    const templateName: Path = templateNameResult.data;
    return err(ERRORS.TEMPLATE.UNDEFINED_VARIABLES, {
      meta: { template: templateName, missingVariables: missing },
    });
  }

  // Determine absolute output path
  const absoluteOutputResult: Result<Path> = resolvePath([workspaceRoot, outputPath]);
  if (!absoluteOutputResult.ok) return absoluteOutputResult;
  const absoluteOutput: Path = absoluteOutputResult.data;

  // Check if file exists and differs
  const outputExistsResult: Result<Bool> = pathExists(absoluteOutput);
  if (!outputExistsResult.ok) return outputExistsResult;
  let existingContent: NullableStr = null;
  if (outputExistsResult.data) {
    const existingResult: Result<Str> = readFile(absoluteOutput);
    if (!existingResult.ok) return existingResult;
    existingContent = existingResult.data;
  }
  const needsUpdate: Bool = existingContent !== rendered;

  if (needsUpdate) {
    if (dryRun) {
      const action: Str = existingContent === null ? 'create' : 'update';
      const dryRunPrefixMsg: Result<Str> = strings.dryRunPrefix();
      if (!dryRunPrefixMsg.ok) return dryRunPrefixMsg;
      log.print(`  {yellow}${dryRunPrefixMsg.data}{/} Would ${action}: ${outputPath}`);
    } else {
      const dirNameResult: Result<Path> = getDirname(absoluteOutput);
      if (!dirNameResult.ok) return dirNameResult;
      const dirResult: Result<Void> = mkdirRecursive(dirNameResult.data);
      if (!dirResult.ok) return dirResult;
      const writeResult: Result<Void> = writeFile(absoluteOutput, rendered);
      if (!writeResult.ok) return writeResult;
      const action: Str = existingContent === null ? 'Created' : 'Updated';
      log.print(`  {symbol:info} {green}${action}{/}: ${outputPath}`);
    }
    return ok(BoolSchema, true);
  }

  return ok(BoolSchema, false);
}

/**
 * Register Handlebars partials from the _partials/ directory.
 * Partials are reusable template fragments referenced via {{> partialName}}.
 *
 * @param templatesDir - Root templates directory (contains _partials/).
 * @returns `Result<Void>` — success, or a structured error.
 */
function registerPartials(templatesDir: Path): Result<Void> {
  const partialsDirResult: Result<Path> = joinPath([templatesDir, '_partials']);
  if (!partialsDirResult.ok) return partialsDirResult;
  const partialsDir: Path = partialsDirResult.data;

  const existsResult: Result<Bool> = pathExists(partialsDir);
  if (!existsResult.ok) return existsResult;
  if (!existsResult.data) return ok(VoidSchema, undefined);

  let partialFiles: StrArray;
  try {
    partialFiles = globSync('**/*.hbs', { cwd: partialsDir });
  } catch (caught: unknown) {
    return err(ERRORS.IO.READDIR_FAILED, {
      meta: { path: partialsDir },
      cause: fromUnknownError(caught),
    });
  }

  for (const partialFile of partialFiles) {
    const name: Filename = partialFile.replace(/\.hbs$/, '');
    const partialPathResult: Result<Path> = joinPath([partialsDir, partialFile]);
    if (!partialPathResult.ok) return partialPathResult;
    const contentResult: Result<Str> = readFile(partialPathResult.data);
    if (!contentResult.ok) return contentResult;
    Handlebars.registerPartial(name, contentResult.data);
  }

  return ok(VoidSchema, undefined);
}

/**
 * Discover and process all templates.
 * Template paths map directly to output paths (just strip .hbs extension).
 *
 * @param templatesDir - Root templates directory.
 * @param workspaceRoot - Workspace root path.
 * @param context - Template context for Handlebars rendering.
 * @param dryRun - Whether to simulate without making changes.
 * @param strings - Locale strings for messages.
 * @returns `Promise<Result<{ processed: NonNegativeInteger; updated: NonNegativeInteger }>>` — processed/updated counts, or a structured error.
 */
async function processTemplates(
  templatesDir: Path,
  workspaceRoot: Path,
  context: TemplateContext,
  dryRun: Bool,
  strings: BuiltSyncStrings,
): Promise<
  Result<{ processed: NonNegativeInteger; updated: NonNegativeInteger; updatedFiles: StrArray }>
> {
  // Find all .hbs templates
  let templates: StrArray;
  try {
    templates = await glob('**/*.hbs', { cwd: templatesDir });
  } catch (caught: unknown) {
    return err(ERRORS.IO.READDIR_FAILED, {
      meta: { path: templatesDir },
      cause: fromUnknownError(caught),
    });
  }

  let processed: NonNegativeInteger = 0;
  let updated: NonNegativeInteger = 0;
  const updatedFiles: StrArray = [];

  for (const templateRelPath of templates) {
    // Skip templates that should be skipped (including PM-conditional ones)
    const skipResult: Result<Bool> = shouldSkipTemplate(templateRelPath, context);
    if (!skipResult.ok) return skipResult;
    if (skipResult.data) {
      continue;
    }

    const templatePathResult: Result<Path> = resolvePath([templatesDir, templateRelPath]);
    if (!templatePathResult.ok) return templatePathResult;
    const templatePath: Path = templatePathResult.data;
    const outputPathResult: Result<Path> = resolveOutputPath(templateRelPath);
    if (!outputPathResult.ok) return outputPathResult;
    const outputPath: Path = outputPathResult.data;

    const result: Result<Bool> = processTemplate(
      templatePath,
      outputPath,
      context,
      workspaceRoot,
      dryRun,
      strings,
    );
    if (!result.ok) return result;
    if (result.data) {
      updatedFiles.push(outputPath);
      updated++;
    }
    processed++;
  }

  return okUnchecked<{
    processed: NonNegativeInteger;
    updated: NonNegativeInteger;
    updatedFiles: StrArray;
  }>({ processed, updated, updatedFiles });
}

/**
 * Print success message.
 *
 * @param strings - Locale strings for messages.
 * @param processed - Num of templates processed.
 * @param updated - Num of files updated.
 * @returns `Result<Void>` — success, or a structured error.
 */
function printSuccess(
  strings: BuiltSyncStrings,
  processed: NonNegativeInteger,
  updated: NonNegativeInteger,
): Result<Void> {
  const successMsg: Result<Str> = strings.success();
  if (!successMsg.ok) return successMsg;
  const processedMsg: Result<Str> = strings.templatesProcessed({ count: processed });
  if (!processedMsg.ok) return processedMsg;

  log.print('');
  log.print(`  {green}{symbol:success}{/} ${successMsg.data}`);
  log.print(`  ${processedMsg.data}`);
  if (updated > 0) {
    log.print(`    ${updated} file(s) updated`);
  } else {
    log.print(`    All files up to date`);
  }
  log.print('');

  return ok(VoidSchema, undefined);
}

/**
 * Print dry-run preview.
 *
 * @param strings - Locale strings for messages.
 * @param processed - Num of templates processed.
 * @param updated - Num of files that would be updated.
 * @returns `Result<Void>` — success, or a structured error.
 */
function printDryRun(
  strings: BuiltSyncStrings,
  processed: NonNegativeInteger,
  updated: NonNegativeInteger,
): Result<Void> {
  const dryRunPrefixMsg: Result<Str> = strings.dryRunPrefix();
  if (!dryRunPrefixMsg.ok) return dryRunPrefixMsg;
  const wouldSyncMsg: Result<Str> = strings.dryRunWouldSync();
  if (!wouldSyncMsg.ok) return wouldSyncMsg;
  const templateCountMsg: Result<Str> = strings.dryRunTemplateCount({ count: processed });
  if (!templateCountMsg.ok) return templateCountMsg;

  log.print('');
  log.print(`  {yellow}${dryRunPrefixMsg.data}{/} ${wouldSyncMsg.data}`);
  log.print(`    {dim}${templateCountMsg.data}{/}`);
  if (updated > 0) {
    log.print(`    {dim}${updated} file(s) would be updated{/}`);
  } else {
    log.print(`    {dim}All files already up to date{/}`);
  }
  log.print('');

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Command Definition
// =============================================================================

/** CLI command instance for the sync tool. */
const command = createCommand<BuiltSyncStrings>({
  id: 'sync',
  version: '1.0.0',
  runtimes: ['node-tty', 'node-pipe'],
  handler: async (ctx: CommandContext<BuiltSyncStrings>): Promise<Result<Void>> => {
    const strings: BuiltSyncStrings = ctx.locale.command;
    const dryRun: Bool = ctx.options.dryRun;

    // Check onboarding requirement
    const onboardResult: Result<Bool> = requireOnboarding();
    if (!onboardResult.ok) return onboardResult;
    if (!onboardResult.data) {
      return err(ERRORS.CONFIG.ONBOARDING_REQUIRED);
    }

    // Ensure we are at workspace root
    const ensureResult: Result<EnsureWorkspaceRootResult> = ensureWorkspaceRoot();
    if (!ensureResult.ok) return ensureResult;
    if (ensureResult.data.status !== 'ok') {
      return err(ERRORS.WORKSPACE.ROOT_NOT_FOUND, {
        meta: { status: ensureResult.data.status, root: ensureResult.data.root },
      });
    }
    const workspaceRoot: Path = ensureResult.data.root;

    const templatesDirResult: Result<Path> = joinPath([ctx.cwd, CONFIG.templatesDir]);
    if (!templatesDirResult.ok) return templatesDirResult;
    const templatesDir: Path = templatesDirResult.data;

    const validateResult: Result<Void> = validateTemplatesDir(strings, templatesDir);
    if (!validateResult.ok) return validateResult;

    const configFilename: Filename = defaults.tooling.paths.configFilename;

    log.print('');

    // Check if config exists, create if missing
    const existsResult: Result<Bool> = configExists();
    if (!existsResult.ok) return existsResult;
    if (!existsResult.data) {
      const configNotFoundMsg: Result<Str> = strings.configNotFound({ configFilename });
      if (!configNotFoundMsg.ok) return configNotFoundMsg;
      log.print(`  ${configNotFoundMsg.data}`);
      const createResult: Result<Void> = createConfigFile(strings, workspaceRoot, dryRun);
      if (!createResult.ok) return createResult;

      if (dryRun) {
        // In dry-run, we can't load config that doesn't exist yet
        const printResult: Result<Void> = printDryRun(strings, 0, 0);
        if (!printResult.ok) return printResult;
        return ok(VoidSchema, undefined);
      }
    }

    // Get validated config (already loaded by dispatchTool)
    const loadingConfigMsg: Result<Str> = strings.loadingConfig({ configFilename });
    if (!loadingConfigMsg.ok) return loadingConfigMsg;
    log.print(`  {symbol:info} ${loadingConfigMsg.data}`);
    const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
    if (!configResult.ok) {
      return err(ERRORS.CONFIG.INVALID, { meta: { error: configResult.error.message } });
    }
    const config: DeepReadonly<CoreConfig> = configResult.data;
    const configLoadedMsg: Result<Str> = strings.configLoaded();
    if (!configLoadedMsg.ok) return configLoadedMsg;
    log.debug(configLoadedMsg.data);

    // Handle package manager switch (auto-cleanup + warnings)
    const pmResult: Result<Void> = handlePmSwitch(workspaceRoot, config, dryRun, strings);
    if (!pmResult.ok) return pmResult;

    // Validate locale files against config
    const localeValidationHeaderMsg: Result<Str> = strings.localeValidationHeader();
    if (!localeValidationHeaderMsg.ok) return localeValidationHeaderMsg;
    log.print(`  {symbol:info} ${localeValidationHeaderMsg.data}`);
    const cliSrcRootResult: Result<Path> = joinPath([
      workspaceRoot,
      'packages/shared/utils/cli/src',
    ]);
    if (!cliSrcRootResult.ok) return cliSrcRootResult;
    const cliSrcRoot: Path = cliSrcRootResult.data;
    const localeResult: Result<LocaleValidationResult> = validateLocaleFiles(
      config.locales,
      cliSrcRoot,
      strings,
    );
    if (!localeResult.ok) return localeResult;
    const { missing, orphaned } = localeResult.data;

    if (missing.length > 0 || orphaned.length > 0) {
      for (const { locale, directory } of missing) {
        const dirPathResult: Result<Path> = safeParse(PathSchema, directory);
        if (!dirPathResult.ok) return dirPathResult;
        const relDirResult: Result<Path> = toRelativePath(dirPathResult.data);
        if (!relDirResult.ok) return relDirResult;
        const relDir: Path = relDirResult.data;
        const missingMsg: Result<Str> = strings.localeMissing({ locale, directory: relDir });
        if (!missingMsg.ok) return missingMsg;
        log.warn(missingMsg.data);
      }
      for (const { locale, directory } of orphaned) {
        const dirPathResult: Result<Path> = safeParse(PathSchema, directory);
        if (!dirPathResult.ok) return dirPathResult;
        const relDirResult: Result<Path> = toRelativePath(dirPathResult.data);
        if (!relDirResult.ok) return relDirResult;
        const relDir: Path = relDirResult.data;
        const orphanedMsg: Result<Str> = strings.localeOrphaned({ locale, directory: relDir });
        if (!orphanedMsg.ok) return orphanedMsg;
        log.warn(orphanedMsg.data);
      }
    } else {
      const localePassedMsg: Result<Str> = strings.localeValidationPassed();
      if (!localePassedMsg.ok) return localePassedMsg;
      log.debug(localePassedMsg.data);
    }

    const syncingMsg: Result<Str> = strings.syncing();
    if (!syncingMsg.ok) return syncingMsg;
    log.print(`{bold}{yellow}${syncingMsg.data}{/}{/}`);

    // Transform config into template context
    const contextResult: Result<TemplateContext> = transformConfigForTemplates(config);
    if (!contextResult.ok) return contextResult;
    const context: TemplateContext = contextResult.data;

    // Inject VS Code JSON schemas from schema-updater output (best-effort — skip if file missing)
    const schemasVscodePathResult: Result<Path> = joinPath([
      workspaceRoot,
      'packages/shared/utils/cli/src/tools/schema-updater/schemas.vscode.json',
    ]);
    if (schemasVscodePathResult.ok) {
      const schemasContent: Result<Str> = readFile(schemasVscodePathResult.data);
      if (schemasContent.ok) {
        try {
          const parsed: { 'json.schemas'?: unknown[] } = JSON.parse(schemasContent.data);
          if (Array.isArray(parsed['json.schemas'])) {
            Object.assign(context, { vscodeJsonSchemas: parsed['json.schemas'] });
          }
        } catch {
          // schemas.vscode.json not valid JSON or not present — skip silently
        }
      }
    }

    // Register partials before processing templates
    const partialsResult: Result<Void> = registerPartials(templatesDir);
    if (!partialsResult.ok) return partialsResult;

    // Process all templates
    const templatesResult: Result<{
      processed: NonNegativeInteger;
      updated: NonNegativeInteger;
      updatedFiles: StrArray;
    }> = await processTemplates(templatesDir, workspaceRoot, context, dryRun, strings);
    if (!templatesResult.ok) return templatesResult;
    const { processed, updated, updatedFiles } = templatesResult.data;

    // Clean stale PM-conditional outputs (e.g., pnpm-workspace.yaml when not using pnpm)
    const staleCleanedResult: Result<NonNegativeInteger> = cleanStaleConditionalOutputs(
      workspaceRoot,
      context,
      dryRun,
      strings,
    );
    if (!staleCleanedResult.ok) return staleCleanedResult;

    // Post-render: auto-run `./bin/mise install` when mise.toml changes
    const miseTomlChanged: Bool = updatedFiles.some((f: Str): Bool => f === 'mise.toml');
    if (miseTomlChanged) {
      // Check if mise version itself needs updating
      const configMiseVersion: Str = config.versions.systemTools.mise;
      const ensureResult2: Result<EnsureMiseResult> = ensureMise(
        workspaceRoot,
        configMiseVersion,
        dryRun,
      );
      if (ensureResult2.ok) {
        const miseStatus: EnsureMiseResult = ensureResult2.data;
        if (miseStatus.status === 'installed' || miseStatus.status === 'updated') {
          const miseUpdatedMsg: Result<Str> = strings.miseVersionUpdated({
            version: configMiseVersion,
          });
          if (!miseUpdatedMsg.ok) return miseUpdatedMsg;
          log.print(`  {green}{symbol:success}{/} ${miseUpdatedMsg.data}`);
        }
      }

      if (!dryRun) {
        const runningMiseMsg: Result<Str> = strings.runningMiseInstall();
        if (!runningMiseMsg.ok) return runningMiseMsg;
        log.print(`  {symbol:info} ${runningMiseMsg.data}`);

        const miseBootstrapPathResult: Result<Path> = joinPath([workspaceRoot, 'bin/mise']);
        if (!miseBootstrapPathResult.ok) return miseBootstrapPathResult;
        const miseBootstrapPath: Path = miseBootstrapPathResult.data;

        const { execSync } = await import('node:child_process');
        try {
          execSync(`${miseBootstrapPath} install`, {
            stdio: 'inherit',
            cwd: workspaceRoot,
          });
          // Generate shims so tools are on PATH without requiring `mise activate`
          execSync(`${miseBootstrapPath} reshim`, {
            stdio: 'inherit',
            cwd: workspaceRoot,
          });
        } catch {
          const warnMsg: Result<Str> = strings.miseInstallFailed();
          if (!warnMsg.ok) return warnMsg;
          log.warn(warnMsg.data);
          // Non-fatal — sync succeeded, tool install is best-effort
        }
      } else {
        const dryMiseMsg: Result<Str> = strings.dryRunMiseInstall();
        if (!dryMiseMsg.ok) return dryMiseMsg;
        log.print(`  {dim}${dryMiseMsg.data}{/}`);
      }
    }

    // Report results
    if (dryRun) {
      const printResult: Result<Void> = printDryRun(strings, processed, updated);
      if (!printResult.ok) return printResult;
    } else {
      const printResult: Result<Void> = printSuccess(strings, processed, updated);
      if (!printResult.ok) return printResult;
    }

    return ok(VoidSchema, undefined);
  },
});

export { command };
export default command;
