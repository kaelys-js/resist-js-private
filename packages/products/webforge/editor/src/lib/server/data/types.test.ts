import { describe, expect, it } from 'vitest';
import { safeParse } from '@/utils/result/safe';
import { ServerUserSchema, ServerProjectSchema, ServerSceneSchema } from './types';

describe('ServerUserSchema', () => {
	it('parses a valid user with all fields', () => {
		const result = safeParse(ServerUserSchema, {
			id: 'user-001',
			displayName: 'Coleb',
			email: 'coleb@example.com',
			avatarUrl: 'https://example.com/avatar.png',
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.id).toBe('user-001');
			expect(result.data.displayName).toBe('Coleb');
			expect(result.data.email).toBe('coleb@example.com');
			expect(result.data.avatarUrl).toBe('https://example.com/avatar.png');
		}
	});

	it('applies default empty string for optional avatarUrl', () => {
		const result = safeParse(ServerUserSchema, {
			id: 'user-001',
			displayName: 'Coleb',
			email: 'coleb@example.com',
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.avatarUrl).toBe('');
		}
	});

	it('rejects missing displayName', () => {
		const result = safeParse(ServerUserSchema, {
			id: 'user-001',
			email: 'coleb@example.com',
		});
		expect(result.ok).toBe(false);
	});

	it('rejects empty displayName', () => {
		const result = safeParse(ServerUserSchema, {
			id: 'user-001',
			displayName: '',
			email: 'coleb@example.com',
		});
		expect(result.ok).toBe(false);
	});

	it('rejects invalid email', () => {
		const result = safeParse(ServerUserSchema, {
			id: 'user-001',
			displayName: 'Coleb',
			email: 'not-an-email',
		});
		expect(result.ok).toBe(false);
	});
});

describe('ServerProjectSchema', () => {
	it('parses a valid project with all fields', () => {
		const result = safeParse(ServerProjectSchema, {
			id: 'proj-001',
			name: 'My First RPG',
			subtitle: 'An HD-2D Adventure',
			ownerId: 'user-001',
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.id).toBe('proj-001');
			expect(result.data.name).toBe('My First RPG');
			expect(result.data.subtitle).toBe('An HD-2D Adventure');
			expect(result.data.ownerId).toBe('user-001');
		}
	});

	it('applies default empty string for optional subtitle', () => {
		const result = safeParse(ServerProjectSchema, {
			id: 'proj-001',
			name: 'My First RPG',
			ownerId: 'user-001',
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.subtitle).toBe('');
		}
	});

	it('rejects missing name', () => {
		const result = safeParse(ServerProjectSchema, {
			id: 'proj-001',
			ownerId: 'user-001',
		});
		expect(result.ok).toBe(false);
	});

	it('rejects empty name', () => {
		const result = safeParse(ServerProjectSchema, {
			id: 'proj-001',
			name: '',
			ownerId: 'user-001',
		});
		expect(result.ok).toBe(false);
	});
});

describe('ServerSceneSchema', () => {
	it('parses a valid scene with all fields', () => {
		const result = safeParse(ServerSceneSchema, {
			id: 'scene-001',
			title: 'Overworld',
			url: '#overworld',
			isActive: true,
			order: 0,
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.id).toBe('scene-001');
			expect(result.data.title).toBe('Overworld');
			expect(result.data.url).toBe('#overworld');
			expect(result.data.isActive).toBe(true);
			expect(result.data.order).toBe(0);
		}
	});

	it('applies defaults for optional fields', () => {
		const result = safeParse(ServerSceneSchema, {
			id: 'scene-001',
			title: 'Overworld',
			url: '#overworld',
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.isActive).toBe(false);
			expect(result.data.order).toBe(0);
		}
	});

	it('rejects missing id', () => {
		const result = safeParse(ServerSceneSchema, {
			title: 'Overworld',
			url: '#overworld',
		});
		expect(result.ok).toBe(false);
	});

	it('rejects empty id', () => {
		const result = safeParse(ServerSceneSchema, {
			id: '',
			title: 'Overworld',
			url: '#overworld',
		});
		expect(result.ok).toBe(false);
	});
});
