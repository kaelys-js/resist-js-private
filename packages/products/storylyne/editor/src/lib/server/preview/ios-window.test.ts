/**
 * Tests for iOS Simulator window tracking.
 *
 * Verifies window bounds detection, scale factor lookup,
 * and coordinate mapping.
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { Num, Str } from '@/schemas/common';

import { execFile } from 'node:child_process';
import {
  getSimulatorWindowBounds,
  getDeviceScaleFactor,
  mapViewportToScreen,
  KNOWN_SCALE_FACTORS,
  type WindowBounds,
} from './ios-window';

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */

vi.mock('node:child_process', (): Record<string, unknown> => {
  const module: Record<string, unknown> = {
    execFile: vi.fn(),
  };
  return { ...module, default: module };
});

/* ------------------------------------------------------------------ */
/*  Fixtures                                                           */
/* ------------------------------------------------------------------ */

const TEST_UDID: Str = 'B33CE7D0-3CD7-4BB9-AEDC-0D5679F6D0C0' as Str;

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('ios-window', (): void => {
  beforeEach((): void => {
    vi.clearAllMocks();
  });

  /* ---------------------------------------------------------------- */
  /*  Constants                                                        */
  /* ---------------------------------------------------------------- */

  it('exports known scale factors for common devices', (): void => {
    expect(KNOWN_SCALE_FACTORS['iPhone 17 Pro']).toBe(3 as Num);
    expect(KNOWN_SCALE_FACTORS['iPhone 17 Pro Max']).toBe(3 as Num);
    expect(KNOWN_SCALE_FACTORS['iPhone SE (3rd generation)']).toBe(2 as Num);
    expect(KNOWN_SCALE_FACTORS['iPad Pro 13-inch (M4)']).toBe(2 as Num);
  });

  /* ---------------------------------------------------------------- */
  /*  Window bounds                                                    */
  /* ---------------------------------------------------------------- */

  it('parses window bounds from AppleScript output', async (): Promise<void> => {
    (execFile as unknown as Mock).mockImplementation(
      (
        _cmd: Str,
        _args: string[],
        callback: (err: Error | null, result: { stdout: Str; stderr: Str }) => void,
      ): void => {
        callback(null, {
          stdout: '100, 200, 590, 1666\n' as Str,
          stderr: '' as Str,
        });
      },
    );

    const bounds: WindowBounds = await getSimulatorWindowBounds();

    expect(bounds.x).toBe(100 as Num);
    expect(bounds.y).toBe(200 as Num);
    expect(bounds.width).toBe(490 as Num);
    expect(bounds.height).toBe(1466 as Num);
  });

  it('throws on AppleScript failure', async (): Promise<void> => {
    (execFile as unknown as Mock).mockImplementation(
      (_cmd: Str, _args: string[], callback: (err: Error | null) => void): void => {
        callback(new Error('Simulator not running'));
      },
    );

    await expect(getSimulatorWindowBounds()).rejects.toThrow('Simulator not running');
  });

  /* ---------------------------------------------------------------- */
  /*  Scale factor                                                     */
  /* ---------------------------------------------------------------- */

  it('returns scale factor from device info', async (): Promise<void> => {
    (execFile as unknown as Mock).mockImplementation(
      (
        _cmd: Str,
        _args: string[],
        callback: (err: Error | null, result: { stdout: Str; stderr: Str }) => void,
      ): void => {
        const json: string = JSON.stringify({
          devices: {
            'com.apple.CoreSimulator.SimRuntime.iOS-19-0': [
              {
                udid: TEST_UDID,
                name: 'iPhone 17 Pro',
                state: 'Booted',
              },
            ],
          },
        });
        callback(null, { stdout: json as Str, stderr: '' as Str });
      },
    );

    const scale: Num = await getDeviceScaleFactor(TEST_UDID);

    expect(scale).toBe(3 as Num);
  });

  it('returns default scale factor for unknown device', async (): Promise<void> => {
    (execFile as unknown as Mock).mockImplementation(
      (
        _cmd: Str,
        _args: string[],
        callback: (err: Error | null, result: { stdout: Str; stderr: Str }) => void,
      ): void => {
        const json: string = JSON.stringify({
          devices: {
            'com.apple.CoreSimulator.SimRuntime.iOS-19-0': [
              {
                udid: TEST_UDID,
                name: 'Custom Simulator',
                state: 'Booted',
              },
            ],
          },
        });
        callback(null, { stdout: json as Str, stderr: '' as Str });
      },
    );

    const scale: Num = await getDeviceScaleFactor(TEST_UDID);

    /* Default scale factor for unknown devices */
    expect(scale).toBe(2 as Num);
  });

  /* ---------------------------------------------------------------- */
  /*  Coordinate mapping                                               */
  /* ---------------------------------------------------------------- */

  it('maps viewport coordinates to screen coordinates', (): void => {
    const bounds: WindowBounds = {
      x: 100 as Num,
      y: 200 as Num,
      width: 490 as Num,
      height: 1066 as Num,
    };

    const result: { screenX: Num; screenY: Num } = mapViewportToScreen(
      245 as Num,
      533 as Num,
      bounds,
    );

    /* viewport center → screen center within window bounds */
    expect(result.screenX).toBe(345 as Num); // 100 + 245
    expect(result.screenY).toBe(733 as Num); // 200 + 533
  });

  it('clamps coordinates within window bounds', (): void => {
    const bounds: WindowBounds = {
      x: 100 as Num,
      y: 200 as Num,
      width: 490 as Num,
      height: 1066 as Num,
    };

    const result: { screenX: Num; screenY: Num } = mapViewportToScreen(
      -50 as Num,
      2000 as Num,
      bounds,
    );

    expect(result.screenX).toBe(100 as Num); // clamped to min (100 + 0)
    expect(result.screenY).toBe(1266 as Num); // clamped to max (200 + 1066)
  });
});
