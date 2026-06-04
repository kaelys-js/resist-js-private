/**
 * CDP input dispatcher for Chromium.
 *
 * Translates Live View input messages (from the client WebSocket)
 * into Chrome DevTools Protocol `Input.dispatch*Event` commands.
 * Supports mouse, keyboard, touch, and scroll events with sub-5ms
 * input latency.
 *
 * Control messages (start, stop, quality, resize) are ignored — they
 * are handled by the session manager, not the input dispatcher.
 *
 * @module
 */

import type { CDPSession } from 'playwright';
import type { InputMessage } from './preview-types';

// =============================================================================
// Dispatcher
// =============================================================================

/**
 * Dispatches client input events to a Chromium page via CDP.
 *
 * @example
 * const dispatcher = new CdpInputDispatcher(cdpSession);
 * dispatcher.dispatch({ type: 'mouseDown', x: 100, y: 200, button: 'left', modifiers: 0 });
 */
export class CdpInputDispatcher {
  /** CDP session for sending Input domain commands. */
  private readonly cdp: CDPSession;

  /**
   * Create a new input dispatcher.
   *
   * @param cdp - Playwright CDPSession for the target page
   */
  constructor(cdp: CDPSession) {
    this.cdp = cdp;
  }

  /**
   * Dispatch an input message to the page via CDP.
   *
   * Translates the Live View message format into the corresponding
   * CDP Input domain command. Control messages are silently ignored.
   *
   * @param msg - Client input message to dispatch
   */
  async dispatch(msg: InputMessage): Promise<void> {
    switch (msg.type) {
      case 'mouseDown': {
        await this.cdp.send('Input.dispatchMouseEvent', {
          type: 'mousePressed',
          x: msg.x as number,
          y: msg.y as number,
          // Str brand → CDP MouseButton literal — values validated by schema
          button: msg.button as 'left' | 'right' | 'middle',
          modifiers: msg.modifiers as number,
          clickCount: 1,
        });
        break;
      }

      case 'mouseUp': {
        await this.cdp.send('Input.dispatchMouseEvent', {
          type: 'mouseReleased',
          x: msg.x as number,
          y: msg.y as number,
          // Str brand → CDP MouseButton literal — values validated by schema
          button: msg.button as 'left' | 'right' | 'middle',
          modifiers: msg.modifiers as number,
        });
        break;
      }

      case 'mouseMove': {
        await this.cdp.send('Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          x: msg.x as number,
          y: msg.y as number,
        });
        break;
      }

      case 'click': {
        await this.cdp.send('Input.dispatchMouseEvent', {
          type: 'mousePressed',
          x: msg.x as number,
          y: msg.y as number,
          // Str brand → CDP MouseButton literal — values validated by schema
          button: msg.button as 'left' | 'right' | 'middle',
          modifiers: msg.modifiers as number,
          clickCount: msg.clickCount as number,
        });
        await this.cdp.send('Input.dispatchMouseEvent', {
          type: 'mouseReleased',
          x: msg.x as number,
          y: msg.y as number,
          // Str brand → CDP MouseButton literal — values validated by schema
          button: msg.button as 'left' | 'right' | 'middle',
          modifiers: msg.modifiers as number,
        });
        break;
      }

      case 'dblclick': {
        // Double-click: two press+release pairs with incrementing clickCount
        await this.cdp.send('Input.dispatchMouseEvent', {
          type: 'mousePressed',
          x: msg.x as number,
          y: msg.y as number,
          button: 'left',
          clickCount: 1,
        });
        await this.cdp.send('Input.dispatchMouseEvent', {
          type: 'mouseReleased',
          x: msg.x as number,
          y: msg.y as number,
          button: 'left',
        });
        await this.cdp.send('Input.dispatchMouseEvent', {
          type: 'mousePressed',
          x: msg.x as number,
          y: msg.y as number,
          button: 'left',
          clickCount: 2,
        });
        await this.cdp.send('Input.dispatchMouseEvent', {
          type: 'mouseReleased',
          x: msg.x as number,
          y: msg.y as number,
          button: 'left',
        });
        break;
      }

      case 'wheel': {
        await this.cdp.send('Input.dispatchMouseEvent', {
          type: 'mouseWheel',
          x: msg.x as number,
          y: msg.y as number,
          deltaX: msg.deltaX as number,
          deltaY: msg.deltaY as number,
        });
        break;
      }

      case 'keyDown': {
        await this.cdp.send('Input.dispatchKeyEvent', {
          type: 'keyDown',
          key: msg.key as string,
          code: msg.code as string,
          modifiers: msg.modifiers as number,
        });
        break;
      }

      case 'keyUp': {
        await this.cdp.send('Input.dispatchKeyEvent', {
          type: 'keyUp',
          key: msg.key as string,
          code: msg.code as string,
          modifiers: msg.modifiers as number,
        });
        break;
      }

      case 'touchStart': {
        await this.cdp.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: msg.touches.map((t: { x: unknown; y: unknown; id: unknown }) => ({
            x: t.x as number,
            y: t.y as number,
            id: t.id as number,
          })),
        });
        break;
      }

      case 'touchMove': {
        await this.cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: msg.touches.map((t: { x: unknown; y: unknown; id: unknown }) => ({
            x: t.x as number,
            y: t.y as number,
            id: t.id as number,
          })),
        });
        break;
      }

      case 'touchEnd': {
        await this.cdp.send('Input.dispatchTouchEvent', {
          type: 'touchEnd',
          touchPoints: msg.touches.map((t: { x: unknown; y: unknown; id: unknown }) => ({
            x: t.x as number,
            y: t.y as number,
            id: t.id as number,
          })),
        });
        break;
      }

      case 'start':
      case 'stop':
      case 'quality':
      case 'resize': {
        // Control messages — handled by session manager, not input dispatcher
        break;
      }
    }
  }
}
