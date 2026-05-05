# `@storylyne/editor` — Preview + Simulator subsystems

> Captured 2026-05-05. Branch: `main`. Paths: `packages/products/storylyne/editor/src/lib/server/{preview,simulator}/`.

The most architecturally interesting part of the editor. Two complementary subsystems power the Lens "Live View" preview (continuous WebSocket-streamed component renders) and the screenshot capture pipeline:

- **`server/preview/`** — Live View session lifecycle: WebSocket plugin, frame providers (CDP screencast, Playwright screenshot loop, scrcpy for Android, simctl pool for iOS), input dispatchers, adaptive quality control.
- **`server/simulator/`** — Real-device toolchain wrappers: `xcrun simctl` (iOS), `adb`/`emulator`/`avdmanager` (Android), with pools that boot real simulators/emulators and reuse them across requests.

The HTTP endpoints in `/api/lens/screenshot/{ios,android}/...` are thin wrappers around `simulator/`. Live View is wired via a Vite plugin that intercepts WebSocket upgrades on the dev server.

## `server/preview/` subsystem

### `preview-types.ts`
The wire schema for Live View. `PREVIEW_ENGINES = ['chromium', 'firefox', 'webkit', 'android-emulator', 'ios-simulator']`.

`SessionConfigSchema` — query-string-validated session config:
- `engine: PreviewEngineSchema`, `component: Str`, `width/height: Num`.
- Optional: `scale`, `quality`, `device` (Playwright preset, Android AVD, or iOS UDID), `cardStyles`, `variant`, `option`, `colorScheme`, `reducedMotion`, `forcedColors`.

Server → client message schemas (`ServerMessageSchema`):
- `MetadataMessageSchema` (initial render state).
- `CursorMessageSchema` (cursor position broadcast for screencast).
- `FpsMessageSchema`, `LatencyMessageSchema`.
- `ErrorMessageSchema`.
- Frame data is sent as raw binary, not wrapped.

Client → server message schemas (`InputMessageSchema`):
- Mouse: `MouseMoveSchema`, `MouseDownSchema`, `MouseUpSchema`, `ClickSchema`, `DblClickSchema`, `WheelSchema` (with `MouseButtonSchema` enum).
- Touch: `TouchStartSchema`, `TouchMoveSchema`, `TouchEndSchema` (with `TouchPointSchema`).
- Keyboard: `KeyDownSchema`, `KeyUpSchema`.

Control messages: `StartControlSchema`, `StopControlSchema`, `ResizeControlSchema`, `QualityControlSchema`.

### `preview-session.ts` — `PreviewSessionManager` class
Tracks active sessions, dispatches to the right engine factory.

`PreviewSession` shape: `{ id, config, engineType: 'cdp'|'screenshot-loop'|'scrcpy'|'ios-simctl', context, page, cdp, ws, scrcpyServer, transcoder, iosCapturePool, iosInput }` (most are `| undefined` based on engine).

Manager methods:
- `createSession(ws, config, browser?)` — branches on `config.engine`:
  - `android-emulator` → `createScrcpySession(id, ws, config)`.
  - `ios-simulator` → `createIosSession(id, ws, config)`.
  - else (Playwright) → opens browser context with `{ viewport, deviceScaleFactor, colorScheme, reducedMotion, forcedColors }`, navigates to `buildIsolateUrl(component, config)` with `waitUntil: 'load'`. Engine type = `'cdp'` for chromium, `'screenshot-loop'` for firefox/webkit. For CDP engine, opens `context.newCDPSession(page)` for screencast.
- `createScrcpySession(id, ws, config)` — `startScrcpyServer(serial, { width, height })` then `createTranscoder({ width, height, quality }, jpeg => ws.send(jpeg))`. Pipes scrcpy H.264 → ffmpeg → JPEG → WebSocket binary frames.
- `createIosSession(id, ws, config)` — `new IosPreviewCapturePool(udid)` + `new IosInputDispatcher(udid, width, height)`. Pool starts `(jpeg) => ws.send(jpeg)` callback.
- `sendMetadata(ws, config)` — initial `{ type: 'metadata', width, height, engine }` JSON.
- `destroySession(id)` — cleans up: `iosCapturePool.stop()`, `transcoder.stop()`, `stopScrcpyServer(scrcpyServer)`, `cdp.detach()`, `page.close()`, `context.close()` (each in try/catch — secondary failures are non-critical).
- `destroyAll()` — `Promise.all` over all session IDs (server shutdown).

`buildIsolateUrl(component, config)` — `http://localhost:3100/isolate/${component}?cardStyles=...&variant=...&option=...`.

### `cdp-screencast.ts` — `CdpScreencastProvider`
Chromium-only. Uses CDP `Page.startScreencast` to get JPEG frames pushed by the browser. Forwards `ScreencastFrameEvent`s to the WebSocket. Polls cursor position via `Input.dispatchMouseEvent` query at `CURSOR_POLL_MS` interval and sends cursor messages. `WS_OPEN = 1` (ws library readyState constant).

### `screenshot-loop.ts` — `ScreenshotLoopProvider`
Firefox/WebKit fallback (no CDP). Continuous `page.screenshot({ type: 'jpeg', quality })` loop at `DEFAULT_FPS = 30` (configurable). Cursor position polled separately via `page.evaluate` at `CURSOR_POLL_MS`.

### `dirty-detector.ts` — `PageDirtyDetector` class
Reduces unnecessary frame captures. Uses `page.evaluate` with a `ResizeObserver` + `MutationObserver` injected into the page that flips a window flag. The provider polls the flag — if not dirty since last capture, skip the frame. `DirtyDetector` interface allows substitutability.

### `cdp-input.ts` — `CdpInputDispatcher` class
Receives `InputMessage`s from WebSocket, dispatches via CDP:
- Mouse → `Input.dispatchMouseEvent`.
- Touch → `Input.dispatchTouchEvent`.
- Keyboard → `Input.dispatchKeyEvent`.

### `screenshot-input.ts` — `PlaywrightInputForwarder` class
Same purpose as `CdpInputDispatcher` but uses Playwright's high-level `page.mouse.*`, `page.keyboard.*`, `page.touchscreen.*` APIs. Used for Firefox/WebKit (where CDP is unavailable).

### `adaptive-quality.ts` — `AdaptiveQualityController` class
Backpressure-aware quality controller:
- Constants: `LOW_BUFFER_THRESHOLD`, `HIGH_BUFFER_THRESHOLD`, `MIN_QUALITY`, `QUALITY_STEP`, `SKIP_ESCALATION_COUNT`, `MAX_SKIP_RATE`.
- Watches WebSocket `bufferedAmount`; if buffered grows past `HIGH_BUFFER_THRESHOLD`, reduces JPEG quality by `QUALITY_STEP` and starts skipping frames (up to `MAX_SKIP_RATE`). When buffer drops below `LOW_BUFFER_THRESHOLD`, climbs quality back up. After `SKIP_ESCALATION_COUNT` consecutive overflow events, escalates skip rate.

### `vite-plugin-preview-ws.ts`
Vite plugin (`apply: 'serve'`) that hooks into the dev server's HTTP `upgrade` event. Endpoint: `PREVIEW_WS_PATH = '/api/lens/preview/ws'`.

`parseSessionQuery(url)` — `URLSearchParams` parse with numeric coercion (for `width/height/scale/quality`), validates against `SessionConfigSchema` via `safeParse`. Returns `Result<SessionConfig>`.

`setupPreviewWs(server: ViteDevServer)`:
- Creates `WebSocketServer({ noServer: true })`.
- Hooks `server.httpServer.on('upgrade', (request, socket, head) => ...)`. If `parsed.pathname === PREVIEW_WS_PATH`, validates query, calls `wsServer.handleUpgrade(request, socket, head, ws => wsServer.emit('connection', ws, sessionConfig))`. Non-matching upgrades are ignored (left for Vite's HMR).
- On connection: logs `'Preview session connected'` and registers `ws.on('close', ...)`.
- (Note: P2 will wire `PreviewSessionManager.createSession(ws, config)` here — current state is connection-only.)

Loaded via dynamic `await import('./vite-plugin-preview-ws.js')` in `vite.config.ts`'s lazy plugin wrapper so `@/` aliases resolve.

### scrcpy Android pipeline (4 files)

**`scrcpy-server.ts`**:
- Constants: `DEFAULT_BIT_RATE`, `SCRCPY_SERVER_PATH`, `SCRCPY_VERSION`.
- `pushServer(serial)` — `adb push <jar> /data/local/tmp/scrcpy-server.jar`.
- `generateScid()` — random session ID for scrcpy server multi-session support.
- `startScrcpyServer(serial, opts)` — spawns `adb shell CLASSPATH=... app_process / com.genymobile.scrcpy.Server`, returns `ScrcpyServerHandle` with stdio streams.
- `stopScrcpyServer(handle)`, `isAdbAvailable()`.

**`scrcpy-video.ts`** — H.264/H.265 NAL parsing:
- `findStartCodes(buf)` — searches for `0x00 0x00 0x00 0x01` (NAL start markers).
- `extractNalUnits(buf)` — splits a video frame into NAL units (headers + payload).
- `findSpsPps(nalUnits)` — locates SPS/PPS for codec init.
- `parseFrameHeader(buf)` — scrcpy's per-frame header (`PTS_MASK`, `KEYFRAME_FLAG`, `CONFIG_FLAG`).
- `parseCodecMetadata(buf)` — first ~12 bytes of the scrcpy stream describe codec (`CODEC_H264`, `CODEC_H265`).
- Constants: `FRAME_HEADER_SIZE`, `CODEC_METADATA_SIZE`, `NAL_TYPE_SPS=7`, `NAL_TYPE_PPS=8`.

**`scrcpy-transcode.ts`**:
- `mapQuality(quality: 1-100)` → ffmpeg JPEG `-q:v` (2-31, lower=better).
- `isFfmpegAvailable()` — `which ffmpeg`.
- `createTranscoder({ width, height, quality }, onJpeg)` — spawns `ffmpeg -f h264 -i pipe:0 -f mjpeg -q:v <q> pipe:1` (or h265). Returns `TranscodeHandle { write(buf), stop() }`. Internally splits MJPEG output on `0xFF 0xD8 ... 0xFF 0xD9` boundaries.

**`scrcpy-control.ts`** — control message encoders (binary protocol matching scrcpy server):
- `MSG_INJECT_KEYCODE = 0`, `MSG_INJECT_TEXT = 1`, `MSG_INJECT_TOUCH_EVENT = 2`, `MSG_INJECT_SCROLL_EVENT = 3`, `MSG_BACK_OR_SCREEN_ON = 4`, `MSG_SET_CLIPBOARD = ...`, `MSG_SET_DISPLAY_POWER = ...`.
- `encodeInjectKeycode({ keycode, action, ...metaState })`, `encodeInjectTouchEvent({ x, y, pointerId, action, pressure, buttons })`, `encodeInjectScrollEvent({ x, y, hScroll, vScroll })`, `encodeInjectText`, `encodeBackOrScreenOn`, `encodeSetClipboard`, `encodeSetDisplayPower`.

### iOS Simulator pipeline (3 files)

**`ios-preview-pool.ts`** — `IosPreviewCapturePool` class:
- `DEFAULT_POOL_SIZE`, `DEFAULT_TARGET_FPS` constants.
- Spawns N parallel `xcrun simctl io <udid> screenshot --type=jpeg -` processes, each capturing into a buffer. JPEG output streamed via stdout. Round-robin'd to maintain target FPS (single `simctl screenshot` invocation is too slow alone).
- `start(onJpeg, quality)`, `stop()`.

**`ios-input.ts`** — `IosInputDispatcher` class:
- Two methods: `IOS_INPUT_METHOD_APPLESCRIPT` (default, uses System Events for keyboard) and `IOS_INPUT_METHOD_SIMCTL` (limited but doesn't need accessibility permissions).
- `KEY_MAP` maps web KeyboardEvent codes to AppleScript keycodes. `mapKeyToSimctl(key)` for the simctl path.

**`ios-window.ts`**:
- `getSimulatorWindowBounds(udid)` — AppleScript `tell application "System Events" to tell process "Simulator" ...` to get window position/size.
- `getDeviceScaleFactor(deviceName)` — uses `KNOWN_SCALE_FACTORS` lookup; falls back to `DEFAULT_SCALE_FACTOR`.
- `mapViewportToScreen(x, y, bounds, scale)` — translates web viewport coordinates to physical screen pixels for the simctl/AppleScript dispatcher.

## `server/simulator/` subsystem

### iOS Simulator wrappers (9 files)

**`ios-simctl.ts`** — `xcrun simctl` wrapper:
- `isXcrunAvailable()` — `which xcrun`.
- `listSimulatorDevices()` — `xcrun simctl list devices --json`. Returns `SimulatorDevice[] = [{ udid, name, state: SimulatorState, runtimeVersion, ... }]`.
- `parseRuntimeVersion(runtimeId)` — extracts `iOS 17.5` from `com.apple.CoreSimulator.SimRuntime.iOS-17-5`.
- `lookupDimensions(deviceName)` — `DEVICE_DIMENSIONS` table (logical width/height/scale per known iPhone/iPad model).

**`ios-pool.ts`** — Boot-and-reuse simulator pool:
- `MAX_POOL_SIZE` constant.
- `poolEntries: Map<udid, PoolEntry>` with `{ inUse: boolean, lastUsed: Num }`.
- `acquireSimulator(udid, name)` — boots if not running, marks `inUse=true`. `releaseSimulator(udid)` — marks `inUse=false` (kept booted).
- `drainPool()` — shuts down all pooled simulators (used on server shutdown).
- `getPoolStatus()`, `countInUse()`, `removeFromPool(udid)`.

**`ios-lifecycle.ts`**:
- `BOOT_TIMEOUT_MS`, `BOOT_POLL_INTERVAL_MS`, `ALREADY_BOOTED_EXIT_CODE` constants.
- `bootSimulator(udid)` — `xcrun simctl boot <udid>`. Treats `ALREADY_BOOTED_EXIT_CODE` as success.
- `getDeviceState(udid)` — parses `xcrun simctl list devices` output.
- `waitForBoot(udid, timeout)` — polls `getDeviceState` until `'Booted'` or timeout.
- `shutdownSimulator(udid)` — `xcrun simctl shutdown <udid>`.

**`ios-navigate.ts`**:
- `validateUrl(url)` — basic safety check.
- `openUrlInSimulator(udid, url)` — `xcrun simctl openurl <udid> <url>` (opens in Safari).

**`ios-screenshot.ts`**:
- `captureSimulatorScreenshot(udid)` — `xcrun simctl io <udid> screenshot --type=png -`. Returns `Buffer`.

**`ios-debug-proxy.ts`** — `ios_webkit_debug_proxy` (separate brew tool):
- `DEFAULT_PROXY_PORT = 27753`.
- `isDebugProxyInstalled()` — checks `which ios_webkit_debug_proxy`.
- `startDebugProxy(udid)` — spawns proxy, captures `proxyProcess` and `proxyPort` in module scope. Singleton.
- `getInspectablePages()` — fetches `http://localhost:${proxyPort}/json` and parses `InspectablePage[]` (pages with `webSocketDebuggerUrl`).
- `parseInspectablePages(json)`, `isProxyRunning()`, `stopDebugProxy()`, `buildProxyArgs(udid, port)`, `getProxyPort()`.

**`ios-page-load.ts`**:
- `DEFAULT_TIMEOUT_MS`, `FALLBACK_DELAY_MS = 3000`, `POLL_INTERVAL_MS`.
- `waitForPageLoad(pageWsUrl)` — if WS URL provided, evaluates `document.readyState === 'complete'` via `Runtime.evaluate` until `complete`. If empty, falls back to `setTimeout(FALLBACK_DELAY_MS)`.
- `waitForPageReady`, `waitForCustomEvent`, `buildReadyCheckScript()`, `parseEvalResponse(msg)`.

**`ios-console-capture.ts`**:
- `captureConsoleLogs(pageWsUrl)` — connects to inspector WS, enables `Console.enable`, drains `Console.messageAdded` events for ~500ms, returns `CapturedConsoleMessage[]`.
- `parseConsoleMessage(event)`, `formatConsoleMessages(captured)` — formats for response (level + message).
- `stopCapture()`, `waitForEvent()`.

**`ios-safe-area.ts`**:
- `DEVICE_INSETS` table — per-device safe-area insets (top/bottom/left/right) for iPhone 14, 15, Pro Max, etc.
- `getStaticSafeAreaInsets(deviceName)` — looks up by exact name match.
- `buildSafeAreaScript()` — JS to inject into the page reading `env(safe-area-inset-*)` runtime values.

**`ios-accessibility.ts`**:
- `ACCESSIBILITY_PREFS` — set of accessibility settings affecting Safari rendering.
- `CONTENT_SIZE_MAP` — maps Dynamic Type names to internal CSS sizes.
- `applyAccessibilitySettings(udid, settings)` — best-effort; runs `defaults write` commands via `xcrun simctl spawn`. Returns even on failure.
- `parseAccessibilityParams(searchParams)` → `IosAccessibilitySettings { appearance, contentSize, reduceMotion, increaseContrast, reduceTransparency }`.
- `buildAccessibilityCommands(settings): SimctlCommand[]`, `buildDefaultsWriteCommand(...)`.

### Android Emulator wrappers (8 files)

**`android-sdk.ts`** — SDK location/availability:
- `detectSdkRoot()` — checks `ANDROID_HOME`, `ANDROID_SDK_ROOT`, then `~/Library/Android/sdk` (macOS), `~/Android/Sdk` (Linux), `%LOCALAPPDATA%\\Android\\Sdk` (Windows).
- `isAdbAvailable(adbPath)` — runs `adb version`.
- `parseAdbVersion(stdout)`.
- `buildSdkPaths(sdkRoot)` → `AndroidSdkPaths { adb, emulator, avdmanager, sdkmanager }` (with `.exe` on Windows).
- `checkAndroidSdk()` → `AndroidSdkStatus { installed, sdkRoot, paths, adbVersion, instructions }`. `instructions` is human-readable setup help.

**`android-pool.ts`** — emulator pool:
- `BASE_PORT = 5554`. Each emulator gets a unique even port (5554, 5556, 5558, ...).
- `pool: Map<avdName, PoolSlot>` with `{ serial, inUse, process }`.
- `acquireEmulator(emulatorPath, adbPath, avdName)` — boots if needed, returns `{ serial }`.
- `releaseEmulator(avdName)` — marks `inUse=false` (kept running).
- `assignSerial()` — finds next free `BASE_PORT + 2*N`.
- `shutdownPool()`, `getPoolSize()`.

**`android-lifecycle.ts`**:
- `startEmulator(emulatorPath, avdName, port)` — spawns `emulator -avd <name> -port <port> -no-window -no-audio -no-boot-anim`. Returns `EmulatorInstance { process, serial }`.
- `waitForBoot(adbPath, serial)` — polls `getprop sys.boot_completed` via `adb shell`.
- `shutdownEmulator(adbPath, serial)` — `adb -s <serial> emu kill`.
- `pollBoot`, `parseBootStatus`, `bootPollDelay`, `killEmulatorProcess`, `buildEmulatorArgs(avdName, port)`.

**`android-devices.ts`** — device profiles + AVD management:
- `LEGACY_PIXELS`, `EXCLUDED_EXACT/EXCLUDED_PREFIXES/EXCLUDED_SIZE_PREFIXES` — filter old/Wear OS/TV profiles.
- `listDeviceProfiles(avdmanagerPath)` — `avdmanager list device`.
- `parseDeviceProfiles(stdout)` → `DeviceProfile[]`.
- `filterPhoneAndTabletProfiles(profiles)`, `getAndroidDeviceProfiles()` — combined existing AVDs + uncreated profiles.
- `listAvds(avdmanagerPath)` — `avdmanager list avd`.
- `parseAvdList(stdout)`, `parseConfigIni(content)`.
- `listSystemImages(avdmanagerPath)` — `avdmanager list target` filtered for installed system images.
- `extractApiLevel(name)` — parses `android-35` etc.
- `createAvd(avdmanagerPath, deviceId, systemImage)` — `echo no | avdmanager create avd -n <name> -d <device> -k <image>`.
- `buildDeviceFromConfig(configIni)` — converts `config.ini` to `AndroidDevice`.
- `DEVICE_DIMENSIONS` table.

**`android-cdp.ts`** — Chrome DevTools Protocol over adb:
- `CDP_LOCAL_PORT = 9222`.
- `setupCdpForward(adbPath, serial)` — `adb -s <serial> forward tcp:9222 localabstract:chrome_devtools_remote`.
- `buildAdbForwardArgs(serial, hostPort, deviceSocket)`.
- `captureConsoleLogs()` — connects to CDP WS, `Console.enable`, drains for ~500ms, returns `CdpConsoleEntry[]`.
- `waitForCdpEvent(ws, method, timeout)`, `parseCdpResponse(msg)`.

**`android-navigate.ts`**:
- `openUrlInEmulator(adbPath, serial, url)` — `adb shell am start -a android.intent.action.VIEW -d <url> com.android.chrome`.
- `setupPortForward(adbPath, serial, hostPort, devicePort)` — `adb reverse tcp:<host> tcp:<device>` so emulator can reach host dev server.
- `rewriteUrlForEmulator(url)` — replaces `localhost`/`127.0.0.1` with `10.0.2.2` (Android emulator's host alias).
- `buildAmStartArgs`, `buildPortForwardArgs`.

**`android-page-load.ts`**:
- `DEFAULT_TIMEOUT_MS`, `FALLBACK_DELAY_MS = 3000`, `POLL_INTERVAL_MS`.
- `waitForPageLoad(cdpWsUrl)` — same as iOS but uses CDP `Runtime.evaluate` polling.
- `waitForPageReady`, `waitForEvent`, `parseEvalResponse`, `buildReadyCheckScript`, `fallbackDelay`.

**`android-screenshot.ts`**:
- `captureEmulatorScreenshot(adbPath, serial)` — `adb -s <serial> exec-out screencap -p`. Returns base64-encoded PNG (string).
- `buildScreencapArgs(serial)`.

**`android-accessibility.ts`**:
- `applyAccessibilitySettings(adbPath, serial, settings)` — runs `adb shell settings put` commands for night mode, font scale, etc.
- `parseAccessibilityParams(searchParams)` → `AndroidAccessibilitySettings`.
- `buildAccessibilityCommands(settings): AccessibilityCommand[]`.

### Shared simulator helpers

**`device-frames.ts`** — Bezel registry:
- `FRAMES: DeviceFrame[]` — hardcoded list of `{ framePath, screenRegion: { x, y, width, height }, ... }` for various iPhone/Android device chassis images. Used to composite real-device screenshots inside a device frame for marketing/preview.
- `findDeviceFrameByName(deviceName)`, `getDeviceFrame(frameId)`, `listDeviceFrames()`.

**`viewport-units.ts`** — Bridge for `vw`/`vh`/`dvh` resolution:
- `buildViewportUnitsScript()` — JS to inject that reports `window.innerWidth`, `document.documentElement.clientHeight`, `visualViewport.height`, etc.
- `parseViewportUnitsResult(json)` → `ViewportUnits { vw, vh, svh, lvh, dvh }`.

## How everything connects

```
                                  ┌─────────────────────────┐
   Lens UI (browser)              │  preview-types.ts       │
   ──────────────                 │  (wire schema)          │
   CommandSearch / Lens           └─────────────────────────┘
   detail page opens                          │
         │                                    │ shared types
         ▼                                    │
   ws://.../api/lens/preview/ws?engine=ios-simulator&component=button&...
         │
         ▼
   vite-plugin-preview-ws.ts ─────► parseSessionQuery ─► safeParse(SessionConfigSchema)
         │
         ▼
   PreviewSessionManager.createSession(ws, config, browser?)
         │
         ├── chromium  ──► CdpScreencastProvider + CdpInputDispatcher
         ├── firefox   ──► ScreenshotLoopProvider + PlaywrightInputForwarder
         ├── webkit    ──► (same)
         ├── android   ──► startScrcpyServer + scrcpy-transcode (h264→mjpeg→ws)
         │                  + scrcpy-control (input encoder)
         └── ios       ──► IosPreviewCapturePool + IosInputDispatcher
                              │
                              ▼
   simulator/ios-pool.acquireSimulator(udid)
       └── ios-lifecycle.bootSimulator + waitForBoot
       └── ios-debug-proxy.startDebugProxy (optional)
       └── ios-screenshot.captureSimulatorScreenshot (per-frame)
```

The same `simulator/` modules are also called directly from `/api/lens/screenshot/{ios,android}/...` for one-shot screenshot capture (no WebSocket).
