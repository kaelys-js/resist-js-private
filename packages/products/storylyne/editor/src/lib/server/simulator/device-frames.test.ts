/**
 * Tests for device frame registry and lookup.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { describe, expect, it } from 'vitest';
import { getDeviceFrame, listDeviceFrames } from './device-frames';

describe('device-frames', () => {
  describe('listDeviceFrames', () => {
    it('returns all registered device frames', () => {
      const frames = listDeviceFrames();
      expect(frames.length).toBeGreaterThan(0);
      for (const frame of frames) {
        expect(frame.id).toBeTruthy();
        expect(frame.name).toBeTruthy();
        expect(frame.framePath).toBeTruthy();
        expect(frame.screenRegion.width).toBeGreaterThan(0);
        expect(frame.screenRegion.height).toBeGreaterThan(0);
      }
    });
  });

  describe('getDeviceFrame', () => {
    it('returns frame for known device ID', () => {
      const frame = getDeviceFrame('iphone-16-pro' as Str);
      expect(frame).not.toBeNull();
      expect(frame?.name).toContain('iPhone');
    });

    it('returns null for unknown device ID', () => {
      const frame = getDeviceFrame('galaxy-z-fold-99' as Str);
      expect(frame).toBeNull();
    });

    it('matches case-insensitively via device name substring', () => {
      const frames = listDeviceFrames();
      const [firstFrame] = frames;
      expect(firstFrame).toBeDefined();
      const found = getDeviceFrame(firstFrame.id);
      expect(found).not.toBeNull();
    });
  });
});
