/**
 * Tests for Document Event Registry.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { DocumentEventRegistry } from './events';
import { BRAND_NAME } from './brand';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockDoc(scheme = 'file', isUntitled = false): any {
  return {
    uri: { scheme, fsPath: '/test/file.ts', toString: () => '/test/file.ts' },
    isUntitled,
    languageId: 'typescript',
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

/** Extracts the last callback registered with a mock VS Code event function. */
function getLastCallback(mockFn: any): (...args: any[]) => void {
  const calls = mockFn.mock.calls;
  return calls[calls.length - 1][0];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DocumentEventRegistry', () => {
  let registry: DocumentEventRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new DocumentEventRegistry();
  });

  afterEach(() => {
    registry.dispose();
  });

  it('registers handlers and reports correct count', () => {
    const handler = vi.fn();
    registry.onOpen('lint', handler);
    registry.onOpen('format', handler);
    registry.onSave('lint', handler);

    expect(registry.handlerCount('open')).toBe(2);
    expect(registry.handlerCount('save')).toBe(1);
    expect(registry.handlerCount('change')).toBe(0);
    expect(registry.handlerCount('close')).toBe(0);
  });

  it('dispatches open events to registered handlers', () => {
    const handler = vi.fn();
    registry.onOpen('lint', handler);
    registry.initialize();

    const openCallback = getLastCallback(vscode.workspace.onDidOpenTextDocument);
    openCallback(createMockDoc());

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('dispatches save events to registered handlers', () => {
    const handler = vi.fn();
    registry.onSave('lint', handler);
    registry.initialize();

    const saveCallback = getLastCallback(vscode.workspace.onDidSaveTextDocument);
    saveCallback(createMockDoc());

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('dispatches change events to registered handlers', () => {
    const handler = vi.fn();
    registry.onChange('lint', handler);
    registry.initialize();

    const changeCallback = getLastCallback(vscode.workspace.onDidChangeTextDocument);
    changeCallback({ document: createMockDoc(), contentChanges: [{ text: 'x' }] });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('skips change events with no content changes', () => {
    const handler = vi.fn();
    registry.onChange('lint', handler);
    registry.initialize();

    const changeCallback = getLastCallback(vscode.workspace.onDidChangeTextDocument);
    changeCallback({ document: createMockDoc(), contentChanges: [] });

    expect(handler).not.toHaveBeenCalled();
  });

  it('dispatches close events to registered handlers', () => {
    const handler = vi.fn();
    registry.onClose('lint', handler);
    registry.initialize();

    const closeCallback = getLastCallback(vscode.workspace.onDidCloseTextDocument);
    closeCallback(createMockDoc());

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('filters non-workspace documents for open but not close', () => {
    const openHandler = vi.fn();
    const closeHandler = vi.fn();
    registry.onOpen('lint', openHandler);
    registry.onClose('lint', closeHandler);
    registry.initialize();

    const untitledDoc = createMockDoc('file', true);

    const openCallback = getLastCallback(vscode.workspace.onDidOpenTextDocument);
    openCallback(untitledDoc);
    expect(openHandler).not.toHaveBeenCalled();

    const closeCallback = getLastCallback(vscode.workspace.onDidCloseTextDocument);
    closeCallback(untitledDoc);
    expect(closeHandler).toHaveBeenCalledTimes(1);
  });

  it('isolates handler errors with output channel', () => {
    const channel = createMockChannel();
    const errorRegistry = new DocumentEventRegistry(channel);
    const badHandler = vi.fn(() => {
      throw new Error('handler boom');
    });
    const goodHandler = vi.fn();

    errorRegistry.onOpen('bad-tool', badHandler);
    errorRegistry.onOpen('good-tool', goodHandler);
    errorRegistry.initialize();

    const openCallback = getLastCallback(vscode.workspace.onDidOpenTextDocument);
    openCallback(createMockDoc());

    expect(badHandler).toHaveBeenCalledTimes(1);
    expect(goodHandler).toHaveBeenCalledTimes(1);

    errorRegistry.dispose();
  });

  it('clears all handlers and listeners on dispose', () => {
    registry.onOpen('lint', vi.fn());
    registry.onSave('lint', vi.fn());
    registry.initialize();

    registry.dispose();

    expect(registry.handlerCount('open')).toBe(0);
    expect(registry.handlerCount('save')).toBe(0);
  });

  it('does not double-initialize', () => {
    vi.clearAllMocks();
    registry.onOpen('lint', vi.fn());
    registry.initialize();
    const callCountAfterFirst = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls.length;

    registry.initialize();
    const callCountAfterSecond = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls
      .length;

    expect(callCountAfterSecond).toBe(callCountAfterFirst);
  });

  it('dispatches to multiple handlers for same event', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const handler3 = vi.fn();

    registry.onSave('lint', handler1);
    registry.onSave('format', handler2);
    registry.onSave('test', handler3);
    registry.initialize();

    const saveCallback = getLastCallback(vscode.workspace.onDidSaveTextDocument);
    saveCallback(createMockDoc());

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
    expect(handler3).toHaveBeenCalledTimes(1);
  });
});
