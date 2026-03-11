/**
 * Tests for iOS Simulator detection — `xcrun simctl` wrapper.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { describe, expect, it } from 'vitest';
import { isXcrunAvailable, listSimulatorDevices, parseRuntimeVersion } from './ios-simctl';

describe('ios-simctl', () => {
  describe('parseRuntimeVersion', () => {
    it('parses standard iOS runtime identifier', () => {
      const result: Str = parseRuntimeVersion(
        'com.apple.CoreSimulator.SimRuntime.iOS-26-0' as Str,
      );
      expect(result).toBe('iOS 26.0');
    });

    it('parses iOS 18.6 runtime identifier', () => {
      const result: Str = parseRuntimeVersion(
        'com.apple.CoreSimulator.SimRuntime.iOS-18-6' as Str,
      );
      expect(result).toBe('iOS 18.6');
    });

    it('handles unknown format gracefully', () => {
      const result: Str = parseRuntimeVersion('unknown-runtime' as Str);
      expect(result).toBe('unknown-runtime');
    });
  });

  describe('isXcrunAvailable', () => {
    it('returns true on macOS with Xcode installed', async () => {
      /* This test runs on the dev machine which has Xcode */
      const available: boolean = await isXcrunAvailable();
      expect(available).toBe(true);
    });
  });

  describe('listSimulatorDevices', () => {
    it('returns non-empty array of available devices', async () => {
      const devices = await listSimulatorDevices();
      expect(devices.length).toBeGreaterThan(0);
    });

    it('returns devices with required fields', async () => {
      const devices = await listSimulatorDevices();
      const first = devices[0];
      expect(first).toBeDefined();
      expect(first!.udid).toBeTruthy();
      expect(first!.name).toBeTruthy();
      expect(first!.state).toMatch(/^(Booted|Shutdown|Shutting Down)$/);
      expect(first!.isAvailable).toBe(true);
      expect(first!.runtimeVersion).toMatch(/^iOS \d+\.\d+$/);
      expect(first!.screenWidth).toBeGreaterThan(0);
      expect(first!.screenHeight).toBeGreaterThan(0);
      expect(first!.scaleFactor).toBeGreaterThan(0);
    });

    it('returns devices sorted alphabetically by name', async () => {
      const devices = await listSimulatorDevices();
      const names: Str[] = devices.map((d) => d.name);
      const sorted: Str[] = [...names].sort();
      expect(names).toEqual(sorted);
    });

    it('includes iPhone and iPad devices', async () => {
      const devices = await listSimulatorDevices();
      const names: Str[] = devices.map((d) => d.name);
      const hasIphone: boolean = names.some((n) => n.includes('iPhone'));
      const hasIpad: boolean = names.some((n) => n.includes('iPad'));
      expect(hasIphone).toBe(true);
      expect(hasIpad).toBe(true);
    });
  });
});
