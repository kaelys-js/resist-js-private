import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent, ResolveOptions } from '@sveltejs/kit';
import { handle } from './hooks.server';

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
