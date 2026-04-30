/**
 * Android Emulator Live Preview Stream
 *
 * MJPEG streaming endpoint that continuously captures screenshots
 * from the Android Emulator and sends them as multipart/x-mixed-replace.
 * Browsers natively render MJPEG in `<img>` tags.
 *
 * Dev-only — returns 404 in production builds.
 *
 * @module
 */

import type { Num, Str } from '@/schemas/common';
import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import { captureEmulatorScreenshot } from '$lib/server/simulator/android-screenshot';
import { checkAndroidSdk } from '$lib/server/simulator/android-sdk';

/** Target frame interval in milliseconds (~10 fps). */
const FRAME_INTERVAL_MS: Num = 100 as Num;

/** MJPEG boundary string. */
const BOUNDARY: Str = '--mjpegboundary' as Str;

/**
 * Delay between stream frames.
 *
 * @returns Promise that resolves after the frame interval
 */
function frameDelay(): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, FRAME_INTERVAL_MS as number);
  });
}

/**
 * Emit a single MJPEG frame and schedule the next one.
 *
 * Recursive async — each call captures one frame, enqueues it,
 * waits the frame interval, then calls itself.
 *
 * @param controller - Stream controller for enqueuing chunks
 * @param encoder - TextEncoder for header bytes
 * @param adbPath - Path to adb binary
 * @param serial - Emulator serial
 * @param state - Cancellation state object
 * @returns Resolves when streaming is cancelled
 */
async function emitFrame(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  adbPath: Str,
  serial: Str,
  state: { cancelled: boolean },
): Promise<void> {
  if (state.cancelled) {
    controller.close();
    return;
  }

  try {
    const base64: Str = await captureEmulatorScreenshot(adbPath, serial);
    const binaryStr: string = atob(base64 as string);
    const bytes: Uint8Array = new Uint8Array(binaryStr.length);

    for (let i: Num = 0 as Num; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.codePointAt(i) ?? 0;
    }

    const header: string = `${BOUNDARY}\r\nContent-Type: image/png\r\nContent-Length: ${bytes.length}\r\n\r\n`;
    controller.enqueue(encoder.encode(header));
    controller.enqueue(bytes);
    controller.enqueue(encoder.encode('\r\n'));
  } catch {
    /* Screenshot capture failed — skip frame */
  }

  await frameDelay();
  return emitFrame(controller, encoder, adbPath, serial, state);
}

/* ------------------------------------------------------------------ */
/*  GET handler                                                        */
/* ------------------------------------------------------------------ */

/**
 * GET handler — returns MJPEG stream from Android Emulator.
 *
 * @param {unknown} event - SvelteKit request event with `url` for query params
 * @returns Multipart MJPEG stream (200) or error (503) or 404 in production
 */
export const GET: RequestHandler = async (event) => {
  const { url } = event;

  if (!dev) {
    return new Response('Stream API is dev-only', { status: 404 });
  }

  const sdk = await checkAndroidSdk();

  if (!sdk.installed || !sdk.paths) {
    return new Response(JSON.stringify({ error: 'Android SDK not available' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const serial: Str = (url.searchParams.get('serial') ?? 'emulator-5554') as Str;
  const adbPath: Str = sdk.paths.adb;
  const state: { cancelled: boolean } = { cancelled: false };

  const stream: ReadableStream<Uint8Array> = new ReadableStream<Uint8Array>({
    start(controller: ReadableStreamDefaultController<Uint8Array>): void {
      const encoder: TextEncoder = new TextEncoder();
      emitFrame(controller, encoder, adbPath, serial, state);
    },
    cancel(): void {
      state.cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': `multipart/x-mixed-replace; boundary=${BOUNDARY}`,
      'Cache-Control': 'no-cache, no-store',
      Connection: 'keep-alive',
    },
  });
};
