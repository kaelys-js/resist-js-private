/**
 * Tests for iOS Simulator lifecycle — boot/shutdown management.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { describe, expect, it } from 'vitest';
import { getDeviceState } from './ios-lifecycle';
import { listSimulatorDevices } from './ios-simctl';

/* xcrun is darwin-only; skip on Linux CI. macOS dev + any macOS CI matrix still run. */
describe.skipIf(process.platform !== 'darwin')('ios-lifecycle', () => {
  describe('getDeviceState', () => {
    it('returns state for a known device UDID', async () => {
      const devices = await listSimulatorDevices();
      expect(devices.length).toBeGreaterThan(0);

      const firstDevice = devices[0]!;
      const state: Str = await getDeviceState(firstDevice.udid);
      expect(state).toMatch(/^(Booted|Shutdown|Shutting Down)$/);
    });

    it('returns Shutdown for unknown UDID', async () => {
      const state: Str = await getDeviceState('00000000-0000-0000-0000-000000000000' as Str);
      expect(state).toBe('Shutdown');
    });
  });

  /* Note: boot/shutdown tests are not included here because they
   * would actually boot/shutdown simulators, which takes 10-30s and
   * leaves side effects. These are tested via integration tests. */
});
