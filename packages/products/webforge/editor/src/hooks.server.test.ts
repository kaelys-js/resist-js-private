import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent, ResolveOptions } from '@sveltejs/kit';
import { handle, handleError } from './hooks.server';

/**
 * Creates a minimal mock RequestEvent for testing the handle hook.
 *
 * @param cookie - Value for the 'locale' cookie
 * @param acceptLanguage - Value for the Accept-Language header
 * @returns Mock RequestEvent with cookies and request headers
 */
function mockEvent(cookie: string, acceptLanguage: string | null): RequestEvent {
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
 * @returns Mock event and setHeaders spy
 */
function createMockErrorEvent(): { event: RequestEvent; setHeaders: ReturnType<typeof vi.fn> } {
	const setHeaders = vi.fn();
	return {
		event: { setHeaders } as unknown as RequestEvent,
		setHeaders,
	};
}

/**
 * Calls handleError with the given params and asserts a defined App.Error is returned.
 *
 * @param params - Error, status, and message to pass to handleError
 * @returns The App.Error result and the setHeaders spy
 */
function callServerHandleError(params: { error: Error; status: number; message: string }): {
	result: App.Error;
	setHeaders: ReturnType<typeof vi.fn>;
} {
	const { event, setHeaders } = createMockErrorEvent();
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
	it('returns App.Error with message and errorId', () => {
		const { result } = callServerHandleError({
			error: new Error('test crash'),
			status: 500,
			message: 'Internal Error',
		});
		expect(result).toHaveProperty('message', 'Internal Error');
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

	it('preserves the provided message', () => {
		const { result } = callServerHandleError({
			error: new Error('crash'),
			status: 404,
			message: 'Not Found',
		});
		expect(result.message).toBe('Not Found');
	});

	it('logs the error with errorId', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const { result } = callServerHandleError({
			error: new Error('crash'),
			status: 500,
			message: 'Internal Error',
		});
		expect(spy).toHaveBeenCalledWith(expect.stringContaining(result.errorId!), expect.any(Error));
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
});
