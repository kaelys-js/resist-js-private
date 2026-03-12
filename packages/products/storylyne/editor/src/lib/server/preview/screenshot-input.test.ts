/**
 * Tests for the Playwright input forwarder.
 *
 * Verifies that each input message type dispatches the correct
 * Playwright API call (mouse, keyboard, touchscreen) for
 * Firefox and WebKit engines.
 *
 * @module
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PlaywrightInputForwarder } from './screenshot-input';
import type { InputMessage } from './preview-types';

/* ------------------------------------------------------------------ */
/*  Mock                                                               */
/* ------------------------------------------------------------------ */

/**
 * Create a mock Playwright page with mouse, keyboard, and touchscreen.
 *
 * @returns Mock page with all input API spies
 */
function createMockPage(): {
  mouse: {
    down: ReturnType<typeof vi.fn>;
    up: ReturnType<typeof vi.fn>;
    move: ReturnType<typeof vi.fn>;
    click: ReturnType<typeof vi.fn>;
    dblclick: ReturnType<typeof vi.fn>;
    wheel: ReturnType<typeof vi.fn>;
  };
  keyboard: {
    down: ReturnType<typeof vi.fn>;
    up: ReturnType<typeof vi.fn>;
  };
  touchscreen: {
    tap: ReturnType<typeof vi.fn>;
  };
} {
  return {
    mouse: {
      down: vi.fn().mockResolvedValue(undefined),
      up: vi.fn().mockResolvedValue(undefined),
      move: vi.fn().mockResolvedValue(undefined),
      click: vi.fn().mockResolvedValue(undefined),
      dblclick: vi.fn().mockResolvedValue(undefined),
      wheel: vi.fn().mockResolvedValue(undefined),
    },
    keyboard: {
      down: vi.fn().mockResolvedValue(undefined),
      up: vi.fn().mockResolvedValue(undefined),
    },
    touchscreen: {
      tap: vi.fn().mockResolvedValue(undefined),
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('PlaywrightInputForwarder', (): void => {
  let page: ReturnType<typeof createMockPage>;
  let forwarder: PlaywrightInputForwarder;

  beforeEach((): void => {
    page = createMockPage();
    forwarder = new PlaywrightInputForwarder(page as never);
  });

  it('dispatches mouseDown as mouse.move + mouse.down', async (): Promise<void> => {
    const msg: InputMessage = {
      type: 'mouseDown',
      x: 100,
      y: 200,
      button: 'left',
      modifiers: 0,
    } as InputMessage;

    await forwarder.dispatch(msg);

    expect(page.mouse.move).toHaveBeenCalledWith(100, 200);
    expect(page.mouse.down).toHaveBeenCalledWith({ button: 'left' });
  });

  it('dispatches mouseUp as mouse.up', async (): Promise<void> => {
    const msg: InputMessage = {
      type: 'mouseUp',
      x: 100,
      y: 200,
      button: 'left',
      modifiers: 0,
    } as InputMessage;

    await forwarder.dispatch(msg);

    expect(page.mouse.up).toHaveBeenCalledWith({ button: 'left' });
  });

  it('dispatches mouseMove as mouse.move', async (): Promise<void> => {
    const msg: InputMessage = {
      type: 'mouseMove',
      x: 300,
      y: 400,
    } as InputMessage;

    await forwarder.dispatch(msg);

    expect(page.mouse.move).toHaveBeenCalledWith(300, 400);
  });

  it('dispatches click as mouse.click', async (): Promise<void> => {
    const msg: InputMessage = {
      type: 'click',
      x: 50,
      y: 60,
      button: 'left',
      modifiers: 0,
      clickCount: 1,
    } as InputMessage;

    await forwarder.dispatch(msg);

    expect(page.mouse.click).toHaveBeenCalledWith(50, 60, { button: 'left', clickCount: 1 });
  });

  it('dispatches dblclick as mouse.dblclick', async (): Promise<void> => {
    const msg: InputMessage = {
      type: 'dblclick',
      x: 50,
      y: 60,
    } as InputMessage;

    await forwarder.dispatch(msg);

    expect(page.mouse.dblclick).toHaveBeenCalledWith(50, 60);
  });

  it('dispatches wheel as mouse.wheel', async (): Promise<void> => {
    const msg: InputMessage = {
      type: 'wheel',
      x: 100,
      y: 200,
      deltaX: 0,
      deltaY: -120,
    } as InputMessage;

    await forwarder.dispatch(msg);

    expect(page.mouse.wheel).toHaveBeenCalledWith(0, -120);
  });

  it('dispatches keyDown as keyboard.down', async (): Promise<void> => {
    const msg: InputMessage = {
      type: 'keyDown',
      key: 'a',
      code: 'KeyA',
      modifiers: 0,
    } as InputMessage;

    await forwarder.dispatch(msg);

    expect(page.keyboard.down).toHaveBeenCalledWith('a');
  });

  it('dispatches keyUp as keyboard.up', async (): Promise<void> => {
    const msg: InputMessage = {
      type: 'keyUp',
      key: 'Enter',
      code: 'Enter',
      modifiers: 0,
    } as InputMessage;

    await forwarder.dispatch(msg);

    expect(page.keyboard.up).toHaveBeenCalledWith('Enter');
  });

  it('dispatches touchStart as touchscreen.tap', async (): Promise<void> => {
    const msg: InputMessage = {
      type: 'touchStart',
      touches: [{ x: 100, y: 200, id: 0 }],
    } as InputMessage;

    await forwarder.dispatch(msg);

    expect(page.touchscreen.tap).toHaveBeenCalledWith(100, 200);
  });

  it('ignores touchMove (Playwright has no move API)', async (): Promise<void> => {
    const msg: InputMessage = {
      type: 'touchMove',
      touches: [{ x: 110, y: 210, id: 0 }],
    } as InputMessage;

    await forwarder.dispatch(msg);

    expect(page.touchscreen.tap).not.toHaveBeenCalled();
  });

  it('ignores touchEnd (Playwright has no touch end API)', async (): Promise<void> => {
    const msg: InputMessage = {
      type: 'touchEnd',
      touches: [{ x: 110, y: 210, id: 0 }],
    } as InputMessage;

    await forwarder.dispatch(msg);

    expect(page.touchscreen.tap).not.toHaveBeenCalled();
  });

  it('ignores control messages (start, stop, quality, resize)', async (): Promise<void> => {
    const messages: InputMessage[] = [
      { type: 'start' },
      { type: 'stop' },
      { type: 'quality', quality: 50 },
      { type: 'resize', width: 800, height: 600 },
    ] as InputMessage[];

    for (const msg of messages) {
      await forwarder.dispatch(msg);
    }

    expect(page.mouse.down).not.toHaveBeenCalled();
    expect(page.mouse.up).not.toHaveBeenCalled();
    expect(page.mouse.move).not.toHaveBeenCalled();
    expect(page.mouse.click).not.toHaveBeenCalled();
    expect(page.keyboard.down).not.toHaveBeenCalled();
    expect(page.keyboard.up).not.toHaveBeenCalled();
    expect(page.touchscreen.tap).not.toHaveBeenCalled();
  });

  it('dispatches right-click button correctly', async (): Promise<void> => {
    const msg: InputMessage = {
      type: 'mouseDown',
      x: 100,
      y: 200,
      button: 'right',
      modifiers: 0,
    } as InputMessage;

    await forwarder.dispatch(msg);

    expect(page.mouse.down).toHaveBeenCalledWith({ button: 'right' });
  });
});
