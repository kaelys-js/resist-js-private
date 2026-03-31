/**
 * Workspace Resolution
 *
 * Finds the monorepo root by walking up to pnpm-workspace.yaml and resolves
 * tool binary paths in node_modules/.bin.
 *
 * @module
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { existsSync } from 'fs';

// =============================================================================
// Cache
// =============================================================================

/** Cached workspace roots keyed by workspace folder path. */
const rootCache = new Map<string, string>();

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
  const root: string | undefined = getWorkspaceRoot(uri);
  if (!root) {
    return undefined;
  }

  const binPath: string = path.join(root, 'node_modules', '.bin', tool);
  if (existsSync(binPath)) {
    return binPath;
  }

  return undefined;
}

/**
 * Clears the workspace root cache. Called by the restart command to force
 * re-resolution after workspace structure changes.
 */
export function clearCache(): void {
  rootCache.clear();
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
