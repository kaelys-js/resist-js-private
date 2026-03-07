import { describe, expect, it } from 'vitest';
import { safeParse } from '@/utils/result/safe';
import {
	DebugStateSchema,
	LOG_LEVELS,
	LogLevelSchema,
	URL_PARAM_PREFIX,
	UrlOverridesSchema,
} from './debug-state';

describe('LOG_LEVELS', () => {
	it('contains exactly five levels in priority order', () => {
		expect(LOG_LEVELS).toEqual(['trace', 'debug', 'info', 'warn', 'error']);
	});
});

describe('LogLevelSchema', () => {
	it.each(LOG_LEVELS)('accepts valid level: %s', (level) => {
		const result = safeParse(LogLevelSchema, level);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toBe(level);
	});

	it('rejects invalid level', () => {
		const result = safeParse(LogLevelSchema, 'verbose');
		expect(result.ok).toBe(false);
	});

	it('rejects non-string', () => {
		const result = safeParse(LogLevelSchema, 42);
		expect(result.ok).toBe(false);
	});
});

describe('DebugStateSchema', () => {
	it('accepts empty object with defaults', () => {
		const result = safeParse(DebugStateSchema, {});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.enabled).toBe(false);
			expect(result.data.logLevel).toBe('info');
		}
	});

	it('accepts fully specified state', () => {
		const result = safeParse(DebugStateSchema, { enabled: true, logLevel: 'trace' });
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.enabled).toBe(true);
			expect(result.data.logLevel).toBe('trace');
		}
	});

	it('rejects unknown keys (strictObject)', () => {
		const result = safeParse(DebugStateSchema, { enabled: true, extra: 'nope' });
		expect(result.ok).toBe(false);
	});

	it('rejects invalid enabled type', () => {
		const result = safeParse(DebugStateSchema, { enabled: 'yes' });
		expect(result.ok).toBe(false);
	});

	it('rejects invalid logLevel', () => {
		const result = safeParse(DebugStateSchema, { logLevel: 'verbose' });
		expect(result.ok).toBe(false);
	});
});

describe('URL_PARAM_PREFIX', () => {
	it('is "sl."', () => {
		expect(URL_PARAM_PREFIX).toBe('sl.');
	});
});

describe('UrlOverridesSchema', () => {
	it('accepts empty object', () => {
		const result = safeParse(UrlOverridesSchema, {});
		expect(result.ok).toBe(true);
	});

	it('accepts string key-value pairs', () => {
		const result = safeParse(UrlOverridesSchema, { debug: 'true', theme: 'midnight' });
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.debug).toBe('true');
			expect(result.data.theme).toBe('midnight');
		}
	});

	it('rejects non-string values', () => {
		const result = safeParse(UrlOverridesSchema, { debug: 42 });
		expect(result.ok).toBe(false);
	});
});
