/**
 * Tests for Android Emulator URL navigation.
 *
 * @module
 */

import type { Num, Str } from '@/schemas/common';
import { describe, expect, it } from 'vitest';
import { buildAmStartArgs, buildPortForwardArgs, rewriteUrlForEmulator } from './android-navigate';

describe('android-navigate', () => {
  describe('buildAmStartArgs', () => {
    it('builds am start intent args for a URL', () => {
      const args: Str[] = buildAmStartArgs('http://10.0.2.2:3100/isolate/button' as Str);
      expect(args).toContain('shell');
      expect(args).toContain('am');
      expect(args).toContain('start');
      expect(args).toContain('-a');
      expect(args).toContain('android.intent.action.VIEW');
      expect(args).toContain('-d');
      expect(args).toContain('http://10.0.2.2:3100/isolate/button');
    });
  });

  describe('rewriteUrlForEmulator', () => {
    it('rewrites localhost to 10.0.2.2', () => {
      const url: Str = rewriteUrlForEmulator('http://localhost:3100/isolate/button' as Str);
      expect(url).toBe('http://10.0.2.2:3100/isolate/button');
    });

    it('rewrites 127.0.0.1 to 10.0.2.2', () => {
      const url: Str = rewriteUrlForEmulator('http://127.0.0.1:3100/isolate/button' as Str);
      expect(url).toBe('http://10.0.2.2:3100/isolate/button');
    });

    it('leaves non-localhost URLs unchanged', () => {
      const url: Str = rewriteUrlForEmulator('http://example.com/page' as Str);
      expect(url).toBe('http://example.com/page');
    });
  });

  describe('buildPortForwardArgs', () => {
    it('builds adb forward args', () => {
      const args: Str[] = buildPortForwardArgs(3100 as Num, 3100 as Num);
      expect(args).toContain('forward');
      expect(args).toContain('tcp:3100');
    });
  });
});
