import { describe, expect, it } from 'vitest';
import { LOG_LEVEL_PRIORITY, shouldLog } from './state-logger.svelte';

describe('LOG_LEVEL_PRIORITY', () => {
	it('has correct priority ordering', () => {
		expect(LOG_LEVEL_PRIORITY.trace).toBe(0);
		expect(LOG_LEVEL_PRIORITY.debug).toBe(1);
		expect(LOG_LEVEL_PRIORITY.info).toBe(2);
		expect(LOG_LEVEL_PRIORITY.warn).toBe(3);
		expect(LOG_LEVEL_PRIORITY.error).toBe(4);
	});

	it('trace is lowest priority (most verbose)', () => {
		expect(LOG_LEVEL_PRIORITY.trace).toBeLessThan(LOG_LEVEL_PRIORITY.debug);
		expect(LOG_LEVEL_PRIORITY.debug).toBeLessThan(LOG_LEVEL_PRIORITY.info);
		expect(LOG_LEVEL_PRIORITY.info).toBeLessThan(LOG_LEVEL_PRIORITY.warn);
		expect(LOG_LEVEL_PRIORITY.warn).toBeLessThan(LOG_LEVEL_PRIORITY.error);
	});
});

describe('shouldLog', () => {
	it('allows debug messages when level is trace', () => {
		expect(shouldLog('debug', 'trace')).toBe(true);
	});

	it('allows debug messages when level is debug', () => {
		expect(shouldLog('debug', 'debug')).toBe(true);
	});

	it('blocks debug messages when level is info', () => {
		expect(shouldLog('debug', 'info')).toBe(false);
	});

	it('blocks debug messages when level is warn', () => {
		expect(shouldLog('debug', 'warn')).toBe(false);
	});

	it('blocks debug messages when level is error', () => {
		expect(shouldLog('debug', 'error')).toBe(false);
	});

	it('allows info messages when level is info', () => {
		expect(shouldLog('info', 'info')).toBe(true);
	});

	it('allows error messages at any level', () => {
		expect(shouldLog('error', 'trace')).toBe(true);
		expect(shouldLog('error', 'error')).toBe(true);
	});
});
