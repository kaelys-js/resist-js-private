/**
 * Tests for the compile-standalone API endpoint.
 *
 * Runs in storylyne-editor-server project (node env).
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { POST } from './+server';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/lens/compile-standalone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/lens/compile-standalone', () => {
  it('returns 400 for invalid JSON body', async () => {
    const response: Response = await POST({
      request: new Request('http://localhost', {
        method: 'POST',
        body: 'not json{{{',
      }),
    } as never);
    expect(response.status).toBe(400);
  });

  it('returns 400 for missing componentDir', async () => {
    const response: Response = await POST({
      request: makeRequest({ props: {} }),
    } as never);
    expect(response.status).toBe(400);
  });

  it('returns 404 for nonexistent component directory', async () => {
    const response: Response = await POST({
      request: makeRequest({ componentDir: 'nonexistent-component-xyz-123' }),
    } as never);
    expect(response.status).toBe(404);
  });

  it('returns 200 with HTML for valid component', async () => {
    const response: Response = await POST({
      request: makeRequest({ componentDir: 'button', props: { variant: 'default' } }),
    } as never);
    expect(response.status).toBe(200);

    const html: string = await response.text();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('lens-standalone-root');
  }, 30_000);

  it('response has text/html content type and attachment disposition', async () => {
    const response: Response = await POST({
      request: makeRequest({ componentDir: 'button' }),
    } as never);
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(response.headers.get('Content-Disposition')).toContain('button-standalone.html');
  }, 30_000);
});
