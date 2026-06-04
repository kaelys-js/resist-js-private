/**
 * scrcpy control message encoder.
 *
 * Serializes input events (touch, keycode, text, scroll, back)
 * into scrcpy's binary control message format for writing
 * to the control socket.
 *
 * All messages are big-endian. Each message starts with a
 * type byte followed by type-specific payload bytes.
 *
 * @module
 */

import type { Num, Str } from '@/schemas/common';

// =============================================================================
// Message type constants
// =============================================================================

/** Inject a keycode event (key down/up). */
export const MSG_INJECT_KEYCODE: Num = 0 as Num;

/** Inject text (bypasses keycode — for IME/Unicode). */
export const MSG_INJECT_TEXT: Num = 1 as Num;

/** Inject a touch event (mouse/finger down/up/move). */
export const MSG_INJECT_TOUCH_EVENT: Num = 2 as Num;

/** Inject a scroll event (mouse wheel). */
export const MSG_INJECT_SCROLL_EVENT: Num = 3 as Num;

/** Back button press or screen-on. */
export const MSG_BACK_OR_SCREEN_ON: Num = 4 as Num;

/** Set device clipboard content. */
export const MSG_SET_CLIPBOARD: Num = 9 as Num;

/** Set display power state (on/off). */
export const MSG_SET_DISPLAY_POWER: Num = 10 as Num;

// =============================================================================
// Types
// =============================================================================

/** Parameters for an INJECT_KEYCODE message. */
export type KeycodeParams = {
  /** Android KeyEvent action (0=DOWN, 1=UP). */
  action: Num;
  /** Android keycode (e.g., 66 for ENTER). */
  keycode: Num;
  /** Repeat count. */
  repeat: Num;
  /** Meta state flags (shift, ctrl, alt, etc.). */
  metaState: Num;
};

/** Parameters for an INJECT_TOUCH_EVENT message. */
export type TouchEventParams = {
  /** Android MotionEvent action (0=DOWN, 1=UP, 2=MOVE). */
  action: Num;
  /** Pointer ID (use 0xFFFFFFFFFFFFFFFF for mouse). */
  pointerId: bigint;
  /** X position in device pixels. */
  x: Num;
  /** Y position in device pixels. */
  y: Num;
  /** Device screen width. */
  screenWidth: Num;
  /** Device screen height. */
  screenHeight: Num;
  /** Touch pressure (0x0000-0xFFFF). */
  pressure: Num;
  /** Button that triggered this action. */
  actionButton: Num;
  /** Currently pressed buttons bitmask. */
  buttons: Num;
};

/** Parameters for an INJECT_SCROLL_EVENT message. */
export type ScrollEventParams = {
  /** X position in device pixels. */
  x: Num;
  /** Y position in device pixels. */
  y: Num;
  /** Device screen width. */
  screenWidth: Num;
  /** Device screen height. */
  screenHeight: Num;
  /** Horizontal scroll amount (signed). */
  hScroll: Num;
  /** Vertical scroll amount (signed). */
  vScroll: Num;
};

// =============================================================================
// INJECT_KEYCODE (14 bytes)
// =============================================================================

/**
 * Encode an INJECT_KEYCODE control message.
 *
 * Layout: type(1) + action(1) + keycode(4) + repeat(4) + metaState(4)
 *
 * @param {KeycodeParams} params - Keycode event parameters
 * @returns {Buffer} 14-byte buffer
 */
export function encodeInjectKeycode(params: KeycodeParams): Buffer {
  const buf: Buffer = Buffer.alloc(14);
  buf[0] = MSG_INJECT_KEYCODE as number;
  buf[1] = params.action as number;
  buf.writeUInt32BE(params.keycode as number, 2);
  buf.writeUInt32BE(params.repeat as number, 6);
  buf.writeUInt32BE(params.metaState as number, 10);
  return buf;
}

// =============================================================================
// INJECT_TEXT (variable length)
// =============================================================================

/**
 * Encode an INJECT_TEXT control message.
 *
 * Layout: type(1) + length(4) + text(N)
 *
 * @param {Str} text - UTF-8 text to inject
 * @returns {Buffer} Variable-length buffer
 */
export function encodeInjectText(text: Str): Buffer {
  const textBuf: Buffer = Buffer.from(text as string, 'utf8');
  const buf: Buffer = Buffer.alloc(5 + textBuf.length);
  buf[0] = MSG_INJECT_TEXT as number;
  buf.writeUInt32BE(textBuf.length, 1);
  textBuf.copy(buf, 5);
  return buf;
}

// =============================================================================
// INJECT_TOUCH_EVENT (32 bytes)
// =============================================================================

/**
 * Encode an INJECT_TOUCH_EVENT control message.
 *
 * Layout: type(1) + action(1) + pointerId(8) + x(4) + y(4)
 *         + screenWidth(2) + screenHeight(2) + pressure(2)
 *         + actionButton(4) + buttons(4)
 *
 * @param {TouchEventParams} params - Touch event parameters
 * @returns {Buffer} 32-byte buffer
 */
export function encodeInjectTouchEvent(params: TouchEventParams): Buffer {
  const buf: Buffer = Buffer.alloc(32);
  buf[0] = MSG_INJECT_TOUCH_EVENT as number;
  buf[1] = params.action as number;
  buf.writeBigUInt64BE(params.pointerId, 2);
  buf.writeUInt32BE(params.x as number, 10);
  buf.writeUInt32BE(params.y as number, 14);
  buf.writeUInt16BE(params.screenWidth as number, 18);
  buf.writeUInt16BE(params.screenHeight as number, 20);
  buf.writeUInt16BE(params.pressure as number, 22);
  buf.writeUInt32BE(params.actionButton as number, 24);
  buf.writeUInt32BE(params.buttons as number, 28);
  return buf;
}

// =============================================================================
// INJECT_SCROLL_EVENT (21 bytes)
// =============================================================================

/**
 * Encode an INJECT_SCROLL_EVENT control message.
 *
 * Layout: type(1) + x(4) + y(4) + screenWidth(2) + screenHeight(2)
 *         + hScroll(4) + vScroll(4)
 *
 * @param {ScrollEventParams} params - Scroll event parameters
 * @returns {Buffer} 21-byte buffer
 */
export function encodeInjectScrollEvent(params: ScrollEventParams): Buffer {
  const buf: Buffer = Buffer.alloc(21);
  buf[0] = MSG_INJECT_SCROLL_EVENT as number;
  buf.writeUInt32BE(params.x as number, 1);
  buf.writeUInt32BE(params.y as number, 5);
  buf.writeUInt16BE(params.screenWidth as number, 9);
  buf.writeUInt16BE(params.screenHeight as number, 11);
  buf.writeInt32BE(params.hScroll as number, 13);
  buf.writeInt32BE(params.vScroll as number, 17);
  return buf;
}

// =============================================================================
// BACK_OR_SCREEN_ON (2 bytes)
// =============================================================================

/**
 * Encode a BACK_OR_SCREEN_ON control message.
 *
 * Layout: type(1) + action(1)
 *
 * @param {Num} action - Key action (0=DOWN, 1=UP)
 * @returns {Buffer} 2-byte buffer
 */
export function encodeBackOrScreenOn(action: Num): Buffer {
  const buf: Buffer = Buffer.alloc(2);
  buf[0] = MSG_BACK_OR_SCREEN_ON as number;
  buf[1] = action as number;
  return buf;
}

// =============================================================================
// SET_CLIPBOARD (variable length)
// =============================================================================

/**
 * Encode a SET_CLIPBOARD control message.
 *
 * Layout: type(1) + paste(1) + length(4) + text(N)
 *
 * @param {Str} text - Clipboard text content
 * @param {boolean} paste - Whether to also paste the text
 * @returns {Buffer} Variable-length buffer
 */
export function encodeSetClipboard(text: Str, paste: boolean): Buffer {
  const textBuf: Buffer = Buffer.from(text as string, 'utf8');
  const buf: Buffer = Buffer.alloc(6 + textBuf.length);
  buf[0] = MSG_SET_CLIPBOARD as number;
  buf[1] = paste ? 1 : 0;
  buf.writeUInt32BE(textBuf.length, 2);
  textBuf.copy(buf, 6);
  return buf;
}

// =============================================================================
// SET_DISPLAY_POWER (2 bytes)
// =============================================================================

/**
 * Encode a SET_DISPLAY_POWER control message.
 *
 * Layout: type(1) + mode(1)
 *
 * @param {boolean} on - Whether to turn the display on (true) or off (false)
 * @returns {Buffer} 2-byte buffer
 */
export function encodeSetDisplayPower(on: boolean): Buffer {
  const buf: Buffer = Buffer.alloc(2);
  buf[0] = MSG_SET_DISPLAY_POWER as number;
  buf[1] = on ? 1 : 0;
  return buf;
}
