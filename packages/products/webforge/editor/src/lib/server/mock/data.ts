/**
 * Mock data for development — simulates a logged-in user with a sample project.
 *
 * These constants are used by `MockDataService` and `resolveAuth` in hooks.
 * They preserve the same scene names as the original hardcoded sidebar data
 * for visual continuity during development.
 *
 * @module
 */

import type { ServerUser, ServerProject, ServerScene } from '../data/types';

/**
 * Mock user profile simulating a logged-in developer.
 *
 * @example
 * ```typescript
 * if (ownerId === MOCK_USER.id) { ... }
 * ```
 */
export const MOCK_USER: ServerUser = {
	id: 'user-mock-001',
	displayName: 'Test User',
	email: 'test-user@example.com',
	avatarUrl: '',
};

/**
 * Mock project with an HD-2D theme.
 *
 * @example
 * ```typescript
 * if (projectId === MOCK_PROJECT.id) { ... }
 * ```
 */
export const MOCK_PROJECT: ServerProject = {
	id: 'proj-mock-001',
	name: 'Sample Project',
	subtitle: 'Sample Project Description',
	ownerId: 'user-mock-001',
};

/**
 * Mock scenes matching the original hardcoded sidebar data.
 *
 * @example
 * ```typescript
 * if (projectId === MOCK_PROJECT.id) return [...MOCK_SCENES];
 * ```
 */
export const MOCK_SCENES: readonly ServerScene[] = [
	{ id: 'scene-001', title: 'Overworld', url: '#overworld', isActive: true, order: 0 },
	{ id: 'scene-002', title: 'Town Interior', url: '#town-interior', isActive: false, order: 1 },
	{ id: 'scene-003', title: 'Dungeon B1', url: '#dungeon-b1', isActive: false, order: 2 },
];
