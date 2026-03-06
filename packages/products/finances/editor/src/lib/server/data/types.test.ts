import { describe, expect, it } from 'vitest';
import { safeParse } from '@/utils/result/safe';
import { ServerUserSchema } from './types';

describe('ServerUserSchema', () => {
	it('parses a valid user with all fields', () => {
		const result = safeParse(ServerUserSchema, {
			id: 'user-001',
			displayName: 'Test User',
			email: 'test-user@example.com',
			avatarUrl: 'https://example.com/avatar.png',
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.id).toBe('user-001');
			expect(result.data.displayName).toBe('Test User');
			expect(result.data.email).toBe('test-user@example.com');
			expect(result.data.avatarUrl).toBe('https://example.com/avatar.png');
		}
	});

	it('applies default empty string for optional avatarUrl', () => {
		const result = safeParse(ServerUserSchema, {
			id: 'user-001',
			displayName: 'Test User',
			email: 'test-user@example.com',
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.avatarUrl).toBe('');
		}
	});

	it('rejects missing displayName', () => {
		const result = safeParse(ServerUserSchema, {
			id: 'user-001',
			email: 'test-user@example.com',
		});
		expect(result.ok).toBe(false);
	});

	it('rejects empty displayName', () => {
		const result = safeParse(ServerUserSchema, {
			id: 'user-001',
			displayName: '',
			email: 'test-user@example.com',
		});
		expect(result.ok).toBe(false);
	});

	it('rejects invalid email', () => {
		const result = safeParse(ServerUserSchema, {
			id: 'user-001',
			displayName: 'Test User',
			email: 'not-an-email',
		});
		expect(result.ok).toBe(false);
	});
});
