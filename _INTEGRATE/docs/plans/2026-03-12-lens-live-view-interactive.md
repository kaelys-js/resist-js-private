# Lens Live View — Interactive Canvas Preview

## Overview

Replace the passive MJPEG `<img>` Live View with an interactive `<canvas>` that streams engine output via WebSocket binary frames and forwards user input (mouse, keyboard, touch, scroll) back to the engine for real-time interaction.

All 5 engines: Chromium (CDP screencast), Firefox (optimized screenshot loop), WebKit (optimized screenshot loop), Android Emulator (scrcpy H.264), iOS Simulator (parallel simctl pool).

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  LensComponentRenderer.svelte  (Live View Panel)                    │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  <canvas>                                                     │   │
│  │    ← Binary WS frames (JPEG) → createImageBitmap → drawImage │   │
│  │    → JSON WS text frames (mousedown, keyup, wheel, touch...) │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                          ↕ WebSocket                                │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │  Vite WS Plugin          │
              │  /api/lens/preview/ws    │
              │  PreviewSessionManager   │
              └────────────┬────────────┘
                           │
        ┌──────────┬───────┴───────┬──────────┐
        ▼          ▼               ▼          ▼
   CDPScreencast  ScreenshotLoop  ScrcpyStream  SimctlPool
   (Chromium)     (Firefox/WebKit) (Android)    (iOS)
   30-60 FPS      30-50 FPS       30-60 FPS    15-25 FPS
```

## Transport Protocol

**Server → Client:**
- Binary frames: raw JPEG bytes (no base64)
- Text frames: JSON metadata `{ type: 'metadata' | 'fps' | 'cursor' | 'error', ... }`

**Client → Server:**
- Text frames: JSON input events `{ type: 'mouseDown' | 'mouseUp' | 'mouseMove' | ... }`
- Text frames: JSON control `{ type: 'start' | 'stop' | 'resize' | 'quality', ... }`

## File Structure

```
packages/products/storylyne/editor/
  src/lib/server/preview/
    vite-plugin-preview-ws.ts        # Vite plugin for WebSocket upgrade
    preview-session.ts               # Session lifecycle manager
    preview-types.ts                 # Shared types/schemas
    cdp-screencast.ts                # Chromium CDP frame provider
    cdp-input.ts                     # Chromium CDP input dispatcher
    screenshot-loop.ts               # Firefox/WebKit frame provider
    screenshot-input.ts              # Firefox/WebKit Playwright input
    dirty-detector.ts                # MutationObserver injection script
    scrcpy-server.ts                 # Android scrcpy lifecycle
    scrcpy-video.ts                  # H.264 stream → JPEG frames
    scrcpy-control.ts                # scrcpy binary control messages
    ios-preview-pool.ts              # Parallel simctl capture pool
    ios-input.ts                     # iOS CGEvent input injection
    ios-window.ts                    # Simulator window tracking
    adaptive-quality.ts              # Backpressure-driven quality control

  vite.config.ts                     # Add previewWsPlugin()

packages/shared/ui/src/lens-component-renderer/
  LensComponentRenderer.svelte       # Live View canvas panel + UI
```

## Implementation Parts

### Part 1: WebSocket + Chromium CDP Engine (8 tasks)

| # | Task | File(s) |
|---|------|---------|
| 1 | Preview types — InputMessage, ServerMessage, SessionConfig schemas | `preview-types.ts` + test |
| 2 | WebSocket Vite plugin — intercept upgrade at `/api/lens/preview/ws`, parse query params, create ws connection | `vite-plugin-preview-ws.ts` |
| 3 | Preview session manager — create/destroy sessions, track active pages, cleanup on disconnect | `preview-session.ts` + test |
| 4 | CDP screencast provider — `Page.startScreencast`, frame ack, binary WS send, start/stop lifecycle | `cdp-screencast.ts` + test |
| 5 | CDP input dispatcher — dispatch mouse/keyboard/touch/wheel events via CDP Input domain | `cdp-input.ts` + test |
| 6 | Canvas renderer + input capture — `<canvas>`, `createImageBitmap`, coordinate translation, event listeners, WS client | `LensComponentRenderer.svelte` |
| 7 | Live View UI — replace MJPEG img, header (engine badge, FPS, latency, status dot), Stop/Fullscreen buttons | `LensComponentRenderer.svelte` |
| 8 | Vite config integration + QA | `vite.config.ts`, QA |

### Part 2: Firefox/WebKit + Quality Controls (8 tasks)

| # | Task | File(s) |
|---|------|---------|
| 1 | Screenshot loop provider — double-buffered `page.screenshot()`, throttle, binary WS send | `screenshot-loop.ts` + test |
| 2 | Dirty-frame detection — injectable MutationObserver + rAF script, poll `__lensFrameDirty` flag | `dirty-detector.ts` + test |
| 3 | Playwright input forwarder — mouse, keyboard, touchscreen API dispatch from WS messages | `screenshot-input.ts` + test |
| 4 | Session manager engine routing — detect engine type, route to CDP or screenshot-loop provider | `preview-session.ts` (modify) |
| 5 | Adaptive quality — monitor WS buffer, adjust JPEG quality + frame skip rate on backpressure | `adaptive-quality.ts` + test |
| 6 | Frame skipping + input batching — drop stale frames on client, batch rapid mouse events | `LensComponentRenderer.svelte` (modify) |
| 7 | Engine selector UI — dropdown in Live View toolbar for Chromium/Firefox/WebKit, hot-swap engine | `LensComponentRenderer.svelte` (modify) |
| 8 | Cursor sync — server polls `document.body.style.cursor` via CDP/evaluate, sends cursor metadata | `cdp-screencast.ts` + `screenshot-loop.ts` (modify) |

### Part 3: Android scrcpy Engine (8 tasks)

| # | Task | File(s) |
|---|------|---------|
| 1 | scrcpy server lifecycle — push JAR via adb, spawn process, parse handshake, shutdown, auto-restart | `scrcpy-server.ts` + test |
| 2 | scrcpy video stream parser — read H.264 NAL units from video socket, extract SPS/PPS | `scrcpy-video.ts` + test |
| 3 | Server-side H.264→JPEG transcode — ffmpeg subprocess pipeline for browsers without WebCodecs | `scrcpy-video.ts` (modify) |
| 4 | scrcpy control message encoder — binary serialization for touch, keycode, text, scroll, back | `scrcpy-control.ts` + test |
| 5 | Android preview session — integrate scrcpy lifecycle + video + control into session manager | `preview-session.ts` (modify) |
| 6 | WebCodecs client decoder — `VideoDecoder` with H.264 config from SPS/PPS, render VideoFrame to canvas | `LensComponentRenderer.svelte` (modify) |
| 7 | Android engine UI — device selector, emulator status, scrcpy connection indicator | `LensComponentRenderer.svelte` (modify) |
| 8 | H.264 vs JPEG auto-detection — detect WebCodecs support, fall back to server-side transcode | `LensComponentRenderer.svelte` (modify) |

### Part 4: iOS Engine + Polish (9 tasks)

| # | Task | File(s) |
|---|------|---------|
| 1 | Parallel simctl capture pool — pre-spawn 3 JPEG capture processes, round-robin scheduling | `ios-preview-pool.ts` + test |
| 2 | iOS input injection — CGEvent mouse/keyboard posting to Simulator.app window | `ios-input.ts` + test |
| 3 | Simulator window tracking — `CGWindowListCopyWindowInfo`, screen bounds, scale factor mapping | `ios-window.ts` + test |
| 4 | iOS preview session — integrate pool + input + window tracking into session manager | `preview-session.ts` (modify) |
| 5 | Connection status + auto-reconnect — exponential backoff (1s/2s/4s/10s max), overlay, stats | `LensComponentRenderer.svelte` (modify) |
| 6 | Fullscreen mode — fixed positioning, floating toolbar, ESC exit, auto-focus canvas | `LensComponentRenderer.svelte` (modify) |
| 7 | Touch simulation toggle — desktop mouse→touch translation, Shift+click for multi-touch | `LensComponentRenderer.svelte` (modify) |
| 8 | Live View toolbar — FPS counter, latency display, resolution badge, viewport presets, zoom slider | `LensComponentRenderer.svelte` (modify) |
| 9 | Take Screenshot from Live View — capture current canvas frame as regular screenshot card entry | `LensComponentRenderer.svelte` (modify) |

## Key Design Decisions

1. **Binary WebSocket frames for image data** — Zero base64 overhead (saves 33% bandwidth). JSON text frames for input/metadata (small, needs parsing).

2. **CDP screencast for Chromium, screenshot loop for Firefox/WebKit** — CDP screencast is Chromium-only but vastly superior (dirty-frame-only, backpressure). Screenshot loop is the only cross-engine option.

3. **Double-buffered screenshot capture** — Capture frame N+1 while frame N transfers. Nearly doubles throughput for Firefox/WebKit from ~15 FPS to ~30 FPS.

4. **Dirty-frame detection** — Injected MutationObserver + rAF avoids wasting CPU capturing identical frames for static content. Only applies to screenshot-loop engines.

5. **scrcpy for Android** — Hardware H.264 encoding at 30-60 FPS with sub-5ms input vs `adb exec-out screencap` at 1-2 FPS with 300ms input. No comparison.

6. **CGEvent for iOS input** — Posts native macOS events to the Simulator.app window. Faster and more reliable than AppleScript (20-50ms vs 200-500ms). Requires a tiny Swift helper CLI.

7. **Adaptive quality** — Automatically reduces JPEG quality when WebSocket buffer backs up. Prevents frame queue explosion during network hiccups or slow clients.

8. **WebCodecs with JPEG fallback** — Send raw H.264 NALs to clients that support WebCodecs (Chrome, Safari, Edge). Transcode to JPEG on server for Firefox. Auto-detected at session start.
