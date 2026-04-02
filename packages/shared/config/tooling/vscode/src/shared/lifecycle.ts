/**
 * Lifecycle Hook Manager
 *
 * Priority-based disposable registry for guaranteed ordered cleanup
 * on extension deactivation. Output channel is disposed last so errors
 * during cleanup can be logged.
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-60.md TASK 6
 *
 * @module
 */

import type * as vscode from 'vscode';
import { extractMessage } from './errors';
import { logError, log } from './output';
import { format } from '../locale/schema';
import { en } from '../locale/en';

/** A named disposable with priority for ordered cleanup. */
type ManagedDisposable = {
  readonly name: string;
  readonly disposable: vscode.Disposable;
  readonly priority: number;
};

/**
 * Manages extension lifecycle with priority-based disposal.
 *
 * Higher priority values are disposed first. Use priority 0 for
 * output channels (disposed last so cleanup errors can be logged).
 */
export class LifecycleManager {
  private readonly resources: ManagedDisposable[] = [];

  /**
   * Registers a named disposable with an optional priority.
   *
   * @param name - Human-readable name for debugging (e.g. 'config-watcher')
   * @param disposable - The disposable to manage
   * @param priority - Disposal priority (higher = disposed first, default 10)
   */
  register(name: string, disposable: vscode.Disposable, priority: number = 10): void {
    this.resources.push({ name, disposable, priority });
  }

  /**
   * Returns the number of managed resources.
   *
   * @returns The count of managed resources
   */
  count(): number {
    return this.resources.length;
  }

  /**
   * Disposes all managed resources in priority order (highest first).
   *
   * Each disposal is wrapped individually — one failure does not prevent
   * others from being disposed. Errors are logged to the channel.
   *
   * @param channel - Optional output channel for logging (should be the last to dispose)
   */
  disposeAll(channel?: vscode.OutputChannel): void {
    const sorted: ManagedDisposable[] = [...this.resources].toSorted(
      (a, b) => b.priority - a.priority,
    );

    for (const resource of sorted) {
      if (channel) {
        log(channel, format(en.lifecycle.disposing, { name: resource.name }));
      }
      try {
        resource.disposable.dispose();
      } catch (error: unknown) {
        const message: string = extractMessage(error);
        if (channel) {
          logError(
            channel,
            format(en.lifecycle.disposalError, { name: resource.name, error: message }),
          );
        }
      }
    }

    const total: number = this.resources.length;
    this.resources.length = 0;

    if (channel) {
      log(channel, format(en.lifecycle.disposed, { count: total }));
    }
  }
}
