/**
 * Configuration Manager
 *
 * Provides typed settings access and configuration change listening.
 * Replaces scattered `vscode.workspace.getConfiguration('resist')` calls.
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-60.md TASK 3-4
 *
 * @module
 */

import * as vscode from 'vscode';
import { safeRun } from './errors';
import { log } from './output';
import { format } from '../locale/schema';
import { en } from '../locale/en';

/**
 * Creates a disposable configuration change listener for a specific section.
 *
 * Handler is wrapped in safeRun — errors are logged, never swallowed.
 *
 * @param section - Configuration section to watch (e.g. 'resist.lint')
 * @param handler - Callback invoked when the section changes
 * @param channel - Optional output channel for error logging
 * @returns Disposable to stop listening
 */
export function onConfigurationChange(
  section: string,
  handler: () => void,
  channel?: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration(section)) {
      if (channel) {
        log(channel, format(en.config.changeDetected, { section }));
      }
      if (channel) {
        safeRun(channel, `config-change:${section}`, handler);
      } else {
        handler();
      }
    }
  });
}

/**
 * Typed configuration manager with caching and auto-refresh.
 *
 * Wraps `vscode.workspace.getConfiguration` with type-safe accessors
 * and automatic cache invalidation on configuration changes.
 */
export class ConfigManager {
  /** The configuration section prefix (e.g. 'resist'). */
  private readonly prefix: string;

  /** Cached workspace configuration object. */
  private config: vscode.WorkspaceConfiguration;

  /** Optional output channel for debug logging. */
  private readonly channel: vscode.OutputChannel | undefined;

  /** Disposable for the configuration change listener. */
  private readonly disposable: vscode.Disposable;

  /**
   * Creates a new ConfigManager.
   *
   * @param prefix - Configuration section prefix (e.g. 'resist')
   * @param channel - Optional output channel for debug logging
   */
  constructor(prefix: string, channel?: vscode.OutputChannel) {
    this.prefix = prefix;
    this.channel = channel;
    this.config = vscode.workspace.getConfiguration(prefix);

    this.disposable = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(prefix)) {
        this.config = vscode.workspace.getConfiguration(prefix);
        if (this.channel) {
          log(this.channel, en.config.refreshed);
        }
      }
    });
  }

  /**
   * Gets a typed configuration value.
   *
   * @param key - Configuration key relative to the prefix (e.g. 'lint.enable')
   * @param defaultValue - Default value if the key is not set
   * @returns The configuration value
   */
  get<T>(key: string, defaultValue: T): T {
    return this.config.get<T>(key, defaultValue);
  }

  /**
   * Gets the raw workspace configuration for the managed section.
   *
   * @returns The VS Code WorkspaceConfiguration object
   */
  getSection(): vscode.WorkspaceConfiguration {
    return this.config;
  }

  /**
   * Forces a cache refresh. Useful after programmatic configuration changes.
   */
  refresh(): void {
    this.config = vscode.workspace.getConfiguration(this.prefix);
    if (this.channel) {
      log(this.channel, en.config.refreshed);
    }
  }

  /**
   * Disposes the configuration manager and its change listener.
   */
  dispose(): void {
    this.disposable.dispose();
  }
}
