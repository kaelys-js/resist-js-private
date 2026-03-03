import { describe, expect, it, vi } from 'vitest';
import { ERRORS, err } from '@/schemas/result/result';
import { handleError } from './hooks.client';

/**
 * Calls handleError and asserts the return is an App.Error object (not void).
 *
 * @param params - Parameters to pass to handleError
 * @returns The App.Error result with message and errorId
 */
function callHandleError(params: { error: unknown; status: number; message: string }): App.Error {
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

	it('logs error with groupCollapsed including error code and errorId', () => {
		const groupSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		const result: App.Error = callHandleError({
			error: new Error('crash'),
			status: 500,
			message: 'Internal Error',
		});

		expect(groupSpy).toHaveBeenCalledWith(
			expect.stringContaining('[Error]'),
			expect.any(String),
			expect.any(String),
			expect.any(String),
			expect.any(String),
		);
		// Verify the key-value block contains error code and error ID
		const [kvCall] = logSpy.mock.calls;
		expect(kvCall[0]).toContain('Code');
		expect(kvCall[0]).toContain('Error ID');
		expect(kvCall).toContain('INTERNAL.UNEXPECTED');
		expect(kvCall).toContain(result.errorId);

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

	it('preserves domain-specific AppError code when thrown error is an AppError', () => {
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

		// The errorId should come from the original AppError
		expect(result.errorId).toBe(validationErr.error.id);
		const [kvCall] = logSpy.mock.calls;
		expect(kvCall[0]).toContain('Code');
		expect(kvCall).toContain('VALIDATION.SCHEMA_FAILED');

		vi.restoreAllMocks();
	});

	it('extracts source from browser @fs URLs in stack traces', () => {
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
				'    at err (http://localhost:5173/@fs/Users/coleb/Desktop/webforge/packages/shared/schemas/result/src/result.ts?t=1772535466719:123:10)',
				'    at safeParse (http://localhost:5173/@fs/Users/coleb/Desktop/webforge/packages/shared/utils/result/src/safe.ts?t=1772535466719:45:12)',
				'    at http://localhost:5173/@fs/Users/coleb/Desktop/webforge/packages/products/webforge/editor/src/routes/(testing)/test-error/validation-client/+page.svelte:21:22',
			].join('\n'),
		};

		callHandleError({
			error: mockAppError,
			status: 500,
			message: 'Internal Error',
		});

		// Should extract source from the first non-shared @fs URL frame
		const [kvCall] = logSpy.mock.calls;
		expect(kvCall[0]).toContain('Source');
		expect(kvCall).toContain(
			'http://localhost:5173/@fs/Users/coleb/Desktop/webforge/packages/products/webforge/editor/src/routes/(testing)/test-error/validation-client/+page.svelte:21:22',
		);

		vi.restoreAllMocks();
	});

	it('extracts source from browser /src/ URLs in stack traces', () => {
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

		const [kvCall] = logSpy.mock.calls;
		expect(kvCall[0]).toContain('Source');
		expect(kvCall).toContain(
			'http://localhost:5173/src/routes/(testing)/test-error/validation-client/+page.svelte:21:22',
		);

		vi.restoreAllMocks();
	});

	it('logs cause chain when AppError has causes', () => {
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

		// Should log the cause chain (styled: format string, color1, color2)
		expect(logSpy).toHaveBeenCalledWith(
			expect.stringContaining('VALIDATION.INVALID_FORMAT'),
			expect.any(String),
			expect.any(String),
		);

		vi.restoreAllMocks();
	});
});
