/**
 * Mock implementation of the DataService interface for development.
 *
 * Returns hardcoded data from `./data.ts`. Automatically activates when
 * `platform.env.DB` is absent (no Cloudflare D1 binding available).
 *
 * @module
 */

import { okUnchecked, type Result } from '@/schemas/result/result';
import type { Str } from '@/schemas/common';
import type { DataService, ServerProject, ServerScene } from '../data/types';
import { MOCK_PROJECT, MOCK_SCENES } from './data';

/**
 * Creates a mock data service that returns hardcoded development data.
 *
 * @returns A DataService implementation backed by mock data
 *
 * @example
 * const service = createMockService();
 * const project = await service.projects.getByOwner('user-mock-001');
 */
export function createMockService(): DataService {
	return {
		projects: {
			async getByOwner(ownerId: Str): Promise<Result<ServerProject | null>> {
				if (ownerId === MOCK_PROJECT.ownerId) {
					return okUnchecked(MOCK_PROJECT);
				}
				return okUnchecked(null);
			},
		},
		scenes: {
			async getByProject(projectId: Str): Promise<Result<ServerScene[]>> {
				if (projectId === MOCK_PROJECT.id) {
					return okUnchecked([...MOCK_SCENES]);
				}
				return okUnchecked([]);
			},
		},
	};
}
