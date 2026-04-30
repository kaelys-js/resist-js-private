/**
 * scrcpy server lifecycle manager.
 *
 * Handles pushing the scrcpy-server JAR to the Android device via ADB,
 * spawning the server process with `adb shell`, and shutting it down.
 *
 * The scrcpy server provides hardware-accelerated H.264 video encoding
 * at 30-60 FPS with sub-5ms input latency — vastly superior to
 * `adb exec-out screencap` at 1-2 FPS.
 *
 * Protocol:
 * 1. Push scrcpy-server.jar to /data/local/tmp/ via adb push
 * 2. Start server via `adb shell CLASSPATH=... app_process /`
 * 3. Connect video + control sockets via adb forward
 * 4. Server streams H.264 NAL units; client sends control messages
 *
 * @module
 */

import { type ChildProcess, execFile, spawn } from 'node:child_process';
import type { Num, Str } from '@/schemas/common';
import { log } from '@/utils/core/logger';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Path where scrcpy-server.jar is pushed on the device. */
export const SCRCPY_SERVER_PATH: Str = '/data/local/tmp/scrcpy-server.jar' as Str;

/** scrcpy server version. Must match the JAR version exactly. */
export const SCRCPY_VERSION: Str = '3.1' as Str;

/** Default video bit rate in bps. */
const DEFAULT_BIT_RATE: Num = 8_000_000 as Num;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Options for starting the scrcpy server. */
export type ScrcpyServerOptions = {
  /** Device screen width in pixels. */
  width: Num;
  /** Device screen height in pixels. */
  height: Num;
  /** Maximum dimension (downscale if either dimension exceeds). */
  maxSize?: Num;
  /** H.264 bit rate in bps (default: 8 Mbps). */
  videoBitRate?: Num;
  /** Video codec to use (default: h264). */
  videoCodec?: Str;
};

/** Handle for a running scrcpy server process. */
export type ScrcpyServerHandle = {
  /** Process ID of the spawned adb shell process. */
  pid: Num;
  /** Terminate the server process. */
  kill: () => void;
  /** Session connection ID (31-bit random). */
  scid: Num;
  /** The underlying child process reference. */
  process: ChildProcess;
};

/* ------------------------------------------------------------------ */
/*  ADB detection                                                      */
/* ------------------------------------------------------------------ */

/**
 * Check if `adb` is available on the system PATH.
 *
 * @returns {Promise<boolean>} True if adb responds to `adb version`
 */
export function isAdbAvailable(): Promise<boolean> {
  return new Promise<boolean>((resolve): void => {
    execFile('adb', ['version'], { timeout: 5000 }, (err: Error | null): void => {
      resolve(err === null);
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Server push                                                        */
/* ------------------------------------------------------------------ */

/**
 * Push the scrcpy-server JAR to the connected Android device.
 *
 * @param {Str} localPath - Local path to the scrcpy-server.jar file
 * @returns Promise that resolves when push completes
 * @throws Error if adb push fails
 */
export function pushServer(localPath: Str): Promise<void> {
  return new Promise<void>((resolve, reject): void => {
    execFile(
      'adb',
      ['push', localPath as string, SCRCPY_SERVER_PATH as string],
      { timeout: 30_000 },
      (err: Error | null): void => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      },
    );
  });
}

/* ------------------------------------------------------------------ */
/*  Server start                                                       */
/* ------------------------------------------------------------------ */

/**
 * Generate a 31-bit random session connection ID.
 *
 * Used for scrcpy's SCID parameter to prevent socket name collisions
 * when multiple instances run simultaneously.
 *
 * @returns Random 31-bit integer
 */
function generateScid(): Num {
  return (Math.floor(Math.random() * 2_147_483_647) + 1) as Num;
}

/**
 * Start the scrcpy server on the specified Android device.
 *
 * Spawns `adb -s <serial> shell CLASSPATH=... app_process / ...`
 * with the appropriate key=value configuration parameters.
 *
 * @param {Str} serial - Device serial (e.g., 'emulator-5554')
 * @param {ScrcpyServerOptions} options - Server configuration options
 * @returns {ScrcpyServerHandle} Handle for the running server process
 */
export function startScrcpyServer(serial: Str, options: ScrcpyServerOptions): ScrcpyServerHandle {
  const scid: Num = generateScid();
  const bitRate: Num = options.videoBitRate ?? DEFAULT_BIT_RATE;
  const codec: Str = options.videoCodec ?? ('h264' as Str);

  // Build the server command with key=value parameters
  const serverParams: Str[] = [
    `${SCRCPY_VERSION}` as Str,
    `scid=${(scid as number).toString(16).padStart(8, '0')}` as Str,
    'audio=false' as Str,
    'video=true' as Str,
    'control=true' as Str,
    `video_codec=${codec}` as Str,
    `video_bit_rate=${bitRate}` as Str,
    'send_device_meta=true' as Str,
    'send_dummy_byte=true' as Str,
  ];

  if (options.maxSize !== undefined) {
    serverParams.push(`max_size=${options.maxSize}` as Str);
  }

  const shellCmd: Str = [
    `CLASSPATH=${SCRCPY_SERVER_PATH}`,
    'app_process',
    '/',
    'com.genymobile.scrcpy.Server',
    ...serverParams,
  ].join(' ') as Str;

  const child: ChildProcess = spawn('adb', ['-s', serial as string, 'shell', shellCmd as string]);

  // Log stderr output for debugging
  child.stderr?.on('data', (data: Buffer): void => {
    log.debug('scrcpy server stderr', { output: data.toString().trim() });
  });

  // Log process exit
  child.on('exit', (code: number | null): void => {
    log.info('scrcpy server exited', { code, serial });
  });

  return {
    pid: (child.pid ?? 0) as Num,
    kill: (): void => {
      if (!child.killed) {
        child.kill();
      }
    },
    scid,
    process: child,
  };
}

/* ------------------------------------------------------------------ */
/*  Server stop                                                        */
/* ------------------------------------------------------------------ */

/**
 * Stop a running scrcpy server.
 *
 * @param {ScrcpyServerHandle} handle - Server handle from startScrcpyServer
 */
export function stopScrcpyServer(handle: ScrcpyServerHandle): void {
  handle.kill();
}
