/**
 * Tests for Config File Watcher
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-56.md TASK 5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { createConfigWatcher } from './watcher';
import { CONFIG_FILE_PATTERNS } from '../shared/brand';

describe('Config File Watcher', () => {
  let lintFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    lintFn = vi.fn();

    // Set up text documents for re-lint
    vscode.workspace.textDocuments = [
      {
        uri: vscode.Uri.file('/repo/src/file.ts'),
        isUntitled: false,
        getText: () => '',
        lineAt: () => ({ text: '' }),
        lineCount: 1,
        positionAt: () => new vscode.Position(0, 0),
        getWordRangeAtPosition: () => undefined,
      },
    ];
  });

  it('creates watchers for all config file patterns', () => {
    createConfigWatcher(lintFn);
    expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledTimes(
      CONFIG_FILE_PATTERNS.length,
    );
    for (const pattern of CONFIG_FILE_PATTERNS) {
      expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith(pattern);
    }
  });

  it('returns disposables array for cleanup', () => {
    const disposables = createConfigWatcher(lintFn);
    // At minimum: debouncer disposable + 2 file watchers
    expect(disposables.length).toBeGreaterThanOrEqual(3);
    for (const d of disposables) {
      expect(d).toHaveProperty('dispose');
    }
  });

  it('registers change/create/delete handlers on each watcher', () => {
    // Track calls to onDidChange/onDidCreate/onDidDelete
    const mockWatcher = {
      onDidChange: vi.fn(),
      onDidCreate: vi.fn(),
      onDidDelete: vi.fn(),
      dispose: vi.fn(),
    };
    vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue(
      mockWatcher as unknown as vscode.FileSystemWatcher,
    );

    createConfigWatcher(lintFn);

    // Both watchers use same mock, so 2 calls each
    expect(mockWatcher.onDidChange).toHaveBeenCalledTimes(2);
    expect(mockWatcher.onDidCreate).toHaveBeenCalledTimes(2);
    expect(mockWatcher.onDidDelete).toHaveBeenCalledTimes(2);
  });

  it('triggers debounced re-lint on file change', () => {
    const mockWatcher = {
      onDidChange: vi.fn(),
      onDidCreate: vi.fn(),
      onDidDelete: vi.fn(),
      dispose: vi.fn(),
    };
    vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue(
      mockWatcher as unknown as vscode.FileSystemWatcher,
    );

    createConfigWatcher(lintFn);

    // Get the callback registered for onDidChange (first watcher = resist.config.ts)
    const changeCallback = mockWatcher.onDidChange.mock.calls[0][0] as () => void;
    changeCallback();

    // Debounce hasn't fired yet
    expect(lintFn).not.toHaveBeenCalled();

    // Advance past debounce (1000ms)
    vi.advanceTimersByTime(1100);

    // Now lintFn should have been called for each text document
    expect(lintFn).toHaveBeenCalledTimes(1);
  });

  it('skips untitled and non-file documents during re-lint', () => {
    vscode.workspace.textDocuments = [
      {
        uri: vscode.Uri.file('/repo/src/file.ts'),
        isUntitled: false,
        getText: () => '',
        lineAt: () => ({ text: '' }),
        lineCount: 1,
        positionAt: () => new vscode.Position(0, 0),
        getWordRangeAtPosition: () => undefined,
      },
      {
        uri: { scheme: 'untitled', fsPath: 'Untitled-1' } as unknown as vscode.Uri,
        isUntitled: true,
        getText: () => '',
        lineAt: () => ({ text: '' }),
        lineCount: 1,
        positionAt: () => new vscode.Position(0, 0),
        getWordRangeAtPosition: () => undefined,
      },
    ];

    const mockWatcher = {
      onDidChange: vi.fn(),
      onDidCreate: vi.fn(),
      onDidDelete: vi.fn(),
      dispose: vi.fn(),
    };
    vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue(
      mockWatcher as unknown as vscode.FileSystemWatcher,
    );

    createConfigWatcher(lintFn);

    const changeCallback = mockWatcher.onDidChange.mock.calls[0][0] as () => void;
    changeCallback();
    vi.advanceTimersByTime(1100);

    // Only the file:// non-untitled document should be linted
    expect(lintFn).toHaveBeenCalledTimes(1);
  });

  it('continues linting other files when one lint call throws', () => {
    vscode.workspace.textDocuments = [
      {
        uri: vscode.Uri.file('/repo/src/a.ts'),
        isUntitled: false,
        getText: () => '',
        lineAt: () => ({ text: '' }),
        lineCount: 1,
        positionAt: () => new vscode.Position(0, 0),
        getWordRangeAtPosition: () => undefined,
      },
      {
        uri: vscode.Uri.file('/repo/src/b.ts'),
        isUntitled: false,
        getText: () => '',
        lineAt: () => ({ text: '' }),
        lineCount: 1,
        positionAt: () => new vscode.Position(0, 0),
        getWordRangeAtPosition: () => undefined,
      },
    ];

    let callCount = 0;
    const throwingLintFn = vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        throw new Error('lint failed for first file');
      }
    });

    const mockWatcher = {
      onDidChange: vi.fn(),
      onDidCreate: vi.fn(),
      onDidDelete: vi.fn(),
      dispose: vi.fn(),
    };
    vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue(
      mockWatcher as unknown as vscode.FileSystemWatcher,
    );

    createConfigWatcher(throwingLintFn);

    const changeCallback = mockWatcher.onDidChange.mock.calls[0][0] as () => void;
    changeCallback();
    vi.advanceTimersByTime(1100);

    // Both files should have been attempted despite first throwing
    expect(throwingLintFn).toHaveBeenCalledTimes(2);
  });

  it('logs errors to output channel when provided', () => {
    const mockChannel = { appendLine: vi.fn() } as unknown as import('vscode').OutputChannel;

    const throwingLintFn = vi.fn(() => {
      throw new Error('lint boom');
    });

    const mockWatcher = {
      onDidChange: vi.fn(),
      onDidCreate: vi.fn(),
      onDidDelete: vi.fn(),
      dispose: vi.fn(),
    };
    vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue(
      mockWatcher as unknown as vscode.FileSystemWatcher,
    );

    createConfigWatcher(throwingLintFn, mockChannel);

    const changeCallback = mockWatcher.onDidChange.mock.calls[0][0] as () => void;
    changeCallback();
    vi.advanceTimersByTime(1100);

    expect(mockChannel.appendLine).toHaveBeenCalled();
    const allLogs: string[] = (mockChannel.appendLine as ReturnType<typeof vi.fn>).mock.calls.map(
      (call: unknown[]) => call[0] as string,
    );
    const hasErrorLog: boolean = allLogs.some((msg) => msg.includes('lint boom'));
    expect(hasErrorLog, 'Expected "lint boom" in output channel logs').toBe(true);
  });
});
