/**
 * Mock implementation of the DataService interface for development.
 *
 * Returns hardcoded data from `./data.ts`. Automatically activates when
 * `platform.env.DB` is absent (no Cloudflare D1 binding available).
 *
 * Supports an optional `delayMs` parameter to simulate server latency,
 * making skeleton loading states visible during development.
 *
 * @module
 */

import { okUnchecked, type Result } from '@/schemas/result/result';
import type { Str } from '@/schemas/common';
import type { DataService, ServerProject, ServerScene } from '../data/types';
import { MOCK_PROJECT, MOCK_SCENES } from './data';

/**
 * Sleeps for the specified number of milliseconds.
 *
 * @param ms - Duration in milliseconds (0 = no delay)
 * @returns A promise that resolves after the specified delay
 */
function sleep(ms: number): Promise<void> {
	if (ms <= 0) return Promise.resolve();
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

/**
 * Creates a mock data service that returns hardcoded development data.
 *
 * @param delayMs - Optional delay in milliseconds to simulate server latency (default: 0)
 * @returns A DataService implementation backed by mock data
 *
 * @example
 * const service = createMockService();
 * const project = await service.projects.getByOwner('user-mock-001');
 *
 * @example
 * // With simulated latency for skeleton testing
 * const service = createMockService(1500);
 */
export function createMockService(delayMs = 0): DataService {
	return {
		projects: {
			async getByOwner(ownerId: Str): Promise<Result<ServerProject | null>> {
				await sleep(delayMs);
				if (ownerId === MOCK_PROJECT.ownerId) {
					return okUnchecked(MOCK_PROJECT);
				}
				return okUnchecked(null);
			},
		},
		scenes: {
			async getByProject(projectId: Str): Promise<Result<ServerScene[]>> {
				await sleep(delayMs);
				if (projectId === MOCK_PROJECT.id) {
					return okUnchecked([...MOCK_SCENES]);
				}
				return okUnchecked([]);
			},
		},
	};
}
