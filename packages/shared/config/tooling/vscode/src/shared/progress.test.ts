/**
 * Tests for Progress Reporting Helpers
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-60.md TASK 10
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { withFileProgress } from './progress';
import type { FileProcessResult } from './progress';
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
    progressHelper: {
      processing: 'Processing {file}',
      cancelled: 'Operation cancelled',
      fileError: 'Error processing {file}: {error}',
    },
  },
}));

describe('withFileProgress', () => {
  const mockChannel = { appendLine: vi.fn() } as unknown as vscode.OutputChannel;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset withProgress mock to properly provide progress and token
    vi.mocked(vscode.window.withProgress).mockImplementation(
      async (
        _options: unknown,
        task: (
          progress: { report: (value: unknown) => void },
          token: { isCancellationRequested: boolean },
        ) => Promise<unknown>,
      ) => {
        const progress = { report: vi.fn() };
        const token = { isCancellationRequested: false };
        return task(progress, token);
      },
    );
  });

  it('processes all files', async () => {
    const files = [vscode.Uri.file('/a.ts'), vscode.Uri.file('/b.ts'), vscode.Uri.file('/c.ts')];

    const processFn = vi.fn(async (uri: vscode.Uri) => `processed:${uri.fsPath}`);

    const results = await withFileProgress(mockChannel, 'Test', files, processFn);

    expect(processFn).toHaveBeenCalledTimes(3);
    expect(results).toHaveLength(3);
  });

  it('returns results array', async () => {
    const files = [vscode.Uri.file('/a.ts')];
    const processFn = vi.fn(async () => 'result-data');

    const results = await withFileProgress(mockChannel, 'Test', files, processFn);

    expect(results).toHaveLength(1);
    expect(results[0].uri).toEqual(files[0]);
    expect(results[0].result).toBe('result-data');
    expect(results[0].error).toBeUndefined();
  });

  it('catches per-file errors and continues', async () => {
    const files = [vscode.Uri.file('/a.ts'), vscode.Uri.file('/b.ts')];

    const processFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('file-a failed'))
      .mockResolvedValueOnce('b-ok');

    const results = await withFileProgress(mockChannel, 'Test', files, processFn);

    expect(results).toHaveLength(2);
    expect(results[0].error).toBe('file-a failed');
    expect(results[0].result).toBeUndefined();
    expect(results[1].result).toBe('b-ok');
    expect(results[1].error).toBeUndefined();
  });

  it('handles empty file list', async () => {
    const results = await withFileProgress(mockChannel, 'Test', [], async () => 'never');

    expect(results).toEqual([]);
    expect(vscode.window.withProgress).not.toHaveBeenCalled();
  });

  it('logs errors to channel', async () => {
    const files = [vscode.Uri.file('/fail.ts')];
    const processFn = vi.fn(async () => {
      throw new Error('process boom');
    });

    await withFileProgress(mockChannel, 'Test', files, processFn);

    expect(output.logError).toHaveBeenCalledWith(
      mockChannel,
      'Error processing /fail.ts: process boom',
    );
  });

  it('handles cancellation', async () => {
    vi.mocked(vscode.window.withProgress).mockImplementation(
      async (
        _options: unknown,
        task: (
          progress: { report: (value: unknown) => void },
          token: { isCancellationRequested: boolean },
        ) => Promise<unknown>,
      ) => {
        const progress = { report: vi.fn() };
        const token = { isCancellationRequested: true }; // Already cancelled
        return task(progress, token);
      },
    );

    const files = [vscode.Uri.file('/a.ts'), vscode.Uri.file('/b.ts')];
    const processFn = vi.fn(async () => 'data');

    const results = await withFileProgress(mockChannel, 'Test', files, processFn);

    expect(processFn).not.toHaveBeenCalled();
    expect(results).toHaveLength(0);
    expect(output.log).toHaveBeenCalledWith(mockChannel, 'Operation cancelled');
  });
});
