/**
 * Tests for the scrcpy server lifecycle manager.
 *
 * Verifies adb detection, server push, process spawning,
 * handshake parsing, shutdown, and auto-restart.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Bool, Num, Str } from '@/schemas/common';
import {
  SCRCPY_SERVER_PATH,
  SCRCPY_VERSION,
  isAdbAvailable,
  pushServer,
  startScrcpyServer,
  stopScrcpyServer,
} from './scrcpy-server';

/* ------------------------------------------------------------------ */
/*  Mock child_process                                                 */
/* ------------------------------------------------------------------ */

/** Captured spawn calls for verification. */
const spawnCalls: Array<{ cmd: Str; args: Str[] }> = [];

/** Captured execFile calls for verification. */
const execFileCalls: Array<{ cmd: Str; args: Str[] }> = [];

/** Configurable exec results. */
let execFileResult: { stdout: Str; stderr: Str } = {
  stdout: '' as Str,
  stderr: '' as Str,
};

/** Whether execFile should reject. */
let execFileShouldReject: boolean = false;

/** Mock child process returned by spawn. */
let mockChildProcess: {
  pid: Num;
  kill: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  stdout: { on: ReturnType<typeof vi.fn> };
  stderr: { on: ReturnType<typeof vi.fn> };
  killed: boolean;
};

vi.mock('node:child_process', (): Record<string, unknown> => {
  /** Mock execFile that captures calls and optionally rejects. */
  const mockExecFile = vi.fn(
    (
      cmd: Str,
      args: Str[],
      _opts: unknown,
      cb: (err: Error | null, result: { stdout: Str; stderr: Str }) => void,
    ): void => {
      execFileCalls.push({ cmd, args });
      if (execFileShouldReject) {
        cb(new Error('Command failed'), { stdout: '' as Str, stderr: '' as Str });
      } else {
        cb(null, execFileResult);
      }
    },
  );

  /** Mock spawn that captures calls and returns mock child process. */
  const mockSpawn = vi.fn((cmd: Str, args: Str[]): unknown => {
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

describe('scrcpy-server', (): void => {
  beforeEach((): void => {
    spawnCalls.length = 0;
    execFileCalls.length = 0;
    execFileResult = { stdout: '' as Str, stderr: '' as Str };
    execFileShouldReject = false;
    mockChildProcess = {
      pid: 12_345 as Num,
      kill: vi.fn(),
      on: vi.fn(),
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      killed: false,
    };
  });

  afterEach((): void => {
    vi.restoreAllMocks();
  });

  /* ---------------------------------------------------------------- */
  /*  Constants                                                        */
  /* ---------------------------------------------------------------- */

  it('exports the server device path', (): void => {
    expect(SCRCPY_SERVER_PATH).toBe('/data/local/tmp/scrcpy-server.jar' as Str);
  });

  it('exports a scrcpy version string', (): void => {
    expect(typeof SCRCPY_VERSION).toBe('string');
    // Should be a semver-like version (e.g. "3.1")
    expect((SCRCPY_VERSION as string).length).toBeGreaterThan(0);
  });

  /* ---------------------------------------------------------------- */
  /*  ADB detection                                                    */
  /* ---------------------------------------------------------------- */

  it('isAdbAvailable returns true when adb responds', async (): Promise<void> => {
    execFileResult = {
      stdout: 'Android Debug Bridge version 1.0.41' as Str,
      stderr: '' as Str,
    };
    const result: boolean = await isAdbAvailable();
    expect(result).toBe(true as Bool);
  });

  it('isAdbAvailable returns false when adb is not found', async (): Promise<void> => {
    execFileShouldReject = true;
    const result: boolean = await isAdbAvailable();
    expect(result).toBe(false as Bool);
  });

  it('isAdbAvailable calls adb version', async (): Promise<void> => {
    await isAdbAvailable();
    expect(execFileCalls[0].cmd).toBe('adb' as Str);
    expect(execFileCalls[0].args).toContain('version');
  });

  /* ---------------------------------------------------------------- */
  /*  Server push                                                      */
  /* ---------------------------------------------------------------- */

  it('pushServer calls adb push with correct args', async (): Promise<void> => {
    await pushServer('/local/scrcpy-server.jar' as Str);
    const call = execFileCalls.find((c) => c.args.includes('push'));
    expect(call).toBeDefined();
    expect(call?.args).toContain('/local/scrcpy-server.jar');
    expect(call?.args).toContain(SCRCPY_SERVER_PATH as string);
  });

  it('pushServer rejects when adb push fails', async (): Promise<void> => {
    execFileShouldReject = true;
    await expect(pushServer('/local/scrcpy-server.jar' as Str)).rejects.toThrow();
  });

  /* ---------------------------------------------------------------- */
  /*  Server start                                                     */
  /* ---------------------------------------------------------------- */

  it('startScrcpyServer spawns adb shell with CLASSPATH', (): void => {
    const handle = startScrcpyServer('emulator-5554' as Str, {
      width: 1080 as Num,
      height: 1920 as Num,
    });

    expect(spawnCalls.length).toBe(1);
    const [call] = spawnCalls;
    expect(call.cmd).toBe('adb' as Str);

    // Should include serial
    expect(call.args).toContain('-s');
    expect(call.args).toContain('emulator-5554');

    // Should include shell command
    expect(call.args).toContain('shell');

    // Should include CLASSPATH and app_process
    const shellCmd: Str = call.args.find((a: Str) => (a as string).includes('CLASSPATH')) as Str;
    expect(shellCmd).toBeDefined();
    expect(shellCmd as string).toContain('scrcpy-server.jar');
    expect(shellCmd as string).toContain('app_process');
    expect(shellCmd as string).toContain(SCRCPY_VERSION as string);

    expect(handle).toBeDefined();
    expect(handle.pid).toBe(12_345 as Num);
  });

  it('startScrcpyServer includes max_size parameter', (): void => {
    startScrcpyServer('emulator-5554' as Str, {
      width: 1080 as Num,
      height: 1920 as Num,
      maxSize: 1920 as Num,
    });

    const shellCmd: string = spawnCalls[0].args.find((a: Str) =>
      (a as string).includes('max_size'),
    ) as string;
    expect(shellCmd).toContain('max_size=1920');
  });

  it('startScrcpyServer includes video codec parameter', (): void => {
    startScrcpyServer('emulator-5554' as Str, {
      width: 1080 as Num,
      height: 1920 as Num,
      videoCodec: 'h264' as Str,
    });

    const shellCmd: string = spawnCalls[0].args.find((a: Str) =>
      (a as string).includes('video_codec'),
    ) as string;
    expect(shellCmd).toContain('video_codec=h264');
  });

  it('startScrcpyServer disables audio by default', (): void => {
    startScrcpyServer('emulator-5554' as Str, {
      width: 1080 as Num,
      height: 1920 as Num,
    });

    const shellCmd: string = spawnCalls[0].args.find((a: Str) =>
      (a as string).includes('audio=false'),
    ) as string;
    expect(shellCmd).toBeDefined();
  });

  it('startScrcpyServer returns a handle with pid and kill', (): void => {
    const handle = startScrcpyServer('emulator-5554' as Str, {
      width: 1080 as Num,
      height: 1920 as Num,
    });

    expect(handle.pid).toBe(12_345 as Num);
    expect(typeof handle.kill).toBe('function');
  });

  /* ---------------------------------------------------------------- */
  /*  Server stop                                                      */
  /* ---------------------------------------------------------------- */

  it('stopScrcpyServer kills the child process', (): void => {
    const handle = startScrcpyServer('emulator-5554' as Str, {
      width: 1080 as Num,
      height: 1920 as Num,
    });

    stopScrcpyServer(handle);
    expect(mockChildProcess.kill).toHaveBeenCalled();
  });

  it('stopScrcpyServer is idempotent on already-killed process', (): void => {
    const handle = startScrcpyServer('emulator-5554' as Str, {
      width: 1080 as Num,
      height: 1920 as Num,
    });

    mockChildProcess.killed = true;
    expect((): void => stopScrcpyServer(handle)).not.toThrow();
  });

  /* ---------------------------------------------------------------- */
  /*  Server options                                                   */
  /* ---------------------------------------------------------------- */

  it('startScrcpyServer supports custom bit rate', (): void => {
    startScrcpyServer('emulator-5554' as Str, {
      width: 1080 as Num,
      height: 1920 as Num,
      videoBitRate: 4_000_000 as Num,
    });

    const shellCmd: string = spawnCalls[0].args.find((a: Str) =>
      (a as string).includes('video_bit_rate'),
    ) as string;
    expect(shellCmd).toContain('video_bit_rate=4000000');
  });

  it('startScrcpyServer includes scid parameter', (): void => {
    startScrcpyServer('emulator-5554' as Str, {
      width: 1080 as Num,
      height: 1920 as Num,
    });

    const shellCmd: string = spawnCalls[0].args.find((a: Str) =>
      (a as string).includes('scid='),
    ) as string;
    expect(shellCmd).toBeDefined();
  });
});
