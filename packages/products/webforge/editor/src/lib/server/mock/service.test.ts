import { describe, expect, it } from 'vitest';
import { createMockService } from './service';
import { MOCK_PROJECT, MOCK_SCENES, MOCK_USER } from './data';

describe('createMockService', () => {
	it('returns a DataService with projects and scenes methods', () => {
		const service = createMockService();
		expect(service).toHaveProperty('projects');
		expect(service).toHaveProperty('scenes');
		expect(typeof service.projects.getByOwner).toBe('function');
		expect(typeof service.scenes.getByProject).toBe('function');
	});

	describe('projects.getByOwner', () => {
		it('returns MOCK_PROJECT for matching ownerId', async () => {
			const service = createMockService();
			const result = await service.projects.getByOwner(MOCK_USER.id);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.data).toEqual(MOCK_PROJECT);
			}
		});

		it('returns null for non-matching ownerId', async () => {
			const service = createMockService();
			const result = await service.projects.getByOwner('unknown-user');
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.data).toBeNull();
			}
		});
	});

	describe('scenes.getByProject', () => {
		it('returns MOCK_SCENES for matching projectId', async () => {
			const service = createMockService();
			const result = await service.scenes.getByProject(MOCK_PROJECT.id);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.data).toEqual(MOCK_SCENES);
				expect(result.data).toHaveLength(3);
			}
		});

		it('returns empty array for non-matching projectId', async () => {
			const service = createMockService();
			const result = await service.scenes.getByProject('unknown-project');
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.data).toEqual([]);
			}
		});
	});
});
