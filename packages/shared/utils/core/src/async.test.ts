/**
 * Tests for async utilities.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import type { Message, NonNegativeInteger } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { withTimeout } from './async';

// ── Helpers ─────────────────────────────────────────────────────────────

const delay = (ms: number): Promise<string> =>
  new Promise((resolve) => setTimeout(() => resolve('done'), ms));

const delayReject = (ms: number): Promise<never> =>
  new Promise((_, reject) => setTimeout(() => reject(new Error('rejected')), ms));

// ── Happy path ──────────────────────────────────────────────────────────

describe('withTimeout — success', () => {
  it('resolves successfully within timeout', async () => {
    const result: Result<string> = await withTimeout(
      delay(10),
      1000 as NonNegativeInteger,
      'Should not timeout' as Message,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('done');
  });

  it('returns frozen result data', async () => {
    const result: Result<string> = await withTimeout(
      Promise.resolve('frozen'),
      1000 as NonNegativeInteger,
      'timeout' as Message,
    );
    expect(result.ok).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
  });
});

// ── Timeout ─────────────────────────────────────────────────────────────

describe('withTimeout — timeout', () => {
  it('returns timeout error when promise exceeds timeout', async () => {
    const result: Result<string> = await withTimeout(
      delay(500),
      50 as NonNegativeInteger,
      'Request timed out' as Message,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toContain('TIMEOUT');
    }
  });
});

// ── Zero timeout (disabled) ─────────────────────────────────────────────

describe('withTimeout — zero timeout', () => {
  it('resolves promise when timeoutMs is 0', async () => {
    const result: Result<string> = await withTimeout(
      Promise.resolve('instant'),
      0 as NonNegativeInteger,
      'timeout' as Message,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('instant');
  });

  it('returns error when promise rejects with timeoutMs 0', async () => {
    const result: Result<string> = await withTimeout(
      Promise.reject(new Error('boom')),
      0 as NonNegativeInteger,
      'failed' as Message,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.cause).toBeDefined();
    }
  });
});

// ── Promise rejection ───────────────────────────────────────────────────

describe('withTimeout — rejection', () => {
  it('returns error wrapping rejection cause', async () => {
    const result: Result<string> = await withTimeout(
      delayReject(10),
      1000 as NonNegativeInteger,
      'operation failed' as Message,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.cause).toBeDefined();
      expect(result.error.cause!.message).toBe('rejected');
    }
  });
});

// ── Input validation ────────────────────────────────────────────────────

describe('withTimeout — validation', () => {
  it('returns validation error for negative timeoutMs', async () => {
    const result: Result<string> = await withTimeout(
      Promise.resolve('x'),
      -1 as unknown as NonNegativeInteger,
      'timeout' as Message,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toContain('VALIDATION');
    }
  });

  it('returns validation error for empty errorMessage', async () => {
    const result: Result<string> = await withTimeout(
      Promise.resolve('x'),
      1000 as NonNegativeInteger,
      '' as unknown as Message,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toContain('VALIDATION');
    }
  });
});
