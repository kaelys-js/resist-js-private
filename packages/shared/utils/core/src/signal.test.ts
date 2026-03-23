/**
 * Tests for signal and global error handling utilities.
 *
 * @module
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Bool, Str, Void } from '@/schemas/common';
import type { AppError, Result } from '@/schemas/result/result';
import type { CapturedError } from '@/schemas/result/captured-error';
import {
  getAbortSignal,
  reportError,
  setupGlobalErrorHandling,
  registerCleanupHandler,
  resetSignalHandlers,
} from './signal';

// ── Helpers ─────────────────────────────────────────────────────────────

const makeAppError = (overrides?: Partial<AppError>): AppError =>
  ({
    code: 'TEST.ERROR' as Str,
    message: 'Test error' as Str,
    id: '550e8400-e29b-41d4-a716-446655440000' as Str,
    timestamp: '2026-03-05T12:00:00.000Z' as Str,
    stack: '' as Str,
    ...overrides,
  }) as AppError;

afterEach(() => {
  resetSignalHandlers();
});

// ── getAbortSignal ──────────────────────────────────────────────────────

describe('getAbortSignal', () => {
  it('returns an AbortSignal', () => {
    const result: Result<AbortSignal> = getAbortSignal();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeInstanceOf(AbortSignal);
    }
  });

  it('returns same signal on subsequent calls', () => {
    const first: Result<AbortSignal> = getAbortSignal();
    const second: Result<AbortSignal> = getAbortSignal();
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.data).toBe(second.data);
    }
  });
});

// ── reportError ─────────────────────────────────────────────────────────

describe('reportError', () => {
  it('creates a CapturedError from AppError', () => {
    const appError = makeAppError();
    const result: Result<CapturedError> = reportError(appError);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.error.code).toBe('TEST.ERROR');
      expect(result.data.error.message).toBe('Test error');
      expect(result.data.id).toBeDefined();
      expect(result.data.timestamp).toBeDefined();
      expect(result.data.environment).toBeDefined();
    }
  });

  it('includes fingerprint from error code', () => {
    const result: Result<CapturedError> = reportError(makeAppError());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.fingerprint).toEqual(['TEST.ERROR']);
    }
  });

  it('sets type to resultError', () => {
    const result: Result<CapturedError> = reportError(makeAppError());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.type).toBe('resultError');
    }
  });

  it('defaults fatal to true', () => {
    const result: Result<CapturedError> = reportError(makeAppError());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.fatal).toBe(true);
    }
  });
});

// ── setupGlobalErrorHandling ────────────────────────────────────────────

describe('setupGlobalErrorHandling', () => {
  it('returns teardown function', () => {
    const onError = vi.fn();
    const result = setupGlobalErrorHandling({ onError });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeTypeOf('function');
      result.data(); // teardown
    }
  });

  it('returns cached teardown on second call (idempotent)', () => {
    const onError = vi.fn();
    const first = setupGlobalErrorHandling({ onError });
    const second = setupGlobalErrorHandling({ onError });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.data).toBe(second.data);
      first.data(); // teardown
    }
  });
});

// ── registerCleanupHandler ──────────────────────────────────────────────

describe('registerCleanupHandler', () => {
  it('accepts a cleanup callback', () => {
    const callback = vi.fn();
    const result: Result<Void> = registerCleanupHandler(callback);
    expect(result.ok).toBe(true);
  });
});

// ── resetSignalHandlers ─────────────────────────────────────────────────

describe('resetSignalHandlers', () => {
  it('resets state and returns ok', () => {
    const result: Result<Void> = resetSignalHandlers();
    expect(result.ok).toBe(true);
  });
});
