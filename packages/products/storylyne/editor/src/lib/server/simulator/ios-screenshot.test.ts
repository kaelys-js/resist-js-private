/**
 * Tests for iOS Simulator screenshot capture.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { describe, expect, it } from 'vitest';
import { captureSimulatorScreenshot } from './ios-screenshot';

describe('ios-screenshot', () => {
  describe('captureSimulatorScreenshot', () => {
    it('rejects with error for non-booted device', async () => {
      /* A random UDID that doesn't correspond to any booted simulator */
      await expect(
        captureSimulatorScreenshot('00000000-0000-0000-0000-000000000000' as Str),
      ).rejects.toThrow();
    });

    /* Note: successful screenshot tests require a booted simulator
     * and are tested via integration tests. */
  });
});
