/**
 * Stale Diagnostic Cleanup
 *
 * Clears diagnostics for files that haven't been edited within a
 * configurable timeout. Skips visible editors to avoid removing
 * diagnostics the user is actively viewing.
 *
 * @module
 */

import * as vscode from 'vscode';
import { log } from '../shared/output';
import { en } from '../locale/en';
import { format } from '../locale/schema';

/**
 * Manages stale diagnostic cleanup.
 *
 * Tracks last-edited timestamps per document URI. A background timer
 * periodically checks for files that have been idle longer than the
 * configured timeout and clears their diagnostics.
 */
export class StaleDiagnosticCleaner implements vscode.Disposable {
  private readonly lastEdited = new Map<string, number>();
  private intervalTimer?: NodeJS.Timeout;
  private readonly channel?: vscode.OutputChannel;
  private readonly timeoutMs: number;

  /**
   * Creates a new StaleDiagnosticCleaner.
   *
   * @param timeoutMs - Time in ms after which diagnostics are considered stale
   * @param channel - Optional output channel for logging
   */
  constructor(timeoutMs: number = 300_000, channel?: vscode.OutputChannel) {
    this.timeoutMs = timeoutMs;
    this.channel = channel;
  }

  /**
   * Records that a document was recently edited.
   *
   * @param uri - The document URI
   */
  trackEdit(uri: vscode.Uri): void {
    this.lastEdited.set(uri.toString(), Date.now());
  }

  /**
   * Starts the background cleanup timer.
   *
   * @param collection - The diagnostic collection to clean
   */
  start(collection: vscode.DiagnosticCollection): void {
    if (this.intervalTimer) {
      return;
    }

    // Check every quarter of the timeout period
    const intervalMs: number = Math.max(this.timeoutMs / 4, 5000);

    this.intervalTimer = setInterval(() => {
      this.cleanup(collection);
    }, intervalMs);
  }

  /**
   * Stops the background cleanup timer.
   */
  stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = undefined;
    }
  }

  /**
   * Performs a cleanup pass, clearing stale diagnostics.
   *
   * @param collection - The diagnostic collection to clean
   */
  cleanup(collection: vscode.DiagnosticCollection): void {
    const now: number = Date.now();
    const visibleUris: Set<string> = getVisibleEditorUris();
    let clearedCount = 0;

    for (const [uriStr, lastTime] of this.lastEdited) {
      if (now - lastTime <= this.timeoutMs) {
        continue;
      }

      // Skip visible editors
      if (visibleUris.has(uriStr)) {
        if (this.channel) {
          log(this.channel, format(en.staleCleanup.skippedVisible, { file: uriStr }));
        }
        continue;
      }

      // Clear diagnostics
      const uri: vscode.Uri = vscode.Uri.file(uriStr);
      collection.delete(uri);
      this.lastEdited.delete(uriStr);
      clearedCount++;
    }

    if (clearedCount > 0 && this.channel) {
      log(this.channel, format(en.staleCleanup.cleared, { count: clearedCount }));
    }
  }

  /**
   * Disposes the cleaner, stopping the timer and clearing state.
   */
  dispose(): void {
    this.stop();
    this.lastEdited.clear();
  }
}

/**
 * Returns the set of URIs for all visible editors.
 *
 * @returns Set of URI strings for visible editors
 */
function getVisibleEditorUris(): Set<string> {
  const uris = new Set<string>();

  // Active editor
  const active: vscode.TextEditor | undefined = vscode.window.activeTextEditor;

  if (active) {
    uris.add(active.document.uri.toString());
  }

  // Visible editors (includes split views)
  if (vscode.window.visibleTextEditors) {
    for (const editor of vscode.window.visibleTextEditors) {
      uris.add(editor.document.uri.toString());
    }
  }

  return uris;
}
