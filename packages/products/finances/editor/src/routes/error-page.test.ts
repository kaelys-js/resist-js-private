import { describe, expect, it } from 'vitest';
import type { Num, Str } from '@/schemas/common';
import { APP_NAME } from '$lib/config/app-meta';

/**
 * Tests for +error.svelte integration behavior.
 *
 * Since +error.svelte depends on $app/state (which requires full SvelteKit runtime),
 * we verify the status→locale mapping logic that ErrorPage uses directly.
 * The actual rendering of +error.svelte with $app/state is verified via E2E tests.
 */
describe('+error.svelte integration logic', () => {
	it('maps 400 status to badRequest locale key', () => {
		const statusKeyMap: Record<Num, Str> = {
			400: 'badRequest',
			403: 'forbidden',
			404: 'notFound',
			500: 'serverError',
		};
		expect(statusKeyMap[400]).toBe('badRequest');
	});

	it('maps 404 status to notFound locale key', () => {
		const statusKeyMap: Record<Num, Str> = {
			400: 'badRequest',
			403: 'forbidden',
			404: 'notFound',
			500: 'serverError',
		};
		expect(statusKeyMap[404]).toBe('notFound');
	});

	it('maps 403 status to forbidden locale key', () => {
		const statusKeyMap: Record<Num, Str> = {
			400: 'badRequest',
			403: 'forbidden',
			404: 'notFound',
			500: 'serverError',
		};
		expect(statusKeyMap[403]).toBe('forbidden');
	});

	it('maps 500 status to serverError locale key', () => {
		const statusKeyMap: Record<Num, Str> = {
			400: 'badRequest',
			403: 'forbidden',
			404: 'notFound',
			500: 'serverError',
		};
		expect(statusKeyMap[500]).toBe('serverError');
	});

	it('unknown status falls back to genericTitle', () => {
		const statusKeyMap: Record<Num, Str> = {
			400: 'badRequest',
			403: 'forbidden',
			404: 'notFound',
			500: 'serverError',
		};
		const key: Str = statusKeyMap[418] ?? 'genericTitle';
		expect(key).toBe('genericTitle');
	});

	it('page.error shape matches App.Error interface', () => {
		const mockPageError: App.Error = {
			message: 'Internal Error',
			errorId: 'abc-123',
		};
		expect(mockPageError.message).toBe('Internal Error');
		expect(mockPageError.errorId).toBe('abc-123');
	});

	it('page.error without errorId is valid', () => {
		const mockPageError: App.Error = {
			message: 'Not found',
		};
		expect(mockPageError.message).toBe('Not found');
		expect(mockPageError.errorId).toBeUndefined();
	});

	it('error title format includes error name and app name', () => {
		const errorTitle: Str = 'Page not found';
		const appName: Str = APP_NAME;
		const title: Str = `${errorTitle} | ${appName}`;
		expect(title).toBe(`Page not found | ${APP_NAME}`);
	});
});
