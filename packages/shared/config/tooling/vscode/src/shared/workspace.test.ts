/**
 * Tests for Workspace Resolution
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-55.md TASK 12
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(() => false),
}));

import { existsSync } from 'fs';
import { getWorkspaceRoot, getBinaryPath, clearCache } from './workspace';

describe('Workspace Resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCache();
    vscode.workspace.workspaceFolders = undefined;
  });

  describe('getWorkspaceRoot', () => {
    it('returns undefined when no workspace folder matches URI', () => {
      // workspace.getWorkspaceFolder returns undefined by default
      vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(undefined);
      const result = getWorkspaceRoot(vscode.Uri.file('/some/file.ts'));
      expect(result).toBeUndefined();
    });

    it('finds monorepo root by walking up to pnpm-workspace.yaml', () => {
      const uri = vscode.Uri.file('/repo/packages/app/src/file.ts');

      // Mock getWorkspaceFolder to return a folder
      const folder = { uri: vscode.Uri.file('/repo/packages/app'), name: 'app', index: 0 };
      vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(
        folder as unknown as import('vscode').WorkspaceFolder,
      );

      // existsSync returns true for /repo/pnpm-workspace.yaml
      vi.mocked(existsSync).mockImplementation((path: unknown) => {
        return String(path) === '/repo/pnpm-workspace.yaml';
      });

      const result = getWorkspaceRoot(uri);
      expect(result).toBe('/repo');
    });

    it('falls back to workspace folder if no pnpm-workspace.yaml found', () => {
      const uri = vscode.Uri.file('/standalone/src/file.ts');
      const folder = { uri: vscode.Uri.file('/standalone'), name: 'standalone', index: 0 };
      vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(
        folder as unknown as import('vscode').WorkspaceFolder,
      );

      // existsSync always returns false
      vi.mocked(existsSync).mockReturnValue(false);

      const result = getWorkspaceRoot(uri);
      expect(result).toBe('/standalone');
    });

    it('caches results per workspace folder', () => {
      const uri = vscode.Uri.file('/repo/src/file.ts');
      const folder = { uri: vscode.Uri.file('/repo'), name: 'repo', index: 0 };
      vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(
        folder as unknown as import('vscode').WorkspaceFolder,
      );
      vi.mocked(existsSync).mockImplementation((path: unknown) => {
        return String(path) === '/repo/pnpm-workspace.yaml';
      });

      const result1 = getWorkspaceRoot(uri);
      const result2 = getWorkspaceRoot(uri);

      expect(result1).toBe(result2);
    });
  });

  describe('getBinaryPath', () => {
    it('returns path when binary exists', () => {
      const uri = vscode.Uri.file('/repo/src/file.ts');
      const folder = { uri: vscode.Uri.file('/repo'), name: 'repo', index: 0 };
      vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(
        folder as unknown as import('vscode').WorkspaceFolder,
      );

      vi.mocked(existsSync).mockImplementation((path: unknown) => {
        const p = String(path);
        return p === '/repo/pnpm-workspace.yaml' || p === '/repo/node_modules/.bin/resist-lint';
      });

      const result = getBinaryPath('resist-lint', uri);
      expect(result).toBe('/repo/node_modules/.bin/resist-lint');
    });

    it('returns undefined when binary does not exist', () => {
      const uri = vscode.Uri.file('/repo/src/file.ts');
      const folder = { uri: vscode.Uri.file('/repo'), name: 'repo', index: 0 };
      vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(
        folder as unknown as import('vscode').WorkspaceFolder,
      );

      vi.mocked(existsSync).mockImplementation((path: unknown) => {
        return String(path) === '/repo/pnpm-workspace.yaml';
      });

      const result = getBinaryPath('resist-lint', uri);
      expect(result).toBeUndefined();
    });

    it('returns undefined when workspace root not found', () => {
      // No workspace folder
      vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(undefined);
      const result = getBinaryPath('resist-lint', vscode.Uri.file('/random/file.ts'));
      expect(result).toBeUndefined();
    });
  });

  describe('clearCache', () => {
    it('invalidates cached workspace roots', () => {
      const uri = vscode.Uri.file('/repo/src/file.ts');
      const folder = { uri: vscode.Uri.file('/repo'), name: 'repo', index: 0 };
      vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(
        folder as unknown as import('vscode').WorkspaceFolder,
      );

      let callCount = 0;
      vi.mocked(existsSync).mockImplementation((path: unknown) => {
        const p = String(path);
        if (p.endsWith('pnpm-workspace.yaml')) {
          callCount++;
          return true;
        }
        return false;
      });

      getWorkspaceRoot(uri);
      const firstCallCount = callCount;

      clearCache();
      getWorkspaceRoot(uri);

      // After clearing cache, existsSync should be called again
      expect(callCount).toBeGreaterThan(firstCallCount);
    });
  });
});
