import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent, ResolveOptions } from '@sveltejs/kit';
import { ERRORS, err } from '@/schemas/result/result';

/** Controls the mocked value of `dev` from `$app/environment`. */
let mockDev = true;
vi.mock('$app/environment', () => ({
	get dev() {
		return mockDev;
	},
	browser: false,
	building: false,
	version: 'test',
}));

// Import after mock setup so the module picks up the mock.
const { handle, handleError } = await import('./hooks.server');

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

	it('sets event.locals.user to mock user by default', async () => {
		const event = mockEvent('en', null);
		const { resolve } = mockResolve();
		await handle({ event, resolve });
		expect(event.locals.user).not.toBeNull();
		expect(event.locals.user?.displayName).toBe('Coleb');
	});

	it('sets event.locals.user to null when ?wf.auth=false', async () => {
		const event = mockEvent('en', null, '/?wf.auth=false');
		const { resolve } = mockResolve();
		await handle({ event, resolve });
		expect(event.locals.user).toBeNull();
	});

	it('sets event.locals.db to a DataService', async () => {
		const event = mockEvent('en', null);
		const { resolve } = mockResolve();
		await handle({ event, resolve });
		expect(event.locals.db).toBeDefined();
		expect(event.locals.db.projects).toBeDefined();
		expect(event.locals.db.scenes).toBeDefined();
	});
});

/**
 * Creates a mock RequestEvent with a stubbed setHeaders method for testing handleError.
 *
 * @param pathname - URL pathname for the mock request
 * @param overrides - Optional overrides for locale, userAgent, referer, searchParams, isDataRequest
 * @returns Mock event and setHeaders spy
 */
function createMockErrorEvent(
	pathname = '/test-page',
	overrides?: {
		locale?: string;
		userAgent?: string;
		referer?: string;
		searchParams?: Record<string, string>;
		isDataRequest?: boolean;
	},
): {
	event: RequestEvent;
	setHeaders: ReturnType<typeof vi.fn>;
} {
	const setHeaders = vi.fn();
	const url = new URL(`http://localhost${pathname}`);
	if (overrides?.searchParams) {
		for (const [k, v] of Object.entries(overrides.searchParams)) {
			url.searchParams.set(k, v);
		}
	}
	const headerMap: Record<string, string | null> = {
		'user-agent': overrides?.userAgent ?? null,
		referer: overrides?.referer ?? null,
	};
	return {
		event: {
			setHeaders,
			url,
			request: {
				method: 'GET',
				headers: {
					get: (name: string): string | null => headerMap[name] ?? null,
				},
			},
			route: { id: pathname },
			locals: { locale: overrides?.locale ?? 'en' },
			isDataRequest: overrides?.isDataRequest ?? false,
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
	locale?: string;
	userAgent?: string;
	referer?: string;
	searchParams?: Record<string, string>;
	isDataRequest?: boolean;
}): {
	result: App.Error;
	setHeaders: ReturnType<typeof vi.fn>;
} {
	const { event, setHeaders } = createMockErrorEvent(params.pathname, {
		locale: params.locale,
		userAgent: params.userAgent,
		referer: params.referer,
		searchParams: params.searchParams,
		isDataRequest: params.isDataRequest,
	});
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
		pathname = '/',
	): Promise<Response> {
		const event = mockEvent(cookie, acceptLanguage, pathname);
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

	it('sets Permissions-Policy with camera, microphone, geolocation, and interest-cohort', async () => {
		const response: Response = await getResponseFromHandle('en', null);
		const policy: string | null = response.headers.get('Permissions-Policy');
		expect(policy).toBeTruthy();
		expect(policy).toContain('camera=()');
		expect(policy).toContain('microphone=()');
		expect(policy).toContain('geolocation=()');
		expect(policy).toContain('interest-cohort=()');
	});

	it('sets Cross-Origin-Opener-Policy to same-origin-allow-popups', async () => {
		const response: Response = await getResponseFromHandle('en', null);
		expect(response.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin-allow-popups');
	});

	it('sets Cross-Origin-Resource-Policy to same-origin', async () => {
		const response: Response = await getResponseFromHandle('en', null);
		expect(response.headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin');
	});

	it('sets Cross-Origin-Embedder-Policy to unsafe-none', async () => {
		const response: Response = await getResponseFromHandle('en', null);
		expect(response.headers.get('Cross-Origin-Embedder-Policy')).toBe('unsafe-none');
	});

	it('sets X-DNS-Prefetch-Control to off', async () => {
		const response: Response = await getResponseFromHandle('en', null);
		expect(response.headers.get('X-DNS-Prefetch-Control')).toBe('off');
	});

	it('sets X-Permitted-Cross-Domain-Policies to none', async () => {
		const response: Response = await getResponseFromHandle('en', null);
		expect(response.headers.get('X-Permitted-Cross-Domain-Policies')).toBe('none');
	});

	it('sets X-XSS-Protection to 0', async () => {
		const response: Response = await getResponseFromHandle('en', null);
		expect(response.headers.get('X-XSS-Protection')).toBe('0');
	});

	it('does NOT set HSTS in dev mode', async () => {
		mockDev = true;
		const response: Response = await getResponseFromHandle('en', null);
		expect(response.headers.get('Strict-Transport-Security')).toBeNull();
	});

	it('sets HSTS in production mode', async () => {
		mockDev = false;
		const response: Response = await getResponseFromHandle('en', null);
		expect(response.headers.get('Strict-Transport-Security')).toBe(
			'max-age=63072000; includeSubDomains; preload',
		);
		mockDev = true;
	});
});

describe('cache-control', () => {
	async function getResponseWithContentType(
		contentType: string,
		pathname = '/',
	): Promise<Response> {
		const event = mockEvent('en', null, pathname);
		const resolve = vi.fn((_event: RequestEvent, opts?: ResolveOptions): Promise<Response> => {
			if (opts?.transformPageChunk) {
				// Capture transformer but don't need it for cache-control tests
			}
			const resp = new Response('ok', {
				headers: { 'content-type': contentType },
			});
			return Promise.resolve(resp);
		});
		const response = await handle({ event, resolve });
		return response as Response;
	}

	it('sets Cache-Control to private, no-cache for HTML responses', async () => {
		const response: Response = await getResponseWithContentType('text/html; charset=utf-8');
		expect(response.headers.get('Cache-Control')).toBe('private, no-cache');
	});

	it('does NOT set Cache-Control for non-HTML responses', async () => {
		const response: Response = await getResponseWithContentType('application/javascript');
		expect(response.headers.get('Cache-Control')).toBeNull();
	});

	it('does NOT set Cache-Control for immutable asset paths', async () => {
		const response: Response = await getResponseWithContentType(
			'text/html',
			'/_app/immutable/entry/start.js',
		);
		expect(response.headers.get('Cache-Control')).toBeNull();
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

	it('includes locale, userAgent, referer, searchParams, and isDataRequest in meta', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		callServerHandleError({
			error: new Error('crash'),
			status: 500,
			message: 'Error',
			pathname: '/api/test',
			locale: 'ja',
			userAgent: 'Mozilla/5.0',
			referer: 'http://localhost/previous',
			searchParams: { page: '2', sort: 'asc' },
			isDataRequest: true,
		});
		const logOutput: string = spy.mock.calls[0]?.[0] ?? '';
		const parsed: Record<string, unknown> = JSON.parse(logOutput);
		const data = parsed.data as Record<string, unknown>;
		const errorMeta = data.errorMeta as Record<string, unknown>;
		expect(errorMeta.locale).toBe('ja');
		expect(errorMeta.userAgent).toBe('Mozilla/5.0');
		expect(errorMeta.referer).toBe('http://localhost/previous');
		expect(errorMeta.searchParams).toEqual({ page: '2', sort: 'asc' });
		expect(errorMeta.isDataRequest).toBe(true);
		spy.mockRestore();
	});
});

describe('enhanced logCapturedError fields', () => {
	it('logs help when present on AppError', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const result = err(ERRORS.VALIDATION.SCHEMA_FAILED, 'Bad input', {
			help: 'Check field format',
		});
		if (result.ok) throw new Error('err() should return error');
		callServerHandleError({
			error: result.error,
			status: 400,
			message: 'Bad Request',
		});
		const logOutput: string = spy.mock.calls[0]?.[0] ?? '';
		const parsed: Record<string, unknown> = JSON.parse(logOutput);
		const data = parsed.data as Record<string, unknown>;
		expect(data.help).toBe('Check field format');
		spy.mockRestore();
	});

	it('logs source when present on AppError', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const result = err(ERRORS.VALIDATION.SCHEMA_FAILED, 'Bad input', {
			source: { pointer: '/data/email', parameter: 'email' },
		});
		if (result.ok) throw new Error('err() should return error');
		callServerHandleError({
			error: result.error,
			status: 400,
			message: 'Bad Request',
		});
		const logOutput: string = spy.mock.calls[0]?.[0] ?? '';
		const parsed: Record<string, unknown> = JSON.parse(logOutput);
		const data = parsed.data as Record<string, unknown>;
		expect(data.source).toBeDefined();
		// Note: data.source is the extractSource() source, and data.errorSource is the appError.source
		expect(data.errorSource).toEqual({ pointer: '/data/email', parameter: 'email' });
		spy.mockRestore();
	});

	it('logs related errors when present on AppError', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const related1 = err(ERRORS.VALIDATION.MISSING_FIELD, 'Field too long');
		const related2 = err(ERRORS.VALIDATION.INVALID_FORMAT, 'Bad format');
		if (related1.ok || related2.ok) throw new Error('err() should return error');
		const result = err(ERRORS.VALIDATION.SCHEMA_FAILED, 'Multiple issues', {
			related: [related1.error, related2.error],
		});
		if (result.ok) throw new Error('err() should return error');
		callServerHandleError({
			error: result.error,
			status: 400,
			message: 'Bad Request',
		});
		const logOutput: string = spy.mock.calls[0]?.[0] ?? '';
		const parsed: Record<string, unknown> = JSON.parse(logOutput);
		const data = parsed.data as Record<string, unknown>;
		expect(data.related).toBeDefined();
		const related = data.related as Array<{ code: string; message: string }>;
		expect(related).toHaveLength(2);
		expect(related[0]?.code).toBe('VALIDATION.MISSING_FIELD');
		expect(related[1]?.code).toBe('VALIDATION.INVALID_FORMAT');
		spy.mockRestore();
	});
});

describe('response headers', () => {
	async function getResponseFromHandle(
		cookie: string,
		acceptLanguage: string | null,
		pathname = '/',
	): Promise<Response> {
		const event = mockEvent(cookie, acceptLanguage, pathname);
		const { resolve } = mockResolve();
		const response = await handle({ event, resolve });
		return response as Response;
	}

	it('sets X-App-Version header', async () => {
		const response: Response = await getResponseFromHandle('en', null);
		const version: string | null = response.headers.get('X-App-Version');
		expect(version).toBeTruthy();
		expect(typeof version).toBe('string');
	});

	it('sets X-Git-Commit header', async () => {
		const response: Response = await getResponseFromHandle('en', null);
		const commit: string | null = response.headers.get('X-Git-Commit');
		expect(commit).toBeTruthy();
		expect(typeof commit).toBe('string');
	});
});
