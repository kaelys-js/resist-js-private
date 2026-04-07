import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { tick, flushSync } from 'svelte';
import type { Str, Void } from '@/schemas/common';
import {
  LOG_LEVEL_PRIORITY,
  shouldLog,
  createWatcher,
  createStateLogger,
  type WatcherCleanup,
} from './state-logger.svelte';

describe('LOG_LEVEL_PRIORITY', () => {
  it('has correct priority ordering', () => {
    expect(LOG_LEVEL_PRIORITY.trace).toBe(0);
    expect(LOG_LEVEL_PRIORITY.debug).toBe(1);
    expect(LOG_LEVEL_PRIORITY.info).toBe(2);
    expect(LOG_LEVEL_PRIORITY.warn).toBe(3);
    expect(LOG_LEVEL_PRIORITY.error).toBe(4);
  });

  it('trace is lowest priority (most verbose)', () => {
    expect(LOG_LEVEL_PRIORITY.trace).toBeLessThan(LOG_LEVEL_PRIORITY.debug);
    expect(LOG_LEVEL_PRIORITY.debug).toBeLessThan(LOG_LEVEL_PRIORITY.info);
    expect(LOG_LEVEL_PRIORITY.info).toBeLessThan(LOG_LEVEL_PRIORITY.warn);
    expect(LOG_LEVEL_PRIORITY.warn).toBeLessThan(LOG_LEVEL_PRIORITY.error);
  });
});

describe('shouldLog', () => {
  it('allows debug messages when level is trace', () => {
    expect(shouldLog('debug', 'trace')).toBe(true);
  });

  it('allows debug messages when level is debug', () => {
    expect(shouldLog('debug', 'debug')).toBe(true);
  });

  it('blocks debug messages when level is info', () => {
    expect(shouldLog('debug', 'info')).toBe(false);
  });

  it('blocks debug messages when level is warn', () => {
    expect(shouldLog('debug', 'warn')).toBe(false);
  });

  it('blocks debug messages when level is error', () => {
    expect(shouldLog('debug', 'error')).toBe(false);
  });

  it('allows info messages when level is info', () => {
    expect(shouldLog('info', 'info')).toBe(true);
  });

  it('allows error messages at any level', () => {
    expect(shouldLog('error', 'trace')).toBe(true);
    expect(shouldLog('error', 'error')).toBe(true);
  });

  it('allows warn at warn level', () => {
    expect(shouldLog('warn', 'warn')).toBe(true);
  });

  it('blocks trace at debug level', () => {
    expect(shouldLog('trace', 'debug')).toBe(false);
  });
});

const watcherNoop: WatcherCleanup = () => {};

describe('WatcherCleanup type', () => {
  it('is exported as a callable function type', () => {
    expect(typeof watcherNoop).toBe('function');
  });
});

// ── createWatcher ────────────────────────────────────────────────────────

describe('createWatcher', () => {
  let groupCollapsedSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let groupEndSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    groupCollapsedSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
  });

  afterEach(() => {
    groupCollapsedSpy.mockRestore();
    logSpy.mockRestore();
    groupEndSpy.mockRestore();
  });

  it('returns a cleanup function', () => {
    let val = $state({ count: 0 });
    const debugStore = { debug: { logLevel: 'debug' as const } };
    const cleanup = createWatcher('test', () => ({ count: val.count }), debugStore);
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('logs state changes when logLevel allows debug', async () => {
    let val = $state({ count: 0 });
    const debugStore = { debug: { logLevel: 'debug' as const } };
    const cleanup = createWatcher(
      'counters',
      () => ({ count: val.count }),
      debugStore,
      'TestStore',
    );

    val.count = 42;
    await tick();

    expect(groupCollapsedSpy).toHaveBeenCalled();
    const call: Str = groupCollapsedSpy.mock.calls[0]?.[0] as Str;
    expect(call).toContain('TestStore');
    expect(call).toContain('counters.count');
    expect(call).toContain('0');
    expect(call).toContain('42');

    // Verify old/new detail logs
    const logCalls: Str[] = logSpy.mock.calls.map((c: unknown[]) => c.join(' '));
    const hasOld = logCalls.some((s: Str) => s.includes('old:'));
    const hasNew = logCalls.some((s: Str) => s.includes('new:'));
    expect(hasOld).toBe(true);
    expect(hasNew).toBe(true);
    expect(groupEndSpy).toHaveBeenCalled();
    cleanup();
  });

  it('suppresses logging when logLevel blocks debug messages', async () => {
    let val = $state({ count: 0 });
    const debugStore = { debug: { logLevel: 'warn' as const } };
    const cleanup = createWatcher('test', () => ({ count: val.count }), debugStore);

    val.count = 99;
    await tick();

    // Should NOT log — logLevel 'warn' blocks 'debug'
    expect(groupCollapsedSpy).not.toHaveBeenCalled();
    cleanup();
  });

  it('does not log when values are unchanged', async () => {
    let val = $state({ count: 5 });
    const debugStore = { debug: { logLevel: 'debug' as const } };
    const cleanup = createWatcher('test', () => ({ count: val.count }), debugStore);

    // Re-assign same value — no diff expected
    val.count = 5;
    await tick();

    expect(groupCollapsedSpy).not.toHaveBeenCalled();
    cleanup();
  });

  it('uses default storeName "Store" when omitted', async () => {
    let val = $state({ x: 0 });
    const debugStore = { debug: { logLevel: 'debug' as const } };
    const cleanup = createWatcher('section', () => ({ x: val.x }), debugStore);

    val.x = 1;
    await tick();

    const call: Str = groupCollapsedSpy.mock.calls[0]?.[0] as Str;
    expect(call).toContain('Store');
    cleanup();
  });

  it('stops logging after cleanup is called', async () => {
    let val = $state({ n: 0 });
    const debugStore = { debug: { logLevel: 'debug' as const } };
    const cleanup = createWatcher('test', () => ({ n: val.n }), debugStore);

    cleanup();

    val.n = 100;
    await tick();

    // No logging after cleanup
    expect(groupCollapsedSpy).not.toHaveBeenCalled();
  });
});

// ── createStateLogger ────────────────────────────────────────────────────

describe('createStateLogger', () => {
  let groupCollapsedSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let groupEndSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    groupCollapsedSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
  });

  afterEach(() => {
    groupCollapsedSpy.mockRestore();
    logSpy.mockRestore();
    groupEndSpy.mockRestore();
  });

  it('watches multiple sections and logs changes', async () => {
    let app = $state({ theme: 'warm' });
    let debug = $state({ enabled: false });
    const debugStore = { debug: { logLevel: 'debug' as const } };

    const logger = createStateLogger(
      [
        { name: 'app', getter: () => ({ theme: app.theme }) },
        { name: 'debug', getter: () => ({ enabled: debug.enabled }) },
      ],
      debugStore,
      'MyStore',
    );

    app.theme = 'midnight';
    await tick();

    expect(groupCollapsedSpy).toHaveBeenCalled();
    const call: Str = groupCollapsedSpy.mock.calls[0]?.[0] as Str;
    expect(call).toContain('MyStore');
    expect(call).toContain('app.theme');

    logger.destroy();
  });

  it('uses default storeName "Store" when omitted', async () => {
    let val = $state({ x: 0 });
    const debugStore = { debug: { logLevel: 'debug' as const } };

    const logger = createStateLogger([{ name: 'data', getter: () => ({ x: val.x }) }], debugStore);

    val.x = 1;
    await tick();

    const call: Str = groupCollapsedSpy.mock.calls[0]?.[0] as Str;
    expect(call).toContain('Store');
    logger.destroy();
  });

  it('destroy stops all watchers', async () => {
    let val = $state({ a: 0 });
    const debugStore = { debug: { logLevel: 'debug' as const } };

    const logger = createStateLogger([{ name: 'sec', getter: () => ({ a: val.a }) }], debugStore);

    logger.destroy();

    val.a = 999;
    await tick();

    expect(groupCollapsedSpy).not.toHaveBeenCalled();
  });
});
