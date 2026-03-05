/**
 * Test route that triggers a 400 Bad Request error for error page testing.
 *
 * @module
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Throws a 400 Bad Request error — never returns page data.
 *
 * @returns Never — always throws a SvelteKit error
 */
export const load: PageServerLoad = () => {
	error(400, { message: 'Bad Request' });
};
