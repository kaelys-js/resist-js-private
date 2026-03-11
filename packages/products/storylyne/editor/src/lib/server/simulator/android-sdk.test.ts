/**
 * Tests for Android SDK detection and path resolution.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { describe, expect, it } from 'vitest';
import { buildSdkPaths, parseAdbVersion } from './android-sdk';

describe('android-sdk', () => {
  describe('buildSdkPaths', () => {
    it('builds paths from ANDROID_HOME', () => {
      const paths = buildSdkPaths('/Users/test/Library/Android/sdk' as Str);
      expect(paths.adb).toBe('/Users/test/Library/Android/sdk/platform-tools/adb');
      expect(paths.emulator).toBe('/Users/test/Library/Android/sdk/emulator/emulator');
      expect(paths.avdmanager).toBe(
        '/Users/test/Library/Android/sdk/cmdline-tools/latest/bin/avdmanager',
      );
    });

    it('handles trailing slash in ANDROID_HOME', () => {
      const paths = buildSdkPaths('/Users/test/sdk/' as Str);
      expect(paths.adb).toBe('/Users/test/sdk/platform-tools/adb');
    });
  });

  describe('parseAdbVersion', () => {
    it('parses standard adb version output', () => {
      const output: Str =
        'Android Debug Bridge version 1.0.41\nVersion 35.0.2-12147458\nInstalled as /usr/local/bin/adb' as Str;
      const version: Str | null = parseAdbVersion(output);
      expect(version).toBe('35.0.2');
    });

    it('returns null for unrecognised output', () => {
      const version: Str | null = parseAdbVersion('not adb' as Str);
      expect(version).toBeNull();
    });

    it('handles Version line without revision suffix', () => {
      const output: Str = 'Android Debug Bridge version 1.0.41\nVersion 34.0.0\n' as Str;
      const version: Str | null = parseAdbVersion(output);
      expect(version).toBe('34.0.0');
    });
  });
});
