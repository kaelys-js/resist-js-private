#!/usr/bin/env tsx
/**
 * VS Code Setup Tool
 *
 * Configures VS Code for the monorepo by installing recommended
 * extensions and removing conflicting ones, based on
 * `.vscode/extensions.json`. Supports listing, diffing, filtering,
 * force-reinstalling, and JSON output for CI/scripting.
 *
 * Usage: `<pm> tool vscode-setup [flags]`
 *
 * @module
 */

import * as v from 'valibot';

import type { CommandContext } from '@/cli/schemas';
import type { BuiltVscodeSetupStrings } from '@/cli/tools/vscode-setup/locales/schema';
import { TOOL_FLAG_DEFS } from '@/cli/tools/vscode-setup/flags';
import { createCommand } from '@/cli/utils/command';
import { requireOnboarding } from '@/cli/utils/core';
import {
  BoolSchema,
  CommandSchema,
  NonNegativeIntegerSchema,
  NullableStrSchema,
  StrArraySchema,
  StrSchema,
  VoidSchema,
  type Bool,
  type Command,
  type EnsureWorkspaceRootResult,
  type JsonData,
  type NonNegativeInteger,
  type NullableStr,
  type Path,
  type Str,
  type StrArray,
  type Void,
} from '@/schemas/common';
import { ERRORS, err, ok, okUnchecked, type Result } from '@/schemas/result/result';
import { parseJsonWithComments, readFile } from '@/utils/core/fs';
import { joinPath, pathExists } from '@/utils/core/path';
import { commandExists, execSyncBool, execSyncSafe } from '@/utils/core/shell';
import { log } from '@/utils/core/terminal';
import { ensureWorkspaceRoot } from '@/utils/core/workspace';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Schemas
// =============================================================================

/** Structure of .vscode/extensions.json file. */
const ExtensionsJsonSchema = v.strictObject({
  /** Extensions to install. */
  recommendations: StrArraySchema,
  /** Conflicting extensions to remove. */
  unwantedRecommendations: StrArraySchema,
});

/** Inferred output type of {@link ExtensionsJsonSchema}. VS Code extensions.json file structure. */
type ExtensionsJson = v.InferOutput<typeof ExtensionsJsonSchema>;

/** Schema for install operation counters. */
const InstallCountsSchema = v.strictObject({
  installed: NonNegativeIntegerSchema,
  skipped: NonNegativeIntegerSchema,
  failed: NonNegativeIntegerSchema,
});

/** Install operation counters. */
type InstallCounts = v.InferOutput<typeof InstallCountsSchema>;

/** Summary statistics for the setup operation. */
const StatsSchema = v.strictObject({
  installed: NonNegativeIntegerSchema,
  skipped: NonNegativeIntegerSchema,
  failed: NonNegativeIntegerSchema,
  uninstalled: NonNegativeIntegerSchema,
});

/** Inferred output type of {@link StatsSchema}. */
type Stats = v.InferOutput<typeof StatsSchema>;

/** Extension status in the context of extensions.json configuration. */
const ExtensionStatusSchema = v.picklist(['recommended', 'unwanted', 'extra', 'missing']);

/** Inferred output type of {@link ExtensionStatusSchema}. */
type ExtensionStatus = v.InferOutput<typeof ExtensionStatusSchema>;

/** Extension info for list and diff output. */
const ExtensionInfoSchema = v.strictObject({
  /** Extension identifier (publisher.name). */
  id: StrSchema,
  /** Status relative to extensions.json configuration. */
  status: ExtensionStatusSchema,
  /** Installed version, or null if not installed. */
  version: NullableStrSchema,
  /** Category parsed from JSONC comments, or null. */
  category: NullableStrSchema,
});

/** Inferred output type of {@link ExtensionInfoSchema}. */
type ExtensionInfo = v.InferOutput<typeof ExtensionInfoSchema>;

/** Diff/audit result with four extension arrays. */
const DiffResultSchema = v.strictObject({
  /** Recommended but not installed. */
  missing: StrArraySchema,
  /** Installed but not in recommendations or unwanted. */
  extra: StrArraySchema,
  /** Installed and in unwantedRecommendations. */
  unwanted: StrArraySchema,
  /** Recommended and installed. */
  ok: StrArraySchema,
});

/** Inferred output type of {@link DiffResultSchema}. */
type DiffResult = v.InferOutput<typeof DiffResultSchema>;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if the VS Code CLI (`code`) is available.
 *
 * @returns Ok with `true` if available, `false` otherwise, or an error Result.
 */
function checkVsCodeCli(): Result<Bool> {
  const cmdResult: Result<Command> = safeParse(CommandSchema, 'code');
  if (!cmdResult.ok) return cmdResult;
  return commandExists(cmdResult.data);
}

/**
 * Get currently installed VS Code extensions as a lowercase Set.
 *
 * @returns Ok with a Set of lowercase extension IDs, or an error Result.
 */
function getInstalledExtensions(): Result<Set<Str>> {
  const cmdResult: Result<Command> = safeParse(CommandSchema, 'code --list-extensions');
  if (!cmdResult.ok) return cmdResult;
  const result: Result<Str> = execSyncSafe(cmdResult.data);
  if (!result.ok) return result;

  if (result.data.length === 0) {
    return okUnchecked<Set<Str>>(new Set<Str>());
  }

  const extensions: StrArray = result.data.trim().toLowerCase().split('\n');
  return okUnchecked<Set<Str>>(new Set<Str>(extensions));
}

/**
 * Get currently installed VS Code extensions with their versions.
 *
 * Runs `code --list-extensions --show-versions` which outputs lines like
 * `publisher.name@1.2.3`. Returns a Map of lowercase extension ID to version string.
 *
 * @returns `Result<Map<Str, Str>>` — Map of extension ID (lowercase) to version, or an error Result.
 */
function getInstalledExtensionsWithVersions(): Result<Map<Str, Str>> {
  const cmdResult: Result<Command> = safeParse(
    CommandSchema,
    'code --list-extensions --show-versions',
  );
  if (!cmdResult.ok) return cmdResult;
  const result: Result<Str> = execSyncSafe(cmdResult.data);
  if (!result.ok) return result;

  const extensionMap: Map<Str, Str> = new Map<Str, Str>();

  if (result.data.length === 0) {
    return okUnchecked<Map<Str, Str>>(extensionMap);
  }

  const lines: StrArray = result.data.trim().split('\n');
  for (const line of lines) {
    const atIndex: NonNegativeInteger = line.lastIndexOf('@');
    if (atIndex > 0) {
      const id: Str = line.substring(0, atIndex).toLowerCase();
      const version: Str = line.substring(atIndex + 1);
      extensionMap.set(id, version);
    } else {
      extensionMap.set(line.toLowerCase(), '');
    }
  }

  return okUnchecked<Map<Str, Str>>(extensionMap);
}

/**
 * Install a VS Code extension.
 *
 * @param extensionId - Extension identifier to install.
 * @returns Ok with `true` if install succeeded, `false` otherwise, or an error Result.
 */
function installExtension(extensionId: Str): Result<Bool> {
  const cmdResult: Result<Command> = safeParse(
    CommandSchema,
    `code --install-extension ${extensionId} --force`,
  );
  if (!cmdResult.ok) return cmdResult;
  return execSyncBool(cmdResult.data);
}

/**
 * Uninstall a VS Code extension.
 *
 * @param extensionId - Extension identifier to uninstall.
 * @returns Ok with `true` if uninstall succeeded, `false` otherwise, or an error Result.
 */
function uninstallExtension(extensionId: Str): Result<Bool> {
  const cmdResult: Result<Command> = safeParse(
    CommandSchema,
    `code --uninstall-extension ${extensionId}`,
  );
  if (!cmdResult.ok) return cmdResult;
  return execSyncBool(cmdResult.data);
}

/**
 * Check if an extension is installed (case-insensitive).
 *
 * @param extensionId - Extension identifier to check.
 * @param installed - Set of currently installed extension IDs (lowercase).
 * @returns `Result<Bool>` — `true` if the extension is in the set, or a validation error.
 */
function isExtensionInstalled(extensionId: Str, installed: ReadonlySet<Str>): Result<Bool> {
  const parsed: Result<Str> = safeParse(StrSchema, extensionId);
  if (!parsed.ok) return parsed;
  return ok(BoolSchema, installed.has(parsed.data.toLowerCase()));
}

/**
 * Parse category comments from JSONC content of extensions.json.
 *
 * Extracts category headers from comment lines (e.g., `// Core tooling`,
 * `// ===== FORMATTERS (...) =====`) and maps each extension to its
 * preceding category.
 *
 * @param rawContent - Raw JSONC string from extensions.json.
 * @returns `Result<Map<Str, Str>>` — Map of extension ID (lowercase) to category name.
 */
function parseCategoryComments(rawContent: Str): Result<Map<Str, Str>> {
  const contentResult: Result<Str> = safeParse(StrSchema, rawContent);
  if (!contentResult.ok) return contentResult;

  const categoryMap: Map<Str, Str> = new Map<Str, Str>();
  const lines: StrArray = contentResult.data.split('\n');
  let currentCategory: NullableStr = null;

  for (const line of lines) {
    const trimmed: Str = line.trim();

    // Match category comment: "// ===== CATEGORY_NAME (...) =====" or "// Category name"
    if (trimmed.startsWith('//')) {
      const commentContent: Str = trimmed.substring(2).trim();
      // Match "===== CATEGORY =====" or "===== CATEGORY (description) ====="
      const bannerMatch: RegExpMatchArray | null = commentContent.match(
        /^=+\s*(.+?)\s*(?:\(.*\))?\s*=+$/,
      );
      if (bannerMatch) {
        const rawCategory: Str = bannerMatch[1].trim();
        // Title-case: "FORMATTERS" → "Formatters"
        currentCategory = rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1).toLowerCase();
        continue;
      }
      // Match simple "// Category name" (only if it's a short label, not a descriptive comment)
      if (
        commentContent.length > 0 &&
        commentContent.length <= 60 &&
        !commentContent.includes(':')
      ) {
        currentCategory = commentContent;
        continue;
      }
    }

    // Match extension ID in quotes: "publisher.extension-name"
    const extMatch: RegExpMatchArray | null = trimmed.match(/^"([^"]+)"[,]?$/);
    if (extMatch && currentCategory !== null) {
      categoryMap.set(extMatch[1].toLowerCase(), currentCategory);
    }
  }

  return okUnchecked<Map<Str, Str>>(categoryMap);
}

/**
 * Compute the diff between installed extensions and configuration.
 *
 * Categorizes all known extensions into four buckets:
 * - **missing**: In recommendations but not installed
 * - **extra**: Installed but not in recommendations or unwanted
 * - **unwanted**: Installed and in unwantedRecommendations
 * - **ok**: In recommendations and installed
 *
 * @param recommendations - Array of recommended extension IDs.
 * @param unwanted - Array of unwanted extension IDs.
 * @param installed - Set of currently installed extension IDs (lowercase).
 * @returns `Result<DiffResult>` — categorized extension lists, or an error Result.
 */
function computeDiff(
  recommendations: StrArray,
  unwanted: StrArray,
  installed: ReadonlySet<Str>,
): Result<DiffResult> {
  const missing: StrArray = [];
  const extra: StrArray = [];
  const unwantedInstalled: StrArray = [];
  const okList: StrArray = [];

  // Build lowercase sets for lookup
  const recommendedLower: Set<Str> = new Set<Str>(
    recommendations.map((id: Str): Str => id.toLowerCase()),
  );
  const unwantedLower: Set<Str> = new Set<Str>(unwanted.map((id: Str): Str => id.toLowerCase()));

  // Check recommendations: installed → ok, not installed → missing
  for (const extId of recommendations) {
    if (installed.has(extId.toLowerCase())) {
      okList.push(extId);
    } else {
      missing.push(extId);
    }
  }

  // Check unwanted: installed → unwanted
  for (const extId of unwanted) {
    if (installed.has(extId.toLowerCase())) {
      unwantedInstalled.push(extId);
    }
  }

  // Check installed: not in recommendations or unwanted → extra
  for (const installedId of installed) {
    if (!recommendedLower.has(installedId) && !unwantedLower.has(installedId)) {
      extra.push(installedId);
    }
  }

  return okUnchecked<DiffResult>({
    missing,
    extra,
    unwanted: unwantedInstalled,
    ok: okList,
  });
}

/**
 * Filter extension arrays by a substring match (case-insensitive).
 *
 * @param extensions - Array of extension IDs to filter.
 * @param filter - Substring to match against (case-insensitive).
 * @returns `Result<StrArray>` — filtered extension IDs, or an error Result.
 */
function applyFilter(extensions: StrArray, filter: Str): Result<StrArray> {
  const filterResult: Result<Str> = safeParse(StrSchema, filter);
  if (!filterResult.ok) return filterResult;
  const lowerFilter: Str = filterResult.data.toLowerCase();
  const filtered: StrArray = extensions.filter((id: Str): boolean =>
    id.toLowerCase().includes(lowerFilter),
  );
  return okUnchecked<StrArray>(filtered);
}

// =============================================================================
// Display Helpers
// =============================================================================

/**
 * Display installed extensions with status annotations and optional versions/categories.
 *
 * @param strings - Built locale strings for messages.
 * @param installed - Set of installed extension IDs (lowercase).
 * @param versionsMap - Map of extension ID to version (or null for no versions).
 * @param recommendations - Array of recommended extension IDs.
 * @param unwanted - Array of unwanted extension IDs.
 * @param categoryMap - Map of extension ID to category name.
 * @param verbose - Whether to show version information.
 * @returns `Result<Stats>` — summary statistics, or an error Result.
 */
function displayList(
  strings: BuiltVscodeSetupStrings,
  installed: ReadonlySet<Str>,
  versionsMap: ReadonlyMap<Str, Str> | null,
  recommendations: StrArray,
  unwanted: StrArray,
  categoryMap: ReadonlyMap<Str, Str>,
  verbose: Bool,
): Result<Stats> {
  const headerMsg: Result<Str> = strings.listHeader();
  if (!headerMsg.ok) return headerMsg;
  log.print(`\n{bold}{yellow}${headerMsg.data}{/}{/}`);

  const recommendedLower: Set<Str> = new Set<Str>(
    recommendations.map((id: Str): Str => id.toLowerCase()),
  );
  const unwantedLower: Set<Str> = new Set<Str>(unwanted.map((id: Str): Str => id.toLowerCase()));

  // Build extension info list sorted by category then name
  const infos: ExtensionInfo[] = [];
  for (const extId of installed) {
    let status: ExtensionStatus = 'extra';
    if (recommendedLower.has(extId)) status = 'recommended';
    else if (unwantedLower.has(extId)) status = 'unwanted';

    const version: NullableStr = versionsMap?.get(extId) ?? null;
    const category: NullableStr = categoryMap.get(extId) ?? null;

    infos.push({ id: extId, status, version, category });
  }

  // Sort by category (null last), then by ID
  infos.sort((a: ExtensionInfo, b: ExtensionInfo): number => {
    const catA: Str = a.category ?? '\uffff';
    const catB: Str = b.category ?? '\uffff';
    if (catA !== catB) return catA.localeCompare(catB);
    return a.id.localeCompare(b.id);
  });

  // Display grouped by category
  let lastCategory: NullableStr = '\x00'; // sentinel
  for (const info of infos) {
    const category: NullableStr = info.category;
    if (category !== lastCategory) {
      const catName: Str = category ?? 'Uncategorized';
      const catMsg: Result<Str> = strings.listCategoryHeader({ category: catName });
      if (!catMsg.ok) return catMsg;
      log.print(`{bold}${catMsg.data}{/}`);
      lastCategory = category;
    }

    const statusColor: Str =
      info.status === 'recommended' ? 'green' : info.status === 'unwanted' ? 'red' : 'dim';

    if (verbose && info.version !== null && info.version.length > 0) {
      const entryMsg: Result<Str> = strings.listEntryWithVersion({
        ext: info.id,
        status: info.status,
        version: info.version,
      });
      if (!entryMsg.ok) return entryMsg;
      log.print(`  {${statusColor}}${entryMsg.data}{/}`);
    } else {
      const entryMsg: Result<Str> = strings.listEntry({ ext: info.id, status: info.status });
      if (!entryMsg.ok) return entryMsg;
      log.print(`  {${statusColor}}${entryMsg.data}{/}`);
    }
  }

  // Summary
  let recommendedCount: NonNegativeInteger = 0;
  let unwantedCount: NonNegativeInteger = 0;
  let extraCount: NonNegativeInteger = 0;

  for (const info of infos) {
    if (info.status === 'recommended') recommendedCount++;
    else if (info.status === 'unwanted') unwantedCount++;
    else extraCount++;
  }

  const summaryMsg: Result<Str> = strings.listSummary({
    installed: infos.length,
    recommended: recommendedCount,
    unwanted: unwantedCount,
    extra: extraCount,
  });
  if (!summaryMsg.ok) return summaryMsg;
  log.print(`\n{bold}${summaryMsg.data}{/}`);

  return okUnchecked<Stats>({
    installed: 0,
    skipped: infos.length,
    failed: 0,
    uninstalled: 0,
  });
}

/**
 * Display diff/audit comparing installed extensions against configuration.
 *
 * Shows four sections: Missing (recommended but not installed),
 * Unwanted (installed and in unwantedRecommendations), Extra (installed
 * but not configured), and OK (recommended and installed).
 *
 * @param strings - Built locale strings for messages.
 * @param diff - Computed diff result.
 * @param verbose - Whether to show OK (installed and recommended) extensions.
 * @returns `Result<Void>` — undefined on success, or an error Result.
 */
function displayDiff(
  strings: BuiltVscodeSetupStrings,
  diff: DiffResult,
  verbose: Bool,
): Result<Void> {
  const headerMsg: Result<Str> = strings.diffHeader();
  if (!headerMsg.ok) return headerMsg;
  log.print(`\n{bold}{yellow}${headerMsg.data}{/}{/}`);

  // Missing
  if (diff.missing.length > 0) {
    log.print(`\n  {bold}{yellow}Missing (recommended but not installed):{/}{/}`);
    for (const ext of diff.missing) {
      const msg: Result<Str> = strings.diffMissing({ ext });
      if (!msg.ok) return msg;
      log.print(`  {yellow}{symbol:warning}{/} ${msg.data}`);
    }
  }

  // Unwanted
  if (diff.unwanted.length > 0) {
    log.print(`\n  {bold}{red}Unwanted (installed but should be removed):{/}{/}`);
    for (const ext of diff.unwanted) {
      const msg: Result<Str> = strings.diffUnwanted({ ext });
      if (!msg.ok) return msg;
      log.print(`  {red}{symbol:error}{/} ${msg.data}`);
    }
  }

  // Extra
  if (diff.extra.length > 0) {
    log.print(`\n  {bold}{dim}Extra (installed but not configured):{/}{/}`);
    for (const ext of diff.extra) {
      const msg: Result<Str> = strings.diffExtra({ ext });
      if (!msg.ok) return msg;
      log.print(`  {dim}{symbol:info}{/} ${msg.data}`);
    }
  }

  // OK (only in verbose mode)
  if (verbose && diff.ok.length > 0) {
    log.print(`\n  {bold}{green}OK (recommended and installed):{/}{/}`);
    for (const ext of diff.ok) {
      const msg: Result<Str> = strings.diffOk({ ext });
      if (!msg.ok) return msg;
      log.print(`  {green}{symbol:success}{/} ${msg.data}`);
    }
  }

  // Summary
  const summaryMsg: Result<Str> = strings.diffSummary({
    missing: diff.missing.length,
    extra: diff.extra.length,
    unwanted: diff.unwanted.length,
    ok: diff.ok.length,
  });
  if (!summaryMsg.ok) return summaryMsg;
  log.print(`\n{bold}${summaryMsg.data}{/}`);

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Core Logic
// =============================================================================

/**
 * Remove conflicting extensions.
 *
 * @param strings - Locale strings for messages.
 * @param unwanted - Array of extension IDs to remove.
 * @param installed - Set of currently installed extension IDs.
 * @param dryRun - Whether to simulate without making changes.
 * @param quiet - Whether to suppress human-readable output (for JSON mode).
 * @param uninstalledNames - Optional array to push uninstalled extension IDs into.
 * @returns `Result<NonNegativeInteger>` — count of uninstalled extensions, or an error Result.
 */
function processUnwantedExtensions(
  strings: BuiltVscodeSetupStrings,
  unwanted: StrArray,
  installed: ReadonlySet<Str>,
  dryRun: Bool,
  quiet: Bool,
  uninstalledNames?: StrArray,
): Result<NonNegativeInteger> {
  const dryRunResult: Result<Bool> = safeParse(BoolSchema, dryRun);
  if (!dryRunResult.ok) return dryRunResult;

  let uninstalledCount: NonNegativeInteger = 0;

  if (unwanted.length === 0) {
    return ok(NonNegativeIntegerSchema, uninstalledCount);
  }

  if (!quiet) {
    const headerRemovingMsg: Result<Str> = strings.headerRemoving();
    if (!headerRemovingMsg.ok) return headerRemovingMsg;
    log.print(`\n{bold}{yellow}${headerRemovingMsg.data}{/}{/}`);
  }

  for (const extensionId of unwanted) {
    const isInstalledResult: Result<Bool> = isExtensionInstalled(extensionId, installed);
    if (!isInstalledResult.ok) return isInstalledResult;

    if (isInstalledResult.data) {
      if (dryRunResult.data) {
        if (!quiet) {
          const dryRunPrefixMsg: Result<Str> = strings.dryRunPrefix();
          if (!dryRunPrefixMsg.ok) return dryRunPrefixMsg;
          const dryRunWouldUninstallMsg: Result<Str> = strings.dryRunWouldUninstall({
            ext: extensionId,
          });
          if (!dryRunWouldUninstallMsg.ok) return dryRunWouldUninstallMsg;
          log.info(dryRunPrefixMsg.data + dryRunWouldUninstallMsg.data);
        }
        uninstalledCount++;
        if (uninstalledNames) uninstalledNames.push(extensionId);
      } else {
        const result: Result<Bool> = uninstallExtension(extensionId);

        if (result.ok && result.data) {
          if (!quiet) {
            const infoRemovingMsg: Result<Str> = strings.infoRemoving({ ext: extensionId });
            if (!infoRemovingMsg.ok) return infoRemovingMsg;
            const infoDoneMsg: Result<Str> = strings.infoDone();
            if (!infoDoneMsg.ok) return infoDoneMsg;
            log.print(`  {green}{symbol:success}{/} ${infoRemovingMsg.data + infoDoneMsg.data}`);
          }
          uninstalledCount++;
          if (uninstalledNames) uninstalledNames.push(extensionId);
        } else if (!quiet) {
          const infoRemovingMsg: Result<Str> = strings.infoRemoving({ ext: extensionId });
          if (!infoRemovingMsg.ok) return infoRemovingMsg;
          const infoFailedMsg: Result<Str> = strings.infoFailed();
          if (!infoFailedMsg.ok) return infoFailedMsg;
          log.error(infoRemovingMsg.data + infoFailedMsg.data);
        }
      }
    }
  }

  if (uninstalledCount === 0 && !quiet) {
    const infoNoConflictingMsg: Result<Str> = strings.infoNoConflicting();
    if (!infoNoConflictingMsg.ok) return infoNoConflictingMsg;
    log.print(`{dim}  ${infoNoConflictingMsg.data}{/}`);
  }

  return ok(NonNegativeIntegerSchema, uninstalledCount);
}

/**
 * Install recommended extensions.
 *
 * @param strings - Locale strings for messages.
 * @param recommendations - Array of extension IDs to install.
 * @param installed - Set of currently installed extension IDs.
 * @param dryRun - Whether to simulate without making changes.
 * @param force - Whether to force reinstall already-installed extensions.
 * @param quiet - Whether to suppress human-readable output (for JSON mode).
 * @param installedNames - Optional array to push installed extension IDs into.
 * @param skippedNames - Optional array to push skipped extension IDs into.
 * @param failedNames - Optional array to push failed extension IDs into.
 * @returns `Result<InstallCounts>` — install/skip/fail counts, or an error Result.
 */
function processRecommendedExtensions(
  strings: BuiltVscodeSetupStrings,
  recommendations: StrArray,
  installed: ReadonlySet<Str>,
  dryRun: Bool,
  force: Bool,
  quiet: Bool,
  installedNames?: StrArray,
  skippedNames?: StrArray,
  failedNames?: StrArray,
): Result<InstallCounts> {
  const dryRunResult: Result<Bool> = safeParse(BoolSchema, dryRun);
  if (!dryRunResult.ok) return dryRunResult;

  let installedCount: NonNegativeInteger = 0;
  let skippedCount: NonNegativeInteger = 0;
  let failedCount: NonNegativeInteger = 0;

  if (recommendations.length === 0) {
    return okUnchecked<InstallCounts>({
      installed: installedCount,
      skipped: skippedCount,
      failed: failedCount,
    });
  }

  if (!quiet) {
    const headerInstallingMsg: Result<Str> = strings.headerInstalling();
    if (!headerInstallingMsg.ok) return headerInstallingMsg;
    log.print(`\n{bold}{yellow}${headerInstallingMsg.data}{/}{/}`);
  }

  for (const extensionId of recommendations) {
    const isInstalledResult: Result<Bool> = isExtensionInstalled(extensionId, installed);
    if (!isInstalledResult.ok) return isInstalledResult;

    if (isInstalledResult.data && !force) {
      skippedCount++;
      if (skippedNames) skippedNames.push(extensionId);
      continue;
    }

    if (dryRunResult.data) {
      if (!quiet) {
        const dryRunPrefixMsg: Result<Str> = strings.dryRunPrefix();
        if (!dryRunPrefixMsg.ok) return dryRunPrefixMsg;
        const dryRunWouldInstallMsg: Result<Str> = strings.dryRunWouldInstall({ ext: extensionId });
        if (!dryRunWouldInstallMsg.ok) return dryRunWouldInstallMsg;
        log.info(dryRunPrefixMsg.data + dryRunWouldInstallMsg.data);
      }
      installedCount++;
      if (installedNames) installedNames.push(extensionId);
    } else {
      const result: Result<Bool> = installExtension(extensionId);

      if (result.ok && result.data) {
        if (!quiet) {
          // Use force-specific message when reinstalling
          const infoMsg: Result<Str> =
            force && isInstalledResult.data
              ? strings.infoForceReinstalling({ ext: extensionId })
              : strings.infoInstalling({ ext: extensionId });
          if (!infoMsg.ok) return infoMsg;
          const infoDoneMsg: Result<Str> = strings.infoDone();
          if (!infoDoneMsg.ok) return infoDoneMsg;
          log.print(`  {green}{symbol:success}{/} ${infoMsg.data + infoDoneMsg.data}`);
        }
        installedCount++;
        if (installedNames) installedNames.push(extensionId);
      } else {
        if (!quiet) {
          const infoMsg: Result<Str> = strings.infoInstalling({ ext: extensionId });
          if (!infoMsg.ok) return infoMsg;
          const infoFailedMsg: Result<Str> = strings.infoFailed();
          if (!infoFailedMsg.ok) return infoFailedMsg;
          log.error(infoMsg.data + infoFailedMsg.data);
        }
        failedCount++;
        if (failedNames) failedNames.push(extensionId);
      }
    }
  }

  if (installedCount === 0 && skippedCount > 0 && !quiet) {
    const infoAllInstalledMsg: Result<Str> = strings.infoAllInstalled();
    if (!infoAllInstalledMsg.ok) return infoAllInstalledMsg;
    log.print(`{dim}  ${infoAllInstalledMsg.data}{/}`);
  }

  return okUnchecked<InstallCounts>({
    installed: installedCount,
    skipped: skippedCount,
    failed: failedCount,
  });
}

/**
 * Display summary of operations.
 *
 * @param strings - Locale strings for messages.
 * @param stats - Summary statistics.
 * @param dryRun - Whether this was a dry-run.
 * @returns `Result<Void>` — undefined on success, or an error Result if a locale string fails.
 */
function logSummary(strings: BuiltVscodeSetupStrings, stats: Stats, dryRun: Bool): Result<Void> {
  const dryRunResult: Result<Bool> = safeParse(BoolSchema, dryRun);
  if (!dryRunResult.ok) return dryRunResult;

  const headerSummaryMsg: Result<Str> = strings.headerSummary();
  if (!headerSummaryMsg.ok) return headerSummaryMsg;
  log.print(`\n{bold}{yellow}${headerSummaryMsg.data}{/}{/}`);

  const summaryInstalledMsg: Result<Str> = strings.summaryInstalled({ count: stats.installed });
  if (!summaryInstalledMsg.ok) return summaryInstalledMsg;
  if (stats.installed > 0) {
    log.print(`  {green}{symbol:success}{/} ${summaryInstalledMsg.data}`);
  } else {
    log.print(`{dim}${summaryInstalledMsg.data}{/}`);
  }

  const summaryAlreadyInstalledMsg: Result<Str> = strings.summaryAlreadyInstalled({
    count: stats.skipped,
  });
  if (!summaryAlreadyInstalledMsg.ok) return summaryAlreadyInstalledMsg;
  log.print(`{dim}${summaryAlreadyInstalledMsg.data}{/}`);

  const summaryUninstalledMsg: Result<Str> = strings.summaryUninstalled({
    count: stats.uninstalled,
  });
  if (!summaryUninstalledMsg.ok) return summaryUninstalledMsg;
  if (stats.uninstalled > 0) {
    log.print(`  {green}{symbol:success}{/} ${summaryUninstalledMsg.data}`);
  } else {
    log.print(`{dim}${summaryUninstalledMsg.data}{/}`);
  }

  if (stats.failed > 0) {
    const summaryFailedMsg: Result<Str> = strings.summaryFailed({ count: stats.failed });
    if (!summaryFailedMsg.ok) return summaryFailedMsg;
    log.error(summaryFailedMsg.data);
  }

  const hasChanges: Bool = stats.installed > 0 || stats.uninstalled > 0;

  if (dryRunResult.data) {
    const dryRunSummaryMsg: Result<Str> = strings.dryRunSummary();
    if (!dryRunSummaryMsg.ok) return dryRunSummaryMsg;
    log.print(`\n{bold}{yellow}${dryRunSummaryMsg.data}{/}{/}`);
  } else if (hasChanges) {
    const infoRestartMsg: Result<Str> = strings.infoRestart();
    if (!infoRestartMsg.ok) return infoRestartMsg;
    log.print(`\n{bold}{yellow}${infoRestartMsg.data}{/}{/}`);
  }

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Command Definition
// =============================================================================

/** CLI command instance for the vscode-setup tool. */
const command = createCommand<BuiltVscodeSetupStrings>({
  id: 'vscode-setup',
  version: '2.0.0',
  runtimes: ['node-tty', 'node-pipe'],
  flagDefs: TOOL_FLAG_DEFS,
  handler: async (ctx: CommandContext<BuiltVscodeSetupStrings>): Promise<Result<Void>> => {
    const strings: BuiltVscodeSetupStrings = ctx.locale.command;

    // 1. Check onboarding requirement
    const onboardResult: Result<Bool> = requireOnboarding();
    if (!onboardResult.ok) return onboardResult;
    if (!onboardResult.data) {
      return err(ERRORS.CONFIG.ONBOARDING_REQUIRED);
    }

    // 2. Read flags
    const dryRun: Bool = ctx.options.dryRun;
    const listMode: Bool = ctx.options.list ?? false;
    const diffMode: Bool = ctx.options.diff ?? false;
    const forceMode: Bool = ctx.options.force ?? false;
    const jsonMode: Bool = ctx.options.json ?? false;
    const filterValue: NullableStr = ctx.options.filter ?? null;
    const verbose: Bool = ctx.options.verbose ?? false;

    // 3. Enforce workspace root
    const ensureResult: Result<EnsureWorkspaceRootResult> = ensureWorkspaceRoot();
    if (!ensureResult.ok) return ensureResult;
    if (ensureResult.data.status !== 'ok') {
      return err(ERRORS.WORKSPACE.ROOT_NOT_FOUND, {
        meta: { status: ensureResult.data.status, root: ensureResult.data.root },
      });
    }
    const workspaceRoot: Path = ensureResult.data.root;

    // 4. Check if VS Code CLI is available
    const cliResult: Result<Bool> = checkVsCodeCli();
    if (!cliResult.ok) return cliResult;
    if (!cliResult.data) {
      return err(ERRORS.IO.TOOL_NOT_FOUND, {
        meta: {
          tool: 'code (VS Code CLI)',
          installHint:
            'https://code.visualstudio.com — then run "Install code command in PATH" from Command Palette',
        },
      });
    }

    // 5. Build path to extensions.json and read
    const extensionsPathResult: Result<Path> = joinPath([
      workspaceRoot,
      '.vscode',
      'extensions.json',
    ]);
    if (!extensionsPathResult.ok) return extensionsPathResult;
    const extensionsPath: Path = extensionsPathResult.data;

    const extensionsExistsResult: Result<Bool> = pathExists(extensionsPath);
    if (!extensionsExistsResult.ok) return extensionsExistsResult;
    if (!extensionsExistsResult.data) {
      return err(ERRORS.CONFIG.NOT_FOUND, { meta: { path: extensionsPath } });
    }

    const contentResult: Result<Str> = readFile(extensionsPath);
    if (!contentResult.ok) return contentResult;

    // 6. Parse JSONC content for both data and category comments
    const parsedResult: Result<unknown> = parseJsonWithComments(contentResult.data);
    if (!parsedResult.ok) return parsedResult;

    const extensionsResult: Result<ExtensionsJson> = safeParse(
      ExtensionsJsonSchema,
      parsedResult.data,
    );
    if (!extensionsResult.ok) {
      return err(ERRORS.VALIDATION.SCHEMA_FAILED, {
        meta: { reason: 'Expected { "recommendations": [...] } in .vscode/extensions.json' },
      });
    }
    const extensions: ExtensionsJson = extensionsResult.data;

    // 7. Parse category comments from raw content
    const categoryResult: Result<Map<Str, Str>> = parseCategoryComments(contentResult.data);
    if (!categoryResult.ok) return categoryResult;
    const categoryMap: ReadonlyMap<Str, Str> = categoryResult.data;

    // 8. Apply filter to recommendations and unwanted
    let recommendations: StrArray = extensions.recommendations;
    let unwanted: StrArray = extensions.unwantedRecommendations;

    if (filterValue !== null) {
      const filteredRecommendations: Result<StrArray> = applyFilter(recommendations, filterValue);
      if (!filteredRecommendations.ok) return filteredRecommendations;
      recommendations = filteredRecommendations.data;

      const filteredUnwanted: Result<StrArray> = applyFilter(unwanted, filterValue);
      if (!filteredUnwanted.ok) return filteredUnwanted;
      unwanted = filteredUnwanted.data;

      const totalCount: NonNegativeInteger =
        extensions.recommendations.length + extensions.unwantedRecommendations.length;
      const matchedCount: NonNegativeInteger = recommendations.length + unwanted.length;

      if (!jsonMode) {
        const filterMsg: Result<Str> = strings.infoFilterActive({
          filter: filterValue,
          matched: matchedCount,
          total: totalCount,
        });
        if (!filterMsg.ok) return filterMsg;
        log.info(filterMsg.data);
      }
    }

    // 9. Get installed extensions (with versions for list/diff modes or verbose)
    const needVersions: Bool = listMode || diffMode || verbose;
    let installed: ReadonlySet<Str>;
    let versionsMap: ReadonlyMap<Str, Str> | null = null;

    if (needVersions) {
      const versionsResult: Result<Map<Str, Str>> = getInstalledExtensionsWithVersions();
      if (!versionsResult.ok) return versionsResult;
      versionsMap = versionsResult.data;
      installed = new Set<Str>(versionsResult.data.keys());
    } else {
      const installedResult: Result<Set<Str>> = getInstalledExtensions();
      if (!installedResult.ok) return installedResult;
      installed = installedResult.data;
    }

    // ─── LIST MODE ──────────────────────────────────────────────────
    if (listMode) {
      if (jsonMode) {
        // Build extension info array for JSON output
        const recommendedLower: Set<Str> = new Set<Str>(
          recommendations.map((id: Str): Str => id.toLowerCase()),
        );
        const unwantedLower: Set<Str> = new Set<Str>(
          unwanted.map((id: Str): Str => id.toLowerCase()),
        );

        const extensionInfos: ExtensionInfo[] = [];
        for (const extId of installed) {
          let status: ExtensionStatus = 'extra';
          if (recommendedLower.has(extId)) status = 'recommended';
          else if (unwantedLower.has(extId)) status = 'unwanted';

          extensionInfos.push({
            id: extId,
            status,
            version: versionsMap?.get(extId) ?? null,
            category: categoryMap.get(extId) ?? null,
          });
        }

        const jsonOutput: JsonData = {
          mode: 'list',
          config: { recommended: recommendations, unwanted },
          extensions: extensionInfos,
          stats: {
            installed: extensionInfos.length,
            skipped: 0,
            failed: 0,
            uninstalled: 0,
          },
        };
        const jsonResult: Result<Void> = log.json(jsonOutput);
        if (!jsonResult.ok) return jsonResult;
        return ok(VoidSchema, undefined);
      }

      const listResult: Result<Stats> = displayList(
        strings,
        installed,
        versionsMap,
        recommendations,
        unwanted,
        categoryMap,
        verbose,
      );
      if (!listResult.ok) return listResult;
      return ok(VoidSchema, undefined);
    }

    // ─── DIFF MODE ──────────────────────────────────────────────────
    if (diffMode) {
      const diffResult: Result<DiffResult> = computeDiff(recommendations, unwanted, installed);
      if (!diffResult.ok) return diffResult;

      if (jsonMode) {
        const jsonOutput: JsonData = {
          mode: 'diff',
          config: { recommended: recommendations, unwanted },
          diff: diffResult.data,
          stats: {
            installed: diffResult.data.ok.length,
            skipped: 0,
            failed: diffResult.data.missing.length,
            uninstalled: 0,
          },
        };
        const jsonResult: Result<Void> = log.json(jsonOutput);
        if (!jsonResult.ok) return jsonResult;
        return ok(VoidSchema, undefined);
      }

      const displayResult: Result<Void> = displayDiff(strings, diffResult.data, verbose);
      if (!displayResult.ok) return displayResult;
      return ok(VoidSchema, undefined);
    }

    // ─── INSTALL MODE (default) ─────────────────────────────────────
    const installedNames: StrArray = [];
    const skippedNames: StrArray = [];
    const failedNames: StrArray = [];
    const uninstalledNames: StrArray = [];

    // Process unwanted extensions
    const unwantedResult: Result<NonNegativeInteger> = processUnwantedExtensions(
      strings,
      unwanted,
      installed,
      dryRun,
      jsonMode,
      uninstalledNames,
    );
    if (!unwantedResult.ok) return unwantedResult;

    // Process recommended extensions (with force support)
    const recommendedResult: Result<InstallCounts> = processRecommendedExtensions(
      strings,
      recommendations,
      installed,
      dryRun,
      forceMode,
      jsonMode,
      installedNames,
      skippedNames,
      failedNames,
    );
    if (!recommendedResult.ok) return recommendedResult;

    // Build stats
    const stats: Stats = {
      installed: recommendedResult.data.installed,
      skipped: recommendedResult.data.skipped,
      failed: recommendedResult.data.failed,
      uninstalled: unwantedResult.data,
    };

    // JSON output for install mode
    if (jsonMode) {
      const jsonOutput: JsonData = {
        mode: 'install',
        config: { recommended: recommendations, unwanted },
        results: {
          installed: installedNames,
          skipped: skippedNames,
          failed: failedNames,
          uninstalled: uninstalledNames,
        },
        stats,
      };
      const jsonResult: Result<Void> = log.json(jsonOutput);
      if (!jsonResult.ok) return jsonResult;
    } else {
      // Display human-readable summary
      const summaryResult: Result<Void> = logSummary(strings, stats, dryRun);
      if (!summaryResult.ok) return summaryResult;
    }

    // Exit code 1 for partial failures
    if (stats.failed > 0) {
      if (!jsonMode) {
        const failMsg: Result<Str> = strings.errorPartialFailure({ failed: stats.failed });
        if (!failMsg.ok) return failMsg;
        log.error(failMsg.data);
      }
      return err(ERRORS.IO.INSTALL_FAILED, { meta: { failed: stats.failed } });
    }

    return ok(VoidSchema, undefined);
  },
});

export { command };
export default command;
