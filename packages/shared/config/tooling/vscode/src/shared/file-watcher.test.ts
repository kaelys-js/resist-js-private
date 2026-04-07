/**
 * Tests for Generic Config File Watcher
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-60.md TASK 7
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { createFileWatcher, createBatchedFileWatcher } from './file-watcher';
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
      batchFired: 'Batch fired: {count} URIs',
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

  it('dispose clears pending debounce timer (line 114-116)', () => {
    const callback = vi.fn();
    const disposables = createFileWatcher(['**/*.json'], callback, mockChannel, 500);

    onDidChangeCallback!();

    for (const d of disposables) d.dispose();

    vi.advanceTimersByTime(600);
    expect(callback).not.toHaveBeenCalled();
  });
});

describe('createBatchedFileWatcher', () => {
  const mockChannel = { appendLine: vi.fn() } as unknown as vscode.OutputChannel;
  let onDidChangeCallback: ((uri: vscode.Uri) => void) | undefined;
  let onDidCreateCallback: ((uri: vscode.Uri) => void) | undefined;
  let onDidDeleteCallback: ((uri: vscode.Uri) => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    onDidChangeCallback = undefined;
    onDidCreateCallback = undefined;
    onDidDeleteCallback = undefined;

    vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue({
      onDidChange: vi.fn((cb: (uri: vscode.Uri) => void) => {
        onDidChangeCallback = cb;
      }),
      onDidCreate: vi.fn((cb: (uri: vscode.Uri) => void) => {
        onDidCreateCallback = cb;
      }),
      onDidDelete: vi.fn((cb: (uri: vscode.Uri) => void) => {
        onDidDeleteCallback = cb;
      }),
      dispose: vi.fn(),
    } as unknown as vscode.FileSystemWatcher);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('batches multiple change events and fires callback with URI array', () => {
    const callback = vi.fn();
    createBatchedFileWatcher(['**/*.ts'], callback, mockChannel, { batchWindowMs: 200 });

    const uri1 = vscode.Uri.file('/src/a.ts');
    const uri2 = vscode.Uri.file('/src/b.ts');
    onDidChangeCallback!(uri1);
    onDidChangeCallback!(uri2);

    vi.advanceTimersByTime(200);
    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith([uri1, uri2]);
  });

  it('deduplicates URIs by fsPath (default behavior)', () => {
    const callback = vi.fn();
    createBatchedFileWatcher(['**/*.ts'], callback, mockChannel, { batchWindowMs: 100 });

    const uri = vscode.Uri.file('/src/a.ts');
    onDidChangeCallback!(uri);
    onDidChangeCallback!(vscode.Uri.file('/src/a.ts'));

    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledOnce();
    expect(callback.mock.calls[0]![0]).toHaveLength(1);
  });

  it('does not deduplicate when deduplicateByUri is false', () => {
    const callback = vi.fn();
    createBatchedFileWatcher(['**/*.ts'], callback, mockChannel, {
      batchWindowMs: 100,
      deduplicateByUri: false,
    });

    const uri = vscode.Uri.file('/src/a.ts');
    onDidChangeCallback!(uri);
    onDidChangeCallback!(vscode.Uri.file('/src/a.ts'));

    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledOnce();
    expect(callback.mock.calls[0]![0]).toHaveLength(2);
  });

  it('does not fire callback when no events occurred before timer', () => {
    const callback = vi.fn();
    createBatchedFileWatcher(['**/*.ts'], callback, mockChannel, { batchWindowMs: 100 });

    vi.advanceTimersByTime(500);
    expect(callback).not.toHaveBeenCalled();
  });

  it('clears pending batch on dispose', () => {
    const callback = vi.fn();
    const disposables = createBatchedFileWatcher(['**/*.ts'], callback, mockChannel, {
      batchWindowMs: 200,
    });

    onDidChangeCallback!(vscode.Uri.file('/src/a.ts'));

    // Dispose before timer fires
    for (const d of disposables) {
      d.dispose();
    }

    vi.advanceTimersByTime(200);
    expect(callback).not.toHaveBeenCalled();
  });

  it('catches callback errors and logs them', () => {
    const callback = vi.fn(() => {
      throw new Error('batch callback error');
    });
    createBatchedFileWatcher(['**/*.ts'], callback, mockChannel, { batchWindowMs: 100 });

    onDidChangeCallback!(vscode.Uri.file('/src/a.ts'));
    vi.advanceTimersByTime(100);

    expect(callback).toHaveBeenCalledOnce();
    expect(output.logError).toHaveBeenCalledWith(mockChannel, 'batch callback error');
  });

  it('works without channel (no logging)', () => {
    const callback = vi.fn();
    createBatchedFileWatcher(['**/*.ts'], callback, undefined, { batchWindowMs: 100 });

    onDidChangeCallback!(vscode.Uri.file('/src/a.ts'));
    vi.advanceTimersByTime(100);

    expect(callback).toHaveBeenCalledOnce();
    expect(output.log).not.toHaveBeenCalled();
  });

  it('logs batch count when channel provided', () => {
    const callback = vi.fn();
    createBatchedFileWatcher(['**/*.ts'], callback, mockChannel, { batchWindowMs: 100 });

    onDidChangeCallback!(vscode.Uri.file('/src/a.ts'));
    onDidChangeCallback!(vscode.Uri.file('/src/b.ts'));
    vi.advanceTimersByTime(100);

    expect(output.log).toHaveBeenCalledWith(mockChannel, 'Batch fired: 2 URIs');
  });

  it('responds to create and delete events', () => {
    const callback = vi.fn();
    createBatchedFileWatcher(['**/*.ts'], callback, mockChannel, { batchWindowMs: 100 });

    onDidCreateCallback!(vscode.Uri.file('/src/new.ts'));
    onDidDeleteCallback!(vscode.Uri.file('/src/old.ts'));
    vi.advanceTimersByTime(100);

    expect(callback).toHaveBeenCalledOnce();
    expect(callback.mock.calls[0]![0]).toHaveLength(2);
  });

  it('resets batch timer on each new event', () => {
    const callback = vi.fn();
    createBatchedFileWatcher(['**/*.ts'], callback, mockChannel, { batchWindowMs: 200 });

    onDidChangeCallback!(vscode.Uri.file('/src/a.ts'));
    vi.advanceTimersByTime(150);
    onDidChangeCallback!(vscode.Uri.file('/src/b.ts'));
    vi.advanceTimersByTime(150);

    // Should not have fired yet (timer reset at t=150)
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(callback).toHaveBeenCalledOnce();
    expect(callback.mock.calls[0]![0]).toHaveLength(2);
  });

  it('uses default batchWindowMs of 500 when no options', () => {
    const callback = vi.fn();
    createBatchedFileWatcher(['**/*.ts'], callback, mockChannel);

    onDidChangeCallback!(vscode.Uri.file('/src/a.ts'));

    vi.advanceTimersByTime(499);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledOnce();
  });

  it('dispose clears pending batch timer (line 170)', () => {
    const callback = vi.fn();
    const disposables = createBatchedFileWatcher(['**/*.ts'], callback, mockChannel, {
      batchWindowMs: 200,
    });

    onDidChangeCallback!(vscode.Uri.file('/src/a.ts'));

    for (const d of disposables) d.dispose();

    vi.advanceTimersByTime(300);
    expect(callback).not.toHaveBeenCalled();
  });
});
