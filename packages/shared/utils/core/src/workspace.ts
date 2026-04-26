/**
 * Workspace Utilities
 *
 * Pure utilities for finding and validating the monorepo workspace root.
 * No CLI dependencies — suitable for use in any context.
 *
 * All functions return `Result<T>` — input is validated via `safeParse`,
 * I/O errors are caught and returned as structured errors.
 * All type annotations use Valibot-inferred types from `@/schemas/common`.
 *
 * @module
 */

import { getConfig } from '@/config/loader';
import {
  EnsureWorkspaceRootResultSchema,
  FilenameSchema,
  PathSchema,
  StrArraySchema,
  type Bool,
  type DynamicModule,
  type EnsureWorkspaceRootResult,
  type Filename,
  type Path,
  type Str,
  type StrArray,
} from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import type { PackageManagerType } from '@/schemas/core-config/tooling';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';
import { requireRuntime } from '@/utils/core/environment';
import { parseJsonWithComments, readFile } from '@/utils/core/fs';
import { type OptionalNodePath, nodePath } from '@/utils/core/node-imports';
import type { DeepReadonly } from '@/utils/core/object';
import { cwd, joinPath, pathExists } from '@/utils/core/path';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Constants
// =============================================================================

/** Lockfile markers per package manager, used to identify the workspace root. */
const LOCKFILE_MARKERS: Record<PackageManagerType, StrArray> = {
  pnpm: ['pnpm-workspace.yaml', 'pnpm-lock.yaml'],
  npm: ['package-lock.json'],
  yarn: ['yarn.lock'],
  bun: ['bun.lockb', 'bun.lock'],
};

/**
 * Get the workspace marker files based on configured package manager.
 *
 * Returns an ordered list of lockfile markers to check when walking upward.
 *
 * @returns `Result<StrArray>` — marker filenames for the configured package manager,
 *          or an error if config cannot be loaded.
 */
function getWorkspaceMarkers(): Result<StrArray> {
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) {
    return configResult;
  }
  const pmName: PackageManagerType = configResult.data.tooling.packageManager.manager;
  return ok(StrArraySchema, LOCKFILE_MARKERS[pmName]);
}

// =============================================================================
// Functions
// =============================================================================

/**
 * Find the workspace root by searching upward for a marker file.
 *
 * When no marker is explicitly provided, uses lockfile markers based on the
 * configured package manager to identify the workspace root. Falls back to
 * checking for a `package.json` with a `workspaces` field as a universal
 * secondary check for npm/yarn/bun compatibility.
 *
 * @param startDir - Directory to start searching from (defaults to cwd).
 * @param marker - Specific marker file to look for (auto-detected if not provided).
 * @returns `Result<Path>` — workspace root path, or `CONFIG.NOT_FOUND` if no
 *          workspace is found, or `VALIDATION.SCHEMA_FAILED` on invalid input.
 *
 * @example
 * ```typescript
 * const root = findWorkspaceRoot();
 * if (!root.ok) return root;
 * root.data; // workspace root path
 * ```
 */
export function findWorkspaceRoot(startDir?: Path, marker?: Filename): Result<Path> {
  const path: OptionalNodePath = nodePath;
  if (!path) {
    return requireRuntime('findWorkspaceRoot', 'node');
  }
  const startResult: Result<Path> =
    startDir === undefined ? cwd() : safeParse(PathSchema, startDir);
  if (!startResult.ok) {
    return startResult;
  }

  // If marker explicitly provided, validate and use simple matching
  if (marker !== undefined) {
    const markerResult: Result<Filename> = safeParse(FilenameSchema, marker);
    if (!markerResult.ok) {
      return markerResult;
    }

    const currentDirResult: Result<Path> = safeParse(PathSchema, path.resolve(startResult.data));
    if (!currentDirResult.ok) {
      return currentDirResult;
    }
    let currentDir: Path = currentDirResult.data;
    while (true) {
      const markerPathResult: Result<Path> = joinPath([currentDir, markerResult.data]);
      if (!markerPathResult.ok) {
        return markerPathResult;
      }

      const existsResult: Result<Bool> = pathExists(markerPathResult.data);
      if (!existsResult.ok) {
        return existsResult;
      }
      if (existsResult.data) {
        return ok(PathSchema, currentDir);
      }

      const parentDirResult: Result<Path> = safeParse(PathSchema, path.dirname(currentDir));
      if (!parentDirResult.ok) {
        return parentDirResult;
      }
      if (parentDirResult.data === currentDir) {
        break;
      }
      currentDir = parentDirResult.data;
    }
    return err(ERRORS.WORKSPACE.ROOT_NOT_FOUND, { meta: { cwd: startResult.data } });
  }

  // Auto-detect: use lockfile markers for the configured PM
  const markersResult: Result<StrArray> = getWorkspaceMarkers();
  if (!markersResult.ok) {
    return markersResult;
  }
  const markers: readonly string[] = markersResult.data;
  const currentDirResult2: Result<Path> = safeParse(PathSchema, path.resolve(startResult.data));
  if (!currentDirResult2.ok) {
    return currentDirResult2;
  }
  let currentDir: Path = currentDirResult2.data;

  while (true) {
    // Check PM-specific lockfile markers
    for (const m of markers) {
      const markerPathResult: Result<Path> = joinPath([currentDir, m]);
      if (!markerPathResult.ok) {
        return markerPathResult;
      }

      const existsResult: Result<Bool> = pathExists(markerPathResult.data);
      if (!existsResult.ok) {
        return existsResult;
      }
      if (existsResult.data) {
        return ok(PathSchema, currentDir);
      }
    }

    // Fallback: check for package.json with a workspaces field
    const pkgPathResult: Result<Path> = joinPath([currentDir, 'package.json']);
    if (pkgPathResult.ok) {
      const pkgContentResult: Result<Str> = readFile(pkgPathResult.data);
      if (pkgContentResult.ok) {
        const pkgJsonResult: Result<DynamicModule> = parseJsonWithComments(pkgContentResult.data);
        if (pkgJsonResult.ok && pkgJsonResult.data.workspaces) {
          return ok(PathSchema, currentDir);
        }
      }
      // Ignore read/parse errors — just means no package.json or invalid JSON
    }

    const parentDirResult: Result<Path> = safeParse(PathSchema, path.dirname(currentDir));
    if (!parentDirResult.ok) {
      return parentDirResult;
    }
    if (parentDirResult.data === currentDir) {
      break;
    }
    currentDir = parentDirResult.data;
  }

  return err(ERRORS.WORKSPACE.ROOT_NOT_FOUND, { meta: { cwd: startResult.data } });
}

/**
 * Ensure the current working directory is the workspace root.
 *
 * Returns a discriminated union result — the caller handles logging
 * and error messages with localized strings.
 *
 * @param cwdPath - Current working directory (defaults to `cwd()`).
 * @returns `Result<EnsureWorkspaceRootResult>` — status indicating outcome,
 *          or `VALIDATION.SCHEMA_FAILED` on invalid input.
 *
 * @example
 * ```typescript
 * const result = ensureWorkspaceRoot();
 * if (!result.ok) return result;
 * switch (result.data.status) {
 *   case 'ok': // at workspace root
 *   case 'not_found': // no workspace found
 *   case 'not_at_root': // found but not at root
 * }
 * ```
 */
export function ensureWorkspaceRoot(cwdPath?: Path): Result<EnsureWorkspaceRootResult> {
  const pathMod: OptionalNodePath = nodePath;
  if (!pathMod) {
    return requireRuntime('ensureWorkspaceRoot', 'node');
  }
  const cwdResult: Result<Path> = cwdPath === undefined ? cwd() : safeParse(PathSchema, cwdPath);
  if (!cwdResult.ok) {
    return cwdResult;
  }

  const rootResult: Result<Path> = findWorkspaceRoot(cwdResult.data);
  if (!rootResult.ok) {
    if (
      rootResult.error.code === ERRORS.CONFIG.NOT_FOUND ||
      rootResult.error.code === ERRORS.WORKSPACE.ROOT_NOT_FOUND
    ) {
      return ok(EnsureWorkspaceRootResultSchema, { status: 'not_found' });
    }
    return rootResult;
  }

  // Resolve both paths to handle symlinks (e.g., /var -> /private/var on macOS)
  const resolvedCwdResult: Result<Path> = safeParse(PathSchema, pathMod.resolve(cwdResult.data));
  if (!resolvedCwdResult.ok) {
    return resolvedCwdResult;
  }
  const resolvedRootResult: Result<Path> = safeParse(PathSchema, pathMod.resolve(rootResult.data));
  if (!resolvedRootResult.ok) {
    return resolvedRootResult;
  }

  if (resolvedCwdResult.data !== resolvedRootResult.data) {
    return ok(EnsureWorkspaceRootResultSchema, {
      status: 'not_at_root',
      root: rootResult.data,
      cwd: cwdResult.data,
    });
  }

  return ok(EnsureWorkspaceRootResultSchema, { status: 'ok', root: rootResult.data });
}
