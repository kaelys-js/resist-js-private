/**
 * Tests for the scrcpy control message encoder.
 *
 * Verifies binary serialization of input control messages
 * matching scrcpy's big-endian wire format.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import type { Num, Str } from '@/schemas/common';
import {
  MSG_INJECT_KEYCODE,
  MSG_INJECT_TEXT,
  MSG_INJECT_TOUCH_EVENT,
  MSG_INJECT_SCROLL_EVENT,
  MSG_BACK_OR_SCREEN_ON,
  MSG_SET_CLIPBOARD,
  MSG_SET_DISPLAY_POWER,
  encodeInjectKeycode,
  encodeInjectText,
  encodeInjectTouchEvent,
  encodeInjectScrollEvent,
  encodeBackOrScreenOn,
  encodeSetClipboard,
  encodeSetDisplayPower,
} from './scrcpy-control';

// =============================================================================
// Tests
// =============================================================================

describe('scrcpy-control', (): void => {
  /* ---------------------------------------------------------------- */
  /*  Constants                                                        */
  /* ---------------------------------------------------------------- */

  it('exports message type constants', (): void => {
    expect(MSG_INJECT_KEYCODE).toBe(0 as Num);
    expect(MSG_INJECT_TEXT).toBe(1 as Num);
    expect(MSG_INJECT_TOUCH_EVENT).toBe(2 as Num);
    expect(MSG_INJECT_SCROLL_EVENT).toBe(3 as Num);
    expect(MSG_BACK_OR_SCREEN_ON).toBe(4 as Num);
    expect(MSG_SET_CLIPBOARD).toBe(9 as Num);
    expect(MSG_SET_DISPLAY_POWER).toBe(10 as Num);
  });

  /* ---------------------------------------------------------------- */
  /*  INJECT_KEYCODE                                                   */
  /* ---------------------------------------------------------------- */

  it('encodes INJECT_KEYCODE as 14 bytes', (): void => {
    const buf: Buffer = encodeInjectKeycode({
      action: 0 as Num, // ACTION_DOWN
      keycode: 66 as Num, // KEYCODE_ENTER
      repeat: 0 as Num,
      metaState: 0 as Num,
    });

    expect(buf.length).toBe(14);
    expect(buf[0]).toBe(0); // MSG_INJECT_KEYCODE
    expect(buf[1]).toBe(0); // action
    expect(buf.readUInt32BE(2)).toBe(66); // keycode
    expect(buf.readUInt32BE(6)).toBe(0); // repeat
    expect(buf.readUInt32BE(10)).toBe(0); // metaState
  });

  it('encodes INJECT_KEYCODE with meta state', (): void => {
    const buf: Buffer = encodeInjectKeycode({
      action: 1 as Num, // ACTION_UP
      keycode: 29 as Num, // KEYCODE_A
      repeat: 0 as Num,
      metaState: 0x00_00_00_41 as Num, // META_SHIFT_ON | META_SHIFT_LEFT_ON
    });

    expect(buf[1]).toBe(1); // action
    expect(buf.readUInt32BE(2)).toBe(29); // keycode
    expect(buf.readUInt32BE(10)).toBe(0x00_00_00_41); // metaState
  });

  /* ---------------------------------------------------------------- */
  /*  INJECT_TEXT                                                      */
  /* ---------------------------------------------------------------- */

  it('encodes INJECT_TEXT with ASCII string', (): void => {
    const buf: Buffer = encodeInjectText('hello' as Str);

    expect(buf[0]).toBe(1); // MSG_INJECT_TEXT
    expect(buf.readUInt32BE(1)).toBe(5); // length
    expect(buf.subarray(5).toString('utf8')).toBe('hello');
    expect(buf.length).toBe(10); // 1 + 4 + 5
  });

  it('encodes INJECT_TEXT with UTF-8 string', (): void => {
    const text: Str = '日本語' as Str;
    const buf: Buffer = encodeInjectText(text);

    expect(buf[0]).toBe(1); // MSG_INJECT_TEXT
    const textBytes: number = Buffer.byteLength(text as string, 'utf8');
    expect(buf.readUInt32BE(1)).toBe(textBytes);
    expect(buf.subarray(5).toString('utf8')).toBe('日本語');
  });

  it('encodes INJECT_TEXT with empty string', (): void => {
    const buf: Buffer = encodeInjectText('' as Str);

    expect(buf[0]).toBe(1); // MSG_INJECT_TEXT
    expect(buf.readUInt32BE(1)).toBe(0); // length
    expect(buf.length).toBe(5); // 1 + 4
  });

  /* ---------------------------------------------------------------- */
  /*  INJECT_TOUCH_EVENT                                               */
  /* ---------------------------------------------------------------- */

  it('encodes INJECT_TOUCH_EVENT as 32 bytes', (): void => {
    const buf: Buffer = encodeInjectTouchEvent({
      action: 0 as Num, // ACTION_DOWN
      pointerId: 1n,
      x: 500 as Num,
      y: 800 as Num,
      screenWidth: 1080 as Num,
      screenHeight: 1920 as Num,
      pressure: 0xff_ff as Num, // max pressure
      actionButton: 0 as Num,
      buttons: 0 as Num,
    });

    expect(buf.length).toBe(32);
    expect(buf[0]).toBe(2); // MSG_INJECT_TOUCH_EVENT
    expect(buf[1]).toBe(0); // action
    expect(buf.readBigUInt64BE(2)).toBe(1n); // pointerId
    expect(buf.readUInt32BE(10)).toBe(500); // x
    expect(buf.readUInt32BE(14)).toBe(800); // y
    expect(buf.readUInt16BE(18)).toBe(1080); // screenWidth
    expect(buf.readUInt16BE(20)).toBe(1920); // screenHeight
    expect(buf.readUInt16BE(22)).toBe(0xff_ff); // pressure
    expect(buf.readUInt32BE(24)).toBe(0); // actionButton
    expect(buf.readUInt32BE(28)).toBe(0); // buttons
  });

  it('encodes INJECT_TOUCH_EVENT with mouse button', (): void => {
    const buf: Buffer = encodeInjectTouchEvent({
      action: 0 as Num,
      pointerId: 0xff_ff_ff_ff_ff_ff_ff_ffn, // mouse pointer
      x: 100 as Num,
      y: 200 as Num,
      screenWidth: 1080 as Num,
      screenHeight: 1920 as Num,
      pressure: 0xff_ff as Num,
      actionButton: 1 as Num, // BUTTON_PRIMARY
      buttons: 1 as Num,
    });

    expect(buf.readBigUInt64BE(2)).toBe(0xff_ff_ff_ff_ff_ff_ff_ffn);
    expect(buf.readUInt32BE(24)).toBe(1); // actionButton
    expect(buf.readUInt32BE(28)).toBe(1); // buttons
  });

  /* ---------------------------------------------------------------- */
  /*  INJECT_SCROLL_EVENT                                              */
  /* ---------------------------------------------------------------- */

  it('encodes INJECT_SCROLL_EVENT as 21 bytes', (): void => {
    const buf: Buffer = encodeInjectScrollEvent({
      x: 540 as Num,
      y: 960 as Num,
      screenWidth: 1080 as Num,
      screenHeight: 1920 as Num,
      hScroll: 0 as Num,
      vScroll: -120 as Num,
    });

    expect(buf.length).toBe(21);
    expect(buf[0]).toBe(3); // MSG_INJECT_SCROLL_EVENT
    expect(buf.readUInt32BE(1)).toBe(540); // x
    expect(buf.readUInt32BE(5)).toBe(960); // y
    expect(buf.readUInt16BE(9)).toBe(1080); // screenWidth
    expect(buf.readUInt16BE(11)).toBe(1920); // screenHeight
    expect(buf.readInt32BE(13)).toBe(0); // hScroll
    expect(buf.readInt32BE(17)).toBe(-120); // vScroll (signed)
  });

  it('encodes INJECT_SCROLL_EVENT with positive scroll', (): void => {
    const buf: Buffer = encodeInjectScrollEvent({
      x: 0 as Num,
      y: 0 as Num,
      screenWidth: 720 as Num,
      screenHeight: 1280 as Num,
      hScroll: 100 as Num,
      vScroll: 200 as Num,
    });

    expect(buf.readInt32BE(13)).toBe(100); // hScroll
    expect(buf.readInt32BE(17)).toBe(200); // vScroll
  });

  /* ---------------------------------------------------------------- */
  /*  BACK_OR_SCREEN_ON                                                */
  /* ---------------------------------------------------------------- */

  it('encodes BACK_OR_SCREEN_ON as 2 bytes', (): void => {
    const buf: Buffer = encodeBackOrScreenOn(0 as Num); // ACTION_DOWN

    expect(buf.length).toBe(2);
    expect(buf[0]).toBe(4); // MSG_BACK_OR_SCREEN_ON
    expect(buf[1]).toBe(0); // action
  });

  it('encodes BACK_OR_SCREEN_ON with ACTION_UP', (): void => {
    const buf: Buffer = encodeBackOrScreenOn(1 as Num);

    expect(buf[0]).toBe(4);
    expect(buf[1]).toBe(1);
  });

  /* ---------------------------------------------------------------- */
  /*  SET_CLIPBOARD                                                    */
  /* ---------------------------------------------------------------- */

  it('encodes SET_CLIPBOARD with text', (): void => {
    const buf: Buffer = encodeSetClipboard('copied text' as Str, true);

    expect(buf[0]).toBe(9); // MSG_SET_CLIPBOARD
    expect(buf[1]).toBe(1); // paste flag = true
    const textLen: number = buf.readUInt32BE(2);
    expect(textLen).toBe(11); // 'copied text' length
    expect(buf.subarray(6).toString('utf8')).toBe('copied text');
  });

  it('encodes SET_CLIPBOARD without paste', (): void => {
    const buf: Buffer = encodeSetClipboard('test' as Str, false);

    expect(buf[0]).toBe(9);
    expect(buf[1]).toBe(0); // paste flag = false
  });

  /* ---------------------------------------------------------------- */
  /*  SET_DISPLAY_POWER                                                */
  /* ---------------------------------------------------------------- */

  it('encodes SET_DISPLAY_POWER as 2 bytes', (): void => {
    const buf: Buffer = encodeSetDisplayPower(true);

    expect(buf.length).toBe(2);
    expect(buf[0]).toBe(10); // MSG_SET_DISPLAY_POWER
    expect(buf[1]).toBe(1); // power on
  });

  it('encodes SET_DISPLAY_POWER off', (): void => {
    const buf: Buffer = encodeSetDisplayPower(false);

    expect(buf[0]).toBe(10);
    expect(buf[1]).toBe(0); // power off
  });
});
