/**
 * Notification Manager
 *
 * Deduplicates and throttles VS Code warning/info notifications.
 * Replaces ad-hoc boolean flags like `hasWarnedMissingBinary`.
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-60.md TASK 2
 *
 * @module
 */

import * as vscode from 'vscode';
import { log } from './output';
import { format } from '../locale/schema';
import { en } from '../locale/en';

/**
 * Manages notification deduplication and throttling.
 *
 * Use `warnOnce` for notifications that should only appear once per session.
 * Use `warnThrottled` for notifications that can repeat after a cooldown.
 */
export class NotificationManager {
  /** Keys that have been shown (for warnOnce). */
  private readonly shownKeys = new Set<string>();

  /** Timestamps of last-shown notification (for warnThrottled). */
  private readonly lastShown = new Map<string, number>();

  /** Output channel for logging suppressed notifications. */
  private readonly channel: vscode.OutputChannel | undefined;

  constructor(channel?: vscode.OutputChannel) {
    this.channel = channel;
  }

  /**
   * Shows a warning notification only once per session for the given key.
   *
   * Subsequent calls with the same key are suppressed and logged.
   *
   * @param key - Unique identifier for this notification
   * @param message - The warning message to show
   */
  warnOnce(key: string, message: string): void {
    if (this.shownKeys.has(key)) {
      if (this.channel) {
        log(this.channel, format(en.notifications.suppressed, { key }));
      }
      return;
    }
    this.shownKeys.add(key);
    vscode.window.showWarningMessage(message);
  }

  /**
   * Shows a warning notification at most once per cooldown period.
   *
   * @param key - Unique identifier for this notification
   * @param message - The warning message to show
   * @param cooldownMs - Minimum time between showing this notification (ms)
   */
  warnThrottled(key: string, message: string, cooldownMs: number): void {
    const now: number = Date.now();
    const lastTime: number | undefined = this.lastShown.get(key);

    if (lastTime !== undefined && now - lastTime < cooldownMs) {
      if (this.channel) {
        log(this.channel, format(en.notifications.suppressed, { key }));
      }
      return;
    }

    this.lastShown.set(key, now);
    vscode.window.showWarningMessage(message);
  }

  /**
   * Resets notification state for a specific key or all keys.
   *
   * @param key - Optional key to reset. If omitted, resets all keys.
   */
  reset(key?: string): void {
    if (key !== undefined) {
      this.shownKeys.delete(key);
      this.lastShown.delete(key);
    } else {
      this.shownKeys.clear();
      this.lastShown.clear();
    }
  }

  /**
   * Disposes the notification manager, clearing all state.
   */
  dispose(): void {
    this.shownKeys.clear();
    this.lastShown.clear();
  }
}
