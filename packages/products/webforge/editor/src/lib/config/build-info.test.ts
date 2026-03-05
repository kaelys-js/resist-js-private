import { describe, expect, it } from 'vitest';
import { getBuildInfo } from './build-info';

describe('getBuildInfo', () => {
	it('returns ok with valid build info from define constants', () => {
		const result = getBuildInfo();
		expect(result.ok).toBe(true);
	});

	it('version is a non-empty string', () => {
		const result = getBuildInfo();
		if (!result.ok) throw new Error('Expected ok result');
		expect(typeof result.data.version).toBe('string');
		expect(result.data.version.length).toBeGreaterThan(0);
	});

	it('commit is a non-empty string', () => {
		const result = getBuildInfo();
		if (!result.ok) throw new Error('Expected ok result');
		expect(typeof result.data.commit).toBe('string');
		expect(result.data.commit.length).toBeGreaterThan(0);
	});

	it('commitFull is a non-empty string', () => {
		const result = getBuildInfo();
		if (!result.ok) throw new Error('Expected ok result');
		expect(typeof result.data.commitFull).toBe('string');
		expect(result.data.commitFull.length).toBeGreaterThan(0);
	});

	it('branch is a non-empty string', () => {
		const result = getBuildInfo();
		if (!result.ok) throw new Error('Expected ok result');
		expect(typeof result.data.branch).toBe('string');
		expect(result.data.branch.length).toBeGreaterThan(0);
	});

	it('dirty is a boolean', () => {
		const result = getBuildInfo();
		if (!result.ok) throw new Error('Expected ok result');
		expect(typeof result.data.dirty).toBe('boolean');
	});

	it('buildTimestamp is an ISO timestamp string', () => {
		const result = getBuildInfo();
		if (!result.ok) throw new Error('Expected ok result');
		expect(typeof result.data.buildTimestamp).toBe('string');
		// Validate it's a valid ISO date
		const parsed = new Date(result.data.buildTimestamp);
		expect(parsed.getTime()).not.toBeNaN();
	});

	it('returns all six fields', () => {
		const result = getBuildInfo();
		if (!result.ok) throw new Error('Expected ok result');
		const keys = Object.keys(result.data);
		expect(keys).toHaveLength(6);
		expect(keys).toContain('version');
		expect(keys).toContain('commit');
		expect(keys).toContain('commitFull');
		expect(keys).toContain('branch');
		expect(keys).toContain('dirty');
		expect(keys).toContain('buildTimestamp');
	});
});
