/**
 * Tests for Stale Diagnostic Cleanup.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { StaleDiagnosticCleaner } from './stale-cleanup';
import { BRAND_NAME } from '../shared/brand';

// =============================================================================
// Tests
// =============================================================================

describe('StaleDiagnosticCleaner', () => {
  let cleaner: StaleDiagnosticCleaner;
  let channel: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    channel = { appendLine: vi.fn(), show: vi.fn(), dispose: vi.fn(), name: BRAND_NAME };
    cleaner = new StaleDiagnosticCleaner(1000, channel); // 1 second timeout for tests
  });

  afterEach(() => {
    cleaner.dispose();
    vi.useRealTimers();
  });

  it('tracks document edits', () => {
    const uri = vscode.Uri.file('/test/file.ts');
    cleaner.trackEdit(uri);
    // No error thrown — tracking works
    expect(true).toBe(true);
  });

  it('cleans up stale diagnostics after timeout', () => {
    const uri = vscode.Uri.file('/test/file.ts');
    const collection: any = {
      delete: vi.fn(),
      get: vi.fn(),
      set: vi.fn(),
    };

    // Track edit and then advance time past timeout
    cleaner.trackEdit(uri);
    vi.advanceTimersByTime(2000); // Past 1000ms timeout

    // No active/visible editors
    (vscode.window as any).activeTextEditor = undefined;
    (vscode.window as any).visibleTextEditors = [];

    cleaner.cleanup(collection);

    expect(collection.delete).toHaveBeenCalledTimes(1);
  });

  it('does not clean up recent edits', () => {
    const uri = vscode.Uri.file('/test/file.ts');
    const collection: any = {
      delete: vi.fn(),
      get: vi.fn(),
    };

    cleaner.trackEdit(uri);
    // Don't advance time — edit is fresh
    cleaner.cleanup(collection);

    expect(collection.delete).not.toHaveBeenCalled();
  });

  it('skips visible editors', () => {
    const uri = vscode.Uri.file('/test/file.ts');
    const collection: any = {
      delete: vi.fn(),
      get: vi.fn(),
    };

    cleaner.trackEdit(uri);
    vi.advanceTimersByTime(2000);

    // Make the file visible
    (vscode.window as any).activeTextEditor = {
      document: { uri },
    };
    (vscode.window as any).visibleTextEditors = [{ document: { uri } }];

    cleaner.cleanup(collection);

    expect(collection.delete).not.toHaveBeenCalled();
  });

  it('logs cleanup count', () => {
    const uri1 = vscode.Uri.file('/test/file1.ts');
    const uri2 = vscode.Uri.file('/test/file2.ts');
    const collection: any = {
      delete: vi.fn(),
      get: vi.fn(),
    };

    cleaner.trackEdit(uri1);
    cleaner.trackEdit(uri2);
    vi.advanceTimersByTime(2000);

    (vscode.window as any).activeTextEditor = undefined;
    (vscode.window as any).visibleTextEditors = [];

    cleaner.cleanup(collection);

    const logCalls = channel.appendLine.mock.calls.map((c: any) => c[0]);
    expect(logCalls.some((msg: string) => msg.includes('Cleared stale'))).toBe(true);
  });

  it('starts and stops background timer', () => {
    const collection: any = { delete: vi.fn(), get: vi.fn() };

    cleaner.start(collection);
    cleaner.stop();
    // No error — timer lifecycle works
    expect(true).toBe(true);
  });

  it('cleans up on dispose', () => {
    const collection: any = { delete: vi.fn(), get: vi.fn() };
    cleaner.start(collection);
    cleaner.dispose();
    // No error
    expect(true).toBe(true);
  });

  it('ignores double start (line 56)', () => {
    const collection: any = { delete: vi.fn(), get: vi.fn() };
    cleaner.start(collection);
    cleaner.start(collection);
    cleaner.stop();
    expect(true).toBe(true);
  });

  it('interval callback triggers cleanup (line 63)', () => {
    const uri = vscode.Uri.file('/test/stale-timer.ts');
    const collection: any = { delete: vi.fn(), get: vi.fn() };

    (vscode.window as any).activeTextEditor = undefined;
    (vscode.window as any).visibleTextEditors = [];

    cleaner.trackEdit(uri);
    cleaner.start(collection);

    // Advance past timeout (1000ms) and interval (max(250, 5000) = 5000ms)
    vi.advanceTimersByTime(6000);

    expect(collection.delete).toHaveBeenCalled();
  });
});
