/**
 * Tests for the H.264→JPEG transcode module.
 *
 * Verifies ffmpeg availability detection, subprocess spawning
 * with correct codec parameters, and frame callback invocation.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Num, Str } from '@/schemas/common';
import {
  type TranscodeHandle,
  type TranscodeOptions,
  isFfmpegAvailable,
  createTranscoder,
} from './scrcpy-transcode';

/* ------------------------------------------------------------------ */
/*  Mock child_process                                                 */
/* ------------------------------------------------------------------ */

/** Captured spawn calls for verification. */
const spawnCalls: Array<{ cmd: Str; args: string[] }> = [];

/** Mock stdin for the ffmpeg process. */
let mockStdin: {
  write: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
};

/** Mock stdout for the ffmpeg process. */
let mockStdout: {
  on: ReturnType<typeof vi.fn>;
  listeners: Map<string, Array<(data: Buffer) => void>>;
  emit: (event: string, data: Buffer) => void;
};

/** Mock stderr for the ffmpeg process. */
let mockStderr: {
  on: ReturnType<typeof vi.fn>;
};

/** Mock child process returned by spawn. */
let mockChildProcess: {
  pid: Num;
  kill: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  stdin: typeof mockStdin;
  stdout: typeof mockStdout;
  stderr: typeof mockStderr;
  killed: boolean;
};

/** Captured execFile calls for verification. */
const execFileCalls: Array<{ cmd: Str; args: string[] }> = [];

/** Whether execFile should reject. */
let execFileShouldReject: boolean = false;

vi.mock('node:child_process', (): Record<string, unknown> => {
  /** Mock execFile for ffmpeg version check. */
  const mockExecFile = vi.fn(
    (cmd: Str, args: string[], _opts: unknown, cb: (err: Error | null) => void): void => {
      execFileCalls.push({ cmd, args });
      if (execFileShouldReject) {
        cb(new Error('Command failed'));
      } else {
        cb(null);
      }
    },
  );

  /** Mock spawn for ffmpeg transcode process. */
  const mockSpawn = vi.fn((cmd: Str, args: string[]): unknown => {
    spawnCalls.push({ cmd, args });
    return mockChildProcess;
  });

  // Provide both named exports and CJS default for ESM interop
  const module: Record<string, unknown> = {
    execFile: mockExecFile,
    spawn: mockSpawn,
  };

  return { ...module, default: module };
});

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('scrcpy-transcode', (): void => {
  beforeEach((): void => {
    spawnCalls.length = 0;
    execFileCalls.length = 0;
    execFileShouldReject = false;

    const stdoutListeners: Map<string, Array<(data: Buffer) => void>> = new Map();

    mockStdin = {
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn(),
    };

    mockStdout = {
      on: vi.fn((event: string, handler: (data: Buffer) => void): void => {
        const existing = stdoutListeners.get(event) ?? [];
        existing.push(handler);
        stdoutListeners.set(event, existing);
      }),
      listeners: stdoutListeners,
      emit(event: string, data: Buffer): void {
        const handlers = stdoutListeners.get(event) ?? [];

        for (const handler of handlers) {
          handler(data);
        }
      },
    };

    mockStderr = {
      on: vi.fn(),
    };

    mockChildProcess = {
      pid: 99_999 as Num,
      kill: vi.fn(),
      on: vi.fn(),
      stdin: mockStdin,
      stdout: mockStdout,
      stderr: mockStderr,
      killed: false,
    };
  });

  afterEach((): void => {
    vi.restoreAllMocks();
  });

  /* ---------------------------------------------------------------- */
  /*  ffmpeg detection                                                  */
  /* ---------------------------------------------------------------- */

  it('isFfmpegAvailable returns true when ffmpeg responds', async (): Promise<void> => {
    const result: boolean = await isFfmpegAvailable();
    expect(result).toBe(true);
    expect(execFileCalls[0]?.cmd).toBe('ffmpeg');
  });

  it('isFfmpegAvailable returns false when ffmpeg is not found', async (): Promise<void> => {
    execFileShouldReject = true;
    const result: boolean = await isFfmpegAvailable();
    expect(result).toBe(false);
  });

  /* ---------------------------------------------------------------- */
  /*  Transcoder creation                                              */
  /* ---------------------------------------------------------------- */

  it('creates a transcoder with correct ffmpeg args', (): void => {
    const options: TranscodeOptions = {
      width: 1080 as Num,
      height: 1920 as Num,
      quality: 80 as Num,
    };

    const handle: TranscodeHandle = createTranscoder(options, vi.fn());

    expect(spawnCalls.length).toBe(1);
    const [call] = spawnCalls;
    expect(call?.cmd).toBe('ffmpeg');

    // Should include H.264 input codec
    expect(call?.args).toContain('h264');

    // Should include JPEG output format
    expect(call?.args).toContain('mjpeg');

    // Should pipe from stdin and to stdout
    expect(call?.args).toContain('pipe:0');
    expect(call?.args).toContain('pipe:1');

    expect(handle).toBeDefined();
    expect(typeof handle.write).toBe('function');
    expect(typeof handle.stop).toBe('function');
  });

  it('passes quality parameter to ffmpeg', (): void => {
    createTranscoder({ width: 1080 as Num, height: 1920 as Num, quality: 60 as Num }, vi.fn());

    const [call] = spawnCalls;
    const args: string = (call?.args ?? []).join(' ');
    // ffmpeg MJPEG quality is controlled by -q:v (1-31, lower = better)
    // We map quality 0-100 → q:v 31-1
    expect(args).toContain('-q:v');
  });

  /* ---------------------------------------------------------------- */
  /*  Frame writing                                                    */
  /* ---------------------------------------------------------------- */

  it('write sends H.264 data to ffmpeg stdin', (): void => {
    const handle: TranscodeHandle = createTranscoder(
      { width: 1080 as Num, height: 1920 as Num, quality: 80 as Num },
      vi.fn(),
    );

    const nalData: Buffer = Buffer.from([0x00, 0x00, 0x00, 0x01, 0x65, 0xaa]);
    handle.write(nalData);

    expect(mockStdin.write).toHaveBeenCalledWith(nalData);
  });

  /* ---------------------------------------------------------------- */
  /*  Stop                                                             */
  /* ---------------------------------------------------------------- */

  it('stop kills the ffmpeg process', (): void => {
    const handle: TranscodeHandle = createTranscoder(
      { width: 1080 as Num, height: 1920 as Num, quality: 80 as Num },
      vi.fn(),
    );

    handle.stop();

    expect(mockStdin.end).toHaveBeenCalled();
    expect(mockChildProcess.kill).toHaveBeenCalled();
  });

  it('stop is idempotent on already-killed process', (): void => {
    const handle: TranscodeHandle = createTranscoder(
      { width: 1080 as Num, height: 1920 as Num, quality: 80 as Num },
      vi.fn(),
    );

    mockChildProcess.killed = true;
    expect((): void => handle.stop()).not.toThrow();
  });

  /* ---------------------------------------------------------------- */
  /*  Output callback                                                  */
  /* ---------------------------------------------------------------- */

  it('invokes onFrame callback when ffmpeg writes JPEG to stdout', (): void => {
    const onFrame = vi.fn();
    createTranscoder({ width: 1080 as Num, height: 1920 as Num, quality: 80 as Num }, onFrame);

    // Simulate ffmpeg writing JPEG data to stdout
    const jpegData: Buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    mockStdout.emit('data', jpegData);

    expect(onFrame).toHaveBeenCalledWith(jpegData);
  });

  it('returns process pid in handle', (): void => {
    const handle: TranscodeHandle = createTranscoder(
      { width: 1080 as Num, height: 1920 as Num, quality: 80 as Num },
      vi.fn(),
    );

    expect(handle.pid).toBe(99_999 as Num);
  });
});
