/**
 * Test route that triggers a 404 Not Found error for error page testing.
 *
 * @module
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Throws a 404 Not Found error — never returns page data.
 *
 * @returns Never — always throws a SvelteKit error
 */
export const load: PageServerLoad = () => {
	error(404, { message: 'Not found' });
};
