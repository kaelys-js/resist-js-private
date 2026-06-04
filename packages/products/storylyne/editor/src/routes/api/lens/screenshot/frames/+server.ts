/**
 * Device Frame Metadata API
 *
 * Returns available device frame metadata (IDs, names, paths,
 * screen regions) for the device frame compositing UI.
 *
 * Dev-only — returns 404 in production builds.
 *
 * @module
 */

import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import { listDeviceFrames } from '$lib/server/simulator/device-frames';

// =============================================================================
// GET handler
// =============================================================================

/**
 * GET handler — returns all registered device frames.
 *
 * @returns JSON array of device frame entries (200) or 404 in production
 */
export const GET: RequestHandler = () => {
  if (!dev) {
    return new Response('Frames API is dev-only', { status: 404 });
  }

  const frames = listDeviceFrames();

  return new Response(JSON.stringify({ frames }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
