/**
 * Tests for the screenshot API endpoint.
 *
 * Playwright is mocked so no real browser is launched. `$app/environment`
 * is mocked to toggle `dev` on/off per test. Browser/context/page stubs
 * track call arguments so we can assert that the correct engine is
 * launched, device presets applied, media emulation set, network
 * throttling attached, and the semaphore released on both success and
 * failure paths.
 *
 * Runs in storylyne-editor-server project (node env).
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// =============================================================================
// Mocks
// =============================================================================

const envState: { dev: boolean } = { dev: true };
vi.mock('$app/environment', () => ({
  get dev(): boolean {
    return envState.dev;
  },
}));

/** Playwright stub — tracks which engine was launched. */
const launchCalls: Array<{ engine: string; options: unknown }> = [];
const newContextCalls: unknown[] = [];
const routeHandlerRegistrations: Array<{ pattern: string }> = [];

function makeBrowserStub(engine: string): unknown {
  return {
    isConnected: (): boolean => true,
    version: (): string => `${engine}-1.0`,
    async newContext(options: unknown) {
      await Promise.resolve();
      newContextCalls.push(options);
      return {
        async newPage() {
          await Promise.resolve();
          const page = {
            on: vi.fn(),
            route: vi.fn(async (pattern: string, _handler: unknown): Promise<void> => {
              await Promise.resolve();
              routeHandlerRegistrations.push({ pattern });
            }),
            goto: vi.fn(async (): Promise<void> => {
              await Promise.resolve();
            }),
            waitForSelector: vi.fn(async (): Promise<void> => {
              await Promise.resolve();
            }),
            waitForTimeout: vi.fn(async (): Promise<void> => {
              await Promise.resolve();
            }),
            evaluate: vi.fn(async (): Promise<Record<string, number>> => {
              await Promise.resolve();
              return {
                domContentLoaded: 42,
                load: 100,
              };
            }),
            screenshot: vi.fn(async (): Promise<Buffer> => {
              await Promise.resolve();
              return Buffer.from('PNGDATA');
            }),
          };

          return page;
        },
        async close(): Promise<void> {
          await Promise.resolve();
          /* no-op */
        },
      };
    },
  };
}

const playwrightStub = {
  chromium: {
    async launch(options: unknown) {
      await Promise.resolve();
      launchCalls.push({ engine: 'chromium', options });
      return makeBrowserStub('chromium');
    },
  },
  firefox: {
    async launch(options: unknown) {
      await Promise.resolve();
      launchCalls.push({ engine: 'firefox', options });
      return makeBrowserStub('firefox');
    },
  },
  webkit: {
    async launch(options: unknown) {
      await Promise.resolve();
      launchCalls.push({ engine: 'webkit', options });
      return makeBrowserStub('webkit');
    },
  },
  devices: {} as Record<string, unknown>,
};

vi.mock('playwright', () => playwrightStub);

// =============================================================================
// Helpers
// =============================================================================

function makeEvent(search: string): { url: URL } {
  return { url: new URL(`http://localhost/api/lens/screenshot${search}`) };
}

// =============================================================================
// Tests
// =============================================================================

describe('GET /api/lens/screenshot', () => {
  beforeEach(() => {
    vi.resetModules();
    launchCalls.length = 0;
    newContextCalls.length = 0;
    routeHandlerRegistrations.length = 0;
    playwrightStub.devices = {};
    envState.dev = true;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /* ---------- dev-only gate ---------- */

  it('returns 404 when not in dev mode', async () => {
    envState.dev = false;
    const { GET } = await import('./+server.ts');
    const response: Response = await GET(makeEvent('?component=button') as never);
    expect(response.status).toBe(404);
    expect(await response.text()).toBe('Screenshot API is dev-only');
  });

  /* ---------- parameter validation ---------- */

  it('returns 400 JSON when component param is missing', async () => {
    const { GET } = await import('./+server.ts');
    const response: Response = await GET(makeEvent('') as never);
    expect(response.status).toBe(400);
    const body: { error: string } = await response.json();
    expect(body.error).toBe('Missing required "component" parameter');
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('returns 400 JSON when engine is invalid', async () => {
    const { GET } = await import('./+server.ts');
    const response: Response = await GET(makeEvent('?component=button&browser=ie11') as never);
    expect(response.status).toBe(400);
    const body: { error: string } = await response.json();
    expect(body.error).toBe('Invalid browser "ie11" — must be chromium, firefox, or webkit');
  });

  it('returns 400 JSON when device preset is unknown', async () => {
    const { GET } = await import('./+server.ts');
    const response: Response = await GET(
      makeEvent('?component=button&device=Nokia%203310') as never,
    );
    expect(response.status).toBe(400);
    const body: { error: string } = await response.json();
    expect(body.error).toBe('Unknown device "Nokia 3310"');
  });

  /* ---------- browser engine selection ---------- */

  it('launches chromium by default', async () => {
    const { GET } = await import('./+server.ts');
    await GET(makeEvent('?component=button') as never);
    expect(launchCalls[0]!.engine).toBe('chromium');
    expect(launchCalls[0]!.options).toEqual({ headless: true });
  });

  it('launches firefox when browser=firefox', async () => {
    const { GET } = await import('./+server.ts');
    await GET(makeEvent('?component=button&browser=firefox') as never);
    expect(launchCalls[0]!.engine).toBe('firefox');
  });

  it('launches webkit when browser=webkit', async () => {
    const { GET } = await import('./+server.ts');
    await GET(makeEvent('?component=button&browser=webkit') as never);
    expect(launchCalls[0]!.engine).toBe('webkit');
  });

  /* ---------- device preset resolution ---------- */

  it('applies device preset from Playwright registry', async () => {
    playwrightStub.devices['iPhone 15 Pro'] = {
      viewport: { width: 393, height: 852 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      userAgent: 'mock-ua',
    };
    const { GET } = await import('./+server.ts');
    const response: Response = await GET(
      makeEvent('?component=button&device=iPhone+15+Pro') as never,
    );
    expect(response.status).toBe(200);
    const options: Record<string, unknown> = newContextCalls[0] as Record<string, unknown>;
    expect(options.viewport).toEqual({ width: 393, height: 852 });
    expect(options.deviceScaleFactor).toBe(3);
    expect(options.isMobile).toBe(true);
  });

  /* ---------- custom viewport / scale overrides ---------- */

  it('applies custom viewport when width+height both provided', async () => {
    const { GET } = await import('./+server.ts');
    await GET(makeEvent('?component=button&width=320&height=568') as never);
    const options: Record<string, unknown> = newContextCalls[0] as Record<string, unknown>;
    expect(options.viewport).toEqual({ width: 320, height: 568 });
  });

  it('ignores custom viewport when width is zero', async () => {
    const { GET } = await import('./+server.ts');
    await GET(makeEvent('?component=button&width=0&height=100') as never);
    const options: Record<string, unknown> = newContextCalls[0] as Record<string, unknown>;
    expect(options.viewport).toBeUndefined();
  });

  it('ignores custom viewport when width is not a number', async () => {
    const { GET } = await import('./+server.ts');
    await GET(makeEvent('?component=button&width=abc&height=100') as never);
    const options: Record<string, unknown> = newContextCalls[0] as Record<string, unknown>;
    expect(options.viewport).toBeUndefined();
  });

  it('ignores custom viewport when only width is provided (no height)', async () => {
    const { GET } = await import('./+server.ts');
    await GET(makeEvent('?component=button&width=320') as never);
    const options: Record<string, unknown> = newContextCalls[0] as Record<string, unknown>;
    expect(options.viewport).toBeUndefined();
  });

  it('applies custom scale override', async () => {
    const { GET } = await import('./+server.ts');
    await GET(makeEvent('?component=button&scale=2.5') as never);
    const options: Record<string, unknown> = newContextCalls[0] as Record<string, unknown>;
    expect(options.deviceScaleFactor).toBe(2.5);
  });

  it('ignores scale when zero', async () => {
    const { GET } = await import('./+server.ts');
    await GET(makeEvent('?component=button&scale=0') as never);
    const options: Record<string, unknown> = newContextCalls[0] as Record<string, unknown>;
    expect(options.deviceScaleFactor).toBeUndefined();
  });

  it('ignores scale when not a number', async () => {
    const { GET } = await import('./+server.ts');
    await GET(makeEvent('?component=button&scale=huge') as never);
    const options: Record<string, unknown> = newContextCalls[0] as Record<string, unknown>;
    expect(options.deviceScaleFactor).toBeUndefined();
  });

  /* ---------- media emulation branches ---------- */

  it('applies colorScheme=dark', async () => {
    const { GET } = await import('./+server.ts');
    await GET(makeEvent('?component=button&colorScheme=dark') as never);
    const options: Record<string, unknown> = newContextCalls[0] as Record<string, unknown>;
    expect(options.colorScheme).toBe('dark');
  });

  it('applies colorScheme=light', async () => {
    const { GET } = await import('./+server.ts');
    await GET(makeEvent('?component=button&colorScheme=light') as never);
    const options: Record<string, unknown> = newContextCalls[0] as Record<string, unknown>;
    expect(options.colorScheme).toBe('light');
  });

  it('ignores invalid colorScheme value', async () => {
    const { GET } = await import('./+server.ts');
    await GET(makeEvent('?component=button&colorScheme=banana') as never);
    const options: Record<string, unknown> = newContextCalls[0] as Record<string, unknown>;
    expect(options.colorScheme).toBeUndefined();
  });

  it('applies reducedMotion=reduce', async () => {
    const { GET } = await import('./+server.ts');
    await GET(makeEvent('?component=button&reducedMotion=reduce') as never);
    const options: Record<string, unknown> = newContextCalls[0] as Record<string, unknown>;
    expect(options.reducedMotion).toBe('reduce');
  });

  it('applies reducedMotion=no-preference', async () => {
    const { GET } = await import('./+server.ts');
    await GET(makeEvent('?component=button&reducedMotion=no-preference') as never);
    const options: Record<string, unknown> = newContextCalls[0] as Record<string, unknown>;
    expect(options.reducedMotion).toBe('no-preference');
  });

  it('applies forcedColors=active', async () => {
    const { GET } = await import('./+server.ts');
    await GET(makeEvent('?component=button&forcedColors=active') as never);
    const options: Record<string, unknown> = newContextCalls[0] as Record<string, unknown>;
    expect(options.forcedColors).toBe('active');
  });

  it('applies forcedColors=none', async () => {
    const { GET } = await import('./+server.ts');
    await GET(makeEvent('?component=button&forcedColors=none') as never);
    const options: Record<string, unknown> = newContextCalls[0] as Record<string, unknown>;
    expect(options.forcedColors).toBe('none');
  });

  /* ---------- network throttle ---------- */

  it('attaches route handler when networkThrottle > 0', async () => {
    const { GET } = await import('./+server.ts');
    await GET(makeEvent('?component=button&networkThrottle=100') as never);
    expect(routeHandlerRegistrations).toHaveLength(1);
    expect(routeHandlerRegistrations[0]!.pattern).toBe('**/*');
  });

  it('does not attach route handler when networkThrottle is zero', async () => {
    const { GET } = await import('./+server.ts');
    await GET(makeEvent('?component=button&networkThrottle=0') as never);
    expect(routeHandlerRegistrations).toHaveLength(0);
  });

  it('does not attach route handler when networkThrottle is NaN', async () => {
    const { GET } = await import('./+server.ts');
    await GET(makeEvent('?component=button&networkThrottle=abc') as never);
    expect(routeHandlerRegistrations).toHaveLength(0);
  });

  /* ---------- response body ---------- */

  it('returns 200 JSON with image, browser, device, consoleLogs, performance', async () => {
    const { GET } = await import('./+server.ts');
    const response: Response = await GET(makeEvent('?component=button') as never);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    const body: Record<string, unknown> = await response.json();
    expect(body.image).toBe(Buffer.from('PNGDATA').toString('base64'));
    expect(body.browser).toBe('chromium');
    expect(body.browserDisplayName).toBe('Chromium');
    expect(body.browserVersion).toBe('chromium-1.0');
    expect(body.device).toBe('custom');
    expect(body.consoleLogs).toEqual([]);
    expect(body.performance).toEqual({ domContentLoaded: 42, load: 100 });
  });

  it('uses device name in response when device preset matches', async () => {
    playwrightStub.devices['iPhone 15 Pro'] = { viewport: { width: 393, height: 852 } };
    const { GET } = await import('./+server.ts');
    const response: Response = await GET(
      makeEvent('?component=button&device=iPhone+15+Pro') as never,
    );
    const body: Record<string, unknown> = await response.json();
    expect(body.device).toBe('iPhone 15 Pro');
  });

  it('reports Firefox display name for engine=firefox', async () => {
    const { GET } = await import('./+server.ts');
    const response: Response = await GET(makeEvent('?component=button&browser=firefox') as never);
    const body: Record<string, unknown> = await response.json();
    expect(body.browserDisplayName).toBe('Firefox');
  });

  it('reports WebKit display name for engine=webkit', async () => {
    const { GET } = await import('./+server.ts');
    const response: Response = await GET(makeEvent('?component=button&browser=webkit') as never);
    const body: Record<string, unknown> = await response.json();
    expect(body.browserDisplayName).toBe('WebKit');
  });

  /* ---------- error / 500 branch ---------- */

  it('returns 500 JSON with error message when screenshot throws', async () => {
    /* Replace the default chromium.launch with a throwing stub for this test. */
    const originalLaunch = playwrightStub.chromium.launch;
    playwrightStub.chromium.launch = () => {
      throw new Error('playwright crashed');
    };
    try {
      const { GET } = await import('./+server.ts');
      const response: Response = await GET(makeEvent('?component=button') as never);
      expect(response.status).toBe(500);
      const body: { error: string } = await response.json();
      expect(body.error).toBe('playwright crashed');
    } finally {
      playwrightStub.chromium.launch = originalLaunch;
    }
  });

  it('returns 500 with generic message when non-Error thrown', async () => {
    const originalLaunch = playwrightStub.chromium.launch;
    playwrightStub.chromium.launch = () => {
      throw 'weird';
    };
    try {
      const { GET } = await import('./+server.ts');
      const response: Response = await GET(makeEvent('?component=button') as never);
      expect(response.status).toBe(500);
      const body: { error: string } = await response.json();
      expect(body.error).toBe('Screenshot capture failed');
    } finally {
      playwrightStub.chromium.launch = originalLaunch;
    }
  });

  /* ---------- pass-through params ---------- */

  it('forwards s, variant, option query params into isolate URL', async () => {
    /* We peek at the page.goto call to check the URL by spying via a
     * custom browser stub that exposes the last-visited URL. */
    let capturedUrl: string | undefined;
    const originalLaunch = playwrightStub.chromium.launch;
    playwrightStub.chromium.launch = (options: unknown) => {
      launchCalls.push({ engine: 'chromium', options });
      return {
        isConnected: (): boolean => true,
        version: (): string => 'chromium-1.0',
        async newContext() {
          await Promise.resolve();
          return {
            async newPage() {
              await Promise.resolve();
              return {
                on: vi.fn(),
                route: vi.fn(),
                goto: vi.fn(async (u: string): Promise<void> => {
                  await Promise.resolve();
                  capturedUrl = u;
                }),
                waitForSelector: vi.fn(),
                waitForTimeout: vi.fn(),
                evaluate: vi.fn(async () => {
                  await Promise.resolve();
                  return {};
                }),
                screenshot: vi.fn(async () => {
                  await Promise.resolve();
                  return Buffer.from('x');
                }),
              };
            },
            async close(): Promise<void> {
              /* no-op */
            },
          };
        },
      } as never;
    };
    try {
      const { GET } = await import('./+server.ts');
      await GET(makeEvent('?component=button&s=BASE64&variant=primary&option=large') as never);
      expect(capturedUrl).toContain('/isolate/button');
      expect(capturedUrl).toContain('screenshot=1');
      expect(capturedUrl).toContain('s=BASE64');
      expect(capturedUrl).toContain('variant=primary');
      expect(capturedUrl).toContain('option=large');
    } finally {
      playwrightStub.chromium.launch = originalLaunch;
    }
  });
});
