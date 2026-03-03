import { describe, expect, it, vi } from 'vitest';
import { handleError } from './hooks.client';

/**
 * Calls handleError and asserts the return is an App.Error object (not void).
 *
 * @param params - Parameters to pass to handleError
 * @returns The App.Error result with message and errorId
 */
function callHandleError(params: { error: Error; status: number; message: string }): App.Error {
	const result = handleError({
		error: params.error,
		event: {} as any,
		status: params.status,
		message: params.message,
	});
	expect(result).toBeDefined();
	return result as App.Error;
}

describe('handleError', () => {
	it('returns App.Error with message and errorId', () => {
		const result: App.Error = callHandleError({
			error: new Error('test crash'),
			status: 500,
			message: 'Internal Error',
		});
		expect(result).toHaveProperty('message', 'Internal Error');
		expect(result).toHaveProperty('errorId');
		expect(typeof result.errorId).toBe('string');
	});

	it('errorId is a valid UUID', () => {
		const result: App.Error = callHandleError({
			error: new Error('test'),
			status: 500,
			message: 'Error',
		});
		expect(result.errorId).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		);
	});

	it('preserves the provided message', () => {
		const result: App.Error = callHandleError({
			error: new Error('crash'),
			status: 404,
			message: 'Not Found',
		});
		expect(result.message).toBe('Not Found');
	});

	it('logs the error with errorId', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const result: App.Error = callHandleError({
			error: new Error('crash'),
			status: 500,
			message: 'Internal Error',
		});
		expect(spy).toHaveBeenCalledWith(expect.stringContaining(result.errorId!), expect.any(Error));
		spy.mockRestore();
	});

	it('generates unique errorIds for each call', () => {
		const result1: App.Error = callHandleError({
			error: new Error('a'),
			status: 500,
			message: 'Error',
		});
		const result2: App.Error = callHandleError({
			error: new Error('b'),
			status: 500,
			message: 'Error',
		});
		expect(result1.errorId).not.toBe(result2.errorId);
	});
});
