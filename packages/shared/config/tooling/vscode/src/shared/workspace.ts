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

/** Cached binary paths keyed by 'tool:workspaceUri'. */
const binaryCache = new Map<string, string | undefined>();

/** Cached workspace roots keyed by 'startPath:markers'. */
const markerCache = new Map<string, string | undefined>();

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
 * Clears the binary path cache. Use after installing new dependencies.
 */
export function clearBinaryCache(): void {
  binaryCache.clear();
}

/**
 * Clears the workspace root cache. Called by the restart command to force
 * re-resolution after workspace structure changes.
 */
export function clearCache(): void {
  rootCache.clear();
  binaryCache.clear();
  markerCache.clear();
}

/**
 * Finds a workspace root by walking up from startPath looking for any of the marker files.
 *
 * Results are cached per (startPath, markers) pair.
 *
 * @param startPath - Directory to start searching from
 * @param markers - Array of marker file names to look for (e.g. ['pnpm-workspace.yaml', '.git'])
 * @returns The directory containing a marker file, or undefined if not found
 */
export function findWorkspaceRoot(startPath: string, markers: string[]): string | undefined {
  const cacheKey: string = `${startPath}:${markers.join(',')}`;
  if (markerCache.has(cacheKey)) {
    return markerCache.get(cacheKey);
  }

  let current: string = startPath;

  for (let i = 0; i < 20; i++) {
    for (const marker of markers) {
      if (existsSync(path.join(current, marker))) {
        markerCache.set(cacheKey, current);
        return current;
      }
    }
    const parent: string = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  markerCache.set(cacheKey, undefined);
  return undefined;
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
