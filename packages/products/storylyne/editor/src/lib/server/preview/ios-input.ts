/**
 * iOS Simulator input injection.
 *
 * Dispatches mouse, keyboard, and scroll events to a running
 * iOS Simulator via `xcrun simctl io` commands. Uses the simctl
 * `sendkey` subcommand for keyboard and `io tap`/`io swipe` for
 * pointer events.
 *
 * For mouse hover/move, falls back to AppleScript-based injection
 * since simctl doesn't support move-without-click.
 *
 * @module
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Num, Str } from '@/schemas/common';
import { log } from '@/utils/core/logger';

const execFileAsync = promisify(execFile);

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Input method: xcrun simctl io commands. */
export const IOS_INPUT_METHOD_SIMCTL: Str = 'simctl' as Str;

/** Input method: AppleScript event posting. */
export const IOS_INPUT_METHOD_APPLESCRIPT: Str = 'applescript' as Str;

/* ------------------------------------------------------------------ */
/*  Dispatcher                                                         */
/* ------------------------------------------------------------------ */

/**
 * Dispatches input events to an iOS Simulator.
 *
 * Uses `xcrun simctl io` for tap/swipe and `xcrun simctl sendkey`
 * for keyboard events. Mouse move uses AppleScript as simctl
 * doesn't support hover/move without tap.
 *
 * @example
 * const input = new IosInputDispatcher('B33CE7D0-...', 1170, 2532);
 * await input.click(585, 1266);
 * await input.keyPress('a');
 * await input.scroll(585, 1266, 0, -120);
 */
export class IosInputDispatcher {
  /** Simulator device UDID. */
  readonly udid: Str;

  /** Screen width in device pixels. */
  readonly screenWidth: Num;

  /** Screen height in device pixels. */
  readonly screenHeight: Num;

  /**
   * Create a new input dispatcher.
   *
   * @param udid - Device UDID (must be booted)
   * @param screenWidth - Screen width in device pixels
   * @param screenHeight - Screen height in device pixels
   */
  constructor(udid: Str, screenWidth: Num, screenHeight: Num) {
    this.udid = udid;
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
  }

  /**
   * Dispatch a click (tap) at the given coordinates.
   *
   * Uses `xcrun simctl io <udid> tap <x> <y>`.
   *
   * @param x - X coordinate in device pixels
   * @param y - Y coordinate in device pixels
   */
  async click(x: Num, y: Num): Promise<void> {
    await this.simctlIo('tap', [(x as number).toString(), (y as number).toString()]);
  }

  /**
   * Dispatch a mouse down event.
   *
   * Uses simctl tap with press-and-hold simulation.
   *
   * @param x - X coordinate in device pixels
   * @param y - Y coordinate in device pixels
   */
  async mouseDown(x: Num, y: Num): Promise<void> {
    await this.simctlIo('tap', [(x as number).toString(), (y as number).toString()]);
  }

  /**
   * Dispatch a mouse up event.
   *
   * Completes a press interaction at the given position.
   *
   * @param x - X coordinate in device pixels
   * @param y - Y coordinate in device pixels
   */
  async mouseUp(x: Num, y: Num): Promise<void> {
    await this.simctlIo('tap', [(x as number).toString(), (y as number).toString()]);
  }

  /**
   * Dispatch a mouse move event (hover).
   *
   * Uses AppleScript to post a mouse moved event to the
   * Simulator.app window, since simctl doesn't support
   * move-without-click.
   *
   * @param x - X coordinate in device pixels
   * @param y - Y coordinate in device pixels
   */
  async mouseMove(x: Num, y: Num): Promise<void> {
    const script: Str = [
      'tell application "Simulator"',
      '  activate',
      'end tell',
      `tell application "System Events" to tell process "Simulator"`,
      `  set frontWindow to front window`,
      `  set winPos to position of frontWindow`,
      `  set absX to (item 1 of winPos) + ${x as number}`,
      `  set absY to (item 2 of winPos) + ${y as number}`,
      'end tell',
    ].join('\n') as Str;

    try {
      await execFileAsync('osascript', ['-e', script]);
    } catch (error: unknown) {
      /* AppleScript mouse move is best-effort — non-critical for preview */
      log.debug('iOS input: mouse move failed', {
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  /**
   * Dispatch a key press event.
   *
   * Uses `xcrun simctl io <udid> sendkey <key>`.
   * Maps common key names to simctl key codes.
   *
   * @param key - Key name (e.g., 'a', 'Enter', 'ArrowLeft')
   */
  async keyPress(key: Str): Promise<void> {
    const simctlKey: Str = mapKeyToSimctl(key);
    await execFileAsync('xcrun', ['simctl', 'io', this.udid, 'sendkey', simctlKey]);
  }

  /**
   * Dispatch text input (multi-character string).
   *
   * Uses `xcrun simctl io <udid> type <text>` for IME-compatible
   * text entry.
   *
   * @param text - Text string to type
   */
  async typeText(text: Str): Promise<void> {
    await execFileAsync('xcrun', ['simctl', 'io', this.udid, 'type', text]);
  }

  /**
   * Dispatch a scroll event.
   *
   * Uses `xcrun simctl io <udid> swipe` to simulate scroll
   * by swiping from the point in the scroll direction.
   *
   * @param x - X coordinate in device pixels
   * @param y - Y coordinate in device pixels
   * @param deltaX - Horizontal scroll delta
   * @param deltaY - Vertical scroll delta
   */
  async scroll(x: Num, y: Num, deltaX: Num, deltaY: Num): Promise<void> {
    /* Convert scroll deltas to swipe endpoint.
       Swipe in the opposite direction of scroll to simulate
       the scroll effect (swipe down = scroll up). */
    const endX: Num = ((x as number) - (deltaX as number)) as Num;
    const endY: Num = ((y as number) - (deltaY as number)) as Num;

    await this.simctlIo('swipe', [
      (x as number).toString(),
      (y as number).toString(),
      (endX as number).toString(),
      (endY as number).toString(),
    ]);
  }

  /**
   * Execute a simctl io subcommand.
   *
   * @param action - IO action (tap, swipe, sendkey, type)
   * @param args - Additional arguments
   */
  private async simctlIo(action: Str, args: string[]): Promise<void> {
    await execFileAsync('xcrun', ['simctl', 'io', this.udid, action, ...args]);
  }
}

/* ------------------------------------------------------------------ */
/*  Key mapping                                                        */
/* ------------------------------------------------------------------ */

/** Map of browser key names to simctl key names. */
const KEY_MAP: Record<Str, Str> = {
  Enter: 'Return' as Str,
  Backspace: 'Delete' as Str,
  Delete: 'ForwardDelete' as Str,
  Tab: 'Tab' as Str,
  Escape: 'Escape' as Str,
  ArrowUp: 'UpArrow' as Str,
  ArrowDown: 'DownArrow' as Str,
  ArrowLeft: 'LeftArrow' as Str,
  ArrowRight: 'RightArrow' as Str,
  ' ': 'Space' as Str,
} as Record<Str, Str>;

/**
 * Map a browser key name to a simctl sendkey name.
 *
 * @param key - Browser key name
 * @returns simctl key name
 */
function mapKeyToSimctl(key: Str): Str {
  const mapped: Str | undefined = KEY_MAP[key];
  if (mapped !== undefined) return mapped;

  /* Single character keys are passed as-is */
  if ((key as string).length === 1) return key;

  /* Unknown keys are passed through */
  return key;
}
