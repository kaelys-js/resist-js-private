/**
 * Playwright input forwarder for Firefox and WebKit.
 *
 * Translates Live View input messages (from the client WebSocket)
 * into Playwright page API calls (mouse, keyboard, touchscreen).
 * Used as the input dispatcher for screenshot-loop engines where
 * CDP is not available.
 *
 * Playwright's input API is higher-level than CDP — it provides
 * `mouse.click()`, `keyboard.down()`, `touchscreen.tap()` instead
 * of raw `Input.dispatchMouseEvent`. Some touch gestures (move,
 * end) have no direct Playwright equivalent and are no-ops.
 *
 * Control messages (start, stop, quality, resize) are ignored — they
 * are handled by the session manager, not the input forwarder.
 *
 * @module
 */

import type { Page } from 'playwright';
import type { InputMessage } from './preview-types';

/* ------------------------------------------------------------------ */
/*  Forwarder                                                          */
/* ------------------------------------------------------------------ */

/**
 * Forwards client input events to a Playwright page via its API.
 *
 * @example
 * const forwarder = new PlaywrightInputForwarder(page);
 * forwarder.dispatch({ type: 'mouseDown', x: 100, y: 200, button: 'left', modifiers: 0 });
 */
export class PlaywrightInputForwarder {
  /** Playwright page to forward input to. */
  private readonly page: Page;

  /**
   * Create a new input forwarder.
   *
   * @param page - Playwright page to forward input events to
   */
  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Dispatch an input message to the page via Playwright API.
   *
   * Translates the Live View message format into the corresponding
   * Playwright mouse/keyboard/touchscreen call. Control messages
   * are silently ignored.
   *
   * @param msg - Client input message to dispatch
   */
  async dispatch(msg: InputMessage): Promise<void> {
    switch (msg.type) {
      case 'mouseDown': {
        await this.page.mouse.move(msg.x as number, msg.y as number);
        // Str brand → Playwright MouseButton literal — values validated by schema
        await this.page.mouse.down({ button: msg.button as 'left' | 'right' | 'middle' });
        break;
      }

      case 'mouseUp': {
        // Str brand → Playwright MouseButton literal — values validated by schema
        await this.page.mouse.up({ button: msg.button as 'left' | 'right' | 'middle' });
        break;
      }

      case 'mouseMove': {
        await this.page.mouse.move(msg.x as number, msg.y as number);
        break;
      }

      case 'click': {
        await this.page.mouse.click(msg.x as number, msg.y as number, {
          // Str brand → Playwright MouseButton literal — values validated by schema
          button: msg.button as 'left' | 'right' | 'middle',
          clickCount: msg.clickCount as number,
        });
        break;
      }

      case 'dblclick': {
        await this.page.mouse.dblclick(msg.x as number, msg.y as number);
        break;
      }

      case 'wheel': {
        await this.page.mouse.wheel(msg.deltaX as number, msg.deltaY as number);
        break;
      }

      case 'keyDown': {
        await this.page.keyboard.down(msg.key as string);
        break;
      }

      case 'keyUp': {
        await this.page.keyboard.up(msg.key as string);
        break;
      }

      case 'touchStart': {
        // Playwright touchscreen.tap() is the closest equivalent
        const [firstTouch] = msg.touches;
        if (firstTouch) {
          await this.page.touchscreen.tap(firstTouch.x as number, firstTouch.y as number);
        }
        break;
      }

      case 'touchMove':
      case 'touchEnd': {
        // Playwright has no touchMove/touchEnd API — no-op
        break;
      }

      case 'start':
      case 'stop':
      case 'quality':
      case 'resize': {
        // Control messages — handled by session manager, not input forwarder
        break;
      }
    }
  }
}
