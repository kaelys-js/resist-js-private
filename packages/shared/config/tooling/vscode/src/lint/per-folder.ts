/**
 * Per-Folder Configuration
 *
 * Resolves lint options per workspace folder for multi-root workspaces.
 * Each folder can have different stage, categories, and args settings.
 *
 * @module
 */

import * as vscode from 'vscode';
import type { LintOptions } from './provider';
import { log } from '../shared/output';
import { en } from '../locale/en';
import { format } from '../locale/schema';
import { CONFIG_SECTION } from '../shared/brand';

/**
 * Resolves lint options for a document based on its workspace folder.
 *
 * In multi-root workspaces, each folder can override the global lint settings.
 * Falls back to global options when no folder-specific config exists.
 *
 * @param {vscode.Uri} docUri - URI of the document to resolve options for
 * @param {LintOptions} globalOptions - Default lint options from workspace settings
 * @param {vscode.OutputChannel} channel - Optional output channel for logging
 * @returns {LintOptions} Resolved lint options for the document's folder
 *
 * @example
 * ```typescript
 * const globalOptions: LintOptions = { stage: 'lint', categories: [], extraArgs: [] };
 * const resolved = getPerFolderLintOptions(document.uri, globalOptions, outputChannel);
 * // resolved may override stage/categories/extraArgs for the document's workspace folder
 * ```
 */
export function getPerFolderLintOptions(
  docUri: vscode.Uri,
  globalOptions: LintOptions,
  channel?: vscode.OutputChannel,
): LintOptions {
  const folder: vscode.WorkspaceFolder | undefined = vscode.workspace.getWorkspaceFolder(docUri);

  if (!folder) {
    if (channel) {
      log(channel, en.perFolder.fallbackGlobal);
    }
    return globalOptions;
  }

  // Read folder-scoped settings
  const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(
    CONFIG_SECTION,
    folder.uri,
  );

  const stage: string | undefined = config.get<string>('lint.stage');
  const categories: string[] | undefined = config.get<string[]>('lint.categories');
  const extraArgs: string[] | undefined = config.get<string[]>('lint.args');

  // Only override if the folder has explicit values
  const resolved: LintOptions = {
    stage: stage ?? globalOptions.stage,
    categories: categories && categories.length > 0 ? categories : globalOptions.categories,
    extraArgs: extraArgs && extraArgs.length > 0 ? extraArgs : globalOptions.extraArgs,
  };

  if (channel) {
    log(channel, format(en.perFolder.resolved, { folder: folder.name }));
  }

  return resolved;
}
