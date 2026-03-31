/**
 * Tests for Configuration Manager
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-60.md TASK 3-4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { __setConfigValue, __resetMocks } from 'vscode';
import { onConfigurationChange, ConfigManager } from './config';
import * as output from './output';
import * as errors from './errors';

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
      const registerCall = vi.mocked(vscode.workspace.onDidChangeConfiguration).mock.calls[0];
      const configChangeCallback = registerCall[0] as (event: {
        affectsConfiguration: (section: string) => boolean;
      }) => void;

      // Simulate a config change event that affects our section
      configChangeCallback({
        affectsConfiguration: (section: string) => section === 'resist.lint',
      });

      expect(handler).toHaveBeenCalledOnce();
    });

    it('ignores unrelated section changes', () => {
      const handler = vi.fn();
      onConfigurationChange('resist.lint', handler, mockChannel);

      const registerCall = vi.mocked(vscode.workspace.onDidChangeConfiguration).mock.calls[0];
      const configChangeCallback = registerCall[0] as (event: {
        affectsConfiguration: (section: string) => boolean;
      }) => void;

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

      const registerCall = vi.mocked(vscode.workspace.onDidChangeConfiguration).mock.calls[0];
      const configChangeCallback = registerCall[0] as (event: {
        affectsConfiguration: (section: string) => boolean;
      }) => void;

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

      const registerCall = vi.mocked(vscode.workspace.onDidChangeConfiguration).mock.calls[0];
      const configChangeCallback = registerCall[0] as (event: {
        affectsConfiguration: (section: string) => boolean;
      }) => void;

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
      const config = new ConfigManager('resist', mockChannel);
      const value = config.get<boolean>('lint.enable', false);
      expect(value).toBe(true);
      config.dispose();
    });

    it('returns defaults when key not set', () => {
      const config = new ConfigManager('resist', mockChannel);
      const value = config.get<number>('lint.maxProblems', 100);
      expect(value).toBe(100);
      config.dispose();
    });

    it('refreshes on config change', () => {
      const config = new ConfigManager('resist', mockChannel);

      // The constructor registers a config change listener
      const registerCall = vi.mocked(vscode.workspace.onDidChangeConfiguration).mock.calls[0];
      const configChangeCallback = registerCall[0] as (event: {
        affectsConfiguration: (section: string) => boolean;
      }) => void;

      configChangeCallback({
        affectsConfiguration: (section: string) => section === 'resist',
      });

      // getConfiguration should have been called again
      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('resist');
      config.dispose();
    });

    it('getSection returns raw config', () => {
      const config = new ConfigManager('resist', mockChannel);
      const section = config.getSection();
      expect(section).toBeDefined();
      expect(section.get).toBeDefined();
      config.dispose();
    });

    it('manual refresh works', () => {
      const config = new ConfigManager('resist', mockChannel);
      const initialCallCount = vi.mocked(vscode.workspace.getConfiguration).mock.calls.length;
      config.refresh();
      expect(vi.mocked(vscode.workspace.getConfiguration).mock.calls.length).toBe(
        initialCallCount + 1,
      );
      config.dispose();
    });

    it('dispose stops listening', () => {
      const config = new ConfigManager('resist', mockChannel);
      config.dispose();
      // The disposable returned by onDidChangeConfiguration should have been disposed
      const returnedDisposable = vi.mocked(vscode.workspace.onDidChangeConfiguration).mock
        .results[0].value;
      expect(returnedDisposable.dispose).toHaveBeenCalled();
    });
  });
});
