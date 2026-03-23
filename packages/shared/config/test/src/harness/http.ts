/**
 * HTTP Request/Response factories for testing Cloudflare Workers and API handlers.
 *
 * Cloudflare Workers use the standard Web `Request`/`Response` API (not Node.js
 * `req`/`res`). These factories eliminate the boilerplate of constructing
 * `Request` and `Response` objects in tests.
 *
 * Works in any environment that supports the Web `Request`/`Response` API
 * (Workers, Node.js 18+, jsdom with polyfills).
 *
 * @example
 * ```typescript
 * import { describe, it, expect } from 'vitest';
 * import { createRequest, createResponse, parseJson } from '@/test-presets/harness/http';
 *
 * describe('user API handler', () => {
 *   it('creates a user', async () => {
 *     const req = createRequest('POST', '/api/users', {
 *       body: { name: 'Alice', email: 'alice@example.com' },
 *       headers: { 'Authorization': 'Bearer test-token' },
 *     });
 *
 *     const res = await handleRequest(req, mockEnv);
 *     expect(res.status).toBe(201);
 *
 *     const data = await parseJson<{ id: number; name: string }>(res);
 *     expect(data.name).toBe('Alice');
 *   });
 *
 *   it('rejects unauthenticated requests', async () => {
 *     const req = createRequest('GET', '/api/users/me');
 *     const res = await handleRequest(req, mockEnv);
 *     expect(res.status).toBe(401);
 *   });
 * });
 * ```
 *
 * @module
 */

/**
 * Options for constructing a test `Request`.
 */
export type CreateRequestOptions = {
  /**
   * Request body. Objects are automatically JSON-serialized with the
   * `Content-Type: application/json` header. Strings are sent as-is.
   * `null`/`undefined` means no body (appropriate for GET/HEAD).
   *
   * @example
   * ```typescript
   * // JSON body (auto-serialized):
   * createRequest('POST', '/api/data', { body: { key: 'value' } });
   *
   * // String body:
   * createRequest('POST', '/api/webhook', { body: 'raw payload' });
   *
   * // No body:
   * createRequest('GET', '/api/status');
   * ```
   */
  body?: unknown;

  /**
   * Additional request headers. Merged with auto-generated headers
   * (e.g., `Content-Type` for JSON bodies). Explicit headers take precedence.
   *
   * @example
   * ```typescript
   * createRequest('GET', '/api/users', {
   *   headers: {
   *     'Authorization': 'Bearer token',
   *     'X-Request-ID': 'test-123',
   *   },
   * });
   * ```
   */
  headers?: Record<string, string>;

  /**
   * Base URL prepended to the path. Default: `'http://localhost'`.
   *
   * @example
   * ```typescript
   * createRequest('GET', '/api/users', { baseUrl: 'https://api.example.com' });
   * // URL: https://api.example.com/api/users
   * ```
   */
  baseUrl?: string;
};

/**
 * Create a `Request` object for testing Workers/API handlers.
 *
 * Handles common patterns automatically:
 * - Objects passed as `body` are JSON-serialized with `Content-Type: application/json`
 * - Relative URLs are resolved against `baseUrl` (default: `http://localhost`)
 * - Full URLs are used as-is
 *
 * @param method - HTTP method (GET, POST, PUT, DELETE, PATCH, etc.)
 * @param url - URL path (e.g., '/api/users') or full URL
 * @param options - Body, headers, and base URL configuration
 * @returns A standard Web `Request` object
 *
 * @example
 * ```typescript
 * import { createRequest } from '@/test-presets/harness/http';
 *
 * // Simple GET:
 * const get = createRequest('GET', '/api/health');
 *
 * // POST with JSON body:
 * const post = createRequest('POST', '/api/users', {
 *   body: { name: 'Bob' },
 *   headers: { 'Authorization': 'Bearer token' },
 * });
 *
 * // PUT with custom base URL:
 * const put = createRequest('PUT', '/api/users/1', {
 *   body: { name: 'Updated' },
 *   baseUrl: 'https://staging.api.com',
 * });
 *
 * // DELETE without body:
 * const del = createRequest('DELETE', '/api/users/1');
 * ```
 */
export function createRequest(
  method: string,
  url: string,
  options: CreateRequestOptions = {},
): Request {
  const { body, headers = {}, baseUrl = 'http://localhost' } = options;

  // Resolve URL: use as-is if it's already absolute, otherwise prepend baseUrl
  const fullUrl =
    url.startsWith('http://') || url.startsWith('https://') ? url : `${baseUrl}${url}`;

  const init: RequestInit = {
    method: method.toUpperCase(),
    headers: { ...headers },
  };

  if (body !== undefined && body !== null) {
    if (typeof body === 'string') {
      init.body = body;
    } else {
      init.body = JSON.stringify(body);
      // Set Content-Type if not explicitly provided
      const headerRecord = init.headers as Record<string, string>;
      if (!headerRecord['Content-Type'] && !headerRecord['content-type']) {
        headerRecord['Content-Type'] = 'application/json';
      }
    }
  }

  return new Request(fullUrl, init);
}

/**
 * Options for constructing a test `Response`.
 */
export type CreateResponseOptions = {
  /**
   * HTTP status code. Default: `200`.
   */
  status?: number;

  /**
   * Response headers. Merged with auto-generated headers.
   */
  headers?: Record<string, string>;
};

/**
 * Create a `Response` object for testing response handling code.
 *
 * Objects are automatically JSON-serialized with the `Content-Type: application/json`
 * header. Strings are sent as-is. `null`/`undefined` means no body.
 *
 * @param body - Response body. Objects are JSON-serialized; strings sent as-is.
 * @param options - Status code and header configuration
 * @returns A standard Web `Response` object
 *
 * @example
 * ```typescript
 * import { createResponse } from '@/test-presets/harness/http';
 *
 * // JSON response:
 * const ok = createResponse({ id: 1, name: 'Alice' }, { status: 201 });
 *
 * // Error response:
 * const err = createResponse(
 *   { error: 'Not Found', code: 'USER_NOT_FOUND' },
 *   { status: 404 },
 * );
 *
 * // No body:
 * const noContent = createResponse(null, { status: 204 });
 *
 * // Custom headers:
 * const cached = createResponse({ data: [] }, {
 *   headers: { 'Cache-Control': 'max-age=3600' },
 * });
 * ```
 */
export function createResponse(body?: unknown, options: CreateResponseOptions = {}): Response {
  const { status = 200, headers = {} } = options;

  let responseBody: string | null = null;
  const responseHeaders: Record<string, string> = { ...headers };

  if (body !== undefined && body !== null) {
    if (typeof body === 'string') {
      responseBody = body;
    } else {
      responseBody = JSON.stringify(body);
      if (!responseHeaders['Content-Type'] && !responseHeaders['content-type']) {
        responseHeaders['Content-Type'] = 'application/json';
      }
    }
  }

  return new Response(responseBody, {
    status,
    headers: responseHeaders,
  });
}

/**
 * Parse a `Response` body as JSON with a type assertion.
 *
 * Convenience wrapper that avoids writing `(await res.json()) as T` in every test.
 *
 * @typeParam T - Expected shape of the JSON response. Default: `unknown`.
 * @param response - The response to parse
 * @returns The parsed JSON body, cast to type `T`
 * @throws If the response body is not valid JSON
 *
 * @example
 * ```typescript
 * import { createRequest, parseJson } from '@/test-presets/harness/http';
 *
 * interface User { id: number; name: string }
 *
 * const req = createRequest('GET', '/api/users/1');
 * const res = await handler(req, env);
 * const user = await parseJson<User>(res);
 * expect(user.name).toBe('Alice');
 * ```
 */
export async function parseJson<T = unknown>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
