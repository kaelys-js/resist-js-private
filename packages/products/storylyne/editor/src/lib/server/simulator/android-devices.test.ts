/**
 * Tests for Android device profile listing and config parsing.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { describe, expect, it } from 'vitest';
import { parseAvdList, parseConfigIni } from './android-devices';

describe('android-devices', () => {
  describe('parseAvdList', () => {
    it('parses emulator -list-avds output', () => {
      const output: Str = 'Pixel_9_API_35\nPixel_9_Pro_API_35\nMedium_Phone_API_35\n' as Str;
      const avds: Str[] = parseAvdList(output);
      expect(avds).toHaveLength(3);
      expect(avds[0]).toBe('Pixel_9_API_35');
      expect(avds[1]).toBe('Pixel_9_Pro_API_35');
      expect(avds[2]).toBe('Medium_Phone_API_35');
    });

    it('filters empty lines', () => {
      const output: Str = '\nPixel_9_API_35\n\n\n' as Str;
      const avds: Str[] = parseAvdList(output);
      expect(avds).toHaveLength(1);
    });

    it('returns empty array for empty input', () => {
      const avds: Str[] = parseAvdList('' as Str);
      expect(avds).toEqual([]);
    });
  });

  describe('parseConfigIni', () => {
    it('parses config.ini key-value pairs', () => {
      const content: Str = [
        'hw.lcd.width=1080',
        'hw.lcd.height=2400',
        'hw.lcd.density=420',
        'image.sysdir.1=system-images/android-35/google_apis_playstore/arm64-v8a/',
        'tag.display=Google Play',
      ].join('\n') as Str;

      const config: Record<Str, Str> = parseConfigIni(content);
      expect(config['hw.lcd.width']).toBe('1080');
      expect(config['hw.lcd.height']).toBe('2400');
      expect(config['hw.lcd.density']).toBe('420');
      expect(config['tag.display']).toBe('Google Play');
    });

    it('skips comment lines', () => {
      const content: Str = '# This is a comment\nhw.lcd.width=1080\n' as Str;
      const config: Record<Str, Str> = parseConfigIni(content);
      expect(Object.keys(config)).toHaveLength(1);
      expect(config['hw.lcd.width']).toBe('1080');
    });

    it('returns empty object for empty input', () => {
      const config: Record<Str, Str> = parseConfigIni('' as Str);
      expect(config).toEqual({});
    });
  });
});
