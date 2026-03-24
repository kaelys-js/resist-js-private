/**
 * Tests for the RFC 9116 security.txt route.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { GET } from './+server';

describe('GET /.well-known/security.txt', () => {
  it('returns 200 with text/plain content type', () => {
    const response: Response = GET({
      url: new URL('http://localhost/.well-known/security.txt'),
    } as never);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
  });

  it('body contains all RFC 9116 fields', async () => {
    const response: Response = GET({
      url: new URL('http://localhost/.well-known/security.txt'),
    } as never);
    const body: string = await response.text();
    expect(body).toContain('Contact:');
    expect(body).toContain('Expires:');
    expect(body).toContain('Preferred-Languages:');
    expect(body).toContain('Canonical:');
    expect(body).toContain('Policy:');
  });

  it('Expires date is approximately 1 year from now', async () => {
    const response: Response = GET({
      url: new URL('http://localhost/.well-known/security.txt'),
    } as never);
    const body: string = await response.text();
    const expiresLine: string | undefined = body.split('\n').find((l) => l.startsWith('Expires:'));
    expect(expiresLine).toBeDefined();

    const expiresDate: Date = new Date(expiresLine!.replace('Expires: ', ''));
    const oneYearFromNow: number = Date.now() + 365 * 24 * 60 * 60 * 1000;
    // Should be within 1 day of 1 year from now
    expect(Math.abs(expiresDate.getTime() - oneYearFromNow)).toBeLessThan(86_400_000);
  });
});
