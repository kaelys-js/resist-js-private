/**
 * Status Bar Management
 *
 * Handles the VS Code status bar item for the formatter.
 *
 * @module
 */

import * as vscode from 'vscode';

let statusBarItem: vscode.StatusBarItem;

/**
 * Creates and shows the formatter status bar item.
 *
 * @param context - VS Code extension context for managing the status bar lifecycle
 * @returns The created status bar item
 */
export function createStatusBar(context: vscode.ExtensionContext): vscode.StatusBarItem {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
  statusBarItem.text = '$(symbol-color) Formatter';
  statusBarItem.tooltip = 'Resist Formatter - Click to format file';
  statusBarItem.command = 'resistFormatter.formatFile';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
  return statusBarItem;
}

/**
 * Updates the status bar icon and text to reflect the current formatter state.
 *
 * @param state - The current state: `'ready'`, `'formatting'`, or `'error'`
 */
export function updateStatusBar(state: 'ready' | 'formatting' | 'error'): void {
  if (!statusBarItem) return;

  switch (state) {
    case 'formatting':
      statusBarItem.text = '$(sync~spin) Formatting...';
      statusBarItem.backgroundColor = undefined;
      break;
    case 'error':
      statusBarItem.text = '$(error) Formatter';
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      break;
    case 'ready':
    default:
      statusBarItem.text = '$(symbol-color) Formatter';
      statusBarItem.backgroundColor = undefined;
      break;
  }
}
