/**
 * Mocked tests for iOS Simulator lifecycle — isolated from real xcrun tests.
 *
 * @module
 */

import type { Num, Str } from '@/schemas/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  queue: [] as Array<{ stdout?: string; error?: Error & { code?: number } }>,
}));

vi.mock('node:child_process', () => {
  const wrap = (
    _f: string,
    _a: readonly string[],
    cb: (e: Error | null, r?: { stdout: string; stderr: string }) => void,
  ): unknown => {
    const next = state.queue.shift();
    if (!next) {
      cb(new Error('no exec response queued'));
      return null;
    }
    if (next.error) cb(next.error);
    else cb(null, { stdout: next.stdout ?? '', stderr: '' });
    return null;
  };
  return { default: { execFile: wrap }, execFile: wrap };
});

describe('ios-lifecycle (mocked)', () => {
  beforeEach(() => {
    state.queue = [];
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    state.queue = [];
  });

  async function load(): Promise<typeof import('./ios-lifecycle')> {
    vi.resetModules();
    return await import('./ios-lifecycle');
  }

  it('bootSimulator returns true on success', async () => {
    state.queue = [{ stdout: 'ok' }];
    const mod = await load();
    await expect(mod.bootSimulator('UDID' as Str)).resolves.toBe(true);
  });

  it('bootSimulator returns true for exit code 149 (already booted)', async () => {
    const err = new Error('already') as Error & { code?: number };
    err.code = 149;
    state.queue = [{ error: err }];
    const mod = await load();
    await expect(mod.bootSimulator('UDID' as Str)).resolves.toBe(true);
  });

  it('bootSimulator rethrows other errors', async () => {
    state.queue = [{ error: new Error('fail') }];
    const mod = await load();
    await expect(mod.bootSimulator('UDID' as Str)).rejects.toThrow(/fail/);
  });

  it('shutdownSimulator always returns true, even on error', async () => {
    state.queue = [{ error: new Error('x') }];
    const mod = await load();
    await expect(mod.shutdownSimulator('UDID' as Str)).resolves.toBe(true);
  });

  it('shutdownSimulator returns true on success', async () => {
    state.queue = [{ stdout: 'ok' }];
    const mod = await load();
    await expect(mod.shutdownSimulator('UDID' as Str)).resolves.toBe(true);
  });

  it('waitForBoot returns true immediately when already Booted', async () => {
    state.queue = [
      {
        stdout: JSON.stringify({ devices: { 'iOS-17': [{ udid: 'UDID', state: 'Booted' }] } }),
      },
    ];
    const mod = await load();
    await expect(mod.waitForBoot('UDID' as Str)).resolves.toBe(true);
  });

  it('waitForBoot polls until Booted', async () => {
    state.queue = [
      {
        stdout: JSON.stringify({ devices: { 'iOS-17': [{ udid: 'UDID', state: 'Shutdown' }] } }),
      },
      {
        stdout: JSON.stringify({ devices: { 'iOS-17': [{ udid: 'UDID', state: 'Booted' }] } }),
      },
    ];
    const mod = await load();
    const p = mod.waitForBoot('UDID' as Str, 10_000 as Num);
    await vi.advanceTimersByTimeAsync(500);
    await expect(p).resolves.toBe(true);
  });

  it('waitForBoot throws on timeout', async () => {
    state.queue = Array.from({ length: 10 }, () => ({
      stdout: JSON.stringify({ devices: { 'iOS-17': [{ udid: 'UDID', state: 'Shutdown' }] } }),
    }));
    const mod = await load();
    const p = mod.waitForBoot('UDID' as Str, 1 as Num).catch((e: Error) => e);
    await vi.advanceTimersByTimeAsync(500);
    const result: Error = (await p) as Error;
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toMatch(/did not boot/);
  });

  it('getDeviceState returns Shutdown for unknown udid', async () => {
    state.queue = [
      { stdout: JSON.stringify({ devices: { 'iOS-17': [{ udid: 'OTHER', state: 'Booted' }] } }) },
    ];
    const mod = await load();
    await expect(mod.getDeviceState('MISSING' as Str)).resolves.toBe('Shutdown');
  });

  it('getDeviceState falls back to Shutdown when state field is absent', async () => {
    state.queue = [{ stdout: JSON.stringify({ devices: { 'iOS-17': [{ udid: 'U' }] } }) }];
    const mod = await load();
    await expect(mod.getDeviceState('U' as Str)).resolves.toBe('Shutdown');
  });

  it('getDeviceState handles devices key being missing', async () => {
    state.queue = [{ stdout: JSON.stringify({}) }];
    const mod = await load();
    await expect(mod.getDeviceState('U' as Str)).resolves.toBe('Shutdown');
  });
});
