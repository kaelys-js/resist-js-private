/**
 * Auto-Fix on Save
 *
 * Automatically applies all auto-fixable lint diagnostics when a file is saved.
 * Includes a loop guard to prevent save→fix→save infinite loops.
 *
 * @module
 */

import * as vscode from 'vscode';
import type { DiagnosticWithData } from './provider';
import { log } from '../shared/output';
import { en } from '../locale/en';
import { format } from '../locale/schema';

/** Default cooldown period to prevent fix→save loops. */
const LOOP_GUARD_MS = 500;

/**
 * Manages auto-fix on save behavior.
 *
 * When enabled, listens for document save events and applies all
 * auto-fixable diagnostics. Uses a loop guard to prevent infinite
 * save→fix→save cycles.
 */
export class FixOnSaveManager implements vscode.Disposable {
  private readonly recentlyFixed = new Map<string, number>();
  private readonly channel?: vscode.OutputChannel;
  private cleanupTimer?: NodeJS.Timeout;

  /**
   * Creates a new FixOnSaveManager.
   *
   * @param channel - Optional output channel for logging
   */
  constructor(channel?: vscode.OutputChannel) {
    this.channel = channel;
    // Periodic cleanup of stale loop guard entries
    this.cleanupTimer = setInterval(() => {
      const now: number = Date.now();
      for (const [key, timestamp] of this.recentlyFixed) {
        if (now - timestamp > LOOP_GUARD_MS * 2) {
          this.recentlyFixed.delete(key);
        }
      }
    }, LOOP_GUARD_MS * 4);
  }

  /**
   * Handles a document save event by applying auto-fixes.
   *
   * @param doc - The saved document
   * @param diagnosticCollection - Collection containing current diagnostics
   * @returns True if fixes were applied, false otherwise
   */
  async handleSave(
    doc: vscode.TextDocument,
    diagnosticCollection: vscode.DiagnosticCollection,
  ): Promise<boolean> {
    const uriKey: string = doc.uri.toString();

    // Loop guard: skip if we recently fixed this file
    const lastFixed: number | undefined = this.recentlyFixed.get(uriKey);
    if (lastFixed !== undefined && Date.now() - lastFixed < LOOP_GUARD_MS) {
      if (this.channel) {
        log(this.channel, en.fixOnSave.loopGuard);
      }
      return false;
    }

    // Collect fixable diagnostics
    const diagnostics: readonly vscode.Diagnostic[] = diagnosticCollection.get(doc.uri) ?? [];
    const fixes: Array<{ start: number; end: number; text: string }> = [];

    for (const diag of diagnostics) {
      const { data } = diag as DiagnosticWithData;
      if (data?.fix && !(data.fix.range.start === data.fix.range.end && data.fix.text === '')) {
        fixes.push({
          start: data.fix.range.start,
          end: data.fix.range.end,
          text: data.fix.text,
        });
      }
    }

    if (fixes.length === 0) {
      if (this.channel) {
        log(this.channel, en.fixOnSave.skippedNoFixes);
      }
      return false;
    }

    // Sort descending by offset to avoid shift issues
    fixes.sort((a, b) => b.start - a.start);

    const edit = new vscode.WorkspaceEdit();
    for (const fix of fixes) {
      const startPos: vscode.Position = doc.positionAt(fix.start);
      const endPos: vscode.Position = doc.positionAt(fix.end);
      edit.replace(doc.uri, new vscode.Range(startPos, endPos), fix.text);
    }

    // Mark as recently fixed BEFORE applying to prevent re-trigger
    this.recentlyFixed.set(uriKey, Date.now());

    const applied: boolean = await vscode.workspace.applyEdit(edit);
    if (applied && this.channel) {
      log(this.channel, format(en.fixOnSave.applied, { count: fixes.length }));
    }

    return applied;
  }

  /**
   * Disposes the manager, clearing timers and state.
   */
  dispose(): void {
    if (this.cleanupTimer !== undefined) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.recentlyFixed.clear();
  }
}
