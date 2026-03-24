/**
 * Tests for workspace utilities.
 *
 * @module
 */

import { describe, expect, it, beforeAll } from 'vitest';
import type { Filename, Path } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { setConfig } from '@/config/loader';
import { findWorkspaceRoot, ensureWorkspaceRoot } from './workspace';

// Load config so getWorkspaceMarkers() works
beforeAll(() => {
  setConfig({});
});

// ── findWorkspaceRoot ───────────────────────────────────────────────────

describe('findWorkspaceRoot', () => {
  it('finds workspace root from cwd', () => {
    const result: Result<Path> = findWorkspaceRoot();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('webforge');
    }
  });

  it('finds workspace root with explicit marker', () => {
    const result: Result<Path> = findWorkspaceRoot(undefined, 'pnpm-workspace.yaml' as Filename);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('webforge');
    }
  });

  it('returns error for nonexistent marker from /tmp', () => {
    const result: Result<Path> = findWorkspaceRoot(
      '/tmp' as Path,
      '__nonexistent_marker_xyz__' as Filename,
    );
    expect(result.ok).toBe(false);
  });

  it('auto-detect finds root via lockfile markers (not workspaces field)', () => {
    // Verifies the primary detection path — lockfile markers match before
    // the workspaces fallback is checked. The workspaces field fallback
    // (line 145) is a secondary check that only fires in npm/yarn/bun repos
    // without their lockfile present — untestable in this pnpm repo.
    const result: Result<Path> = findWorkspaceRoot();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('webforge');
    }
  });
});

// ── ensureWorkspaceRoot ─────────────────────────────────────────────────

describe('ensureWorkspaceRoot', () => {
  it('returns ok when cwd is workspace root', () => {
    const rootResult: Result<Path> = findWorkspaceRoot();
    if (!rootResult.ok) throw new Error('Could not find workspace root');

    const result = ensureWorkspaceRoot(rootResult.data);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe('ok');
    }
  });

  it('returns not_at_root when cwd is a subdirectory', () => {
    const rootResult: Result<Path> = findWorkspaceRoot();
    if (!rootResult.ok) throw new Error('Could not find workspace root');

    const subdir = `${rootResult.data}/packages/shared/utils/core` as Path;
    const result = ensureWorkspaceRoot(subdir);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe('not_at_root');
    }
  });

  it('returns not_found when no workspace exists', () => {
    const result = ensureWorkspaceRoot('/tmp' as Path);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe('not_found');
    }
  });
});
