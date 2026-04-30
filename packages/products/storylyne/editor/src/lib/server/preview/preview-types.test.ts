/**
 * Tests for preview WebSocket protocol types and schemas.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { safeParse } from '@/utils/result/safe';
import type { Bool, Str } from '@/schemas/common';
import {
  InputMessageSchema,
  ServerMessageSchema,
  SessionConfigSchema,
  PREVIEW_ENGINES,
} from './preview-types';

/* ------------------------------------------------------------------ */
/*  SessionConfig                                                      */
/* ------------------------------------------------------------------ */

describe('SessionConfigSchema', (): void => {
  it('validates a minimal Chromium config', (): void => {
    const input: Record<Str, unknown> = {
      engine: 'chromium',
      component: 'button',
      width: 1280,
      height: 720,
    };
    const result = safeParse(SessionConfigSchema, input);
    expect(result.ok).toBe(true as Bool);
    if (result.ok) {
      expect(result.data.engine).toBe('chromium' as Str);
      expect(result.data.component).toBe('button' as Str);
      expect(result.data.quality).toBe(60); // default
    }
  });

  it('validates a full config with all optional fields', (): void => {
    const input: Record<Str, unknown> = {
      engine: 'webkit',
      component: 'badge',
      width: 375,
      height: 812,
      scale: 3,
      quality: 40,
      colorScheme: 'dark',
      reducedMotion: 'reduce',
      forcedColors: 'active',
      cardStyles: 'eyJ0ZXN0IjoxfQ==',
      variant: 'size',
      option: 'sm',
      device: 'iPhone 15 Pro',
    };
    const result = safeParse(SessionConfigSchema, input);
    expect(result.ok).toBe(true as Bool);
    if (result.ok) {
      expect(result.data.engine).toBe('webkit' as Str);
      expect(result.data.quality).toBe(40);
      expect(result.data.colorScheme).toBe('dark' as Str);
      expect(result.data.device).toBe('iPhone 15 Pro' as Str);
    }
  });

  it('rejects invalid engine', (): void => {
    const input: Record<Str, unknown> = {
      engine: 'netscape',
      component: 'button',
      width: 1280,
      height: 720,
    };
    const result = safeParse(SessionConfigSchema, input);
    expect(result.ok).toBe(false as Bool);
  });

  it('rejects missing component', (): void => {
    const input: Record<Str, unknown> = {
      engine: 'chromium',
      width: 1280,
      height: 720,
    };
    const result = safeParse(SessionConfigSchema, input);
    expect(result.ok).toBe(false as Bool);
  });

  it('validates all engine types', (): void => {
    const engines: Str[] = [
      'chromium',
      'firefox',
      'webkit',
      'ios-simulator',
      'android-emulator',
    ] as Str[];

    for (const engine of engines) {
      const input: Record<Str, unknown> = {
        engine,
        component: 'button',
        width: 800,
        height: 600,
      };
      const result = safeParse(SessionConfigSchema, input);
      expect(result.ok).toBe(true as Bool);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  InputMessage                                                       */
/* ------------------------------------------------------------------ */

describe('InputMessageSchema', (): void => {
  it('validates mouseDown event', (): void => {
    const input: Record<Str, unknown> = {
      type: 'mouseDown',
      x: 200,
      y: 300,
      button: 'left',
      modifiers: 0,
    };
    const result = safeParse(InputMessageSchema, input);
    expect(result.ok).toBe(true as Bool);
  });

  it('validates mouseMove event', (): void => {
    const input: Record<Str, unknown> = {
      type: 'mouseMove',
      x: 150,
      y: 250,
    };
    const result = safeParse(InputMessageSchema, input);
    expect(result.ok).toBe(true as Bool);
  });

  it('validates wheel event', (): void => {
    const input: Record<Str, unknown> = {
      type: 'wheel',
      x: 100,
      y: 200,
      deltaX: 0,
      deltaY: -120,
    };
    const result = safeParse(InputMessageSchema, input);
    expect(result.ok).toBe(true as Bool);
  });

  it('validates keyDown event', (): void => {
    const input: Record<Str, unknown> = {
      type: 'keyDown',
      key: 'a',
      code: 'KeyA',
      modifiers: 0,
    };
    const result = safeParse(InputMessageSchema, input);
    expect(result.ok).toBe(true as Bool);
  });

  it('validates keyUp event', (): void => {
    const input: Record<Str, unknown> = {
      type: 'keyUp',
      key: 'Enter',
      code: 'Enter',
      modifiers: 0,
    };
    const result = safeParse(InputMessageSchema, input);
    expect(result.ok).toBe(true as Bool);
  });

  it('validates touchStart event', (): void => {
    const input: Record<Str, unknown> = {
      type: 'touchStart',
      touches: [
        { x: 100, y: 200, id: 0 },
        { x: 300, y: 400, id: 1 },
      ],
    };
    const result = safeParse(InputMessageSchema, input);
    expect(result.ok).toBe(true as Bool);
  });

  it('validates touchMove event', (): void => {
    const input: Record<Str, unknown> = {
      type: 'touchMove',
      touches: [{ x: 110, y: 210, id: 0 }],
    };
    const result = safeParse(InputMessageSchema, input);
    expect(result.ok).toBe(true as Bool);
  });

  it('validates touchEnd event', (): void => {
    const input: Record<Str, unknown> = {
      type: 'touchEnd',
      touches: [{ x: 110, y: 210, id: 0 }],
    };
    const result = safeParse(InputMessageSchema, input);
    expect(result.ok).toBe(true as Bool);
  });

  it('validates click event', (): void => {
    const input: Record<Str, unknown> = {
      type: 'click',
      x: 200,
      y: 300,
      button: 'left',
      modifiers: 0,
      clickCount: 1,
    };
    const result = safeParse(InputMessageSchema, input);
    expect(result.ok).toBe(true as Bool);
  });

  it('validates dblclick event', (): void => {
    const input: Record<Str, unknown> = {
      type: 'dblclick',
      x: 200,
      y: 300,
    };
    const result = safeParse(InputMessageSchema, input);
    expect(result.ok).toBe(true as Bool);
  });

  it('validates start control message', (): void => {
    const input: Record<Str, unknown> = { type: 'start' };
    const result = safeParse(InputMessageSchema, input);
    expect(result.ok).toBe(true as Bool);
  });

  it('validates stop control message', (): void => {
    const input: Record<Str, unknown> = { type: 'stop' };
    const result = safeParse(InputMessageSchema, input);
    expect(result.ok).toBe(true as Bool);
  });

  it('validates resize control message', (): void => {
    const input: Record<Str, unknown> = { type: 'resize', width: 800, height: 600 };
    const result = safeParse(InputMessageSchema, input);
    expect(result.ok).toBe(true as Bool);
  });

  it('validates quality control message', (): void => {
    const input: Record<Str, unknown> = { type: 'quality', quality: 30 };
    const result = safeParse(InputMessageSchema, input);
    expect(result.ok).toBe(true as Bool);
  });

  it('rejects unknown event type', (): void => {
    const input: Record<Str, unknown> = { type: 'teleport', x: 0, y: 0 };
    const result = safeParse(InputMessageSchema, input);
    expect(result.ok).toBe(false as Bool);
  });

  it('validates mouseDown with all modifier bits', (): void => {
    const input: Record<Str, unknown> = {
      type: 'mouseDown',
      x: 10,
      y: 20,
      button: 'right',
      modifiers: 15,
    };
    const result = safeParse(InputMessageSchema, input);
    expect(result.ok).toBe(true as Bool);
  });
});

/* ------------------------------------------------------------------ */
/*  ServerMessage                                                      */
/* ------------------------------------------------------------------ */

describe('ServerMessageSchema', (): void => {
  it('validates metadata message', (): void => {
    const input: Record<Str, unknown> = {
      type: 'metadata',
      width: 1280,
      height: 720,
      engine: 'chromium',
    };
    const result = safeParse(ServerMessageSchema, input);
    expect(result.ok).toBe(true as Bool);
  });

  it('validates fps message', (): void => {
    const input: Record<Str, unknown> = {
      type: 'fps',
      value: 42,
    };
    const result = safeParse(ServerMessageSchema, input);
    expect(result.ok).toBe(true as Bool);
  });

  it('validates cursor message', (): void => {
    const input: Record<Str, unknown> = {
      type: 'cursor',
      cursor: 'pointer',
    };
    const result = safeParse(ServerMessageSchema, input);
    expect(result.ok).toBe(true as Bool);
  });

  it('validates error message', (): void => {
    const input: Record<Str, unknown> = {
      type: 'error',
      message: 'Browser crashed',
    };
    const result = safeParse(ServerMessageSchema, input);
    expect(result.ok).toBe(true as Bool);
  });

  it('validates latency message', (): void => {
    const input: Record<Str, unknown> = {
      type: 'latency',
      value: 35,
    };
    const result = safeParse(ServerMessageSchema, input);
    expect(result.ok).toBe(true as Bool);
  });

  it('rejects unknown server message type', (): void => {
    const input: Record<Str, unknown> = { type: 'explosion', data: 'boom' };
    const result = safeParse(ServerMessageSchema, input);
    expect(result.ok).toBe(false as Bool);
  });
});

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

describe('PREVIEW_ENGINES', (): void => {
  it('contains all 5 engine identifiers', (): void => {
    expect(PREVIEW_ENGINES).toEqual([
      'chromium',
      'firefox',
      'webkit',
      'ios-simulator',
      'android-emulator',
    ]);
  });
});
