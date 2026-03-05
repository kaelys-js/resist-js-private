/**
 * Data service factory — creates the appropriate DataService implementation.
 *
 * Automatically selects mock data when `platform.env.DB` is absent,
 * or D1-backed service when available. This means zero code changes
 * in load functions when deploying to Cloudflare.
 *
 * @module
 */

import type { Num } from '@/schemas/common';
import type { DataService } from './types';
import { createMockService } from '../mock/service';

/**
 * Creates a DataService instance based on platform availability.
 *
 * @param _platform - SvelteKit platform object (contains D1 binding when deployed)
 * @param delayMs - Optional mock data delay in milliseconds (dev only, default: 0)
 * @returns A DataService implementation (mock or D1)
 *
 * @example
 * // In hooks.server.ts:
 * event.locals.db = createDataService(event.platform);
 *
 * @example
 * // With simulated latency for skeleton testing:
 * event.locals.db = createDataService(event.platform, 1500);
 */
export function createDataService(_platform?: App.Platform, delayMs: Num = 0): DataService {
	// Future: if (_platform?.env?.DB) return createD1Service(_platform.env.DB);
	return createMockService(delayMs);
}
