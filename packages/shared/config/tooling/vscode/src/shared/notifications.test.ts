/**
 * Tests for Notification Manager
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-60.md TASK 2
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { NotificationManager } from './notifications';
import * as output from './output';

vi.mock('./output', () => ({
  log: vi.fn(),
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
    notifications: {
      suppressed: 'Notification suppressed (already shown): {key}',
    },
  },
}));

describe('NotificationManager', () => {
  const mockChannel = { appendLine: vi.fn() } as unknown as vscode.OutputChannel;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('warnOnce', () => {
    it('shows warning first time', () => {
      const manager = new NotificationManager(mockChannel);
      manager.warnOnce('key1', 'First warning');
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('First warning');
    });

    it('suppresses second call with same key', () => {
      const manager = new NotificationManager(mockChannel);
      manager.warnOnce('key1', 'Warning');
      manager.warnOnce('key1', 'Warning');

      expect(vscode.window.showWarningMessage).toHaveBeenCalledOnce();
    });

    it('logs suppression to channel', () => {
      const manager = new NotificationManager(mockChannel);
      manager.warnOnce('myKey', 'Warning');
      manager.warnOnce('myKey', 'Warning again');

      expect(output.log).toHaveBeenCalledWith(
        mockChannel,
        'Notification suppressed (already shown): myKey',
      );
    });
  });

  describe('warnThrottled', () => {
    it('shows warning first time', () => {
      const manager = new NotificationManager(mockChannel);
      manager.warnThrottled('tkey', 'Throttled warning', 5000);
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('Throttled warning');
    });

    it('suppresses within cooldown period', () => {
      const manager = new NotificationManager(mockChannel);
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      manager.warnThrottled('tkey', 'Warning', 5000);

      vi.spyOn(Date, 'now').mockReturnValue(now + 3000);
      manager.warnThrottled('tkey', 'Warning', 5000);

      expect(vscode.window.showWarningMessage).toHaveBeenCalledOnce();
    });

    it('shows after cooldown expires', () => {
      const manager = new NotificationManager(mockChannel);
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      manager.warnThrottled('tkey', 'Warning', 5000);

      vi.spyOn(Date, 'now').mockReturnValue(now + 6000);
      manager.warnThrottled('tkey', 'Warning again', 5000);

      expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(2);
      expect(vscode.window.showWarningMessage).toHaveBeenLastCalledWith('Warning again');
    });
  });

  describe('reset', () => {
    it('resets a specific key so it can be shown again', () => {
      const manager = new NotificationManager(mockChannel);
      manager.warnOnce('key1', 'Warning');
      manager.reset('key1');
      manager.warnOnce('key1', 'Warning again');

      expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(2);
    });

    it('resets all keys when no argument given', () => {
      const manager = new NotificationManager(mockChannel);
      manager.warnOnce('key1', 'Warning 1');
      manager.warnOnce('key2', 'Warning 2');
      manager.reset();
      manager.warnOnce('key1', 'Warning 1 again');
      manager.warnOnce('key2', 'Warning 2 again');

      expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(4);
    });
  });

  describe('dispose', () => {
    it('clears all state', () => {
      const manager = new NotificationManager(mockChannel);
      manager.warnOnce('key1', 'Warning');
      manager.dispose();
      manager.warnOnce('key1', 'Warning after dispose');

      expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe('constructor', () => {
    it('works without channel', () => {
      const manager = new NotificationManager();
      manager.warnOnce('key1', 'Warning');
      manager.warnOnce('key1', 'Suppressed');

      expect(vscode.window.showWarningMessage).toHaveBeenCalledOnce();
      expect(output.log).not.toHaveBeenCalled();
    });

    it('warnThrottled suppression skips log when no channel (line 68)', () => {
      const manager = new NotificationManager();
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);
      manager.warnThrottled('tkey', 'Warning', 5000);
      vi.spyOn(Date, 'now').mockReturnValue(now + 3000);
      manager.warnThrottled('tkey', 'Warning', 5000);
      expect(vscode.window.showWarningMessage).toHaveBeenCalledOnce();
      expect(output.log).not.toHaveBeenCalled();
    });
  });
});
