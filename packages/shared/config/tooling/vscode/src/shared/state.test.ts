/**
 * Tests for Tool State Manager
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-60.md TASK 11
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type * as vscode from 'vscode';
import { ToolStateManager } from './state';
import * as output from './output';

vi.mock('./output', () => ({
  log: vi.fn(),
  logError: vi.fn(),
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
    state: {
      transitioned: '{tool} state: {from} → {to}',
      observerError: 'Observer error for {tool}: {error}',
    },
  },
}));

describe('ToolStateManager', () => {
  const mockChannel = { appendLine: vi.fn() } as unknown as vscode.OutputChannel;
  let manager: ToolStateManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new ToolStateManager(mockChannel);
  });

  describe('setState/getState', () => {
    it('sets and retrieves state', () => {
      manager.setState('lint', 'ready');
      expect(manager.getState('lint')).toBe('ready');
    });

    it('defaults to not-installed', () => {
      expect(manager.getState('unknown-tool')).toBe('not-installed');
    });

    it('updates state across transitions', () => {
      manager.setState('lint', 'ready');
      manager.setState('lint', 'running');
      manager.setState('lint', 'error');
      expect(manager.getState('lint')).toBe('error');
    });
  });

  describe('observers', () => {
    it('notifies on state change', () => {
      const callback = vi.fn();
      manager.onStateChange('lint', callback);

      manager.setState('lint', 'ready');

      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith('lint', 'not-installed', 'ready');
    });

    it('wildcard observer gets all changes', () => {
      const callback = vi.fn();
      manager.onStateChange('*', callback);

      manager.setState('lint', 'ready');
      manager.setState('format', 'running');

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith('lint', 'not-installed', 'ready');
      expect(callback).toHaveBeenCalledWith('format', 'not-installed', 'running');
    });

    it('dispose stops notifications', () => {
      const callback = vi.fn();
      const disposable = manager.onStateChange('lint', callback);

      manager.setState('lint', 'ready');
      expect(callback).toHaveBeenCalledOnce();

      disposable.dispose();
      manager.setState('lint', 'running');
      expect(callback).toHaveBeenCalledOnce(); // Still 1, not 2
    });

    it('does not notify observer for different tool', () => {
      const callback = vi.fn();
      manager.onStateChange('format', callback);

      manager.setState('lint', 'ready');

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('no-op transitions', () => {
    it('same state does not trigger observers', () => {
      const callback = vi.fn();
      manager.onStateChange('lint', callback);

      manager.setState('lint', 'ready');
      manager.setState('lint', 'ready'); // No-op

      expect(callback).toHaveBeenCalledOnce();
    });
  });

  describe('observer errors', () => {
    it('observer errors do not crash state manager', () => {
      const badCallback = vi.fn(() => {
        throw new Error('observer crash');
      });
      const goodCallback = vi.fn();

      manager.onStateChange('lint', badCallback);
      manager.onStateChange('lint', goodCallback);

      expect(() => manager.setState('lint', 'ready')).not.toThrow();
      expect(badCallback).toHaveBeenCalledOnce();
      expect(goodCallback).toHaveBeenCalledOnce();
    });

    it('logs observer errors to output channel', () => {
      const badCallback = vi.fn(() => {
        throw new Error('observer crash');
      });
      manager.onStateChange('lint', badCallback);

      manager.setState('lint', 'ready');

      expect(output.logError).toHaveBeenCalledOnce();
      expect(output.logError).toHaveBeenCalledWith(
        mockChannel,
        'Observer error for lint: observer crash',
      );
    });
  });

  describe('dispose', () => {
    it('clears all state and observers', () => {
      const callback = vi.fn();
      manager.onStateChange('lint', callback);
      manager.setState('lint', 'ready');

      manager.dispose();

      expect(manager.getState('lint')).toBe('not-installed');
      // After dispose, observers are cleared too
      manager.setState('lint', 'running');
      expect(callback).toHaveBeenCalledOnce(); // Only the first call before dispose
    });
  });
});
