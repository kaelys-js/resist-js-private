/**
 * Tests for iOS Simulator input injection.
 *
 * Verifies mouse, keyboard, and touch event dispatch
 * via simctl + AppleScript to the Simulator.app window.
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { Num, Str } from '@/schemas/common';

import { execFile } from 'node:child_process';
import {
  IosInputDispatcher,
  IOS_INPUT_METHOD_SIMCTL,
  IOS_INPUT_METHOD_APPLESCRIPT,
} from './ios-input';

// =============================================================================
// Mocks
// =============================================================================

vi.mock('node:child_process', (): Record<string, unknown> => {
  const module: Record<string, unknown> = {
    execFile: vi.fn(),
  };

  return { ...module, default: module };
});

// =============================================================================
// Fixtures
// =============================================================================

const TEST_UDID: Str = 'B33CE7D0-3CD7-4BB9-AEDC-0D5679F6D0C0' as Str;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Make execFile resolve immediately.
 */
function mockExecFileSuccess(): void {
  (execFile as unknown as Mock).mockImplementation(
    (
      _cmd: Str,
      _args: string[],
      callback: (err: Error | null, result: { stdout: Str; stderr: Str }) => void,
    ): void => {
      callback(null, { stdout: '' as Str, stderr: '' as Str });
    },
  );
}

// =============================================================================
// Tests
// =============================================================================

describe('IosInputDispatcher', (): void => {
  beforeEach((): void => {
    vi.clearAllMocks();
    mockExecFileSuccess();
  });

  /* ---------------------------------------------------------------- */
  /*  Constants                                                        */
  /* ---------------------------------------------------------------- */

  it('exports input method constants', (): void => {
    expect(IOS_INPUT_METHOD_SIMCTL).toBe('simctl' as Str);
    expect(IOS_INPUT_METHOD_APPLESCRIPT).toBe('applescript' as Str);
  });

  /* ---------------------------------------------------------------- */
  /*  Construction                                                     */
  /* ---------------------------------------------------------------- */

  it('creates a dispatcher with UDID and screen dimensions', (): void => {
    const dispatcher: IosInputDispatcher = new IosInputDispatcher(
      TEST_UDID,
      1170 as Num,
      2532 as Num,
    );
    expect(dispatcher.udid).toBe(TEST_UDID);
    expect(dispatcher.screenWidth).toBe(1170 as Num);
    expect(dispatcher.screenHeight).toBe(2532 as Num);
  });

  /* ---------------------------------------------------------------- */
  /*  Mouse events                                                     */
  /* ---------------------------------------------------------------- */

  it('dispatches mouse click via simctl io tap', async (): Promise<void> => {
    const dispatcher: IosInputDispatcher = new IosInputDispatcher(
      TEST_UDID,
      1170 as Num,
      2532 as Num,
    );

    await dispatcher.click(585 as Num, 1266 as Num);

    expect(execFile).toHaveBeenCalled();
    const call: unknown[] = (execFile as unknown as Mock).mock.calls[0] as unknown[];
    const cmd: Str = call[0] as Str;
    const args: string[] = call[1] as string[];

    expect(cmd).toBe('xcrun');
    expect(args).toContain('simctl');
    expect(args).toContain('io');
    expect(args).toContain(TEST_UDID);
  });

  it('dispatches mouse down event', async (): Promise<void> => {
    const dispatcher: IosInputDispatcher = new IosInputDispatcher(
      TEST_UDID,
      1170 as Num,
      2532 as Num,
    );

    await dispatcher.mouseDown(100 as Num, 200 as Num);

    expect(execFile).toHaveBeenCalled();
  });

  it('dispatches mouse up event', async (): Promise<void> => {
    const dispatcher: IosInputDispatcher = new IosInputDispatcher(
      TEST_UDID,
      1170 as Num,
      2532 as Num,
    );

    await dispatcher.mouseUp(100 as Num, 200 as Num);

    expect(execFile).toHaveBeenCalled();
  });

  it('dispatches mouse move event', async (): Promise<void> => {
    const dispatcher: IosInputDispatcher = new IosInputDispatcher(
      TEST_UDID,
      1170 as Num,
      2532 as Num,
    );

    await dispatcher.mouseMove(300 as Num, 400 as Num);

    expect(execFile).toHaveBeenCalled();
  });

  /* ---------------------------------------------------------------- */
  /*  Keyboard events                                                  */
  /* ---------------------------------------------------------------- */

  it('dispatches key press via simctl sendkey', async (): Promise<void> => {
    const dispatcher: IosInputDispatcher = new IosInputDispatcher(
      TEST_UDID,
      1170 as Num,
      2532 as Num,
    );

    await dispatcher.keyPress('a' as Str);

    expect(execFile).toHaveBeenCalled();
    const call: unknown[] = (execFile as unknown as Mock).mock.calls[0] as unknown[];
    const args: string[] = call[1] as string[];

    expect(args).toContain('simctl');
  });

  it('dispatches text input via simctl keyboard', async (): Promise<void> => {
    const dispatcher: IosInputDispatcher = new IosInputDispatcher(
      TEST_UDID,
      1170 as Num,
      2532 as Num,
    );

    await dispatcher.typeText('hello' as Str);

    expect(execFile).toHaveBeenCalled();
  });

  /* ---------------------------------------------------------------- */
  /*  Scroll events                                                    */
  /* ---------------------------------------------------------------- */

  it('dispatches scroll event', async (): Promise<void> => {
    const dispatcher: IosInputDispatcher = new IosInputDispatcher(
      TEST_UDID,
      1170 as Num,
      2532 as Num,
    );

    await dispatcher.scroll(585 as Num, 1266 as Num, 0 as Num, -120 as Num);

    expect(execFile).toHaveBeenCalled();
  });

  /* ---------------------------------------------------------------- */
  /*  Error handling                                                   */
  /* ---------------------------------------------------------------- */

  it('throws on input dispatch failure', async (): Promise<void> => {
    (execFile as unknown as Mock).mockImplementation(
      (_cmd: Str, _args: string[], callback: (err: Error | null) => void): void => {
        callback(new Error('simctl error'));
      },
    );

    const dispatcher: IosInputDispatcher = new IosInputDispatcher(
      TEST_UDID,
      1170 as Num,
      2532 as Num,
    );

    await expect(dispatcher.click(100 as Num, 200 as Num)).rejects.toThrow('simctl error');
  });

  /* ---------------------------------------------------------------- */
  /*  Coordinate scaling                                               */
  /* ---------------------------------------------------------------- */

  it('passes coordinates directly (no scaling for simctl)', async (): Promise<void> => {
    const dispatcher: IosInputDispatcher = new IosInputDispatcher(
      TEST_UDID,
      1170 as Num,
      2532 as Num,
    );

    await dispatcher.click(585 as Num, 1266 as Num);

    const call: unknown[] = (execFile as unknown as Mock).mock.calls[0] as unknown[];
    const args: string[] = call[1] as string[];

    /* Coordinates should appear as string args */
    expect(args).toContain('585');
    expect(args).toContain('1266');
  });

  it('mouseMove handles error gracefully without throwing', async (): Promise<void> => {
    (execFile as unknown as Mock).mockImplementation(
      (_cmd: string, _args: string[], callback: (err: Error | null) => void) => {
        callback(new Error('simctl failed'));
      },
    );

    const dispatcher: IosInputDispatcher = new IosInputDispatcher(
      TEST_UDID,
      1170 as Num,
      2532 as Num,
    );

    // Should not throw — error is caught and logged
    await dispatcher.mouseMove(300 as Num, 400 as Num);
  });
});
