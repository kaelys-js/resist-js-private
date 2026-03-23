/**
 * Tests for clipboard.ts — shared clipboard utility for the Lens documentation system.
 *
 * Mocks browser APIs since tests run in node environment.
 *
 * @module
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Str } from '@/schemas/common';

describe('clipboardCopy', () => {
  let clipboardCopy: (text: Str) => Promise<boolean>;

  beforeEach(async () => {
    // Set up minimal DOM globals for the module
    vi.stubGlobal('navigator', { clipboard: undefined });
    vi.stubGlobal('document', {
      createElement: vi.fn(),
      body: { insertBefore: vi.fn() },
      execCommand: vi.fn(),
    });

    // Dynamic import to pick up our stubs
    ({ clipboardCopy } = await import('./clipboard.js'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses navigator.clipboard.writeText when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const result: boolean = await clipboardCopy('hello' as Str);
    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('falls back to execCommand when clipboard API throws', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const mockTa = {
      value: '',
      style: { position: '', opacity: '' },
      select: vi.fn(),
      remove: vi.fn(),
    };
    const createElement = vi.fn().mockReturnValue(mockTa);
    const insertBefore = vi.fn();
    const execCommand = vi.fn().mockReturnValue(true);
    vi.stubGlobal('document', {
      createElement,
      body: { insertBefore },
      execCommand,
    });

    const result: boolean = await clipboardCopy('test' as Str);
    expect(result).toBe(true);
    expect(createElement).toHaveBeenCalledWith('textarea');
    expect(mockTa.value).toBe('test');
    expect(mockTa.style.position).toBe('fixed');
    expect(mockTa.style.opacity).toBe('0');
    expect(mockTa.select).toHaveBeenCalled();
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(mockTa.remove).toHaveBeenCalled();
  });

  it('falls back to execCommand when clipboard API is undefined', async () => {
    vi.stubGlobal('navigator', { clipboard: undefined });

    const mockTa = {
      value: '',
      style: { position: '', opacity: '' },
      select: vi.fn(),
      remove: vi.fn(),
    };
    const createElement = vi.fn().mockReturnValue(mockTa);
    const insertBefore = vi.fn();
    const execCommand = vi.fn().mockReturnValue(true);
    vi.stubGlobal('document', {
      createElement,
      body: { insertBefore },
      execCommand,
    });

    const result: boolean = await clipboardCopy('fallback' as Str);
    expect(result).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('returns false when execCommand returns false', async () => {
    vi.stubGlobal('navigator', {});

    const mockTa = {
      value: '',
      style: { position: '', opacity: '' },
      select: vi.fn(),
      remove: vi.fn(),
    };
    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValue(mockTa),
      body: { insertBefore: vi.fn() },
      execCommand: vi.fn().mockReturnValue(false),
    });

    const result: boolean = await clipboardCopy('fail' as Str);
    expect(result).toBe(false);
  });

  it('returns false when both clipboard API and execCommand throw', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    vi.stubGlobal('document', {
      createElement: vi.fn().mockImplementation(() => {
        throw new Error('not available');
      }),
      body: { insertBefore: vi.fn() },
      execCommand: vi.fn(),
    });

    const result: boolean = await clipboardCopy('error' as Str);
    expect(result).toBe(false);
  });
});
