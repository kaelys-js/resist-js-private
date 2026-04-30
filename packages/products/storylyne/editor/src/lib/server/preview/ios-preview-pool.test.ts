/**
 * Tests for the iOS Simulator Live View capture pool.
 *
 * Verifies round-robin scheduling, frame capture flow,
 * lifecycle management, and cleanup.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { Num, Str } from '@/schemas/common';
import { execFile } from 'node:child_process';
import { readFile, unlink } from 'node:fs/promises';
import { IosPreviewCapturePool, DEFAULT_POOL_SIZE, DEFAULT_TARGET_FPS } from './ios-preview-pool';

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */

vi.mock('node:child_process', (): Record<string, unknown> => {
  const module: Record<string, unknown> = {
    execFile: vi.fn(),
  };

  return { ...module, default: module };
});

vi.mock('node:fs/promises', (): Record<string, unknown> => {
  const module: Record<string, unknown> = {
    readFile: vi.fn(),
    unlink: vi.fn(),
  };

  return { ...module, default: module };
});

/* ------------------------------------------------------------------ */
/*  Fixtures                                                           */
/* ------------------------------------------------------------------ */

const TEST_UDID: Str = 'B33CE7D0-3CD7-4BB9-AEDC-0D5679F6D0C0' as Str;
const FAKE_PNG: Buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0xaa, 0xbb, 0xcc]);

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Make execFile resolve immediately (simulating successful screenshot).
 */
function mockExecFileSuccess(): void {
  (execFile as unknown as Mock).mockImplementation(
    (
      _cmd: Str,
      _args: string[],
      callback: (err: Error | null, result: { stdout: Str; stderr: Str }) => void,
    ): void => {
      callback(null, { stdout: '' as Str, stderr: '' as Str });
    },
  );
}

/**
 * Make readFile return fake PNG data.
 */
function mockReadFileSuccess(): void {
  (readFile as unknown as Mock).mockResolvedValue(FAKE_PNG);
}

/**
 * Make unlink resolve (temp file cleanup).
 */
function mockUnlinkSuccess(): void {
  (unlink as unknown as Mock).mockResolvedValue(undefined);
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('IosPreviewCapturePool', (): void => {
  beforeEach((): void => {
    vi.clearAllMocks();
    mockExecFileSuccess();
    mockReadFileSuccess();
    mockUnlinkSuccess();
  });

  afterEach((): void => {
    vi.restoreAllMocks();
  });

  /* ---------------------------------------------------------------- */
  /*  Constants                                                        */
  /* ---------------------------------------------------------------- */

  it('exports default pool size of 3', (): void => {
    expect(DEFAULT_POOL_SIZE).toBe(3 as Num);
  });

  it('exports default target FPS of 20', (): void => {
    expect(DEFAULT_TARGET_FPS).toBe(20 as Num);
  });

  /* ---------------------------------------------------------------- */
  /*  Construction                                                     */
  /* ---------------------------------------------------------------- */

  it('creates a pool with default size', (): void => {
    const pool: IosPreviewCapturePool = new IosPreviewCapturePool(TEST_UDID);
    expect(pool.udid).toBe(TEST_UDID);
    expect(pool.poolSize).toBe(DEFAULT_POOL_SIZE);
    expect(pool.isRunning).toBe(false);
  });

  it('creates a pool with custom size', (): void => {
    const pool: IosPreviewCapturePool = new IosPreviewCapturePool(TEST_UDID, 5 as Num);
    expect(pool.poolSize).toBe(5 as Num);
  });

  /* ---------------------------------------------------------------- */
  /*  Capture loop lifecycle                                           */
  /* ---------------------------------------------------------------- */

  it('starts the capture loop', (): void => {
    const pool: IosPreviewCapturePool = new IosPreviewCapturePool(TEST_UDID);
    const onFrame: Mock = vi.fn();

    pool.start(onFrame, 60 as Num);

    expect(pool.isRunning).toBe(true);

    pool.stop();
  });

  it('stops the capture loop', (): void => {
    const pool: IosPreviewCapturePool = new IosPreviewCapturePool(TEST_UDID);
    const onFrame: Mock = vi.fn();

    pool.start(onFrame, 60 as Num);
    pool.stop();

    expect(pool.isRunning).toBe(false);
  });

  it('is idempotent on start', (): void => {
    const pool: IosPreviewCapturePool = new IosPreviewCapturePool(TEST_UDID);
    const onFrame: Mock = vi.fn();

    pool.start(onFrame, 60 as Num);
    pool.start(onFrame, 60 as Num); // second start is no-op

    expect(pool.isRunning).toBe(true);

    pool.stop();
  });

  it('is idempotent on stop', (): void => {
    const pool: IosPreviewCapturePool = new IosPreviewCapturePool(TEST_UDID);

    pool.stop(); // stop without start is no-op
    expect(pool.isRunning).toBe(false);
  });

  /* ---------------------------------------------------------------- */
  /*  Frame capture                                                    */
  /* ---------------------------------------------------------------- */

  it('calls onFrame callback with captured JPEG buffer', async (): Promise<void> => {
    const pool: IosPreviewCapturePool = new IosPreviewCapturePool(TEST_UDID);
    const onFrame: Mock = vi.fn();

    pool.start(onFrame, 60 as Num);

    // Allow one capture cycle to complete
    await vi.waitFor(
      (): void => {
        expect(onFrame).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    pool.stop();

    const firstFrame: Buffer = onFrame.mock.calls[0]![0] as Buffer;
    expect(Buffer.isBuffer(firstFrame)).toBe(true);
  });

  it('uses xcrun simctl io screenshot for capture', async (): Promise<void> => {
    const pool: IosPreviewCapturePool = new IosPreviewCapturePool(TEST_UDID);
    const onFrame: Mock = vi.fn();

    pool.start(onFrame, 60 as Num);

    await vi.waitFor(
      (): void => {
        expect(execFile).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    pool.stop();

    const call: unknown[] = (execFile as unknown as Mock).mock.calls[0] as unknown[];
    const cmd: Str = call[0] as Str;
    const args: string[] = call[1] as string[];

    expect(cmd).toBe('xcrun');
    expect(args[0]).toBe('simctl');
    expect(args[1]).toBe('io');
    expect(args[2]).toBe(TEST_UDID);
    expect(args[3]).toBe('screenshot');
    expect(args).toContain('--type=jpeg');
  });

  it('cleans up temp files after reading', async (): Promise<void> => {
    const pool: IosPreviewCapturePool = new IosPreviewCapturePool(TEST_UDID);
    const onFrame: Mock = vi.fn();

    pool.start(onFrame, 60 as Num);

    await vi.waitFor(
      (): void => {
        expect(unlink).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    pool.stop();
  });

  /* ---------------------------------------------------------------- */
  /*  FPS tracking                                                     */
  /* ---------------------------------------------------------------- */

  it('tracks frame count', async (): Promise<void> => {
    const pool: IosPreviewCapturePool = new IosPreviewCapturePool(TEST_UDID);
    const onFrame: Mock = vi.fn();

    pool.start(onFrame, 60 as Num);

    await vi.waitFor(
      (): void => {
        expect(pool.frameCount).toBeGreaterThan(0 as Num);
      },
      { timeout: 2000 },
    );

    pool.stop();
  });

  it('resets frame count on start', (): void => {
    const pool: IosPreviewCapturePool = new IosPreviewCapturePool(TEST_UDID);
    const onFrame: Mock = vi.fn();

    pool.start(onFrame, 60 as Num);
    pool.stop();

    pool.start(onFrame, 60 as Num);
    expect(pool.frameCount).toBe(0 as Num);
    pool.stop();
  });

  /* ---------------------------------------------------------------- */
  /*  Target FPS                                                       */
  /* ---------------------------------------------------------------- */

  it('allows adjusting target FPS', (): void => {
    const pool: IosPreviewCapturePool = new IosPreviewCapturePool(TEST_UDID);
    const onFrame: Mock = vi.fn();

    pool.start(onFrame, 60 as Num);

    pool.adjustTargetFps(10 as Num);

    pool.stop();
  });

  /* ---------------------------------------------------------------- */
  /*  Error handling                                                   */
  /* ---------------------------------------------------------------- */

  it('continues capture loop on transient screenshot failure', async (): Promise<void> => {
    let callCount: Num = 0 as Num;

    (execFile as unknown as Mock).mockImplementation(
      (
        _cmd: Str,
        _args: string[],
        callback: (err: Error | null, result: { stdout: Str; stderr: Str }) => void,
      ): void => {
        callCount = ((callCount as number) + 1) as Num;
        if (callCount === (1 as Num)) {
          callback(new Error('transient failure'), { stdout: '' as Str, stderr: '' as Str });
        } else {
          callback(null, { stdout: '' as Str, stderr: '' as Str });
        }
      },
    );

    const pool: IosPreviewCapturePool = new IosPreviewCapturePool(TEST_UDID);
    const onFrame: Mock = vi.fn();

    pool.start(onFrame, 60 as Num);

    /* Despite first call failing, should eventually deliver a frame */
    await vi.waitFor(
      (): void => {
        expect(onFrame).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    pool.stop();
  });

  it('handles temp file cleanup failure gracefully', async (): Promise<void> => {
    (unlink as unknown as Mock).mockRejectedValue(new Error('ENOENT'));

    const pool: IosPreviewCapturePool = new IosPreviewCapturePool(TEST_UDID);
    const onFrame: Mock = vi.fn();

    pool.start(onFrame, 60 as Num);

    await vi.waitFor(
      (): void => {
        expect(onFrame).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    pool.stop();
  });
});
