/**
 * Tests for the robots.txt route.
 *
 * Runs in storylyne-editor-server project (node env).
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { GET } from './+server';

describe('GET /robots.txt', () => {
  it('returns 200 with text/plain content type', () => {
    const response: Response = GET({} as never);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
  });

  it('body contains User-agent and Disallow directives', async () => {
    const response: Response = GET({} as never);
    const body: string = await response.text();
    expect(body).toContain('User-agent: *');
    expect(body).toContain('Disallow: /api/');
    expect(body).toContain('Allow: /');
  });

  it('blocks AI training crawlers and allows AI search assistants', async () => {
    const response: Response = GET({} as never);
    const body: string = await response.text();

    // Training crawlers blocked
    expect(body).toContain('User-agent: GPTBot\nDisallow: /');
    expect(body).toContain('User-agent: anthropic-ai\nDisallow: /');
    expect(body).toContain('User-agent: CCBot\nDisallow: /');

    // Search assistants allowed
    expect(body).toContain('User-agent: ChatGPT-User\nAllow: /');
    expect(body).toContain('User-agent: Claude-Web\nAllow: /');
  });
});
