/**
 * Tests for Shared Error Boundary Helpers
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-56.md TASK 4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeRun, safeRunAsync } from './errors';
import * as output from './output';

vi.mock('./output', () => ({
  logError: vi.fn(),
}));

describe('Error Boundaries', () => {
  const mockChannel = { appendLine: vi.fn() } as unknown as import('vscode').OutputChannel;

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
        throw 'string error'; // eslint-disable-line no-throw-literal
      });
      safeRun(mockChannel, 'test', fn);
      expect(output.logError).toHaveBeenCalledWith(mockChannel, 'test: string error');
    });

    it('handles null thrown value', () => {
      const fn = vi.fn(() => {
        throw null; // eslint-disable-line no-throw-literal
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
      const fn = vi.fn(async () => {
        throw new Error('async boom');
      });
      await safeRunAsync(mockChannel, 'lintDocument', fn);
      expect(output.logError).toHaveBeenCalledWith(mockChannel, 'lintDocument: async boom');
    });

    it('handles rejected promise with non-Error value', async () => {
      const fn = vi.fn(() => Promise.reject(42));
      await safeRunAsync(mockChannel, 'test', fn);
      expect(output.logError).toHaveBeenCalledWith(mockChannel, 'test: 42');
    });

    it('does not re-throw async errors', async () => {
      const fn = vi.fn(async () => {
        throw new Error('should not propagate');
      });
      await expect(safeRunAsync(mockChannel, 'test', fn)).resolves.toBeUndefined();
    });
  });
});
