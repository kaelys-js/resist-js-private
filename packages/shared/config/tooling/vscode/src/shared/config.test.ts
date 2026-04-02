/**
 * Tests for Configuration Manager
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-60.md TASK 3-4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
// @ts-expect-error -- mock-only export
import { __setConfigValue, __resetMocks } from 'vscode';
import { onConfigurationChange, ConfigManager } from './config';
import * as errors from './errors';
import { CONFIG_SECTION } from './brand';

vi.mock('./output', () => ({
  log: vi.fn(),
}));

vi.mock('./errors', () => ({
  safeRun: vi.fn((_channel: unknown, _label: string, fn: () => void) => {
    fn();
  }),
}));

vi.mock('../locale/schema', () => ({
  format: vi.fn((template: string, params: Record<string, string | number>) => {
    let result: string = template;
    for (const [key, value] of Object.entries(params)) {
      result = result.replaceAll(`{${key}}`, String(value));
    }
    return result;
  }),
}));

vi.mock('../locale/en', () => ({
  en: {
    config: {
      changeDetected: 'Configuration change detected for section: {section}',
      refreshed: 'Configuration cache refreshed',
    },
  },
}));

describe('Configuration', () => {
  const mockChannel = { appendLine: vi.fn() } as unknown as vscode.OutputChannel;

  beforeEach(() => {
    vi.clearAllMocks();
    __resetMocks();
  });

  describe('onConfigurationChange', () => {
    it('fires handler when section matches', () => {
      const handler = vi.fn();
      onConfigurationChange('resist.lint', handler, mockChannel);

      // Get the callback registered with onDidChangeConfiguration
      const [configChangeCallback] = vi.mocked(vscode.workspace.onDidChangeConfiguration).mock
        .calls[0]! as [(event: { affectsConfiguration: (section: string) => boolean }) => void];

      // Simulate a config change event that affects our section
      configChangeCallback({
        affectsConfiguration: (section: string) => section === 'resist.lint',
      });

      expect(handler).toHaveBeenCalledOnce();
    });

    it('ignores unrelated section changes', () => {
      const handler = vi.fn();
      onConfigurationChange('resist.lint', handler, mockChannel);

      const [configChangeCallback] = vi.mocked(vscode.workspace.onDidChangeConfiguration).mock
        .calls[0]! as [(event: { affectsConfiguration: (section: string) => boolean }) => void];

      configChangeCallback({
        affectsConfiguration: (section: string) => section === 'editor.fontSize',
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('returns a disposable', () => {
      const handler = vi.fn();
      const disposable = onConfigurationChange('resist.lint', handler, mockChannel);
      expect(disposable).toBeDefined();
      expect(disposable.dispose).toBeDefined();
    });

    it('wraps handler in safeRun when channel provided', () => {
      const handler = vi.fn();
      onConfigurationChange('resist.lint', handler, mockChannel);

      const [configChangeCallback] = vi.mocked(vscode.workspace.onDidChangeConfiguration).mock
        .calls[0]! as [(event: { affectsConfiguration: (section: string) => boolean }) => void];

      configChangeCallback({
        affectsConfiguration: (section: string) => section === 'resist.lint',
      });

      expect(errors.safeRun).toHaveBeenCalledWith(
        mockChannel,
        'config-change:resist.lint',
        handler,
      );
    });

    it('calls handler directly without channel', () => {
      const handler = vi.fn();
      onConfigurationChange('resist.lint', handler);

      const [configChangeCallback] = vi.mocked(vscode.workspace.onDidChangeConfiguration).mock
        .calls[0]! as [(event: { affectsConfiguration: (section: string) => boolean }) => void];

      configChangeCallback({
        affectsConfiguration: (section: string) => section === 'resist.lint',
      });

      expect(handler).toHaveBeenCalledOnce();
      expect(errors.safeRun).not.toHaveBeenCalled();
    });
  });

  describe('ConfigManager', () => {
    it('gets typed values', () => {
      __setConfigValue('resist.lint.enable', true);
      const config = new ConfigManager(CONFIG_SECTION, mockChannel);
      const value = config.get<boolean>('lint.enable', false);
      expect(value).toBe(true);
      config.dispose();
    });

    it('returns defaults when key not set', () => {
      const config = new ConfigManager(CONFIG_SECTION, mockChannel);
      const value = config.get<number>('lint.maxProblems', 100);
      expect(value).toBe(100);
      config.dispose();
    });

    it('refreshes on config change', () => {
      const config = new ConfigManager(CONFIG_SECTION, mockChannel);

      // The constructor registers a config change listener
      const [configChangeCallback] = vi.mocked(vscode.workspace.onDidChangeConfiguration).mock
        .calls[0]! as [(event: { affectsConfiguration: (section: string) => boolean }) => void];

      configChangeCallback({
        affectsConfiguration: (section: string) => section === CONFIG_SECTION,
      });

      // getConfiguration should have been called again
      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith(CONFIG_SECTION);
      config.dispose();
    });

    it('getSection returns raw config', () => {
      const config = new ConfigManager(CONFIG_SECTION, mockChannel);
      const section = config.getSection();
      expect(section).toBeDefined();
      expect(section.get).toBeDefined();
      config.dispose();
    });

    it('manual refresh works', () => {
      const config = new ConfigManager(CONFIG_SECTION, mockChannel);
      const initialCallCount = vi.mocked(vscode.workspace.getConfiguration).mock.calls.length;
      config.refresh();
      expect(vi.mocked(vscode.workspace.getConfiguration).mock.calls.length).toBe(
        initialCallCount + 1,
      );
      config.dispose();
    });

    it('dispose stops listening', () => {
      const config = new ConfigManager(CONFIG_SECTION, mockChannel);
      config.dispose();
      // The disposable returned by onDidChangeConfiguration should have been disposed
      const returnedDisposable = vi.mocked(vscode.workspace.onDidChangeConfiguration).mock
        .results[0]!.value;
      expect(returnedDisposable.dispose).toHaveBeenCalled();
    });
  });
});
