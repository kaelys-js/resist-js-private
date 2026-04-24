/**
 * Tests for HTTP Request/Response factory utilities.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { createRequest, createResponse, parseJson } from './http';

describe('http', () => {
  describe('createRequest', () => {
    it('builds a GET request against default baseUrl', () => {
      const req: Request = createRequest('GET', '/api/health');
      expect(req.method).toBe('GET');
      expect(req.url).toBe('http://localhost/api/health');
    });

    it('uppercases the method', () => {
      const req: Request = createRequest('post', '/api/data', { body: 'x' });
      expect(req.method).toBe('POST');
    });

    it('prepends custom baseUrl for relative paths', () => {
      const req: Request = createRequest('GET', '/api/users', {
        baseUrl: 'https://api.example.com',
      });
      expect(req.url).toBe('https://api.example.com/api/users');
    });

    it('uses absolute http:// URL as-is', () => {
      const req: Request = createRequest('GET', 'http://other.host/path');
      expect(req.url).toBe('http://other.host/path');
    });

    it('uses absolute https:// URL as-is', () => {
      const req: Request = createRequest('GET', 'https://other.host/path');
      expect(req.url).toBe('https://other.host/path');
    });

    it('serializes object body as JSON and sets Content-Type', async () => {
      const req: Request = createRequest('POST', '/api/data', {
        body: { key: 'value' },
      });
      expect(req.headers.get('content-type')).toBe('application/json');
      const parsed: unknown = await req.json();
      expect(parsed).toEqual({ key: 'value' });
    });

    it('preserves caller-provided Content-Type (exact casing)', async () => {
      const req: Request = createRequest('POST', '/api/data', {
        body: { a: 1 },
        headers: { 'Content-Type': 'application/vnd.custom+json' },
      });
      expect(req.headers.get('content-type')).toBe('application/vnd.custom+json');
    });

    it('preserves caller-provided content-type (lowercase)', async () => {
      const req: Request = createRequest('POST', '/api/data', {
        body: { a: 1 },
        headers: { 'content-type': 'application/vnd.lc+json' },
      });
      expect(req.headers.get('content-type')).toBe('application/vnd.lc+json');
    });

    it('passes string body through as-is; createRequest itself sets no Content-Type', async () => {
      const req: Request = createRequest('POST', '/api/webhook', {
        body: 'raw payload',
      });
      /* createRequest does not inject application/json for string bodies.
       * The platform Request constructor may default to text/plain which is fine. */
      expect(req.headers.get('content-type')).not.toBe('application/json');
      expect(await req.text()).toBe('raw payload');
    });

    it('sends no body for GET (body undefined)', () => {
      const req: Request = createRequest('GET', '/api/x');
      expect(req.body).toBeNull();
    });

    it('sends no body when body is null', () => {
      const req: Request = createRequest('POST', '/api/x', { body: null });
      expect(req.body).toBeNull();
    });

    it('merges additional headers with JSON auto-header', () => {
      const req: Request = createRequest('POST', '/api/x', {
        body: { a: 1 },
        headers: { Authorization: 'Bearer t' },
      });
      expect(req.headers.get('authorization')).toBe('Bearer t');
      expect(req.headers.get('content-type')).toBe('application/json');
    });
  });

  describe('createResponse', () => {
    it('defaults to status 200 with no body', async () => {
      const res: Response = createResponse();
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('');
    });

    it('accepts a custom status code', () => {
      const res: Response = createResponse({ ok: true }, { status: 201 });
      expect(res.status).toBe(201);
    });

    it('serializes object body as JSON and sets Content-Type', async () => {
      const res: Response = createResponse({ id: 1, name: 'Alice' });
      expect(res.headers.get('content-type')).toBe('application/json');
      const data: unknown = await res.json();
      expect(data).toEqual({ id: 1, name: 'Alice' });
    });

    it('preserves caller-provided Content-Type (exact casing)', () => {
      const res: Response = createResponse(
        { a: 1 },
        { headers: { 'Content-Type': 'application/problem+json' } },
      );
      expect(res.headers.get('content-type')).toBe('application/problem+json');
    });

    it('preserves caller-provided content-type (lowercase)', () => {
      const res: Response = createResponse(
        { a: 1 },
        { headers: { 'content-type': 'application/ld+json' } },
      );
      expect(res.headers.get('content-type')).toBe('application/ld+json');
    });

    it('passes string body through as-is; createResponse itself sets no Content-Type', async () => {
      const res: Response = createResponse('raw', { status: 200 });
      expect(res.headers.get('content-type')).not.toBe('application/json');
      expect(await res.text()).toBe('raw');
    });

    it('sends no body when body is null', async () => {
      const res: Response = createResponse(null, { status: 204 });
      expect(res.status).toBe(204);
      expect(await res.text()).toBe('');
    });

    it('sends no body when body is undefined', async () => {
      const res: Response = createResponse(undefined, { status: 202 });
      expect(res.status).toBe(202);
      expect(await res.text()).toBe('');
    });

    it('merges custom headers with JSON auto-header', () => {
      const res: Response = createResponse({ a: 1 }, { headers: { 'Cache-Control': 'no-store' } });
      expect(res.headers.get('cache-control')).toBe('no-store');
      expect(res.headers.get('content-type')).toBe('application/json');
    });
  });

  describe('parseJson', () => {
    it('parses a JSON response body', async () => {
      const res: Response = createResponse({ hello: 'world' });
      const data: { hello: string } = await parseJson<{ hello: string }>(res);
      expect(data).toEqual({ hello: 'world' });
    });

    it('returns unknown when no type parameter is provided', async () => {
      const res: Response = createResponse({ n: 42 });
      const data: unknown = await parseJson(res);
      expect(data).toEqual({ n: 42 });
    });
  });
});
