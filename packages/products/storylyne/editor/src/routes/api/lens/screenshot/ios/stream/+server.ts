/**
 * iOS Simulator Live Preview Stream
 *
 * MJPEG streaming endpoint that continuously captures screenshots
 * from the iOS Simulator and sends them as multipart/x-mixed-replace.
 * Browsers natively render MJPEG in `<img>` tags.
 *
 * Dev-only — returns 404 in production builds.
 *
 * @module
 */

import type { Num, Str } from '@/schemas/common';
import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import { captureSimulatorScreenshot } from '$lib/server/simulator/ios-screenshot';
import { isXcrunAvailable } from '$lib/server/simulator/ios-simctl';

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
 * @param udid - Simulator UDID
 * @param state - Cancellation state object
 * @returns Resolves when streaming is cancelled
 */
async function emitFrame(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  udid: Str,
  state: { cancelled: boolean },
): Promise<void> {
  if (state.cancelled) {
    controller.close();
    return;
  }

  try {
    const pngBuffer: Buffer = await captureSimulatorScreenshot(udid);
    const bytes: Uint8Array = new Uint8Array(pngBuffer);
    const header: string = `${BOUNDARY}\r\nContent-Type: image/png\r\nContent-Length: ${bytes.length}\r\n\r\n`;
    controller.enqueue(encoder.encode(header));
    controller.enqueue(bytes);
    controller.enqueue(encoder.encode('\r\n'));
  } catch {
    /* Screenshot capture failed — skip frame */
  }

  await frameDelay();
  return emitFrame(controller, encoder, udid, state);
}

/* ------------------------------------------------------------------ */
/*  GET handler                                                        */
/* ------------------------------------------------------------------ */

/**
 * GET handler — returns MJPEG stream from iOS Simulator.
 *
 * @param {unknown} event - SvelteKit request event with `url` for query params
 * @returns Multipart MJPEG stream (200) or error (503) or 404 in production
 */
export const GET: RequestHandler = async (event) => {
  const { url } = event;

  if (!dev) {
    return new Response('Stream API is dev-only', { status: 404 });
  }

  const xcrunAvailable: boolean = await isXcrunAvailable();

  if (!xcrunAvailable) {
    return new Response(JSON.stringify({ error: 'xcrun not available' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const udid: Str = (url.searchParams.get('udid') ?? 'booted') as Str;
  const state: { cancelled: boolean } = { cancelled: false };

  const stream: ReadableStream<Uint8Array> = new ReadableStream<Uint8Array>({
    start(controller: ReadableStreamDefaultController<Uint8Array>): void {
      const encoder: TextEncoder = new TextEncoder();
      emitFrame(controller, encoder, udid, state);
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
