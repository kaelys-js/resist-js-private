/**
 * Tests for Shared Error Boundary Helpers
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-56.md TASK 4
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OutputChannel } from 'vscode';
import { safeRun, safeRunAsync } from './errors';
import * as output from './output';

vi.mock('./output', () => ({
  logError: vi.fn(),
}));

describe('Error Boundaries', () => {
  const mockChannel = { appendLine: vi.fn() } as unknown as OutputChannel;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('safeRun', () => {
    it('executes function normally when no error', () => {
      const fn = vi.fn();
      safeRun(mockChannel, 'test-label', fn);
      expect(fn).toHaveBeenCalledOnce();
      expect(output.logError).not.toHaveBeenCalled();
    });

    it('catches sync errors and logs via logError', () => {
      const fn = vi.fn(() => {
        throw new Error('sync boom');
      });
      safeRun(mockChannel, 'onDidSave', fn);
      expect(output.logError).toHaveBeenCalledWith(mockChannel, 'onDidSave: sync boom');
    });

    it('handles non-Error thrown values', () => {
      const fn = vi.fn(() => {
        // Intentionally throw non-Error to test extractMessage fallback
        const nonError: unknown = 'string error';

        throw nonError;
      });
      safeRun(mockChannel, 'test', fn);
      expect(output.logError).toHaveBeenCalledWith(mockChannel, 'test: string error');
    });

    it('handles null thrown value', () => {
      const fn = vi.fn(() => {
        // Intentionally throw non-Error to test extractMessage fallback
        const nonError: unknown = null;

        throw nonError;
      });
      safeRun(mockChannel, 'test', fn);
      expect(output.logError).toHaveBeenCalledWith(mockChannel, 'test: null');
    });

    it('does not re-throw errors', () => {
      const fn = vi.fn(() => {
        throw new Error('should not propagate');
      });
      expect(() => safeRun(mockChannel, 'test', fn)).not.toThrow();
    });
  });

  describe('safeRunAsync', () => {
    it('executes async function normally when no error', async () => {
      const fn = vi.fn(async () => {});
      await safeRunAsync(mockChannel, 'test-label', fn);
      expect(fn).toHaveBeenCalledOnce();
      expect(output.logError).not.toHaveBeenCalled();
    });

    it('catches async errors and logs via logError', async () => {
      const error = new Error('async boom');
      const fn = vi.fn(async () => {
        await Promise.resolve();
        throw error;
      });
      await safeRunAsync(mockChannel, 'lintDocument', fn);
      expect(output.logError).toHaveBeenCalledWith(mockChannel, 'lintDocument: async boom');
    });

    it('handles rejected promise with non-Error value', async () => {
      const error = new Error('42');
      const fn = vi.fn(async () => {
        await Promise.resolve();
        throw error;
      });
      await safeRunAsync(mockChannel, 'test', fn);
      expect(output.logError).toHaveBeenCalledWith(mockChannel, 'test: 42');
    });

    it('does not re-throw async errors', async () => {
      const error = new Error('should not propagate');
      const fn = vi.fn(async () => {
        await Promise.resolve();
        throw error;
      });
      await expect(safeRunAsync(mockChannel, 'test', fn)).resolves.toBeUndefined();
    });
  });
});
