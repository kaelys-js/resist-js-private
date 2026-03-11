/**
 * Test route that triggers a 500 Internal Server Error for error page testing.
 *
 * @module
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Throws a 500 Internal Server Error — never returns page data.
 *
 * @returns Never — always throws a SvelteKit error
 */
export const load: PageServerLoad = () => {
  error(500, { message: 'Internal server error' });
};
