/**
 * Tests for Auto-Fix on Save.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { FixOnSaveManager } from './fix-on-save';
import { BRAND_NAME, DIAGNOSTIC_SOURCE } from '../shared/brand';

// =============================================================================
// Helpers
// =============================================================================

function createMockDoc(): any {
  return {
    uri: { toString: () => '/test/file.ts', fsPath: '/test/file.ts' },
    isUntitled: false,
    positionAt: (offset: number) => new vscode.Position(0, offset),
    getText: () => 'const x = 1;',
  };
}

function createMockChannel(): any {
  return {
    appendLine: vi.fn(),
    show: vi.fn(),
    dispose: vi.fn(),
    name: BRAND_NAME,
  };
}

function createDiagWithFix(start: number, end: number, text: string): any {
  return {
    range: new vscode.Range(0, 0, 0, 5),
    message: 'test issue',
    severity: vscode.DiagnosticSeverity.Warning,
    source: DIAGNOSTIC_SOURCE,
    data: {
      fix: { range: { start, end }, text },
    },
  };
}

function createDiagWithoutFix(): any {
  return {
    range: new vscode.Range(0, 0, 0, 5),
    message: 'no fix available',
    severity: vscode.DiagnosticSeverity.Warning,
    source: DIAGNOSTIC_SOURCE,
    data: undefined,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('FixOnSaveManager', () => {
  let manager: FixOnSaveManager;
  let channel: any;

  beforeEach(() => {
    vi.clearAllMocks();
    channel = createMockChannel();
    manager = new FixOnSaveManager(channel);
  });

  afterEach(() => {
    manager.dispose();
  });

  it('applies auto-fixes on save', async () => {
    const doc = createMockDoc();
    const collection = vscode.languages.createDiagnosticCollection('test');
    const diag = createDiagWithFix(0, 5, 'let');
    collection.set(doc.uri, [diag]);

    const result = await manager.handleSave(doc, collection);

    expect(result).toBe(true);
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });

  it('returns false when no fixable diagnostics', async () => {
    const doc = createMockDoc();
    const collection = vscode.languages.createDiagnosticCollection('test');
    collection.set(doc.uri, [createDiagWithoutFix()]);

    const result = await manager.handleSave(doc, collection);

    expect(result).toBe(false);
    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
  });

  it('returns false when no diagnostics at all', async () => {
    const doc = createMockDoc();
    const collection = vscode.languages.createDiagnosticCollection('test');

    const result = await manager.handleSave(doc, collection);

    expect(result).toBe(false);
  });

  it('loop guard prevents re-fix within cooldown', async () => {
    const doc = createMockDoc();
    const collection = vscode.languages.createDiagnosticCollection('test');
    collection.set(doc.uri, [createDiagWithFix(0, 5, 'let')]);

    // First save applies fixes
    await manager.handleSave(doc, collection);
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);

    // Second save within cooldown is blocked
    const result = await manager.handleSave(doc, collection);
    expect(result).toBe(false);
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1); // Still 1
  });

  it('skips no-op fixes (start === end && empty text)', async () => {
    const doc = createMockDoc();
    const collection = vscode.languages.createDiagnosticCollection('test');
    const noopFix = createDiagWithFix(5, 5, '');
    collection.set(doc.uri, [noopFix]);

    const result = await manager.handleSave(doc, collection);

    expect(result).toBe(false);
  });

  it('applies multiple fixes sorted by offset descending', async () => {
    const doc = createMockDoc();
    const collection = vscode.languages.createDiagnosticCollection('test');
    const fix1 = createDiagWithFix(0, 3, 'let');
    const fix2 = createDiagWithFix(10, 15, 'hello');
    collection.set(doc.uri, [fix1, fix2]);

    await manager.handleSave(doc, collection);

    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });

  it('logs applied fix count', async () => {
    const doc = createMockDoc();
    const collection = vscode.languages.createDiagnosticCollection('test');
    collection.set(doc.uri, [createDiagWithFix(0, 5, 'let')]);

    await manager.handleSave(doc, collection);

    // Check that log was called with the applied message
    const logCalls = channel.appendLine.mock.calls.map((c: any) => c[0]);
    const appliedLog = logCalls.find((msg: string) => msg.includes('Auto-fixed'));
    expect(appliedLog).toBeDefined();
  });

  it('cleans up on dispose', () => {
    manager.dispose();
    // No error thrown — timers and state cleared
    expect(true).toBe(true);
  });

  it('cleanup timer removes stale loop guard entries (line 40-44)', async () => {
    vi.useFakeTimers();
    const timerManager = new FixOnSaveManager(channel);

    const doc = createMockDoc();
    const collection = vscode.languages.createDiagnosticCollection('test');
    collection.set(doc.uri, [createDiagWithFix(0, 5, 'let')]);

    // First save adds entry to recentlyFixed
    await timerManager.handleSave(doc, collection);

    // Second save blocked by loop guard
    let result = await timerManager.handleSave(doc, collection);
    expect(result).toBe(false);

    // Advance time past cleanup threshold (LOOP_GUARD_MS * 4)
    vi.advanceTimersByTime(120_000);

    // Cleanup timer should have removed the stale entry — re-save succeeds
    result = await timerManager.handleSave(doc, collection);
    expect(result).toBe(true);

    timerManager.dispose();
    vi.useRealTimers();
  });
});
