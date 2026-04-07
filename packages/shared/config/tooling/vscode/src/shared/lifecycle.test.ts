/**
 * Tests for Lifecycle Hook Manager
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-60.md TASK 6
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type * as vscode from 'vscode';
import { LifecycleManager } from './lifecycle';
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
    lifecycle: {
      disposing: 'Disposing: {name}',
      disposed: 'Disposed {count} resources',
      disposalError: 'Disposal failed for {name}: {error}',
    },
  },
}));

describe('LifecycleManager', () => {
  const mockChannel = { appendLine: vi.fn() } as unknown as vscode.OutputChannel;
  let manager: LifecycleManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new LifecycleManager();
  });

  describe('register', () => {
    it('tracks resources', () => {
      manager.register('watcher', { dispose: vi.fn() });
      manager.register('config', { dispose: vi.fn() });
      expect(manager.count()).toBe(2);
    });

    it('count() returns correct value', () => {
      expect(manager.count()).toBe(0);
      manager.register('a', { dispose: vi.fn() });
      expect(manager.count()).toBe(1);
      manager.register('b', { dispose: vi.fn() });
      expect(manager.count()).toBe(2);
    });
  });

  describe('disposeAll', () => {
    it('disposes in priority order (highest first)', () => {
      const order: string[] = [];

      manager.register(
        'low',
        {
          dispose: () => {
            order.push('low');
          },
        },
        1,
      );
      manager.register(
        'high',
        {
          dispose: () => {
            order.push('high');
          },
        },
        100,
      );
      manager.register(
        'medium',
        {
          dispose: () => {
            order.push('medium');
          },
        },
        50,
      );

      manager.disposeAll(mockChannel);

      expect(order).toEqual(['high', 'medium', 'low']);
    });

    it('catches disposal errors and continues', () => {
      const disposeFn = vi.fn();
      manager.register('failing', {
        dispose: () => {
          throw new Error('dispose error');
        },
      });
      manager.register('succeeding', { dispose: disposeFn });

      expect(() => manager.disposeAll(mockChannel)).not.toThrow();
      expect(disposeFn).toHaveBeenCalledOnce();
    });

    it('logs disposal with channel', () => {
      manager.register('watcher', { dispose: vi.fn() });
      manager.disposeAll(mockChannel);

      expect(output.log).toHaveBeenCalledWith(mockChannel, 'Disposing: watcher');
      expect(output.log).toHaveBeenCalledWith(mockChannel, 'Disposed 1 resources');
    });

    it('clears resources after dispose', () => {
      manager.register('a', { dispose: vi.fn() });
      manager.register('b', { dispose: vi.fn() });
      expect(manager.count()).toBe(2);

      manager.disposeAll(mockChannel);
      expect(manager.count()).toBe(0);
    });
  });

  describe('error during disposal', () => {
    it('logs error', () => {
      manager.register('broken', {
        dispose: () => {
          throw new Error('kaboom');
        },
      });
      manager.disposeAll(mockChannel);

      expect(output.logError).toHaveBeenCalledWith(
        mockChannel,
        'Disposal failed for broken: kaboom',
      );
    });

    it('continues disposing others after error', () => {
      const disposeFn = vi.fn();
      manager.register(
        'broken',
        {
          dispose: () => {
            throw new Error('fail');
          },
        },
        20,
      );
      manager.register('ok', { dispose: disposeFn }, 10);

      manager.disposeAll(mockChannel);

      expect(disposeFn).toHaveBeenCalledOnce();
    });

    it('disposeAll works without channel (line 69)', () => {
      const disposeFn = vi.fn();
      manager.register('res1', { dispose: disposeFn }, 10);
      manager.disposeAll();
      expect(disposeFn).toHaveBeenCalledOnce();
    });

    it('disposeAll without channel swallows errors silently (line 77)', () => {
      const disposeFn = vi.fn();
      manager.register(
        'broken',
        {
          dispose: () => {
            throw new Error('fail');
          },
        },
        20,
      );
      manager.register('ok', { dispose: disposeFn }, 10);
      manager.disposeAll();
      expect(disposeFn).toHaveBeenCalledOnce();
    });
  });
});
