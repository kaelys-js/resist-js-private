/**
 * Tests for async testing utilities.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { retry, waitFor, withAbort, withTimeout } from './async';

async function captureError(p: Promise<unknown>): Promise<Error> {
  try {
    await p;
  } catch (error: unknown) {
    return error as Error;
  }
  throw new Error('expected rejection but promise resolved');
}

async function captureUnknown(p: Promise<unknown>): Promise<unknown> {
  try {
    await p;
  } catch (error: unknown) {
    return error;
  }
  throw new Error('expected rejection but promise resolved');
}

describe('async', () => {
  describe('waitFor', () => {
    it('resolves immediately when the first attempt succeeds', async () => {
      let calls: number = 0;
      await waitFor((): void => {
        calls += 1;
      });
      expect(calls).toBe(1);
    });

    it('retries until the callback stops throwing', async () => {
      let calls: number = 0;
      await waitFor(
        (): void => {
          calls += 1;
          if (calls < 3) {
            throw new Error('not yet');
          }
        },
        { interval: 5, timeout: 500 },
      );
      expect(calls).toBe(3);
    });

    it('rejects with the last error after timeout', async () => {
      const err: Error = await captureError(
        waitFor(
          (): void => {
            throw new Error('still failing');
          },
          { interval: 5, timeout: 20 },
        ),
      );
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('still failing');
    });

    it('accepts an async callback', async () => {
      let done: boolean = false;
      await waitFor(async (): Promise<void> => {
        await Promise.resolve();
        if (!done) {
          done = true;
          throw new Error('first');
        }
      });
      expect(done).toBe(true);
    });

    it('uses default options when none provided', async () => {
      let attempt: number = 0;
      await waitFor((): void => {
        attempt += 1;
        if (attempt === 1) {
          throw new Error('transient');
        }
      });
      expect(attempt).toBe(2);
    });

    it('rethrows final-attempt error when there is no prior error', async () => {
      /* Force the while-loop to not execute by providing a negative timeout. */
      const err: Error = await captureError(
        waitFor(
          (): void => {
            throw new Error('final only');
          },
          { timeout: -1, interval: 1 },
        ),
      );
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('final only');
    });
  });

  describe('retry', () => {
    it('returns on first success', async () => {
      const result: number = await retry((): number => 42);
      expect(result).toBe(42);
    });

    it('retries up to maxAttempts and returns last-attempt result', async () => {
      let attempt: number = 0;
      const result: string = await retry<string>(
        (): string => {
          attempt += 1;
          if (attempt < 3) {
            throw new Error('transient');
          }
          return 'ok';
        },
        { maxAttempts: 3 },
      );
      expect(result).toBe('ok');
      expect(attempt).toBe(3);
    });

    it('throws last error when all attempts fail', async () => {
      const err: Error = await captureError(
        retry<number>(
          (): number => {
            throw new Error('always fails');
          },
          { maxAttempts: 2 },
        ),
      );
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('always fails');
    });

    it('wraps non-Error rejections in Error', async () => {
      const err: Error = await captureError(
        retry<number>(
          (): number => {
            throw 'string-rejection';
          },
          { maxAttempts: 1 },
        ),
      );
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('string-rejection');
    });

    it('uses default options when none provided', async () => {
      let attempt: number = 0;
      const result: number = await retry<number>((): number => {
        attempt += 1;
        if (attempt < 3) {
          throw new Error('transient');
        }
        return attempt;
      });
      expect(result).toBe(3);
    });

    it('honors delay between attempts', async () => {
      let attempt: number = 0;
      const start: number = Date.now();
      await retry<number>(
        (): number => {
          attempt += 1;
          if (attempt < 2) {
            throw new Error('transient');
          }
          return attempt;
        },
        { maxAttempts: 2, delay: 20 },
      );
      const elapsed: number = Date.now() - start;
      expect(attempt).toBe(2);
      expect(elapsed).toBeGreaterThanOrEqual(15);
    });

    it('handles async functions', async () => {
      const result: number = await retry<number>(async (): Promise<number> => {
        await Promise.resolve();
        return 7;
      });
      expect(result).toBe(7);
    });
  });

  describe('withTimeout', () => {
    it('resolves when the promise resolves first', async () => {
      const result: number = await withTimeout(Promise.resolve(123), 1000);
      expect(result).toBe(123);
    });

    it('rejects with default message when promise is slower than deadline', async () => {
      const slow: Promise<number> = new Promise<number>((resolve: (v: number) => void): void => {
        setTimeout((): void => {
          resolve(1);
        }, 100);
      });
      const err: Error = await captureError(withTimeout(slow, 10));
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('Operation timed out after 10ms');
    });

    it('rejects with a custom message when provided', async () => {
      const slow: Promise<number> = new Promise<number>((resolve: (v: number) => void): void => {
        setTimeout((): void => {
          resolve(1);
        }, 100);
      });
      const err: Error = await captureError(withTimeout(slow, 5, 'slow!'));
      expect(err.message).toBe('slow!');
    });

    it('clears the timeout when the promise resolves', async () => {
      /* No assertion on timer internals — verify that the function returns and
       * subsequent microtasks run without the timer interfering. */
      const result: string = await withTimeout(Promise.resolve('done'), 1000);
      expect(result).toBe('done');
    });

    it('propagates rejections from the original promise', async () => {
      const err: Error = await captureError(
        withTimeout(Promise.reject(new Error('inner fail')), 1000),
      );
      expect(err.message).toBe('inner fail');
    });
  });

  describe('withAbort', () => {
    it('rejects immediately when signal is already aborted', async () => {
      const controller: AbortController = new AbortController();
      controller.abort(new Error('pre-aborted'));
      const err: Error = await captureError(withAbort(Promise.resolve(1), controller.signal));
      expect(err.message).toBe('pre-aborted');
    });

    it('rejects with a non-null reason when pre-aborted with no explicit reason', async () => {
      const controller: AbortController = new AbortController();
      controller.abort();
      const err: unknown = await captureUnknown(withAbort(Promise.resolve(1), controller.signal));
      /* Platform default reason is a DOMException with name 'AbortError'. */
      expect(err).toBeDefined();
      expect(err).not.toBeNull();
    });

    it('resolves when the promise resolves before abort', async () => {
      const controller: AbortController = new AbortController();
      const result: number = await withAbort(Promise.resolve(42), controller.signal);
      expect(result).toBe(42);
    });

    it('rejects with signal.reason when aborted mid-flight', async () => {
      const controller: AbortController = new AbortController();
      const slow: Promise<number> = new Promise<number>((resolve: (v: number) => void): void => {
        setTimeout((): void => {
          resolve(1);
        }, 100);
      });
      const wrapped: Promise<number> = withAbort(slow, controller.signal);
      controller.abort(new Error('user cancelled'));
      const err: Error = await captureError(wrapped);
      expect(err.message).toBe('user cancelled');
    });

    it('rejects with fallback Error when aborted with no reason', async () => {
      const controller: AbortController = new AbortController();
      /* Override reason to undefined via Proxy to hit the `?? new Error(...)` branch. */
      const realSignal: AbortSignal = controller.signal;
      const fakeSignal: AbortSignal = new Proxy(realSignal, {
        get(target: AbortSignal, prop: string | symbol): unknown {
          if (prop === 'reason') {
            return undefined;
          }

          const value: unknown = Reflect.get(target, prop);

          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
      const slow: Promise<number> = new Promise<number>((resolve: (v: number) => void): void => {
        setTimeout((): void => {
          resolve(1);
        }, 100);
      });
      const wrapped: Promise<number> = withAbort(slow, fakeSignal);
      controller.abort();
      const err: Error = await captureError(wrapped);
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('Aborted');
    });

    it('returns fallback Error when pre-aborted signal has no reason', async () => {
      const controller: AbortController = new AbortController();
      controller.abort();
      const realSignal: AbortSignal = controller.signal;
      const fakeSignal: AbortSignal = new Proxy(realSignal, {
        get(target: AbortSignal, prop: string | symbol): unknown {
          if (prop === 'reason') {
            return undefined;
          }

          const value: unknown = Reflect.get(target, prop);

          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
      const err: Error = await captureError(withAbort(Promise.resolve(1), fakeSignal));
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('Aborted');
    });
  });
});
