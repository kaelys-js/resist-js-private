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
// Public API
// =============================================================================

/**
 * Finds the monorepo root for a given document URI.
 *
 * Walks up from the document's workspace folder looking for pnpm-workspace.yaml.
 * Falls back to the workspace folder path if no monorepo marker is found.
 * Results are cached per workspace folder.
 *
 * @param uri - Document URI to resolve workspace root for
 * @returns Monorepo root path, or undefined if no workspace folder
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
 * @param tool - Binary name (e.g. 'resist-lint')
 * @param uri - Document URI to resolve workspace root from
 * @returns Absolute path to the binary, or undefined if not found
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
 * @param tool - Binary name (e.g. 'resist-lint')
 * @param uri - Document URI to resolve workspace from
 * @returns Workspace info with rootPath and binPath, or undefined
 */
export function resolveWorkspace(tool: string, uri: vscode.Uri): WorkspaceInfo | undefined {
  const rootPath: string | undefined = getWorkspaceRoot(uri);
  if (!rootPath) {
    return undefined;
  }
  const binPath: string | undefined = getBinaryPath(tool, uri);
  return { rootPath, binPath };
}

// =============================================================================
// Internal
// =============================================================================

/**
 * Walks up from startDir looking for pnpm-workspace.yaml.
 *
 * @param startDir - Directory to start searching from
 * @returns The directory containing pnpm-workspace.yaml, or startDir as fallback
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
