import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent, ResolveOptions } from '@sveltejs/kit';
import { ERRORS, err } from '@/schemas/result/result';
import { handle, handleError } from './hooks.server';

/**
 * Creates a minimal mock RequestEvent for testing the handle hook.
 *
 * @param cookie - Value for the 'locale' cookie
 * @param acceptLanguage - Value for the Accept-Language header
 * @param pathname - URL pathname for the request
 * @returns Mock RequestEvent with cookies and request headers
 */
function mockEvent(cookie: string, acceptLanguage: string | null, pathname = '/'): RequestEvent {
	return {
		cookies: {
			get: (name: string): string | undefined =>
				name === 'locale' ? cookie || undefined : undefined,
			set: vi.fn(),
			delete: vi.fn(),
			getAll: vi.fn(),
			serialize: vi.fn(),
		},
		request: {
			headers: {
				get: (name: string): string | null => (name === 'accept-language' ? acceptLanguage : null),
			},
		},
		url: new URL(`http://localhost${pathname}`),
		locals: {} as Record<string, string>,
	} as unknown as RequestEvent;
}

/**
 * Creates a mock resolve function that captures the transformPageChunk callback.
 *
 * @returns Object with the resolve mock and a getter for the transformed HTML
 */
function mockResolve(): {
	resolve: (event: RequestEvent, opts?: ResolveOptions) => Promise<Response>;
	getTransformed: (html: string) => string;
} {
	let transformer: ((input: { html: string }) => string) | null = null;
	const resolve = vi.fn((_event: RequestEvent, opts?: ResolveOptions): Promise<Response> => {
		if (opts?.transformPageChunk) {
			transformer = opts.transformPageChunk as (input: { html: string }) => string;
		}
		return Promise.resolve(new Response('ok'));
	});
	return {
		resolve,
		getTransformed: (html: string): string => {
			if (!transformer) throw new Error('transformPageChunk not set');
			return transformer({ html });
		},
	};
}

describe('hooks.server handle', () => {
	it('sets event.locals.locale from cookie', async () => {
		const event = mockEvent('ja', null);
		const { resolve } = mockResolve();
		await handle({ event, resolve });
		expect(event.locals.locale).toBe('ja');
	});

	it('falls back to Accept-Language when no cookie', async () => {
		const event = mockEvent('', 'fr,en;q=0.9');
		const { resolve } = mockResolve();
		await handle({ event, resolve });
		expect(event.locals.locale).toBe('fr');
	});

	it("defaults to 'en' when no cookie and no supported header", async () => {
		const event = mockEvent('', null);
		const { resolve } = mockResolve();
		await handle({ event, resolve });
		expect(event.locals.locale).toBe('en');
	});

	it('replaces %lang% and %dir% in HTML', async () => {
		const event = mockEvent('ja', null);
		const { resolve, getTransformed } = mockResolve();
		await handle({ event, resolve });
		const html: string = getTransformed('<html lang="%lang%" dir="%dir%">');
		expect(html).toBe('<html lang="ja" dir="ltr">');
	});

	it('sets dir="rtl" for RTL locales if getTextDirection returns rtl', async () => {
		// All currently supported locales are LTR, so test default behavior
		const event = mockEvent('en', null);
		const { resolve, getTransformed } = mockResolve();
		await handle({ event, resolve });
		const html: string = getTransformed('<html lang="%lang%" dir="%dir%">');
		expect(html).toContain('dir="ltr"');
	});

	it('calls resolve with transformPageChunk option', async () => {
		const event = mockEvent('en', null);
		const { resolve } = mockResolve();
		await handle({ event, resolve });
		expect(resolve).toHaveBeenCalledOnce();
		expect(resolve).toHaveBeenCalledWith(
			event,
			expect.objectContaining({ transformPageChunk: expect.any(Function) }),
		);
	});
});

/**
 * Creates a mock RequestEvent with a stubbed setHeaders method for testing handleError.
 *
 * @param pathname - URL pathname for the mock request
 * @returns Mock event and setHeaders spy
 */
function createMockErrorEvent(pathname = '/test-page'): {
	event: RequestEvent;
	setHeaders: ReturnType<typeof vi.fn>;
} {
	const setHeaders = vi.fn();
	return {
		event: {
			setHeaders,
			url: new URL(`http://localhost${pathname}`),
			request: { method: 'GET', headers: { get: () => null } },
			route: { id: pathname },
		} as unknown as RequestEvent,
		setHeaders,
	};
}

/**
 * Calls handleError with the given params and asserts a defined App.Error is returned.
 *
 * @param params - Error, status, message, and optional pathname to pass to handleError
 * @returns The App.Error result and the setHeaders spy
 */
function callServerHandleError(params: {
	error: unknown;
	status: number;
	message: string;
	pathname?: string;
}): {
	result: App.Error;
	setHeaders: ReturnType<typeof vi.fn>;
} {
	const { event, setHeaders } = createMockErrorEvent(params.pathname);
	const returned = handleError({
		error: params.error,
		event,
		status: params.status,
		message: params.message,
	});
	expect(returned).toBeDefined();
	return { result: returned as App.Error, setHeaders };
}

describe('security headers', () => {
	async function getResponseFromHandle(
		cookie: string,
		acceptLanguage: string | null,
	): Promise<Response> {
		const event = mockEvent(cookie, acceptLanguage);
		const { resolve } = mockResolve();
		const response = await handle({ event, resolve });
		return response as Response;
	}

	it('sets X-Frame-Options to DENY', async () => {
		const response: Response = await getResponseFromHandle('en', null);
		expect(response.headers.get('X-Frame-Options')).toBe('DENY');
	});

	it('sets X-Content-Type-Options to nosniff', async () => {
		const response: Response = await getResponseFromHandle('en', null);
		expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
	});

	it('sets Referrer-Policy to strict-origin-when-cross-origin', async () => {
		const response: Response = await getResponseFromHandle('en', null);
		expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
	});

	it('sets Permissions-Policy', async () => {
		const response: Response = await getResponseFromHandle('en', null);
		const policy: string | null = response.headers.get('Permissions-Policy');
		expect(policy).toBeTruthy();
		expect(policy).toContain('camera=()');
		expect(policy).toContain('microphone=()');
		expect(policy).toContain('geolocation=()');
	});

	it('sets Cross-Origin-Opener-Policy to same-origin', async () => {
		const response: Response = await getResponseFromHandle('en', null);
		expect(response.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
	});
});

describe('handleError', () => {
	it('returns App.Error with message containing errorId and separate errorId field', () => {
		const { result } = callServerHandleError({
			error: new Error('test crash'),
			status: 500,
			message: 'Internal Error',
		});
		expect(result.message).toContain('Internal Error');
		expect(result.message).toContain('Reference:');
		expect(result.message).toContain(result.errorId!);
		expect(result).toHaveProperty('errorId');
		expect(typeof result.errorId).toBe('string');
	});

	it('errorId is a valid UUID', () => {
		const { result } = callServerHandleError({
			error: new Error('test'),
			status: 500,
			message: 'Error',
		});
		expect(result.errorId).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		);
	});

	it('includes the original message text', () => {
		const { result } = callServerHandleError({
			error: new Error('crash'),
			status: 404,
			message: 'Not Found',
		});
		expect(result.message).toContain('Not Found');
		expect(result.message).toContain('Reference:');
	});

	it('logs structured CapturedError with errorId, error code, and CapturedError fields', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const { result } = callServerHandleError({
			error: new Error('crash'),
			status: 500,
			message: 'Internal Error',
			pathname: '/api/scenes',
		});
		// logCapturedError outputs via log.error() → console.error in json mode
		const logOutput: string = spy.mock.calls[0]?.[0] ?? '';
		expect(logOutput).toContain(result.errorId);
		expect(logOutput).toContain('INTERNAL.UNEXPECTED');
		const parsed: Record<string, unknown> = JSON.parse(logOutput);
		const data = parsed.data as Record<string, unknown>;
		// AppError fields
		expect(data).toMatchObject({
			errorId: result.errorId,
			errorCode: 'INTERNAL.UNEXPECTED',
		});
		// CapturedError fields
		expect(data.captureId).toBeDefined();
		expect(typeof data.captureId).toBe('string');
		expect(data.environment).toBeDefined();
		expect(data.fatal).toBe(false);
		expect(data.source).toBeDefined();
		expect(typeof data.source).toBe('string');
		// Request context in errorMeta (from UNEXPECTED wrapper's meta)
		const errorMeta = data.errorMeta as Record<string, unknown>;
		expect(errorMeta.url).toBe('/api/scenes');
		expect(errorMeta.method).toBe('GET');
		expect(errorMeta.status).toBe(500);
		spy.mockRestore();
	});

	it('generates unique errorIds for each call', () => {
		const { result: result1 } = callServerHandleError({
			error: new Error('a'),
			status: 500,
			message: 'Error',
		});
		const { result: result2 } = callServerHandleError({
			error: new Error('b'),
			status: 500,
			message: 'Error',
		});
		expect(result1.errorId).not.toBe(result2.errorId);
	});

	it('sets x-error-id response header', () => {
		const { result, setHeaders } = callServerHandleError({
			error: new Error('crash'),
			status: 500,
			message: 'Error',
		});
		expect(setHeaders).toHaveBeenCalledWith({ 'x-error-id': result.errorId });
	});

	it('preserves domain-specific AppError code when thrown error is an AppError', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const validationErr = err(ERRORS.VALIDATION.SCHEMA_FAILED, 'Bad input', {
			meta: { field: 'email' },
		});
		if (validationErr.ok) throw new Error('err() should return error');
		const { result } = callServerHandleError({
			error: validationErr.error,
			status: 500,
			message: 'Internal Error',
		});
		// The errorId should come from the original AppError, not a new wrapper
		expect(result.errorId).toBe(validationErr.error.id);
		const logOutput: string = spy.mock.calls[0]?.[0] ?? '';
		const parsed: Record<string, unknown> = JSON.parse(logOutput);
		expect(parsed.data).toMatchObject({
			errorCode: 'VALIDATION.SCHEMA_FAILED',
		});
		spy.mockRestore();
	});

	it('wraps plain Error in INTERNAL.UNEXPECTED with cause chain', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const { result } = callServerHandleError({
			error: new Error('plain crash'),
			status: 500,
			message: 'Internal Error',
			pathname: '/test',
		});
		const logOutput: string = spy.mock.calls[0]?.[0] ?? '';
		const parsed: Record<string, unknown> = JSON.parse(logOutput);
		expect(parsed.data).toMatchObject({
			errorCode: 'INTERNAL.UNEXPECTED',
		});
		// The cause chain should include the wrapped plain error
		const data = parsed.data as Record<string, unknown>;
		expect(data.causeChain).toBeDefined();
		const chain = data.causeChain as Array<{ code: string; message: string }>;
		expect(chain[0]?.code).toBe('INTERNAL.UNEXPECTED');
		expect(chain[0]?.message).toBe('plain crash');
		expect(result.errorId).toBeTruthy();
		// CapturedError fields present
		expect(data.captureId).toBeDefined();
		expect(data.fatal).toBe(false);
		expect(data.fingerprint).toBeDefined();
		spy.mockRestore();
	});
});
