/**
 * Command Registration Pattern
 *
 * Generic command registration with automatic error boundary wrapping.
 * Eliminates repeated `vscode.commands.registerCommand` + `safeRunAsync` patterns.
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-60.md TASK 5
 *
 * @module
 */

import * as vscode from 'vscode';
import { safeRunAsync } from './errors';

/**
 * Registers a VS Code command with automatic error boundary wrapping.
 *
 * The handler is wrapped in `safeRunAsync` so that errors are logged
 * to the output channel instead of crashing the extension.
 *
 * @param context - Extension context for subscription management
 * @param channel - Output channel for error logging
 * @param id - Command identifier (e.g. 'resist.lint.file')
 * @param handler - Async command handler
 */
export function registerCommand(
  context: vscode.ExtensionContext,
  channel: vscode.OutputChannel,
  id: string,
  handler: () => Promise<void>,
): void {
  const disposable: vscode.Disposable = vscode.commands.registerCommand(id, async () => {
    await safeRunAsync(channel, id, handler);
  });
  context.subscriptions.push(disposable);
}

/**
 * Registers a VS Code text editor command with automatic error boundary wrapping.
 *
 * Like `registerCommand`, but the handler receives the active text editor.
 *
 * @param context - Extension context for subscription management
 * @param channel - Output channel for error logging
 * @param id - Command identifier (e.g. 'resist.lint.fix')
 * @param handler - Async handler receiving the active text editor
 */
export function registerTextEditorCommand(
  context: vscode.ExtensionContext,
  channel: vscode.OutputChannel,
  id: string,
  handler: (editor: vscode.TextEditor) => Promise<void>,
): void {
  const disposable: vscode.Disposable = vscode.commands.registerTextEditorCommand(
    id,
    async (editor: vscode.TextEditor) => {
      await safeRunAsync(channel, id, () => handler(editor));
    },
  );
  context.subscriptions.push(disposable);
}
