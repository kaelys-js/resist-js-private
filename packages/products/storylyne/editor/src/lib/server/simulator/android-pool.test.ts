/**
 * Tests for Android Emulator pool management.
 *
 * @module
 */

import type { Num, Str } from '@/schemas/common';
import { describe, expect, it } from 'vitest';
import { assignSerial } from './android-pool';

describe('android-pool', () => {
  describe('assignSerial', () => {
    it('assigns sequential serials starting from emulator-5554', () => {
      const serial0: Str = assignSerial(0 as Num);
      expect(serial0).toBe('emulator-5554');
    });

    it('assigns next serial for index 1', () => {
      const serial1: Str = assignSerial(1 as Num);
      expect(serial1).toBe('emulator-5556');
    });

    it('assigns correct serial for index 2', () => {
      const serial2: Str = assignSerial(2 as Num);
      expect(serial2).toBe('emulator-5558');
    });
  });
});
