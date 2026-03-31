/**
 * Tests for Per-Folder Configuration.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { getPerFolderLintOptions } from './per-folder';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getPerFolderLintOptions', () => {
  const globalOptions = {
    stage: 'lint',
    categories: ['naming'],
    extraArgs: ['--verbose'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns global options when no workspace folder found', () => {
    vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(undefined);

    const result = getPerFolderLintOptions(vscode.Uri.file('/test/file.ts'), globalOptions);

    expect(result).toEqual(globalOptions);
  });

  it('uses folder-specific settings when available', () => {
    const folder = { uri: vscode.Uri.file('/workspace'), name: 'my-project', index: 0 };
    vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(folder);
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((key: string) => {
        if (key === 'lint.stage') return 'build';
        if (key === 'lint.categories') return ['testing'];
        if (key === 'lint.args') return ['--strict'];
        return undefined;
      }),
      update: vi.fn(),
      has: vi.fn(),
      inspect: vi.fn(),
    } as any);

    const result = getPerFolderLintOptions(vscode.Uri.file('/workspace/file.ts'), globalOptions);

    expect(result.stage).toBe('build');
    expect(result.categories).toEqual(['testing']);
    expect(result.extraArgs).toEqual(['--strict']);
  });

  it('falls back to global for unset folder settings', () => {
    const folder = { uri: vscode.Uri.file('/workspace'), name: 'my-project', index: 0 };
    vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(folder);
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((_key: string) => undefined),
      update: vi.fn(),
      has: vi.fn(),
      inspect: vi.fn(),
    } as any);

    const result = getPerFolderLintOptions(vscode.Uri.file('/workspace/file.ts'), globalOptions);

    expect(result.stage).toBe('lint');
    expect(result.categories).toEqual(['naming']);
    expect(result.extraArgs).toEqual(['--verbose']);
  });

  it('falls back to global when folder categories are empty', () => {
    const folder = { uri: vscode.Uri.file('/workspace'), name: 'proj', index: 0 };
    vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(folder);
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((key: string) => {
        if (key === 'lint.categories') return [];
        return undefined;
      }),
      update: vi.fn(),
      has: vi.fn(),
      inspect: vi.fn(),
    } as any);

    const result = getPerFolderLintOptions(vscode.Uri.file('/workspace/file.ts'), globalOptions);

    expect(result.categories).toEqual(['naming']);
  });

  it('logs resolved folder name with channel', () => {
    const folder = { uri: vscode.Uri.file('/workspace'), name: 'my-project', index: 0 };
    vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(folder);
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn(() => undefined),
      update: vi.fn(),
      has: vi.fn(),
      inspect: vi.fn(),
    } as any);

    const channel: any = { appendLine: vi.fn(), show: vi.fn(), dispose: vi.fn() };
    getPerFolderLintOptions(vscode.Uri.file('/workspace/file.ts'), globalOptions, channel);

    const logCalls = channel.appendLine.mock.calls.map((c: any) => c[0]);
    expect(logCalls.some((msg: string) => msg.includes('my-project'))).toBe(true);
  });
});
