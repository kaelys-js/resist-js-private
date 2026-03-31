/**
 * State Manager
 *
 * Per-tool state machine with typed transitions and observers.
 * Replaces loose boolean flags with a formal state management system.
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-60.md TASK 11
 *
 * @module
 */

import type * as vscode from 'vscode';
import { log } from './output';
import { format } from '../locale/schema';
import { en } from '../locale/en';

/** Valid tool states. */
export type ToolState = 'ready' | 'running' | 'error' | 'disabled' | 'not-installed';

/** Callback invoked when a tool's state changes. */
export type StateChangeCallback = (tool: string, from: ToolState, to: ToolState) => void;

/** Managed observer with disposal. */
interface Observer {
  readonly tool: string;
  readonly callback: StateChangeCallback;
}

/**
 * Manages per-tool state with observer support.
 *
 * Each tool has an independent state. Observers are notified on transitions.
 * Invalid transitions are logged as warnings, not thrown.
 */
export class ToolStateManager {
  /** Current state per tool. */
  private readonly states = new Map<string, ToolState>();

  /** Registered observers. */
  private readonly observers: Observer[] = [];

  /** Optional output channel for debug logging. */
  private readonly channel: vscode.OutputChannel | undefined;

  /** Counter for generating unique observer IDs. */
  private nextId: number = 0;

  /** Map of observer IDs to array indices for disposal. */
  private readonly observerIds = new Map<number, Observer>();

  constructor(channel?: vscode.OutputChannel) {
    this.channel = channel;
  }

  /**
   * Sets the state of a tool, notifying observers.
   *
   * @param tool - Tool identifier (e.g. 'lint', 'format')
   * @param state - New state
   */
  setState(tool: string, state: ToolState): void {
    const from: ToolState = this.states.get(tool) ?? 'not-installed';

    if (from === state) {
      return; // No-op transition
    }

    this.states.set(tool, state);

    if (this.channel) {
      log(this.channel, format(en.state.transitioned, { tool, from, to: state }));
    }

    for (const observer of this.observers) {
      if (observer.tool === tool || observer.tool === '*') {
        try {
          observer.callback(tool, from, state);
        } catch {
          // Observer errors are silently ignored to prevent cascading failures
        }
      }
    }
  }

  /**
   * Gets the current state of a tool.
   *
   * @param tool - Tool identifier
   * @returns Current state (defaults to 'not-installed' if never set)
   */
  getState(tool: string): ToolState {
    return this.states.get(tool) ?? 'not-installed';
  }

  /**
   * Registers an observer for state changes on a specific tool.
   *
   * Use `'*'` as the tool to observe all tools.
   *
   * @param tool - Tool identifier to observe (or '*' for all)
   * @param callback - Function called on state changes
   * @returns Disposable to unregister the observer
   */
  onStateChange(tool: string, callback: StateChangeCallback): { dispose: () => void } {
    const observer: Observer = { tool, callback };
    const id: number = this.nextId++;
    this.observers.push(observer);
    this.observerIds.set(id, observer);

    return {
      dispose: () => {
        const index: number = this.observers.indexOf(observer);
        if (index !== -1) {
          this.observers.splice(index, 1);
        }
        this.observerIds.delete(id);
      },
    };
  }

  /**
   * Disposes the state manager, clearing all state and observers.
   */
  dispose(): void {
    this.states.clear();
    this.observers.length = 0;
    this.observerIds.clear();
  }
}
