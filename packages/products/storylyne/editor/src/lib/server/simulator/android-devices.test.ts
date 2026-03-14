/**
 * Tests for Android device profile listing and config parsing.
 *
 * @module
 */

import type { Bool, Str } from '@/schemas/common';
import { describe, expect, it } from 'vitest';
import {
  type AndroidDevice,
  type DeviceProfile,
  filterPhoneAndTabletProfiles,
  parseAvdList,
  parseConfigIni,
  parseDeviceProfiles,
} from './android-devices';

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

  describe('parseDeviceProfiles', () => {
    it('parses avdmanager list device output into profiles', () => {
      const output: Str = [
        'Available devices definitions:',
        'id: 46 or "pixel_9"',
        '    Name: Pixel 9',
        '    OEM : Google',
        '---------',
        'id: 47 or "pixel_9_pro"',
        '    Name: Pixel 9 Pro',
        '    OEM : Google',
        '---------',
      ].join('\n') as Str;

      const profiles: DeviceProfile[] = parseDeviceProfiles(output);
      expect(profiles).toHaveLength(2);
      expect(profiles[0]?.deviceId).toBe('pixel_9');
      expect(profiles[0]?.displayName).toBe('Pixel 9');
      expect(profiles[0]?.oem).toBe('Google');
      expect(profiles[1]?.deviceId).toBe('pixel_9_pro');
      expect(profiles[1]?.displayName).toBe('Pixel 9 Pro');
    });

    it('parses entries with tags', () => {
      const output: Str = [
        'Available devices definitions:',
        'id: 1 or "automotive_1024p_landscape"',
        '    Name: Automotive (1024p landscape)',
        '    OEM : Google',
        '    Tag : android-automotive-playstore',
        '---------',
      ].join('\n') as Str;

      const profiles: DeviceProfile[] = parseDeviceProfiles(output);
      expect(profiles).toHaveLength(1);
      expect(profiles[0]?.tag).toBe('android-automotive-playstore');
    });

    it('returns empty array for empty output', () => {
      const profiles: DeviceProfile[] = parseDeviceProfiles('' as Str);
      expect(profiles).toEqual([]);
    });

    it('handles output with only header line', () => {
      const output: Str = 'Available devices definitions:\n' as Str;
      const profiles: DeviceProfile[] = parseDeviceProfiles(output);
      expect(profiles).toEqual([]);
    });
  });

  describe('filterPhoneAndTabletProfiles', () => {
    const makeProfile = (deviceId: Str, displayName: Str, tag?: Str): DeviceProfile => ({
      deviceId,
      displayName,
      oem: 'Google' as Str,
      tag: (tag ?? '') as Str,
    });

    it('includes Pixel phones', () => {
      const profiles: DeviceProfile[] = [
        makeProfile('pixel_9' as Str, 'Pixel 9' as Str),
        makeProfile('pixel_9_pro' as Str, 'Pixel 9 Pro' as Str),
        makeProfile('pixel_8' as Str, 'Pixel 8' as Str),
      ];
      const filtered: DeviceProfile[] = filterPhoneAndTabletProfiles(profiles);
      expect(filtered).toHaveLength(3);
    });

    it('includes medium/small phones and tablets', () => {
      const profiles: DeviceProfile[] = [
        makeProfile('medium_phone' as Str, 'Medium Phone' as Str),
        makeProfile('small_phone' as Str, 'Small Phone' as Str),
        makeProfile('medium_tablet' as Str, 'Medium Tablet' as Str),
      ];
      const filtered: DeviceProfile[] = filterPhoneAndTabletProfiles(profiles);
      expect(filtered).toHaveLength(3);
    });

    it('excludes automotive, TV, wear, desktop, XR, glasses profiles', () => {
      const profiles: DeviceProfile[] = [
        makeProfile('pixel_9' as Str, 'Pixel 9' as Str),
        makeProfile(
          'automotive_1024p_landscape' as Str,
          'Automotive (1024p landscape)' as Str,
          'android-automotive' as Str,
        ),
        makeProfile('tv_1080p' as Str, 'TV (1080p)' as Str),
        makeProfile('wearos_large_round' as Str, 'Wear OS Large Round' as Str, 'wearos' as Str),
        makeProfile('desktop_large' as Str, 'Large Desktop' as Str, 'android-desktop' as Str),
        makeProfile('xr_headset_device' as Str, 'XR Headset' as Str),
        makeProfile('ai_glasses_device' as Str, 'AI Glasses' as Str, 'ai-glasses' as Str),
      ];
      const filtered: DeviceProfile[] = filterPhoneAndTabletProfiles(profiles);
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.deviceId).toBe('pixel_9');
    });

    it('excludes legacy devices (pre-Pixel 6)', () => {
      const profiles: DeviceProfile[] = [
        makeProfile('pixel_9' as Str, 'Pixel 9' as Str),
        makeProfile('pixel_5' as Str, 'Pixel 5' as Str),
        makeProfile('pixel_4' as Str, 'Pixel 4' as Str),
        makeProfile('Nexus 5' as Str, 'Nexus 5' as Str),
        makeProfile('Galaxy Nexus' as Str, 'Galaxy Nexus' as Str),
      ];
      const filtered: DeviceProfile[] = filterPhoneAndTabletProfiles(profiles);
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.deviceId).toBe('pixel_9');
    });

    it('includes Pixel 6 and newer', () => {
      const profiles: DeviceProfile[] = [
        makeProfile('pixel_6' as Str, 'Pixel 6' as Str),
        makeProfile('pixel_6_pro' as Str, 'Pixel 6 Pro' as Str),
        makeProfile('pixel_7' as Str, 'Pixel 7' as Str),
        makeProfile('pixel_8' as Str, 'Pixel 8' as Str),
        makeProfile('pixel_9' as Str, 'Pixel 9' as Str),
        makeProfile('pixel_9a' as Str, 'Pixel 9a' as Str),
      ];
      const filtered: DeviceProfile[] = filterPhoneAndTabletProfiles(profiles);
      expect(filtered).toHaveLength(6);
    });

    it('includes foldable devices', () => {
      const profiles: DeviceProfile[] = [
        makeProfile('pixel_fold' as Str, 'Pixel Fold' as Str),
        makeProfile('pixel_9_pro_fold' as Str, 'Pixel 9 Pro Fold' as Str),
        makeProfile('6.7in Foldable' as Str, '6.7" Foldable' as Str),
        makeProfile('7.6in Foldable' as Str, '7.6" Foldable' as Str),
      ];
      const filtered: DeviceProfile[] = filterPhoneAndTabletProfiles(profiles);
      expect(filtered).toHaveLength(4);
    });

    it('includes generic tablet profiles', () => {
      const profiles: DeviceProfile[] = [
        makeProfile('pixel_tablet' as Str, 'Pixel Tablet' as Str),
        makeProfile('7in WSVGA (Tablet)' as Str, '7" WSVGA (Tablet)' as Str),
        makeProfile('10.1in WXGA (Tablet)' as Str, '10.1" WXGA (Tablet)' as Str),
      ];
      const filtered: DeviceProfile[] = filterPhoneAndTabletProfiles(profiles);
      expect(filtered).toHaveLength(3);
    });

    it('excludes resizable and freeform profiles', () => {
      const profiles: DeviceProfile[] = [
        makeProfile('pixel_9' as Str, 'Pixel 9' as Str),
        makeProfile('resizable' as Str, 'Resizable' as Str),
        makeProfile('13.5in Freeform' as Str, '13.5" Freeform' as Str),
      ];
      const filtered: DeviceProfile[] = filterPhoneAndTabletProfiles(profiles);
      expect(filtered).toHaveLength(1);
    });
  });

  describe('AndroidDevice type with created field', () => {
    it('supports created flag on device objects', () => {
      const device: AndroidDevice = {
        name: 'Pixel_9' as Str,
        width: 1080 as never,
        height: 2424 as never,
        density: 420 as never,
        apiLevel: 35 as never,
        displayTag: 'Google APIs' as Str,
        created: true as Bool,
        deviceId: 'pixel_9' as Str,
      };
      expect(device.created).toBe(true);
      expect(device.deviceId).toBe('pixel_9');
    });

    it('supports uncreated device with profile data', () => {
      const device: AndroidDevice = {
        name: 'Pixel 8' as Str,
        width: 1080 as never,
        height: 2400 as never,
        density: 420 as never,
        apiLevel: 0 as never,
        displayTag: '' as Str,
        created: false as Bool,
        deviceId: 'pixel_8' as Str,
      };
      expect(device.created).toBe(false);
      expect(device.name).toBe('Pixel 8');
    });
  });
});
