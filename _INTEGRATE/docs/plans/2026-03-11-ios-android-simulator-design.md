# Lens: iOS Simulator & Android Emulator Screenshot Integration

## Context

The Lens Real Browser feature currently uses Playwright to render components in headless Chromium, Firefox, and WebKit. While Playwright provides excellent cross-browser coverage, it uses patched browser engines — not the actual Safari or Chrome Mobile that runs on real devices. This means CSS `env(safe-area-inset-*)`, dynamic viewport units (`dvh`/`svh`/`lvh`), and device-specific rendering behaviors (notch geometry, Dynamic Island, home indicator) cannot be accurately tested.

This plan adds two new screenshot engines — **iOS Simulator** (using `xcrun simctl` + real Safari) and **Android Emulator** (using `adb` + real Chrome Mobile) — alongside the existing Playwright engine. Both provide real browser rendering with accurate device emulation, safe area insets, accessibility settings, and console capture. The system also adds device frame compositing, safe area overlays, dynamic viewport unit measurement, and real-time simulator preview streaming.

**22 features across 4 tiers, split into 5 implementation parts.**

## Architecture

### Three-Engine Design

```
┌─────────────────────────────────────────────────────────────┐
│ LensComponentRenderer.svelte                                 │
│   cardScreenSource: 'playwright' | 'ios-simulator' | 'android-emulator' │
│   captureScreenshot() → routes to correct API endpoint       │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
  /api/lens/     /api/lens/     /api/lens/
  screenshot     screenshot/ios  screenshot/android
  (Playwright)   (xcrun simctl)  (adb + emulator)
        │              │              │
        ▼              ▼              ▼
  isolate/[name]  isolate/[name]  isolate/[name]
  (same page)    (same page)     (via 10.0.2.2)
```

All three engines navigate to the same `/isolate/[name]` page and return the same JSON response shape (`image`, `browser`, `browserDisplayName`, `browserVersion`, `device`, `consoleLogs`, `performance`), so the existing `ScreenshotCapture` type works with minimal extension (add `source` field).

### Server-Side Modules

New server-only utilities at `src/lib/server/simulator/` in the editor package:
- `ios-simctl.ts` — device detection via `xcrun simctl list --json`
- `ios-lifecycle.ts` — boot/shutdown with idempotent error handling
- `ios-navigate.ts` — `xcrun simctl openurl`
- `ios-screenshot.ts` — `xcrun simctl io screenshot --mask=alpha`
- `ios-pool.ts` — pre-booted simulator pool (singleton, survives across requests)
- `ios-accessibility.ts` — dark mode, content size, contrast, reduced motion
- `ios-debug-proxy.ts` — ios-webkit-debug-proxy management (optional dep)
- `ios-console-capture.ts` — WebSocket → WebKit Inspector Protocol
- `ios-page-load.ts` — poll `[data-lens-ready]` via `Runtime.evaluate`
- `ios-safe-area.ts` — static inset lookup + live reading via debug proxy
- `android-sdk.ts` — SDK detection, path resolution
- `android-devices.ts` — AVD listing, config.ini parsing
- `android-lifecycle.ts` — emulator boot (spawn), shutdown (emu kill)
- `android-navigate.ts` — `adb shell am start`, port forwarding
- `android-screenshot.ts` — `adb exec-out screencap -p`
- `android-pool.ts` — pre-booted emulator pool with Quick Boot
- `android-accessibility.ts` — dark mode, font scale, density, animation scale
- `android-cdp.ts` — CDP over adb forward, WebSocket connection
- `android-page-load.ts` — poll `[data-lens-ready]` via CDP `Runtime.evaluate`
- `device-frames.ts` — device bezel image registry + screen region mapping
- `viewport-units.ts` — measure svh/lvh/dvh via debug proxy or CDP

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/lens/screenshot` | GET | Existing Playwright capture |
| `/api/lens/screenshot/devices` | GET | Existing Playwright device list |
| `/api/lens/screenshot/ios` | GET | iOS Simulator capture |
| `/api/lens/screenshot/ios/devices` | GET | iOS Simulator device list |
| `/api/lens/screenshot/ios/stream` | GET | iOS live preview (MJPEG) |
| `/api/lens/screenshot/android` | GET | Android Emulator capture |
| `/api/lens/screenshot/android/devices` | GET | Android Emulator device list |
| `/api/lens/screenshot/android/setup` | GET | Android SDK status + install guide |
| `/api/lens/screenshot/android/stream` | GET | Android live preview (MJPEG) |
| `/api/lens/screenshot/status` | GET | Combined backend status |
| `/api/lens/screenshot/frames` | GET | Device frame metadata |

## Implementation

### Part 1: iOS Simulator Core (8 tasks)

| # | Task | File(s) | Changelog |
|---|------|---------|-----------|
| 1 | Extend `ScreenshotCapture` with `source` discriminator field | `LensComponentRenderer.svelte` (types) | #1,3 |
| 2 | iOS Simulator detection — `isXcrunAvailable()`, `listSimulatorDevices()`, parse `xcrun simctl list --json` | `src/lib/server/simulator/ios-simctl.ts` + test | #1 |
| 3 | iOS boot/shutdown lifecycle — `bootSimulator()`, `waitForBoot()`, idempotent exit code 149 handling | `src/lib/server/simulator/ios-lifecycle.ts` + test | #1 |
| 4 | iOS URL navigation — `openUrlInSimulator()` with URL validation | `src/lib/server/simulator/ios-navigate.ts` + test | #1,3 |
| 5 | iOS screenshot capture — `captureSimulatorScreenshot()` with `--mask=alpha` for notch/Dynamic Island | `src/lib/server/simulator/ios-screenshot.ts` + test | #1,4,6 |
| 6 | Pre-booted simulator pool — singleton `IosSimulatorPool` with acquire/release/warm-boot | `src/lib/server/simulator/ios-pool.ts` + test | #2 |
| 7 | iOS Screenshot API route — GET handler with pool, openurl, fixed 3s wait (interim), screenshot, JSON response | `src/routes/api/lens/screenshot/ios/+server.ts` | #1,3 |
| 8 | iOS Device listing API — cached list with boot state, dimensions, OS version | `src/routes/api/lens/screenshot/ios/devices/+server.ts` | #1 |

### Part 2: iOS Simulator Advanced + UI Integration (8 tasks)

| # | Task | File(s) | Changelog |
|---|------|---------|-----------|
| 1 | iOS accessibility settings — dark mode (`simctl ui appearance`), content size, contrast, reduced motion (plist write) | `src/lib/server/simulator/ios-accessibility.ts` + test | #5 |
| 2 | ios-webkit-debug-proxy management — detect install, start/stop proxy, get inspectable targets | `src/lib/server/simulator/ios-debug-proxy.ts` + test | #7 |
| 3 | Console capture via debug proxy — WebSocket to WebKit Inspector, `Console.enable`, collect `Console.messageAdded` | `src/lib/server/simulator/ios-console-capture.ts` + test | #7 |
| 4 | Page-load detection — poll `[data-lens-ready]` via `Runtime.evaluate` over debug proxy WebSocket | `src/lib/server/simulator/ios-page-load.ts` + test | #8 |
| 5 | Upgrade iOS screenshot route — replace fixed delay with debug proxy load detection + console capture + accessibility settings | `src/routes/api/lens/screenshot/ios/+server.ts` (modify) | #5,7,8 |
| 6 | Device source selector UI — radio group: Playwright / iOS Simulator / Android Emulator; `cardScreenSource` state | `LensComponentRenderer.svelte` (submenu) | #16 |
| 7 | iOS capture integration in `captureScreenshot()` — route to `/api/lens/screenshot/ios` when source = ios-simulator | `LensComponentRenderer.svelte` (function) | #1,16 |
| 8 | Screenshot card source badges + status indicators — source icon, boot state dots, estimated time | `LensComponentRenderer.svelte` (cards) | #17 |

### Part 3: Android Emulator Core (8 tasks)

| # | Task | File(s) | Changelog |
|---|------|---------|-----------|
| 1 | Android SDK detection — check `ANDROID_HOME`/PATH for adb/emulator/avdmanager, parse version | `src/lib/server/simulator/android-sdk.ts` + test | #15 |
| 2 | Android SDK setup guide API — returns install status + instructions JSON | `src/routes/api/lens/screenshot/android/setup/+server.ts` | #15 |
| 3 | Android device profiles — parse `emulator -list-avds` + AVD config.ini for dimensions/density/API level | `src/lib/server/simulator/android-devices.ts` + test | #14 |
| 4 | Android boot/shutdown lifecycle — `spawn` emulator process, `waitForBoot` via `getprop`, `emu kill` | `src/lib/server/simulator/android-lifecycle.ts` + test | #9 |
| 5 | Android URL navigation — `adb shell am start`, port forwarding for `10.0.2.2` host access | `src/lib/server/simulator/android-navigate.ts` + test | #9,11 |
| 6 | Android screenshot capture — `adb exec-out screencap -p` (pipe PNG to stdout, no temp file) | `src/lib/server/simulator/android-screenshot.ts` + test | #9,11 |
| 7 | Pre-booted Android emulator pool — singleton with Quick Boot, process tracking, serial assignment | `src/lib/server/simulator/android-pool.ts` + test | #10 |
| 8 | Android Screenshot + Device listing API routes — GET handlers with pool, am start, fixed 3s wait, screencap | `src/routes/api/lens/screenshot/android/+server.ts` + `devices/+server.ts` | #9,14 |

### Part 4: Android Advanced + Unified Device Menu (9 tasks)

| # | Task | File(s) | Changelog |
|---|------|---------|-----------|
| 1 | Android accessibility — dark mode (`cmd uimode night`), font scale, display density, animation scale | `src/lib/server/simulator/android-accessibility.ts` + test | #12 |
| 2 | Chrome DevTools Protocol via adb — `adb forward`, CDP WebSocket connection, `Runtime.enable`, `Log.enable` | `src/lib/server/simulator/android-cdp.ts` + test | #13 |
| 3 | Android page-load detection — poll `[data-lens-ready]` via CDP `Runtime.evaluate` | `src/lib/server/simulator/android-page-load.ts` + test | #13 |
| 4 | Upgrade Android screenshot route — debug proxy load detection + CDP console capture + accessibility | `src/routes/api/lens/screenshot/android/+server.ts` (modify) | #12,13 |
| 5 | Unified device fetching — `fetchIosDevices()`, `fetchAndroidDevices()`, `fetchAllDeviceSources()` parallel fetch | `LensComponentRenderer.svelte` | #16 |
| 6 | Unified device menu rendering — 3-source submenu, conditional engine section, boot state badges, setup guide link | `LensComponentRenderer.svelte` (submenu template) | #16,17 |
| 7 | Status indicators + polling — green/grey/spinner dots, estimated boot time, poll every 5s while menu open | `LensComponentRenderer.svelte` | #17 |
| 8 | Parallel capture — `captureParallel()` fires all available sources simultaneously, split capture button | `LensComponentRenderer.svelte` | #18 |
| 9 | Pool status API — combined Playwright + iOS + Android backend status endpoint | `src/routes/api/lens/screenshot/status/+server.ts` | #17 |

### Part 5: Enhanced Fidelity (8 tasks)

| # | Task | File(s) | Changelog |
|---|------|---------|-----------|
| 1 | iOS safe area inset data — static lookup table + live reading via debug proxy `Runtime.evaluate` | `src/lib/server/simulator/ios-safe-area.ts` + test | #4,19 |
| 2 | Safe area inset overlay rendering — toggleable colored overlay on screenshot cards | `LensComponentRenderer.svelte` (cards) | #19 |
| 3 | Dynamic viewport unit measurement — measure svh/lvh/dvh via debug proxy or CDP, include in response | `src/lib/server/simulator/viewport-units.ts` + test | #20 |
| 4 | Device frame asset system — SVG bezel images + screen region JSON descriptors for 6 devices | `src/lib/server/simulator/device-frames.ts` + test + `static/device-frames/*.svg` | #21 |
| 5 | Device frame compositing UI — "Show Frame" toggle, CSS-positioned screenshot inside bezel image | `LensComponentRenderer.svelte` (cards) | #21 |
| 6 | Device frame lookup API — GET endpoint returning available frame metadata | `src/routes/api/lens/screenshot/frames/+server.ts` | #21 |
| 7 | Real-time simulator preview streams — MJPEG endpoints for iOS + Android using `ReadableStream` | `src/routes/api/lens/screenshot/ios/stream/+server.ts` + `android/stream/+server.ts` | #22 |
| 8 | Live preview panel UI — `<img>` with MJPEG source, start/stop controls, streaming indicator | `LensComponentRenderer.svelte` (new section) | #22 |

## Key Design Decisions

1. **Separate API routes per engine** — `/screenshot`, `/screenshot/ios`, `/screenshot/android` rather than a single route with engine param. Keeps each handler focused and testable. All return identical JSON shape.

2. **ios-webkit-debug-proxy is optional** — If not installed, iOS screenshots still work (just without console capture and smart load detection, uses 3s fixed delay). The UI shows an orange warning when debug proxy is missing.

3. **Android SDK is optional** — If not installed, the Android source is greyed out with a "Setup..." link to the install guide endpoint. Never installs anything automatically.

4. **Pre-booted pools use singleton pattern** — Same pattern as existing `browserCache` Map in the Playwright screenshot route. Module-scoped, survives across requests.

5. **Android uses `10.0.2.2`** — Android emulator's special IP for host loopback. Port forwarding via `adb forward` maps the dev server port.

6. **Device frames are SVG** — Scalable, small file size, easy to create/modify. Stored in `static/device-frames/` for direct serving.

7. **MJPEG streaming** — Browsers natively handle `multipart/x-mixed-replace` in `<img>` tags. No JavaScript frame-pulling needed. ~10 fps via repeated `xcrun simctl io screenshot` or `adb exec-out screencap`.

## Changelog → Task Mapping

| # | Feature | Part.Task |
|---|---------|-----------|
| 1 | iOS Simulator screenshot engine | P1.2-7 |
| 2 | Pre-booted simulator pool | P1.6 |
| 3 | Real Safari rendering | P1.4,7 |
| 4 | Real env(safe-area-inset-*) | P1.5, P5.1 |
| 5 | iOS accessibility settings | P2.1,5 |
| 6 | Device mask rendering | P1.5 |
| 7 | Console capture (ios-webkit-debug-proxy) | P2.2,3 |
| 8 | Page-load detection | P2.4,5 |
| 9 | Android Emulator screenshot engine | P3.4-8 |
| 10 | Pre-booted emulator pool | P3.7 |
| 11 | Real Chrome rendering | P3.5,6,8 |
| 12 | Android accessibility settings | P4.1,4 |
| 13 | Console capture (CDP) | P4.2,3,4 |
| 14 | Device profiles | P3.3,8 |
| 15 | Android SDK auto-setup | P3.1,2 |
| 16 | Device source selector | P2.6,7, P4.5,6 |
| 17 | Status indicators | P2.8, P4.7,9 |
| 18 | Parallel capture | P4.8 |
| 19 | Safe area inset overlay | P5.1,2 |
| 20 | Dynamic viewport unit testing | P5.3 |
| 21 | Device frame compositing | P5.4,5,6 |
| 22 | Real-time simulator preview | P5.7,8 |

## File Structure

```
packages/products/storylyne/editor/
  src/lib/server/simulator/
    ios-simctl.ts + test            # Detection + device listing
    ios-lifecycle.ts + test         # Boot/shutdown
    ios-navigate.ts + test          # URL navigation
    ios-screenshot.ts + test        # Screenshot capture
    ios-pool.ts + test              # Pre-booted pool
    ios-accessibility.ts + test     # Dark mode, content size, etc.
    ios-debug-proxy.ts + test       # Debug proxy management
    ios-console-capture.ts + test   # WebKit Inspector console
    ios-page-load.ts + test         # Load detection polling
    ios-safe-area.ts + test         # Safe area inset data
    android-sdk.ts + test           # SDK detection
    android-devices.ts + test       # AVD listing + profiles
    android-lifecycle.ts + test     # Emulator boot/shutdown
    android-navigate.ts + test      # URL + port forwarding
    android-screenshot.ts + test    # screencap capture
    android-pool.ts + test          # Pre-booted pool
    android-accessibility.ts + test # System settings
    android-cdp.ts + test           # CDP over adb
    android-page-load.ts + test     # Load detection via CDP
    device-frames.ts + test         # Frame registry
    viewport-units.ts + test        # svh/lvh/dvh measurement
  src/routes/api/lens/screenshot/
    ios/+server.ts                  # iOS capture endpoint
    ios/devices/+server.ts          # iOS device list
    ios/stream/+server.ts           # iOS MJPEG stream
    android/+server.ts              # Android capture endpoint
    android/devices/+server.ts      # Android device list
    android/setup/+server.ts        # Android SDK status
    android/stream/+server.ts       # Android MJPEG stream
    status/+server.ts               # Combined backend status
    frames/+server.ts               # Device frame metadata
  static/device-frames/
    iphone-16-pro.svg               # 6 device bezel SVGs
    iphone-16-pro-max.svg
    iphone-se.svg
    ipad-pro-13.svg
    pixel-9.svg
    pixel-9-pro.svg

Modified:
  packages/shared/ui/src/lens-component-renderer/LensComponentRenderer.svelte
    — ScreenshotCapture type (add source, safeAreaInsets, deviceFrame)
    — cardScreenSource state variable
    — captureScreenshot() routing by source
    — Device source selector UI
    — Unified device menu
    — Status indicators + polling
    — Parallel capture
    — Safe area overlay
    — Device frame compositing
    — Live preview panel
```

## Verification

1. **Unit tests**: TDD for all 21 server-side utility modules (tests first, then implementation)
2. **QA**: `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format` after every file edit
3. **Integration**: `pnpm qa:test` after each part
4. **Visual**: Verify via Playwright MCP (`mcp__plugin_playwright_playwright__*`) — navigate to Lens, open Real Browser submenu, test each source
5. **Completeness**: After all 5 parts, compare every changelog item (1–22) against the task mapping table to verify nothing missed
