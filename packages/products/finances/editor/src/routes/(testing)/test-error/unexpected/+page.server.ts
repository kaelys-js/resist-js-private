/**
 * Test route that simulates an unexpected server crash via a raw throw.
 *
 * @module
 */

import type { PageServerLoad } from './$types';

/**
 * Throws an unhandled Error — simulates a server crash for error handling testing.
 *
 * @returns Never — always throws an unhandled Error
 */
export const load: PageServerLoad = () => {
	throw new Error('Unexpected test error — this simulates a server crash');
};
