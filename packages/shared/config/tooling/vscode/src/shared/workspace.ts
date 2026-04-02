/**
 * Workspace Resolution
 *
 * Finds the monorepo root by walking up to pnpm-workspace.yaml and resolves
 * tool binary paths in node_modules/.bin.
 *
 * @module
 */

import * as vscode from 'vscode';
import * as path from 'node:path';
import { existsSync } from 'node:fs';
import type { WorkspaceInfo } from './types';

// =============================================================================
// Cache
// =============================================================================

/** Cached workspace roots keyed by workspace folder path. */
const rootCache = new Map<string, string>();

/** Cached binary paths keyed by 'tool:workspaceUri'. */
const binaryCache = new Map<string, string | undefined>();

// =============================================================================
// Internal
// =============================================================================

/**
 * Walks up from startDir looking for pnpm-workspace.yaml.
 *
 * @param {string} startDir - Directory to start searching from
 * @returns {string} The directory containing pnpm-workspace.yaml, or startDir as fallback
 */
function findMonorepoRoot(startDir: string): string {
  let current: string = startDir;

  // Walk up at most 20 levels to avoid infinite loops on broken filesystems
  for (let i = 0; i < 20; i++) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }

    const parent: string = path.dirname(current);

    if (parent === current) {
      break; // Reached filesystem root
    }
    current = parent;
  }

  // Fallback to the original directory
  return startDir;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Finds the monorepo root for a given document URI.
 *
 * Walks up from the document's workspace folder looking for pnpm-workspace.yaml.
 * Falls back to the workspace folder path if no monorepo marker is found.
 * Results are cached per workspace folder.
 *
 * @param {vscode.Uri} uri - Document URI to resolve workspace root for
 * @returns {string | undefined} Monorepo root path, or undefined if no workspace folder
 *
 * @example
 * ```typescript
 * const root = getWorkspaceRoot(document.uri);
 * if (root) {
 *   console.log('Workspace root:', root);
 * }
 * ```
 */
export function getWorkspaceRoot(uri: vscode.Uri): string | undefined {
  const folder: vscode.WorkspaceFolder | undefined = vscode.workspace.getWorkspaceFolder(uri);

  if (!folder) {
    return undefined;
  }

  const folderPath: string = folder.uri.fsPath;
  const cached: string | undefined = rootCache.get(folderPath);

  if (cached) {
    return cached;
  }

  const root: string = findMonorepoRoot(folderPath);
  rootCache.set(folderPath, root);
  return root;
}

/**
 * Resolves the absolute path to a binary in node_modules/.bin.
 *
 * @param {string} tool - Binary name (e.g. 'resist-lint')
 * @param {vscode.Uri} uri - Document URI to resolve workspace root from
 * @returns {string | undefined} Absolute path to the binary, or undefined if not found
 *
 * @example
 * ```typescript
 * const binPath = getBinaryPath('resist-lint', document.uri);
 * if (binPath) {
 *   console.log('Binary found at:', binPath);
 * }
 * ```
 */
export function getBinaryPath(tool: string, uri: vscode.Uri): string | undefined {
  const cacheKey: string = `${tool}:${uri.toString()}`;
  const cached: string | undefined = binaryCache.get(cacheKey);

  if (cached !== undefined) {
    return cached;
  }

  // Check if key exists with undefined value (negative cache)
  if (binaryCache.has(cacheKey)) {
    return undefined;
  }

  const root: string | undefined = getWorkspaceRoot(uri);

  if (!root) {
    binaryCache.set(cacheKey, undefined);
    return undefined;
  }

  const binPath: string = path.join(root, 'node_modules', '.bin', tool);

  if (existsSync(binPath)) {
    binaryCache.set(cacheKey, binPath);
    return binPath;
  }

  binaryCache.set(cacheKey, undefined);
  return undefined;
}

/**
 * Clears the workspace root cache. Called by the restart command to force
 * re-resolution after workspace structure changes.
 *
 * @example
 * ```typescript
 * clearCache();
 * // All subsequent getWorkspaceRoot/getBinaryPath calls will re-resolve
 * ```
 */
export function clearCache(): void {
  rootCache.clear();
  binaryCache.clear();
}

/**
 * Resolves workspace info for a given URI.
 *
 * Combines `getWorkspaceRoot()` and `getBinaryPath()` into a single call
 * that returns a `WorkspaceInfo` object, or undefined if no workspace folder.
 *
 * @param {string} tool - Binary name (e.g. 'resist-lint')
 * @param {vscode.Uri} uri - Document URI to resolve workspace from
 * @returns {WorkspaceInfo | undefined} Workspace info with rootPath and binPath, or undefined
 *
 * @example
 * ```typescript
 * const info = resolveWorkspace('resist-lint', document.uri);
 * if (info) {
 *   console.log('Root:', info.rootPath, 'Binary:', info.binPath);
 * }
 * ```
 */
export function resolveWorkspace(tool: string, uri: vscode.Uri): WorkspaceInfo | undefined {
  const rootPath: string | undefined = getWorkspaceRoot(uri);

  if (!rootPath) {
    return undefined;
  }

  const binPath: string | undefined = getBinaryPath(tool, uri);

  return { rootPath, binPath };
}
