/**
 * Tests for the CDP input dispatcher.
 *
 * Verifies that each input message type dispatches the correct CDP
 * Input domain command with the right parameters.
 *
 * @module
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CdpInputDispatcher } from './cdp-input';
import type { InputMessage } from './preview-types';

/* ------------------------------------------------------------------ */
/*  Mock                                                               */
/* ------------------------------------------------------------------ */

/**
 * Create a mock CDPSession.
 *
 * @returns Mock with send spy
 */
function createMockCdp(): { send: ReturnType<typeof vi.fn> } {
  return {
    send: vi.fn().mockResolvedValue(undefined),
  };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('CdpInputDispatcher', (): void => {
  let cdp: ReturnType<typeof createMockCdp>;
  let dispatcher: CdpInputDispatcher;

  beforeEach((): void => {
    cdp = createMockCdp();
    dispatcher = new CdpInputDispatcher(cdp as never);
  });

  it('dispatches mouseDown as Input.dispatchMouseEvent pressed', async (): Promise<void> => {
    const msg: InputMessage = {
      type: 'mouseDown',
      x: 100,
      y: 200,
      button: 'left',
      modifiers: 0,
    } as InputMessage;

    await dispatcher.dispatch(msg);

    expect(cdp.send).toHaveBeenCalledWith('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: 100,
      y: 200,
      button: 'left',
      modifiers: 0,
      clickCount: 1,
    });
  });

  it('dispatches mouseUp as Input.dispatchMouseEvent released', async (): Promise<void> => {
    const msg: InputMessage = {
      type: 'mouseUp',
      x: 100,
      y: 200,
      button: 'left',
      modifiers: 0,
    } as InputMessage;

    await dispatcher.dispatch(msg);

    expect(cdp.send).toHaveBeenCalledWith('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: 100,
      y: 200,
      button: 'left',
      modifiers: 0,
    });
  });

  it('dispatches mouseMove as Input.dispatchMouseEvent moved', async (): Promise<void> => {
    const msg: InputMessage = {
      type: 'mouseMove',
      x: 300,
      y: 400,
    } as InputMessage;

    await dispatcher.dispatch(msg);

    expect(cdp.send).toHaveBeenCalledWith('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: 300,
      y: 400,
    });
  });

  it('dispatches click as mousePressed + mouseReleased', async (): Promise<void> => {
    const msg: InputMessage = {
      type: 'click',
      x: 50,
      y: 60,
      button: 'left',
      modifiers: 0,
      clickCount: 1,
    } as InputMessage;

    await dispatcher.dispatch(msg);

    expect(cdp.send).toHaveBeenCalledTimes(2);
    expect(cdp.send).toHaveBeenNthCalledWith(1, 'Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: 50,
      y: 60,
      button: 'left',
      modifiers: 0,
      clickCount: 1,
    });
    expect(cdp.send).toHaveBeenNthCalledWith(2, 'Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: 50,
      y: 60,
      button: 'left',
      modifiers: 0,
    });
  });

  it('dispatches dblclick as two click pairs', async (): Promise<void> => {
    const msg: InputMessage = {
      type: 'dblclick',
      x: 50,
      y: 60,
    } as InputMessage;

    await dispatcher.dispatch(msg);

    // 2 press + 2 release = 4 calls
    expect(cdp.send).toHaveBeenCalledTimes(4);
  });

  it('dispatches wheel as Input.dispatchMouseEvent wheel', async (): Promise<void> => {
    const msg: InputMessage = {
      type: 'wheel',
      x: 100,
      y: 200,
      deltaX: 0,
      deltaY: -120,
    } as InputMessage;

    await dispatcher.dispatch(msg);

    expect(cdp.send).toHaveBeenCalledWith('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: 100,
      y: 200,
      deltaX: 0,
      deltaY: -120,
    });
  });

  it('dispatches keyDown as Input.dispatchKeyEvent', async (): Promise<void> => {
    const msg: InputMessage = {
      type: 'keyDown',
      key: 'a',
      code: 'KeyA',
      modifiers: 0,
    } as InputMessage;

    await dispatcher.dispatch(msg);

    expect(cdp.send).toHaveBeenCalledWith('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'a',
      code: 'KeyA',
      modifiers: 0,
    });
  });

  it('dispatches keyUp as Input.dispatchKeyEvent', async (): Promise<void> => {
    const msg: InputMessage = {
      type: 'keyUp',
      key: 'Enter',
      code: 'Enter',
      modifiers: 0,
    } as InputMessage;

    await dispatcher.dispatch(msg);

    expect(cdp.send).toHaveBeenCalledWith('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Enter',
      code: 'Enter',
      modifiers: 0,
    });
  });

  it('dispatches touchStart as Input.dispatchTouchEvent', async (): Promise<void> => {
    const msg: InputMessage = {
      type: 'touchStart',
      touches: [{ x: 100, y: 200, id: 0 }],
    } as InputMessage;

    await dispatcher.dispatch(msg);

    expect(cdp.send).toHaveBeenCalledWith('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 100, y: 200, id: 0 }],
    });
  });

  it('dispatches touchMove as Input.dispatchTouchEvent', async (): Promise<void> => {
    const msg: InputMessage = {
      type: 'touchMove',
      touches: [{ x: 110, y: 210, id: 0 }],
    } as InputMessage;

    await dispatcher.dispatch(msg);

    expect(cdp.send).toHaveBeenCalledWith('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 110, y: 210, id: 0 }],
    });
  });

  it('dispatches touchEnd as Input.dispatchTouchEvent', async (): Promise<void> => {
    const msg: InputMessage = {
      type: 'touchEnd',
      touches: [{ x: 110, y: 210, id: 0 }],
    } as InputMessage;

    await dispatcher.dispatch(msg);

    expect(cdp.send).toHaveBeenCalledWith('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [{ x: 110, y: 210, id: 0 }],
    });
  });

  it('ignores control messages (start, stop, quality, resize)', async (): Promise<void> => {
    const messages: InputMessage[] = [
      { type: 'start' },
      { type: 'stop' },
      { type: 'quality', quality: 50 },
      { type: 'resize', width: 800, height: 600 },
    ] as InputMessage[];

    for (const msg of messages) {
      await dispatcher.dispatch(msg);
    }

    expect(cdp.send).not.toHaveBeenCalled();
  });
});
