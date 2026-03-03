import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn()', () => {
	it('returns empty string for no arguments', () => {
		expect(cn()).toBe('');
	});

	it('passes through a single class', () => {
		expect(cn('p-4')).toBe('p-4');
	});

	it('merges multiple classes', () => {
		expect(cn('p-4', 'mt-2')).toBe('p-4 mt-2');
	});

	it('resolves Tailwind conflicts (last wins)', () => {
		expect(cn('p-4', 'p-8')).toBe('p-8');
	});

	it('resolves conflicting text colors', () => {
		expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
	});

	it('handles falsy inputs (false, 0, empty string)', () => {
		expect(cn('p-4', false, 'mb-3')).toBe('p-4 mb-3');
		expect(cn('p-4', 0, 'mb-3')).toBe('p-4 mb-3');
		expect(cn('p-4', '', 'mb-3')).toBe('p-4 mb-3');
	});

	it('handles undefined and null inputs', () => {
		expect(cn('p-4', undefined, null, 'mt-2')).toBe('p-4 mt-2');
	});

	it('handles array input', () => {
		expect(cn(['p-4', 'mt-2'])).toBe('p-4 mt-2');
	});

	it('handles object input (clsx style)', () => {
		expect(cn({ 'p-4': true, 'mt-2': false, 'mb-3': true })).toBe('p-4 mb-3');
	});

	it('merges complex mix of inputs', () => {
		const result: string = cn('base', ['arr-1', 'arr-2'], { conditional: true }, undefined);
		expect(result).toBe('base arr-1 arr-2 conditional');
	});
});
