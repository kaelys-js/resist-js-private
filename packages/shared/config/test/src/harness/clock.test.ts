/**
 * Tests for fake-clock utilities.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi as rawVi } from 'vitest';
import { createFakeClock, type ViFakeTimerProvider, useFakeClock } from './clock';

const vi = rawVi as unknown as ViFakeTimerProvider & typeof rawVi;

describe('clock', () => {
  describe('createFakeClock', () => {
    it('installs fake timers and advances them', async () => {
      const clock = createFakeClock(vi);

      try {
        const spy = vi.fn();
        setTimeout(spy, 100);
        expect(spy).not.toHaveBeenCalled();
        await clock.advance(100);
        expect(spy).toHaveBeenCalledOnce();
      } finally {
        clock.restore();
      }
    });

    it('pins time to provided Date', () => {
      const fixed: Date = new Date('2024-06-15T12:00:00.000Z');
      const clock = createFakeClock(vi, fixed);

      try {
        expect(Date.now()).toBe(fixed.getTime());
      } finally {
        clock.restore();
      }
    });

    it('pins time to provided numeric timestamp', () => {
      const clock = createFakeClock(vi, 1_700_000_000_000);

      try {
        expect(Date.now()).toBe(1_700_000_000_000);
      } finally {
        clock.restore();
      }
    });

    it('runs all pending timers via runAll', async () => {
      const clock = createFakeClock(vi);

      try {
        const spy = vi.fn();
        setTimeout(spy, 1000);
        setTimeout(spy, 5000);
        await clock.runAll();
        expect(spy).toHaveBeenCalledTimes(2);
      } finally {
        clock.restore();
      }
    });

    it('restore reverts to real timers', () => {
      const clock = createFakeClock(vi);
      clock.restore();
      /* After restore, Date.now() returns real wall-clock time — must be > 2024. */
      expect(Date.now()).toBeGreaterThan(new Date('2024-01-01').getTime());
    });

    it('passes undefined options when no `now` argument provided', () => {
      const spy = vi.spyOn(vi, 'useFakeTimers');
      const clock = createFakeClock(vi);

      try {
        expect(spy).toHaveBeenCalledWith(undefined);
      } finally {
        clock.restore();
        spy.mockRestore();
      }
    });

    it('passes numeric `now` through unchanged', () => {
      const spy = vi.spyOn(vi, 'useFakeTimers');
      const clock = createFakeClock(vi, 123_456_789);

      try {
        expect(spy).toHaveBeenCalledWith({ now: 123_456_789 });
      } finally {
        clock.restore();
        spy.mockRestore();
      }
    });

    it('converts Date `now` to ms timestamp', () => {
      const spy = vi.spyOn(vi, 'useFakeTimers');
      const fixed: Date = new Date('2024-01-01T00:00:00.000Z');
      const clock = createFakeClock(vi, fixed);

      try {
        expect(spy).toHaveBeenCalledWith({ now: fixed.getTime() });
      } finally {
        clock.restore();
        spy.mockRestore();
      }
    });
  });

  describe('useFakeClock', () => {
    describe('nested — with hooks', () => {
      const getClock = useFakeClock({ vi, beforeEach, afterEach });

      it('provides a working clock inside a test', async () => {
        const spy = vi.fn();
        setTimeout(spy, 100);
        await getClock().advance(100);
        expect(spy).toHaveBeenCalledOnce();
      });

      it('resets clock between tests', async () => {
        /* Fresh clock, no lingering timers from previous test. */
        const spy = vi.fn();
        setTimeout(spy, 50);
        await getClock().advance(50);
        expect(spy).toHaveBeenCalledOnce();
      });
    });

    describe('nested — with fixed time', () => {
      const getClock = useFakeClock(
        { vi, beforeEach, afterEach },
        new Date('2024-06-15T00:00:00.000Z'),
      );

      it('pins Date.now to the fixed time', () => {
        expect(getClock()).toBeDefined();
        expect(Date.now()).toBe(new Date('2024-06-15T00:00:00.000Z').getTime());
      });
    });

    it('getter throws when called before beforeEach has run', () => {
      const registered: { beforeEach?: () => void; afterEach?: () => void } = {};
      const hooks = {
        vi,
        beforeEach: (fn: () => void): void => {
          registered.beforeEach = fn;
        },
        afterEach: (fn: () => void): void => {
          registered.afterEach = fn;
        },
      };
      const getClock = useFakeClock(hooks);
      /* Do NOT call registered.beforeEach — simulate invocation outside a test. */
      expect((): void => {
        getClock();
      }).toThrow(/no clock available/);
    });

    it('afterEach restores and clears the current clock', () => {
      const registered: { beforeEach?: () => void; afterEach?: () => void } = {};
      const hooks = {
        vi,
        beforeEach: (fn: () => void): void => {
          registered.beforeEach = fn;
        },
        afterEach: (fn: () => void): void => {
          registered.afterEach = fn;
        },
      };
      const getClock = useFakeClock(hooks);
      registered.beforeEach?.();
      expect(getClock()).toBeDefined();
      registered.afterEach?.();
      expect((): void => {
        getClock();
      }).toThrow(/no clock available/);
    });
  });
});
