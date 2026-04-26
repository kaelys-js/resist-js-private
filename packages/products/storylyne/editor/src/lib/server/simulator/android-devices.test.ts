/**
 * Tests for Android device profile listing and config parsing.
 *
 * @module
 */

import type { Bool, Str } from '@/schemas/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type AndroidDevice,
  type DeviceProfile,
  filterPhoneAndTabletProfiles,
  parseAvdList,
  parseConfigIni,
  parseDeviceProfiles,
} from './android-devices';
import type * as NodeFsPromisesModule from 'node:fs/promises';
import type * as AndroidDevicesModule from './android-devices';

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

  /* -----------------------------------------------------------------------
   * Mocked async functions — listAvds / getAndroidDevices / listSystemImages /
   * listDeviceProfiles / getAndroidDeviceProfiles / createAvd.
   * Each test injects its own execFile and readFile mocks via vi.resetModules
   * + dynamic import.
   * -------------------------------------------------------------------- */
  describe('async binary-invoking functions', () => {
    type LoadedModule = typeof AndroidDevicesModule;

    type ExecCallback = (error: Error | null, result?: { stdout: string; stderr: string }) => void;
    type ExecImpl = (file: string, args: readonly string[], cb: ExecCallback) => unknown;
    type ReadFileImpl = (path: string, encoding: string) => Promise<string>;

    const mockState = vi.hoisted(() => ({
      execFile: null as ExecImpl | null,
      readFile: null as ReadFileImpl | null,
    }));

    vi.mock('node:child_process', () => ({
      default: {
        execFile: (file: string, args: readonly string[], cb: ExecCallback) => {
          if (!mockState.execFile) {
            throw new Error('execFile mock not configured');
          }
          return mockState.execFile(file, args, cb);
        },
      },
      execFile: (file: string, args: readonly string[], cb: ExecCallback) => {
        if (!mockState.execFile) {
          throw new Error('execFile mock not configured');
        }
        return mockState.execFile(file, args, cb);
      },
    }));

    vi.mock('node:fs/promises', async (importOriginal) => {
      const actual = await importOriginal<typeof NodeFsPromisesModule>();
      return {
        ...actual,
        default: {
          ...actual,
          readFile: (path: string, encoding: string) => {
            if (mockState.readFile) {
              return mockState.readFile(path, encoding);
            }
            return actual.readFile(path, encoding as BufferEncoding);
          },
        },
        readFile: (path: string, encoding: string) => {
          if (mockState.readFile) {
            return mockState.readFile(path, encoding);
          }
          return actual.readFile(path, encoding as BufferEncoding);
        },
      };
    });

    async function loadWithExec(opts: {
      execFileImpl: ExecImpl;
      readFileImpl?: ReadFileImpl;
    }): Promise<LoadedModule> {
      mockState.execFile = opts.execFileImpl;
      mockState.readFile = opts.readFileImpl ?? null;
      vi.resetModules();
      return (await import('./android-devices')) as LoadedModule;
    }

    beforeEach(() => {
      mockState.execFile = null;
      mockState.readFile = null;
      vi.resetModules();
    });

    afterEach(() => {
      mockState.execFile = null;
      mockState.readFile = null;
    });

    it('listAvds returns parsed names when execFile succeeds', async () => {
      const mod = await loadWithExec({
        execFileImpl: (_file, _args, cb) => {
          cb(null, { stdout: 'Pixel_9_API_35\nMedium_Phone_API_35\n', stderr: '' });
          return null;
        },
      });
      const avds = await mod.listAvds('/bin/emulator' as Str);
      expect(avds).toEqual(['Pixel_9_API_35', 'Medium_Phone_API_35']);
    });

    it('listAvds returns [] when execFile errors', async () => {
      const mod = await loadWithExec({
        execFileImpl: (_file, _args, cb) => {
          cb(new Error('ENOENT'));
          return null;
        },
      });
      const avds = await mod.listAvds('/nope' as Str);
      expect(avds).toEqual([]);
    });

    it('listDeviceProfiles parses + filters when execFile succeeds', async () => {
      const listOutput = [
        'id: 1 or "pixel_9"',
        '    Name: Pixel 9',
        '    OEM : Google',
        '---------',
        'id: 2 or "automotive_1024p"',
        '    Name: Automotive',
        '    OEM : Google',
        '    Tag : android-automotive',
        '---------',
      ].join('\n');
      const mod = await loadWithExec({
        execFileImpl: (_file, _args, cb) => {
          cb(null, { stdout: listOutput, stderr: '' });
          return null;
        },
      });
      const profiles = await mod.listDeviceProfiles('/bin/avdmanager' as Str);
      expect(profiles).toHaveLength(1);
      expect(profiles[0]?.deviceId).toBe('pixel_9');
    });

    it('listDeviceProfiles returns [] when execFile errors', async () => {
      const mod = await loadWithExec({
        execFileImpl: (_file, _args, cb) => {
          cb(new Error('missing'));
          return null;
        },
      });
      const profiles = await mod.listDeviceProfiles('/nope' as Str);
      expect(profiles).toEqual([]);
    });

    it('listSystemImages extracts system-images lines and pipe-splits', async () => {
      const output = [
        'Installed packages:',
        '  Path | Version | Description',
        '  system-images;android-35;google_apis;arm64-v8a | 1 | Google APIs ARM 64',
        '  system-images;android-34;default;x86_64 | 2 | Android 34',
        '  platform-tools | 3 | Platform Tools',
        '',
      ].join('\n');
      const mod = await loadWithExec({
        execFileImpl: (file, args, cb) => {
          /* sdkmanager path is derived from avdmanager path — should be sdkmanager here */
          expect(file).toMatch(/sdkmanager$/);
          expect(args).toContain('--list_installed');
          cb(null, { stdout: output, stderr: '' });
          return null;
        },
      });
      const images = await mod.listSystemImages('/sdk/cmdline-tools/latest/bin/avdmanager' as Str);
      expect(images).toEqual([
        'system-images;android-35;google_apis;arm64-v8a',
        'system-images;android-34;default;x86_64',
      ]);
    });

    it('listSystemImages returns [] when sdkmanager errors', async () => {
      const mod = await loadWithExec({
        execFileImpl: (_file, _args, cb) => {
          cb(new Error('no sdkmanager'));
          return null;
        },
      });
      const images = await mod.listSystemImages('/nope/avdmanager' as Str);
      expect(images).toEqual([]);
    });

    it('getAndroidDevices reads each AVD config.ini and builds devices', async () => {
      const mod = await loadWithExec({
        execFileImpl: (_file, _args, cb) => {
          cb(null, { stdout: 'Pixel_9_API_35\n', stderr: '' });
          return null;
        },
        readFileImpl: (path: string) => {
          if (path.includes('Pixel_9_API_35.avd/config.ini')) {
            return Promise.resolve(
              [
                'hw.lcd.width=1080',
                'hw.lcd.height=2424',
                'hw.lcd.density=420',
                'image.sysdir.1=system-images/android-35/google_apis/arm64-v8a/',
                'tag.display=Google APIs',
                'hw.device.name=pixel_9',
              ].join('\n'),
            );
          }
          return Promise.reject(new Error('no config'));
        },
      });
      const devices = await mod.getAndroidDevices('/bin/emulator' as Str);
      expect(devices).toHaveLength(1);
      expect(devices[0]?.name).toBe('Pixel_9_API_35');
      expect(devices[0]?.width as number).toBe(1080);
      expect(devices[0]?.height as number).toBe(2424);
      expect(devices[0]?.density as number).toBe(420);
      expect(devices[0]?.apiLevel as number).toBe(35);
      expect(devices[0]?.displayTag).toBe('Google APIs');
      expect(devices[0]?.deviceId).toBe('pixel_9');
      expect(devices[0]?.created).toBe(true);
    });

    it('getAndroidDevices returns defaults when config.ini read throws', async () => {
      const mod = await loadWithExec({
        execFileImpl: (_file, _args, cb) => {
          cb(null, { stdout: 'Broken_AVD\n', stderr: '' });
          return null;
        },
        readFileImpl: () => Promise.reject(new Error('ENOENT')),
      });
      const devices = await mod.getAndroidDevices('/bin/emulator' as Str);
      expect(devices).toHaveLength(1);
      expect(devices[0]?.name).toBe('Broken_AVD');
      expect(devices[0]?.width as number).toBe(0);
      expect(devices[0]?.height as number).toBe(0);
      expect(devices[0]?.apiLevel as number).toBe(0);
      expect(devices[0]?.created).toBe(true);
    });

    it('getAndroidDevices: extractApiLevel returns 0 for config without image.sysdir.1', async () => {
      const mod = await loadWithExec({
        execFileImpl: (_file, _args, cb) => {
          cb(null, { stdout: 'NoApi_AVD\n', stderr: '' });
          return null;
        },
        readFileImpl: () => Promise.resolve('hw.lcd.width=720\n'),
      });
      const devices = await mod.getAndroidDevices('/bin/emulator' as Str);
      expect(devices[0]?.apiLevel as number).toBe(0);
    });

    it('getAndroidDeviceProfiles merges AVDs with uncreated hardware profiles, dedup by deviceId', async () => {
      const listDevicesOutput = [
        'id: 1 or "pixel_9"',
        '    Name: Pixel 9',
        '    OEM : Google',
        '---------',
        'id: 2 or "pixel_8"',
        '    Name: Pixel 8',
        '    OEM : Google',
        '---------',
      ].join('\n');
      const mod = await loadWithExec({
        execFileImpl: (file, args, cb) => {
          if ((args as readonly string[]).includes('-list-avds')) {
            cb(null, { stdout: 'Pixel_9_API_35\n', stderr: '' });
          } else if ((args as readonly string[])[0] === 'list') {
            cb(null, { stdout: listDevicesOutput, stderr: '' });
          } else {
            cb(null, { stdout: '', stderr: '' });
          }
          return null;
        },
        readFileImpl: () =>
          Promise.resolve(
            [
              'hw.lcd.width=1080',
              'hw.lcd.height=2424',
              'hw.lcd.density=420',
              'image.sysdir.1=system-images/android-35/google_apis/arm64-v8a/',
              'hw.device.name=pixel_9',
            ].join('\n'),
          ),
      });
      const all = await mod.getAndroidDeviceProfiles(
        '/bin/emulator' as Str,
        '/bin/avdmanager' as Str,
      );
      /* Existing pixel_9 AVD + uncreated pixel_8 hardware profile (pixel_9 deduped) */
      expect(all).toHaveLength(2);
      expect(all[0]?.deviceId).toBe('pixel_9');
      expect(all[0]?.created).toBe(true);
      expect(all[1]?.deviceId).toBe('pixel_8');
      expect(all[1]?.created).toBe(false);
      /* Uncreated device pulls dimensions from DEVICE_DIMENSIONS static lookup */
      expect(all[1]?.width as number).toBe(1080);
      expect(all[1]?.height as number).toBe(2400);
    });

    it('getAndroidDeviceProfiles gives zero dims for unknown deviceId not in lookup', async () => {
      const listDevicesOutput = [
        'id: 99 or "unknown_device_xyz"',
        '    Name: Unknown',
        '    OEM : Google',
        '---------',
      ].join('\n');
      const mod = await loadWithExec({
        execFileImpl: (_file, args, cb) => {
          if ((args as readonly string[]).includes('-list-avds')) {
            cb(null, { stdout: '', stderr: '' });
          } else if ((args as readonly string[])[0] === 'list') {
            cb(null, { stdout: listDevicesOutput, stderr: '' });
          } else {
            cb(null, { stdout: '', stderr: '' });
          }
          return null;
        },
      });
      const all = await mod.getAndroidDeviceProfiles(
        '/bin/emulator' as Str,
        '/bin/avdmanager' as Str,
      );
      expect(all).toHaveLength(1);
      expect(all[0]?.deviceId).toBe('unknown_device_xyz');
      expect(all[0]?.width as number).toBe(0);
      expect(all[0]?.height as number).toBe(0);
      expect(all[0]?.density as number).toBe(0);
    });

    it('createAvd builds AVD name from deviceId + API level and invokes avdmanager', async () => {
      let invokedArgs: readonly string[] | null = null;
      const mod = await loadWithExec({
        execFileImpl: (_file, args, cb) => {
          invokedArgs = args;
          cb(null, { stdout: '', stderr: '' });
          return { stdin: { write: () => true, end: () => {} } };
        },
      });
      const name: Str = await mod.createAvd(
        '/bin/avdmanager' as Str,
        'pixel_9' as Str,
        'system-images;android-35;google_apis;arm64-v8a' as Str,
      );
      expect(name).toBe('Pixel_9_API_35');
      expect(invokedArgs).toContain('create');
      expect(invokedArgs).toContain('avd');
      expect(invokedArgs).toContain('--device');
      expect(invokedArgs).toContain('pixel_9');
    });

    it('createAvd uses "unknown" API suffix when system image lacks android-NN', async () => {
      const mod = await loadWithExec({
        execFileImpl: (_file, _args, cb) => {
          cb(null, { stdout: '', stderr: '' });
          return { stdin: { write: () => true, end: () => {} } };
        },
      });
      const name: Str = await mod.createAvd(
        '/bin/avdmanager' as Str,
        'pixel_9_pro' as Str,
        'system-images;no-android-version;foo;bar' as Str,
      );
      expect(name).toBe('Pixel_9_Pro_API_unknown');
    });

    it('createAvd rejects when execFile callback receives error', async () => {
      const mod = await loadWithExec({
        execFileImpl: (_file, _args, cb) => {
          cb(new Error('creation failed'));
          return { stdin: { write: () => true, end: () => {} } };
        },
      });
      await expect(
        mod.createAvd(
          '/bin/avdmanager' as Str,
          'pixel_9' as Str,
          'system-images;android-35;google_apis;arm64-v8a' as Str,
        ),
      ).rejects.toThrow('creation failed');
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
