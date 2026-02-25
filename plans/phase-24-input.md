# Phase 24: Input System + Controller Support

Unified input abstraction layer consumed by both the runtime (gameplay, battles, menus) and editor (keyboard shortcuts, tool hotkeys). Provides action-based input mapping with rebindable controls, gamepad support, and touch input for mobile.

**Package:** `@webforge/runtime` (core input manager) + `@webforge/editor` (editor shortcut bindings)

---

## 24.1 Input Action Map Schema

Valibot schemas defining the input abstraction layer.

### Files
- `packages/products/webforge/runtime/src/schemas/input-action.ts` — InputActionSchema, InputBindingSchema, InputContextSchema
- `packages/products/webforge/runtime/src/schemas/input-action.test.ts`

### Schemas
- **InputActionSchema** — Action definition: `id` (Str), `label` (Str), `category` (picklist: 'movement', 'interaction', 'menu', 'battle', 'editor', 'camera', 'debug')
- **InputBindingSchema** — Binding: `actionId` (Str), `device` (picklist: 'keyboard', 'mouse', 'gamepad', 'touch'), `input` (Str — key code, button index, axis name), `modifiers` (optional array of 'shift', 'ctrl', 'alt', 'meta')
- **InputContextSchema** — Context definition: `id` (Str, picklist: 'gameplay', 'menu', 'battle', 'editor', 'dialogue', 'cutscene'), `actions` (array of actionId refs), `blockBelow` (Bool — whether this context blocks input to lower contexts)
- **InputMapSchema** — Full map: `contexts` (array of InputContextSchema), `bindings` (array of InputBindingSchema), `deadZone` (Num, 0-1, default 0.15), `repeatDelay` (Num ms, default 500), `repeatRate` (Num ms, default 50)

### Default Action Definitions
- Movement: `move-up`, `move-down`, `move-left`, `move-right`, `dash`
- Interaction: `confirm`, `cancel`, `interact`, `menu-open`
- Camera: `camera-zoom-in`, `camera-zoom-out`, `camera-rotate-left`, `camera-rotate-right`
- Battle: `attack`, `skill`, `item`, `defend`, `flee`
- Menu: `menu-up`, `menu-down`, `menu-left`, `menu-right`, `menu-confirm`, `menu-cancel`, `menu-page-left`, `menu-page-right`
- Editor: `undo`, `redo`, `save`, `delete`, `select-all`, `copy`, `paste`, `cut`
- Debug: `toggle-inspector`, `toggle-fps`, `toggle-grid`

---

## 24.2 Keyboard + Mouse Input Provider

DOM event listeners for keyboard and mouse input.

### Files
- `packages/products/webforge/runtime/src/input/keyboard-provider.ts`
- `packages/products/webforge/runtime/src/input/keyboard-provider.test.ts`
- `packages/products/webforge/runtime/src/input/mouse-provider.ts`
- `packages/products/webforge/runtime/src/input/mouse-provider.test.ts`

### Keyboard Provider
- `createKeyboardProvider(target: EventTarget): Result<KeyboardProvider>`
- Tracks key down/up state via `Set<string>` keyed on `KeyboardEvent.code`
- `isKeyDown(code: Str): Bool` — current frame state
- `wasKeyPressed(code: Str): Bool` — just pressed this frame (edge detection)
- `wasKeyReleased(code: Str): Bool` — just released this frame
- Key repeat handling: configurable delay + rate, fires repeated `wasKeyPressed` for held keys
- `update(): void` — called per frame to swap current/previous state buffers
- `dispose(): void` — removes event listeners

### Mouse Provider
- `createMouseProvider(canvas: HTMLCanvasElement): Result<MouseProvider>`
- Tracks button state (left, right, middle), position, delta, wheel
- `getPosition(): { x: Num, y: Num }` — canvas-relative position
- `getDelta(): { dx: Num, dy: Num }` — movement since last frame
- `getWheelDelta(): Num` — scroll wheel delta
- `isButtonDown(button: Num): Bool`
- `wasButtonPressed(button: Num): Bool`
- Pointer lock support: `requestPointerLock()`, `exitPointerLock()`, `isPointerLocked(): Bool`
- `update(): void`, `dispose(): void`

---

## 24.3 Gamepad Input Provider

Gamepad API polling with axis dead zones and hot-plug detection.

### Files
- `packages/products/webforge/runtime/src/input/gamepad-provider.ts`
- `packages/products/webforge/runtime/src/input/gamepad-provider.test.ts`

### Functions
- `createGamepadProvider(): Result<GamepadProvider>`
- Polls `navigator.getGamepads()` each frame (Gamepad API is polling-based, not event-based)
- `getConnectedGamepads(): ReadonlyArray<GamepadInfo>` — list of connected pads with name, index, button/axis count
- `isButtonDown(padIndex: Num, button: Num): Bool`
- `wasButtonPressed(padIndex: Num, button: Num): Bool`
- `getAxis(padIndex: Num, axis: Num): Num` — returns -1 to 1 with dead zone applied
- `getStick(padIndex: Num, stick: 'left' | 'right'): { x: Num, y: Num }` — combined axes with circular dead zone
- Dead zone: configurable per-axis, default 0.15, uses circular dead zone (not per-axis)
- Hot-plug: `gamepadconnected` / `gamepaddisconnected` events → observable
- Standard gamepad mapping: maps to Xbox layout (A/B/X/Y, bumpers, triggers, sticks, d-pad)
- `update(): void`, `dispose(): void`

---

## 24.4 Touch Input Provider

Touch input for mobile with virtual joystick and gesture recognition.

### Files
- `packages/products/webforge/runtime/src/input/touch-provider.ts`
- `packages/products/webforge/runtime/src/input/touch-provider.test.ts`
- `packages/products/webforge/runtime/src/input/virtual-joystick.ts`
- `packages/products/webforge/runtime/src/input/virtual-joystick.test.ts`

### Touch Provider
- `createTouchProvider(canvas: HTMLCanvasElement): Result<TouchProvider>`
- Multi-touch tracking via `TouchEvent` listeners
- `getTouches(): ReadonlyArray<TouchInfo>` — active touches with id, position, startPosition, duration
- `wasTapped(region?: TouchRegion): Bool` — tap detection (touch < 200ms, < 10px movement)
- `wasSwipe(direction?: 'up' | 'down' | 'left' | 'right'): Bool` — swipe detection
- `getPinch(): { scale: Num, center: { x: Num, y: Num } } | undefined` — two-finger pinch

### Virtual Joystick
- `createVirtualJoystick(config: VirtualJoystickConfig): Result<VirtualJoystick>`
- Config: `side` ('left' | 'right'), `radius` (Num), `deadZone` (Num), `fixed` (Bool — fixed position vs follows touch)
- Returns `{ x: Num, y: Num }` normalized direction (-1 to 1)
- Renders as semi-transparent overlay on canvas (Babylon.js GUI or HTML overlay)
- Auto-hides when no touch active

---

## 24.5 Input Manager

Central coordinator: context switching, action dispatch, input buffering.

### Files
- `packages/products/webforge/runtime/src/input/input-manager.ts`
- `packages/products/webforge/runtime/src/input/input-manager.test.ts`

### Functions
- `createInputManager(config: InputMapConfig): Result<InputManager>`
- Manages a context stack: `pushContext(contextId: Str)`, `popContext()`, `setContext(contextId: Str)`
- Each frame: polls all providers, resolves bindings for active context, fires action callbacks
- `onAction(actionId: Str, callback: (event: InputActionEvent) => void): () => void` — returns unsubscribe
- `isActionActive(actionId: Str): Bool` — continuous (held)
- `wasActionTriggered(actionId: Str): Bool` — edge (just pressed)
- Input buffering: queues actions for a configurable window (default 100ms) so fast inputs aren't missed
- Binding resolution: checks context stack top-down, `blockBelow` stops traversal
- `update(deltaTimeMs: Num): void` — call per frame
- `dispose(): void`

### InputActionEvent
- `actionId: Str`
- `device: 'keyboard' | 'mouse' | 'gamepad' | 'touch'`
- `value: Num` — 0 or 1 for buttons, -1 to 1 for axes
- `timestamp: Num`

---

## 24.6 Input Settings Persistence

Save/load rebindable controls, preset profiles.

### Files
- `packages/products/webforge/runtime/src/input/input-settings.ts`
- `packages/products/webforge/runtime/src/input/input-settings.test.ts`
- `packages/products/webforge/runtime/src/schemas/input-settings.ts`
- `packages/products/webforge/runtime/src/schemas/input-settings.test.ts`

### Schemas
- **InputSettingsSchema** — `bindings` (array of InputBindingSchema overrides), `deadZone` (Num), `vibrationEnabled` (Bool), `preset` (optional Str — name of preset profile applied)
- **InputPresetSchema** — `name` (Str), `description` (Str), `bindings` (array of InputBindingSchema)

### Built-in Presets
- `wasd` — WASD movement, mouse camera, number keys for skills
- `arrows` — Arrow key movement, Z/X confirm/cancel (classic RPG Maker style)
- `gamepad-xbox` — Xbox controller layout
- `gamepad-playstation` — PlayStation controller layout (different button labels)
- `touch-mobile` — Virtual joystick left, action buttons right

### Functions
- `createDefaultBindings(): Result<ReadonlyArray<InputBinding>>` — full default binding set
- `applyPreset(settings: InputSettings, presetName: Str): Result<InputSettings>`
- `rebindAction(settings: InputSettings, actionId: Str, newBinding: InputBinding): Result<InputSettings>`
- `resetToDefaults(settings: InputSettings): Result<InputSettings>`
- `serializeSettings(settings: InputSettings): Result<Str>` — JSON string for localStorage/file
- `deserializeSettings(json: Str): Result<InputSettings>`

---

## Dependencies

- **Requires:** Phase 1 (engine for frame-tick integration via `registerBeforeRender`)
- **Consumed by:** Phase 4 (player movement), Phase 9-11 (battle input), Phase 12 (menu navigation), Phase 21 (mini-game input), Phase 2 (editor shortcuts)

## Testing Strategy

1. **Schema tests** — Valid/invalid input action maps, binding validation, preset validation
2. **Logic tests** — Dead zone calculation, circular dead zone math, input buffering queue, context stack resolution, key repeat timing
3. **Integration tests** — Simulated DOM events in jsdom: keyboard/mouse providers fire correct state changes, input manager resolves bindings to actions
4. **Visual verification** — Dev harness overlay showing active inputs, bound actions, gamepad state
