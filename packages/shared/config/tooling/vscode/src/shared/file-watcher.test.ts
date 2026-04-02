/**
 * Tests for Generic Config File Watcher
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-60.md TASK 7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { createFileWatcher } from './file-watcher';
import * as output from './output';

vi.mock('./output', () => ({
  log: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('../locale/schema', () => ({
  format: vi.fn((template: string, params: Record<string, string | number>) => {
    let result: string = template;
    for (const [key, value] of Object.entries(params)) {
      result = result.replaceAll(`{${key}}`, String(value));
    }
    return result;
  }),
}));

vi.mock('../locale/en', () => ({
  en: {
    watcher: {
      configChanged: 'Config file changed: {pattern}',
    },
  },
}));

describe('createFileWatcher', () => {
  const mockChannel = { appendLine: vi.fn() } as unknown as vscode.OutputChannel;
  let onDidChangeCallback: (() => void) | undefined;
  let onDidCreateCallback: (() => void) | undefined;
  let onDidDeleteCallback: (() => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    onDidChangeCallback = undefined;
    onDidCreateCallback = undefined;
    onDidDeleteCallback = undefined;

    vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue({
      onDidChange: vi.fn((cb: () => void) => {
        onDidChangeCallback = cb;
      }),
      onDidCreate: vi.fn((cb: () => void) => {
        onDidCreateCallback = cb;
      }),
      onDidDelete: vi.fn((cb: () => void) => {
        onDidDeleteCallback = cb;
      }),
      dispose: vi.fn(),
    } as unknown as vscode.FileSystemWatcher);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates watchers for each pattern', () => {
    const callback = vi.fn();
    createFileWatcher(['**/*.json', '**/*.yaml'], callback, mockChannel);

    expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledTimes(2);
    expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith('**/*.json');
    expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith('**/*.yaml');
  });

  it('returns disposables', () => {
    const callback = vi.fn();
    const disposables = createFileWatcher(['**/*.json'], callback, mockChannel);

    // Should have the watcher + the timer cleanup disposable
    expect(disposables.length).toBe(2);
    expect(disposables[0]!.dispose).toBeDefined();
    expect(disposables[1]!.dispose).toBeDefined();
  });

  it('debounces rapid changes', () => {
    const callback = vi.fn();
    createFileWatcher(['**/*.json'], callback, mockChannel, 500);

    // Trigger multiple changes rapidly
    onDidChangeCallback!();
    onDidChangeCallback!();
    onDidChangeCallback!();

    vi.advanceTimersByTime(499);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledOnce();
  });

  it('catches callback errors', () => {
    const callback = vi.fn(() => {
      throw new Error('callback boom');
    });
    createFileWatcher(['**/*.json'], callback, mockChannel, 100);

    onDidChangeCallback!();
    vi.advanceTimersByTime(100);

    expect(callback).toHaveBeenCalledOnce();
    expect(output.logError).toHaveBeenCalledWith(mockChannel, 'callback boom');
  });

  it('logs to channel when provided', () => {
    const callback = vi.fn();
    createFileWatcher(['**/*.json'], callback, mockChannel, 100);

    onDidChangeCallback!();

    expect(output.log).toHaveBeenCalledWith(mockChannel, 'Config file changed: **/*.json');
  });

  it('works without channel (no logging, no crash on error)', () => {
    const callback = vi.fn(() => {
      throw new Error('silent boom');
    });
    createFileWatcher(['**/*.json'], callback, undefined, 100);

    onDidChangeCallback!();
    expect(() => vi.advanceTimersByTime(100)).not.toThrow();
    expect(output.logError).not.toHaveBeenCalled();
  });

  it('responds to create events', () => {
    const callback = vi.fn();
    createFileWatcher(['**/*.json'], callback, mockChannel, 100);

    onDidCreateCallback!();
    vi.advanceTimersByTime(100);

    expect(callback).toHaveBeenCalledOnce();
  });

  it('responds to delete events', () => {
    const callback = vi.fn();
    createFileWatcher(['**/*.json'], callback, mockChannel, 100);

    onDidDeleteCallback!();
    vi.advanceTimersByTime(100);

    expect(callback).toHaveBeenCalledOnce();
  });
});
