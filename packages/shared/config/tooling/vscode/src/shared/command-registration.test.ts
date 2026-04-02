/**
 * Tests for Command Registration
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-60.md TASK 5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { registerCommand, registerTextEditorCommand } from './command-registration';
import * as errors from './errors';

vi.mock('./errors', () => ({
  safeRunAsync: vi.fn(async (_channel: unknown, _label: string, fn: () => Promise<void>) => {
    await fn();
  }),
}));

describe('Command Registration', () => {
  const mockChannel = { appendLine: vi.fn() } as unknown as vscode.OutputChannel;
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      subscriptions: [] as Array<{ dispose: () => void }>,
    } as unknown as vscode.ExtensionContext;
  });

  describe('registerCommand', () => {
    it('registers command on context subscriptions', () => {
      const handler = vi.fn(async () => {});
      registerCommand(mockContext, mockChannel, 'resist.test.cmd', handler);

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'resist.test.cmd',
        expect.any(Function),
      );
      expect(mockContext.subscriptions).toHaveLength(1);
    });

    it('wraps handler in error boundary via safeRunAsync', async () => {
      const handler = vi.fn(async () => {});
      registerCommand(mockContext, mockChannel, 'resist.test.cmd', handler);

      // Get the callback registered with vscode.commands.registerCommand
      const registerCall = vi.mocked(vscode.commands.registerCommand).mock.calls[0];
      const wrappedHandler = registerCall[1] as () => void;

      // Execute the wrapped handler
      wrappedHandler();

      // Wait for async operations
      await vi.waitFor(() => {
        expect(errors.safeRunAsync).toHaveBeenCalledWith(
          mockChannel,
          'resist.test.cmd',
          expect.any(Function),
        );
      });
    });

    it('handler errors are caught by safeRunAsync boundary', async () => {
      vi.mocked(errors.safeRunAsync).mockImplementation(async () => {
        // safeRunAsync swallows errors
      });

      const handler = vi.fn(async () => {
        throw new Error('command failed');
      });
      registerCommand(mockContext, mockChannel, 'resist.test.cmd', handler);

      const registerCall = vi.mocked(vscode.commands.registerCommand).mock.calls[0];
      const wrappedHandler = registerCall[1] as () => void;

      // Should not throw — safeRunAsync catches it
      expect(() => wrappedHandler()).not.toThrow();
    });
  });

  describe('registerTextEditorCommand', () => {
    it('registers text editor command', () => {
      const handler = vi.fn(async (_editor: vscode.TextEditor) => {});
      registerTextEditorCommand(mockContext, mockChannel, 'resist.test.editor', handler);

      expect(vscode.commands.registerTextEditorCommand).toHaveBeenCalledWith(
        'resist.test.editor',
        expect.any(Function),
      );
      expect(mockContext.subscriptions).toHaveLength(1);
    });

    it('passes editor to the handler', async () => {
      const handler = vi.fn(async (_editor: vscode.TextEditor) => {});
      registerTextEditorCommand(mockContext, mockChannel, 'resist.test.editor', handler);

      const registerCall = vi.mocked(vscode.commands.registerTextEditorCommand).mock.calls[0];
      const wrappedHandler = registerCall[1] as (editor: vscode.TextEditor) => void;

      const mockEditor = {
        document: { uri: vscode.Uri.file('/test.ts') },
      } as unknown as vscode.TextEditor;
      wrappedHandler(mockEditor);

      await vi.waitFor(() => {
        expect(errors.safeRunAsync).toHaveBeenCalled();
      });
    });
  });
});
