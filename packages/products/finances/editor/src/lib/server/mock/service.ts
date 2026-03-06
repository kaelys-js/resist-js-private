/**
 * Mock implementation of the DataService for development.
 *
 * Placeholder for future finance data service. The actual finance data
 * CRUD is handled by API routes reading/writing JSON files.
 *
 * @module
 */

import type { Num, Void } from '@/schemas/common';

/**
 * Sleeps for the specified number of milliseconds.
 *
 * @param ms - Duration in milliseconds (0 = no delay)
 * @returns A promise that resolves after the specified delay
 */
export function sleep(ms: Num): Promise<Void> {
	if (ms <= 0) return Promise.resolve(undefined);
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
