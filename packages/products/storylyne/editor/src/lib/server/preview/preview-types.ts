/**
 * Preview WebSocket protocol types and schemas.
 *
 * Defines the bidirectional message protocol between the Live View
 * canvas (client) and the preview session (server). Client sends
 * input events as JSON text frames; server sends image data as
 * binary frames and metadata/control as JSON text frames.
 *
 * @module
 */

import * as v from 'valibot';
import { type Str, NumSchema, StrSchema } from '@/schemas/common';

// =============================================================================
// Engine identifiers
// =============================================================================

/** All supported preview engine identifiers. */
export const PREVIEW_ENGINES: readonly Str[] = [
  'chromium' as Str,
  'firefox' as Str,
  'webkit' as Str,
  'ios-simulator' as Str,
  'android-emulator' as Str,
] as const;

/** Schema for a valid engine identifier. */
const PreviewEngineSchema = v.picklist([
  'chromium',
  'firefox',
  'webkit',
  'ios-simulator',
  'android-emulator',
]);

// =============================================================================
// SessionConfig
// =============================================================================

/**
 * Configuration for a preview WebSocket session.
 *
 * Sent by the client when opening a connection (as query params on
 * the WebSocket URL) to specify which engine, component, viewport,
 * and card settings to use.
 */
export const SessionConfigSchema = v.strictObject({
  /** Browser/simulator engine to use. */
  engine: PreviewEngineSchema,
  /** Component directory name (e.g., 'button', 'badge'). */
  component: StrSchema,
  /** Viewport width in CSS pixels. */
  width: NumSchema,
  /** Viewport height in CSS pixels. */
  height: NumSchema,
  /** Device scale factor (default: 1). */
  scale: v.optional(NumSchema),
  /** JPEG quality for frame encoding (0-100, default: 60). */
  quality: v.optional(v.pipe(NumSchema, v.minValue(0), v.maxValue(100)), 60),
  /** Color scheme emulation. */
  colorScheme: v.optional(v.picklist(['dark', 'light'])),
  /** Reduced motion emulation. */
  reducedMotion: v.optional(v.picklist(['reduce', 'no-preference'])),
  /** Forced colors emulation. */
  forcedColors: v.optional(v.picklist(['active', 'none'])),
  /** Base64-encoded JSON card styles (pass-through to isolate route). */
  cardStyles: v.optional(StrSchema),
  /** Variant override name. */
  variant: v.optional(StrSchema),
  /** Variant option value. */
  option: v.optional(StrSchema),
  /** Playwright device name (e.g., 'iPhone 15 Pro'). */
  device: v.optional(StrSchema),
});

/** Configuration for a preview WebSocket session. */
export type SessionConfig = v.InferOutput<typeof SessionConfigSchema>;

// =============================================================================
// Mouse button
// =============================================================================

/** Valid mouse button values. */
const MouseButtonSchema = v.picklist(['left', 'right', 'middle']);

// =============================================================================
// Touch point
// =============================================================================

/** A single touch point with position and identifier. */
const TouchPointSchema = v.strictObject({
  /** X coordinate in viewport pixels. */
  x: NumSchema,
  /** Y coordinate in viewport pixels. */
  y: NumSchema,
  /** Touch point identifier. */
  id: NumSchema,
});

// =============================================================================
// Input messages (Client → Server)
// =============================================================================

/** Mouse down event. */
const MouseDownSchema = v.strictObject({
  /** Event type discriminator. */
  type: v.literal('mouseDown'),
  /** X coordinate in viewport pixels. */
  x: NumSchema,
  /** Y coordinate in viewport pixels. */
  y: NumSchema,
  /** Which mouse button. */
  button: MouseButtonSchema,
  /** Modifier key bitmask: Alt=1, Ctrl=2, Meta=4, Shift=8. */
  modifiers: NumSchema,
});

/** Mouse up event. */
const MouseUpSchema = v.strictObject({
  /** Event type discriminator. */
  type: v.literal('mouseUp'),
  /** X coordinate in viewport pixels. */
  x: NumSchema,
  /** Y coordinate in viewport pixels. */
  y: NumSchema,
  /** Which mouse button. */
  button: MouseButtonSchema,
  /** Modifier key bitmask. */
  modifiers: NumSchema,
});

/** Mouse move event. */
const MouseMoveSchema = v.strictObject({
  /** Event type discriminator. */
  type: v.literal('mouseMove'),
  /** X coordinate in viewport pixels. */
  x: NumSchema,
  /** Y coordinate in viewport pixels. */
  y: NumSchema,
});

/** Click event (mouseDown + mouseUp). */
const ClickSchema = v.strictObject({
  /** Event type discriminator. */
  type: v.literal('click'),
  /** X coordinate in viewport pixels. */
  x: NumSchema,
  /** Y coordinate in viewport pixels. */
  y: NumSchema,
  /** Which mouse button. */
  button: MouseButtonSchema,
  /** Modifier key bitmask. */
  modifiers: NumSchema,
  /** Number of consecutive clicks. */
  clickCount: NumSchema,
});

/** Double-click event. */
const DblClickSchema = v.strictObject({
  /** Event type discriminator. */
  type: v.literal('dblclick'),
  /** X coordinate in viewport pixels. */
  x: NumSchema,
  /** Y coordinate in viewport pixels. */
  y: NumSchema,
});

/** Scroll/wheel event. */
const WheelSchema = v.strictObject({
  /** Event type discriminator. */
  type: v.literal('wheel'),
  /** X coordinate in viewport pixels. */
  x: NumSchema,
  /** Y coordinate in viewport pixels. */
  y: NumSchema,
  /** Horizontal scroll delta. */
  deltaX: NumSchema,
  /** Vertical scroll delta. */
  deltaY: NumSchema,
});

/** Key down event. */
const KeyDownSchema = v.strictObject({
  /** Event type discriminator. */
  type: v.literal('keyDown'),
  /** Key value (e.g., 'a', 'Enter', 'ArrowLeft'). */
  key: StrSchema,
  /** Physical key code (e.g., 'KeyA', 'Enter'). */
  code: StrSchema,
  /** Modifier key bitmask. */
  modifiers: NumSchema,
});

/** Key up event. */
const KeyUpSchema = v.strictObject({
  /** Event type discriminator. */
  type: v.literal('keyUp'),
  /** Key value. */
  key: StrSchema,
  /** Physical key code. */
  code: StrSchema,
  /** Modifier key bitmask. */
  modifiers: NumSchema,
});

/** Touch start event. */
const TouchStartSchema = v.strictObject({
  /** Event type discriminator. */
  type: v.literal('touchStart'),
  /** Active touch points. */
  touches: v.array(TouchPointSchema),
});

/** Touch move event. */
const TouchMoveSchema = v.strictObject({
  /** Event type discriminator. */
  type: v.literal('touchMove'),
  /** Active touch points. */
  touches: v.array(TouchPointSchema),
});

/** Touch end event. */
const TouchEndSchema = v.strictObject({
  /** Event type discriminator. */
  type: v.literal('touchEnd'),
  /** Released touch points. */
  touches: v.array(TouchPointSchema),
});

/** Start streaming control message. */
const StartControlSchema = v.strictObject({
  /** Control type discriminator. */
  type: v.literal('start'),
});

/** Stop streaming control message. */
const StopControlSchema = v.strictObject({
  /** Control type discriminator. */
  type: v.literal('stop'),
});

/** Viewport resize control message. */
const ResizeControlSchema = v.strictObject({
  /** Control type discriminator. */
  type: v.literal('resize'),
  /** New viewport width in CSS pixels. */
  width: NumSchema,
  /** New viewport height in CSS pixels. */
  height: NumSchema,
});

/** Quality adjustment control message. */
const QualityControlSchema = v.strictObject({
  /** Control type discriminator. */
  type: v.literal('quality'),
  /** New JPEG quality (0-100). */
  quality: NumSchema,
});

/**
 * Union schema for all client → server messages.
 *
 * Input events (mouse, keyboard, touch) and control messages
 * (start, stop, resize, quality) sent as JSON text WebSocket frames.
 */
export const InputMessageSchema = v.variant('type', [
  MouseDownSchema,
  MouseUpSchema,
  MouseMoveSchema,
  ClickSchema,
  DblClickSchema,
  WheelSchema,
  KeyDownSchema,
  KeyUpSchema,
  TouchStartSchema,
  TouchMoveSchema,
  TouchEndSchema,
  StartControlSchema,
  StopControlSchema,
  ResizeControlSchema,
  QualityControlSchema,
]);

/** Any client → server message. */
export type InputMessage = v.InferOutput<typeof InputMessageSchema>;

// =============================================================================
// Server messages (Server → Client)
// =============================================================================

/** Viewport metadata sent at session start and on resize. */
const MetadataMessageSchema = v.strictObject({
  /** Message type discriminator. */
  type: v.literal('metadata'),
  /** Viewport width in CSS pixels. */
  width: NumSchema,
  /** Viewport height in CSS pixels. */
  height: NumSchema,
  /** Engine identifier. */
  engine: StrSchema,
});

/** FPS counter update (rolling 1-second average). */
const FpsMessageSchema = v.strictObject({
  /** Message type discriminator. */
  type: v.literal('fps'),
  /** Frames per second. */
  value: NumSchema,
});

/** Latency measurement update. */
const LatencyMessageSchema = v.strictObject({
  /** Message type discriminator. */
  type: v.literal('latency'),
  /** Round-trip latency in milliseconds. */
  value: NumSchema,
});

/** Cursor style change. */
const CursorMessageSchema = v.strictObject({
  /** Message type discriminator. */
  type: v.literal('cursor'),
  /** CSS cursor value (e.g., 'pointer', 'text', 'grab'). */
  cursor: StrSchema,
});

/** Error notification. */
const ErrorMessageSchema = v.strictObject({
  /** Message type discriminator. */
  type: v.literal('error'),
  /** Human-readable error description. */
  message: StrSchema,
});

/**
 * Union schema for all server → client JSON messages.
 *
 * Image data is sent as binary WebSocket frames (raw JPEG bytes),
 * not through this schema. This covers only the JSON text frames.
 */
export const ServerMessageSchema = v.variant('type', [
  MetadataMessageSchema,
  FpsMessageSchema,
  LatencyMessageSchema,
  CursorMessageSchema,
  ErrorMessageSchema,
]);

/** Any server → client JSON message. */
export type ServerMessage = v.InferOutput<typeof ServerMessageSchema>;
