import { describe, expect, it, vi } from 'vitest';
import { ERRORS, err } from '@/schemas/result/result';
import type { Num, Str } from '@/schemas/common';
import { handleError } from './hooks.client';

/**
 * Calls handleError and asserts the return is an App.Error object (not void).
 *
 * @param params - Parameters to pass to handleError
 * @returns The App.Error result with message and errorId
 */
function callHandleError(params: { error: unknown; status: Num; message: Str }): App.Error {
	const result = handleError({
		error: params.error,
		event: {} as any,
		status: params.status,
		message: params.message,
	});
	expect(result).toBeDefined();
	return result as App.Error;
}

/**
 * Waits for pending microtasks to flush so async logErrorToConsole completes.
 *
 * logErrorToConsole is async (source map resolution) but fire-and-forget.
 * In tests, source map fetch fails immediately (no server), so the async
 * function resolves on the next microtask tick.
 */
async function flushAsync(): Promise<void> {
	await new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
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

	it('logs error via CapturedError pipeline with groupCollapsed header', async () => {
		const groupSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		const result: App.Error = callHandleError({
			error: new Error('crash'),
			status: 500,
			message: 'Internal Error',
		});

		// logErrorToConsole is async — wait for it to complete
		await flushAsync();

		// reportError sets type='resultError' which maps to [Error] label
		expect(groupSpy).toHaveBeenCalledWith(
			expect.stringContaining('[Error]'),
			expect.any(String),
			expect.any(String),
			expect.any(String),
			expect.any(String),
		);
		// Verify the key-value block contains both AppError and CapturedError fields
		const [kvCall] = logSpy.mock.calls;
		expect(kvCall[0]).toContain('Code');
		expect(kvCall[0]).toContain('Error ID');
		expect(kvCall[0]).toContain('Capture ID');
		expect(kvCall[0]).toContain('Type');
		expect(kvCall[0]).toContain('Environment');
		expect(kvCall[0]).toContain('Fatal');
		expect(kvCall).toContain('INTERNAL.UNEXPECTED');
		expect(kvCall).toContain(result.errorId);
		// CapturedError fields
		expect(kvCall).toContain('resultError'); // type
		expect(kvCall).toContain('false'); // fatal (non-fatal from handleError)

		vi.restoreAllMocks();
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

	it('preserves domain-specific AppError code when thrown error is an AppError', async () => {
		vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		const validationErr = err(ERRORS.VALIDATION.SCHEMA_FAILED, 'Bad input');
		if (validationErr.ok) throw new Error('err() should return error');

		const result: App.Error = callHandleError({
			error: validationErr.error,
			status: 500,
			message: 'Internal Error',
		});

		await flushAsync();

		// The errorId should come from the original AppError
		expect(result.errorId).toBe(validationErr.error.id);
		const [kvCall] = logSpy.mock.calls;
		expect(kvCall[0]).toContain('Code');
		expect(kvCall).toContain('VALIDATION.SCHEMA_FAILED');

		vi.restoreAllMocks();
	});

	it('extracts source from browser @fs URLs in stack traces', async () => {
		// Mock fetch to reject immediately — no dev server in test env.
		// Without this, real fetch attempts a TCP connection that takes too long to fail.
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('no server')));
		vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		// Build a mock AppError-shaped object with a browser-style stack trace.
		// Real AppErrors are frozen, so we create a plain object that fromUnknownError recognizes.
		const mockAppError = {
			ok: false,
			code: 'VALIDATION.SCHEMA_FAILED',
			id: '00000000-0000-0000-0000-000000000001',
			message: 'test',
			timestamp: new Date().toISOString(),
			stack: [
				'Error: test',
				'    at err (http://localhost:5173/@fs/Users/Test User/Desktop/webforge/packages/shared/schemas/result/src/result.ts?t=1772535466719:123:10)',
				'    at safeParse (http://localhost:5173/@fs/Users/Test User/Desktop/webforge/packages/shared/utils/result/src/safe.ts?t=1772535466719:45:12)',
				'    at http://localhost:5173/@fs/Users/Test User/Desktop/webforge/packages/products/webforge/editor/src/routes/(testing)/test-error/validation-client/+page.svelte:21:22',
			].join('\n'),
		};

		callHandleError({
			error: mockAppError,
			status: 500,
			message: 'Internal Error',
		});

		await flushAsync();

		// Should extract source from the first non-shared @fs URL frame
		// Source map resolution fails in test (no server), so falls back to raw positions
		const [kvCall] = logSpy.mock.calls;
		expect(kvCall[0]).toContain('Source');
		expect(kvCall).toContain(
			'http://localhost:5173/@fs/Users/Test User/Desktop/webforge/packages/products/webforge/editor/src/routes/(testing)/test-error/validation-client/+page.svelte:21:22',
		);

		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('extracts source from browser /src/ URLs in stack traces', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('no server')));
		vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		const mockAppError = {
			ok: false,
			code: 'VALIDATION.SCHEMA_FAILED',
			id: '00000000-0000-0000-0000-000000000002',
			message: 'test',
			timestamp: new Date().toISOString(),
			stack: [
				'Error: test',
				'    at http://localhost:5173/src/routes/(testing)/test-error/validation-client/+page.svelte:21:22',
			].join('\n'),
		};

		callHandleError({
			error: mockAppError,
			status: 500,
			message: 'Internal Error',
		});

		await flushAsync();

		const [kvCall] = logSpy.mock.calls;
		expect(kvCall[0]).toContain('Source');
		expect(kvCall).toContain(
			'http://localhost:5173/src/routes/(testing)/test-error/validation-client/+page.svelte:21:22',
		);

		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('logs Release entry when captured.release is present', async () => {
		vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		callHandleError({
			error: new Error('crash'),
			status: 500,
			message: 'Error',
		});

		await flushAsync();

		// The key-value block should include Release (from ambient options)
		const [kvCall] = logSpy.mock.calls;
		expect(kvCall[0]).toContain('Release');
		expect(kvCall).toContain('0.0.0-test');

		vi.restoreAllMocks();
	});

	it('logs Tags section when captured.tags has entries', async () => {
		vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		callHandleError({
			error: new Error('crash'),
			status: 500,
			message: 'Error',
		});

		await flushAsync();

		// Should log a Tags: section (from ambient tags)
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Tags'), expect.any(String));

		vi.restoreAllMocks();
	});

	it('logs Help when appError.help is present', async () => {
		vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		const result = err(ERRORS.VALIDATION.SCHEMA_FAILED, 'Bad input', {
			help: 'Check the field format',
		});
		if (result.ok) throw new Error('err() should return error');

		callHandleError({
			error: result.error,
			status: 400,
			message: 'Bad Request',
		});

		await flushAsync();

		expect(logSpy).toHaveBeenCalledWith(
			expect.stringContaining('Help'),
			expect.any(String),
			expect.any(String),
			'Check the field format',
		);

		vi.restoreAllMocks();
	});

	it('logs Source pointer when appError.source is present', async () => {
		vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		const result = err(ERRORS.VALIDATION.SCHEMA_FAILED, 'Bad input', {
			source: { pointer: '/data/email', parameter: 'email' },
		});
		if (result.ok) throw new Error('err() should return error');

		callHandleError({
			error: result.error,
			status: 400,
			message: 'Bad Request',
		});

		await flushAsync();

		expect(logSpy).toHaveBeenCalledWith(
			expect.stringContaining('Source pointer'),
			expect.any(String),
		);

		vi.restoreAllMocks();
	});

	it('logs Related errors when appError.related has entries', async () => {
		vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		const related1 = err(ERRORS.VALIDATION.MISSING_FIELD, 'Missing name');
		const related2 = err(ERRORS.VALIDATION.INVALID_FORMAT, 'Bad email');
		if (related1.ok || related2.ok) throw new Error('err() should return error');

		const result = err(ERRORS.VALIDATION.SCHEMA_FAILED, 'Multiple issues', {
			related: [related1.error, related2.error],
		});
		if (result.ok) throw new Error('err() should return error');

		callHandleError({
			error: result.error,
			status: 400,
			message: 'Bad Request',
		});

		await flushAsync();

		expect(logSpy).toHaveBeenCalledWith(
			expect.stringContaining('Related errors'),
			expect.any(String),
		);

		vi.restoreAllMocks();
	});

	it('logs cause chain when AppError has causes', async () => {
		vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		// Create an error with a cause chain
		const innerErr = err(ERRORS.VALIDATION.INVALID_FORMAT, 'bad email');
		if (innerErr.ok) throw new Error('err() should return error');
		const outerErr = err(ERRORS.VALIDATION.SCHEMA_FAILED, 'validation failed', {
			cause: innerErr.error,
		});
		if (outerErr.ok) throw new Error('err() should return error');

		callHandleError({
			error: outerErr.error,
			status: 500,
			message: 'Internal Error',
		});

		await flushAsync();

		// Should log the cause chain (styled: format string, color1, color2)
		expect(logSpy).toHaveBeenCalledWith(
			expect.stringContaining('VALIDATION.INVALID_FORMAT'),
			expect.any(String),
			expect.any(String),
		);

		vi.restoreAllMocks();
	});
});
