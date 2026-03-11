/**
 * Tests for iOS Simulator URL navigation.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { describe, expect, it } from 'vitest';
import { openUrlInSimulator } from './ios-navigate';

describe('ios-navigate', () => {
  describe('openUrlInSimulator validation', () => {
    it('rejects empty URL', async () => {
      await expect(
        openUrlInSimulator('fake-udid' as Str, '' as Str),
      ).rejects.toThrow('URL is required');
    });

    it('rejects invalid URL format', async () => {
      await expect(
        openUrlInSimulator('fake-udid' as Str, 'not-a-url' as Str),
      ).rejects.toThrow('Invalid URL');
    });

    it('rejects non-http protocols', async () => {
      await expect(
        openUrlInSimulator('fake-udid' as Str, 'ftp://example.com' as Str),
      ).rejects.toThrow('URL must use http:// or https://');
    });

    it('rejects javascript: protocol', async () => {
      await expect(
        openUrlInSimulator('fake-udid' as Str, 'javascript:alert(1)' as Str),
      ).rejects.toThrow('URL must use http:// or https://');
    });

    it('rejects file: protocol', async () => {
      await expect(
        openUrlInSimulator('fake-udid' as Str, 'file:///etc/passwd' as Str),
      ).rejects.toThrow('URL must use http:// or https://');
    });

    /* Note: successful navigation tests require a booted simulator
     * and are tested via integration tests. */
  });
});
